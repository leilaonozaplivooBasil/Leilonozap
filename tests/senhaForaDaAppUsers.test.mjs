// 🔐 A credencial não mora mais na app_users.
//
// O caso real (11/09/2026): 55 contas criadas pelo login com Google tinham um
// UUID gravado EM TEXTO na coluna `app_users.password`. Três fatos somados:
//
//   1. googleLogin.js gravava `password: crypto.randomUUID()`;
//   2. a policy `public_read` da app_users é SELECT para o papel `anon` com
//      `qual = true` — a coluna ia junto no alcance da chave publicável do site;
//   3. login.js, sem hash na app_users_auth, compara `stored === password`.
//
// Lia o UUID, digitava como senha, entrava na conta.
//
// Supabase e Google são dublês. Nenhum dado real (REGRA 15).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.GOOGLE_CLIENT_ID = 'cliente-de-teste.apps.googleusercontent.com';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let estado;
const fetchReal = globalThis.fetch;

function resposta(valor, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => valor, text: async () => JSON.stringify(valor) };
}

function resp() {
  const r = { code: 200, corpo: null, cabecalhos: {} };
  r.setHeader = (k, v) => { r.cabecalhos[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.corpo = b; return r; };
  r.send = (b) => { r.corpo = b; return r; };
  return r;
}

beforeEach(() => {
  estado = {
    usuarios: [],
    auth: [],             // linhas de app_users_auth
    escritas: [],         // toda chamada com method
    falharPatchSenha: false,
  };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (opts.method) estado.escritas.push({ u, method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });

    // ── Google ────────────────────────────────────────────────────────────
    if (u.includes('oauth2.googleapis.com/tokeninfo')) {
      return resposta({
        aud: process.env.GOOGLE_CLIENT_ID, email: 'novo@exemplo.com',
        email_verified: 'true', name: 'Pessoa Nova', sub: '1234567890',
      });
    }

    // ── app_users_auth ────────────────────────────────────────────────────
    if (u.includes('app_users_auth')) {
      if (opts.method === 'POST') {
        const b = JSON.parse(opts.body);
        estado.auth = estado.auth.filter((a) => a.user_id !== b.user_id).concat(b);
        return resposta(null);
      }
      const id = decodeURIComponent((u.match(/user_id=eq\.([^&]+)/) || [])[1] || '');
      return resposta(estado.auth.filter((a) => a.user_id === id));
    }

    // ── app_users ─────────────────────────────────────────────────────────
    if (u.includes('app_users')) {
      if (opts.method === 'PATCH') {
        if (estado.falharPatchSenha) throw new Error('rede caiu no PATCH');
        const id = decodeURIComponent((u.match(/id=eq\.([^&]+)/) || [])[1] || '');
        const b = JSON.parse(opts.body);
        estado.usuarios = estado.usuarios.map((x) => (x.id === id ? { ...x, ...b } : x));
        return resposta(null);
      }
      if (opts.method === 'POST') {
        const b = JSON.parse(opts.body);
        const novo = { id: 'novo-0001', ...b };
        estado.usuarios.push(novo);
        return resposta([novo]);
      }
      if (u.includes('referral_code=eq.')) return resposta([]);       // código livre
      const email = decodeURIComponent((u.match(/email=eq\.([^&]+)/) || [])[1] || '');
      return resposta(estado.usuarios.filter((x) => x.email === email));
    }

    if (u.includes('system_logs')) return resposta(null);
    return resposta([]);
  };
});

afterEach(() => { globalThis.fetch = fetchReal; });

async function entrar(email, senha) {
  const { default: login } = await import('../api/functions/login.js?t=' + Math.random());
  const r = resp();
  await login({ method: 'POST', body: { email, password: senha } }, r);
  return r;
}

async function entrarComGoogle() {
  const { default: googleLogin } = await import('../api/functions/googleLogin.js?t=' + Math.random());
  const r = resp();
  // token só precisa ter três partes; o dublê do Google é quem decide o payload
  const corpo = Buffer.from(JSON.stringify({ email: 'novo@exemplo.com' })).toString('base64url');
  await googleLogin({ method: 'POST', body: { credential: `a.${corpo}.c` } }, r);
  return r;
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN — a automigração texto → bcrypt tem que LIMPAR o texto
// ════════════════════════════════════════════════════════════════════════════

test('SEN-1 senha em texto que acerta vira bcrypt E some da app_users', async () => {
  // 🔴 É o coração do conserto. Antes, o hash era criado e o texto FICAVA —
  // ao alcance do papel anon, e aceito de volta pelo próprio login.
  estado.usuarios = [{ id: 'u1', email: 'a@b.com', password: 'segredo-em-texto', active: true }];

  const r = await entrar('a@b.com', 'segredo-em-texto');
  assert.equal(r.corpo.success, true, 'a pessoa tem que continuar entrando');

  assert.equal(estado.auth.length, 1, 'o hash não foi para a app_users_auth');
  assert.ok(String(estado.auth[0].password_hash).startsWith('$2'), 'não gravou bcrypt');

  const limpeza = estado.escritas.find((e) => e.method === 'PATCH' && e.body && 'password' in e.body);
  assert.ok(limpeza, 'não limpou app_users.password');
  assert.equal(limpeza.body.password, null);
  assert.equal(estado.usuarios[0].password, null, 'o texto continua na tabela');
});

test('SEN-2 senha errada não cria hash nem limpa nada', async () => {
  estado.usuarios = [{ id: 'u1', email: 'a@b.com', password: 'segredo-em-texto', active: true }];

  const r = await entrar('a@b.com', 'chute-errado');
  assert.equal(r.corpo.success, false);
  assert.equal(estado.auth.length, 0, 'criou credencial para quem errou a senha');
  assert.equal(estado.usuarios[0].password, 'segredo-em-texto');
});

test('SEN-3 quem já está em bcrypt não é tocado', async () => {
  estado.usuarios = [{ id: 'u1', email: 'a@b.com', password: null, active: true }];
  estado.auth = [{ user_id: 'u1', password_hash: bcrypt.hashSync('minha-senha', 10) }];

  const r = await entrar('a@b.com', 'minha-senha');
  assert.equal(r.corpo.success, true);
  const patchDeSenha = estado.escritas.filter((e) => e.method === 'PATCH' && e.body && 'password' in e.body);
  assert.equal(patchDeSenha.length, 0, 'mexeu na senha de quem já estava certo');
});

test('SEN-4 se a limpeza falhar, o login NÃO é bloqueado', async () => {
  // A pessoa acertou a senha e já tem o hash. Recusar a entrada por causa de uma
  // faxina que pode ser refeita seria trocar um risco por uma porta fechada.
  estado.usuarios = [{ id: 'u1', email: 'a@b.com', password: 'segredo-em-texto', active: true }];
  estado.falharPatchSenha = true;

  const r = await entrar('a@b.com', 'segredo-em-texto');
  assert.equal(r.corpo.success, true);
  assert.equal(estado.auth.length, 1, 'o hash tem que ter sido gravado mesmo assim');
});

test('SEN-5 a resposta do login nunca devolve a senha', async () => {
  estado.usuarios = [{ id: 'u1', email: 'a@b.com', password: 'segredo-em-texto', active: true, full_name: 'Fulana' }];
  const r = await entrar('a@b.com', 'segredo-em-texto');
  assert.equal(r.corpo.success, true);
  assert.ok(!('password' in (r.corpo.user || {})), 'devolveu a senha para o navegador');
  assert.ok(!JSON.stringify(r.corpo).includes('segredo-em-texto'));
});

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE — o cadastro novo nasce SEM credencial em texto
// ════════════════════════════════════════════════════════════════════════════

test('SEN-6 cadastro pelo Google nasce com password nulo', async () => {
  // 🔴 Antes nascia com crypto.randomUUID() em texto — e esse UUID era uma
  // senha que funcionava, legível por quem tivesse a chave pública do site.
  await entrarComGoogle();

  const criacao = estado.escritas.find((e) => e.u.includes('app_users') && e.method === 'POST');
  assert.ok(criacao, 'não criou o usuário');
  assert.equal(criacao.body.password, null, 'voltou a gravar credencial em texto');
  assert.ok(!UUID.test(String(criacao.body.password || '')), 'gravou um UUID como senha');
});

test('SEN-7 nenhum campo do cadastro pelo Google carrega um UUID solto', async () => {
  await entrarComGoogle();
  const criacao = estado.escritas.find((e) => e.u.includes('app_users') && e.method === 'POST');
  for (const [campo, valor] of Object.entries(criacao.body)) {
    assert.ok(!UUID.test(String(valor ?? '')), `campo ${campo} saiu com um UUID: possível credencial em texto`);
  }
});

test('SEN-8 quem nasceu pelo Google não entra com senha nenhuma pelo login normal', async () => {
  // Sem credencial em lugar nenhum, o login tem que recusar — inclusive uma
  // string vazia, que era o jeito mais óbvio de tentar.
  estado.usuarios = [{ id: 'g1', email: 'g@b.com', password: null, active: true }];
  for (const tentativa of ['', 'null', 'undefined', 'qualquer']) {
    const r = await entrar('g@b.com', tentativa);
    assert.equal(r.corpo.success, false, `entrou com "${tentativa}"`);
  }
});
