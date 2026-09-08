// adminUpdateUser — a trava anti-rebaixamento e o efeito na diretoria do X-Game.
//
// 08/09/2026 — dono, com print real: editou o cargo (tirou a diretoria) E a
// Permissão de Trabalho (tirou o admin) de uma pessoa na MESMA tela, salvou, e
// nada mudou. A tela só dizia "o servidor não confirmou a alteração da função
// principal". A causa: a trava anti-rebaixamento (que existe pra ninguém
// perder acesso de admin sem querer) apagava role/career_levels/
// primary_career_level do payload inteiro e respondia sucesso — CALADA.
//
// Este arquivo prova três coisas: (1) sem confirmação, os três campos ficam
// de pé (não silenciosamente descartados — a rota agora AVISA quais foram
// barrados); (2) com `allow_role_downgrade: true`, o rebaixamento vai;
// (3) quem sai do bloco "diretor" do plano tem a participação ativa dela no
// X-Game (xgame_participantes) desativada junto — "todas as funções dentro
// da diretoria na X-Game precisam atualizar também".
import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste-nao-e-a-de-producao';
delete process.env.SESSAO_MODO; // etapa 1: nunca recusa por falta de crachá

const SUPER = 'user-super-0001';
const ALVO = 'user-diretora-0002';

let banco;
let escritasParticipantes;
const fetchReal = globalThis.fetch;

function linhaDe(url) {
  const m = /id=eq\.([^&]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

beforeEach(() => {
  escritasParticipantes = [];
  banco = {
    app_users: {
      [SUPER]: { id: SUPER, role: 'super_admin', career_levels: ['usuario'], full_name: 'Luiz', email: 'luiz@x.com' },
      [ALVO]: { id: ALVO, role: 'admin', career_levels: ['usuario', 'diretoria_operacao'], primary_career_level: 'diretoria_operacao', full_name: 'Aline Mendes', email: 'aline@x.com' },
    },
    xgame_participantes: [
      { id: 'part-1', user_id: ALVO, cargo: 'executivo', ativo: true },
    ],
  };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    // 🩹 uma resposta HTTP de verdade é um retrato do instante da chamada —
    // devolver a MESMA referência do "banco" faria uma leitura anterior
    // enxergar uma mutação feita por um PATCH posterior (não é o que o
    // Supabase real faz). Clona antes de devolver.
    const json = (v) => { const copia = JSON.parse(JSON.stringify(v)); return { ok: true, status: 200, json: async () => copia, text: async () => JSON.stringify(copia) }; };
    const method = opts.method || 'GET';

    if (u.startsWith('https://exemplo.supabase.co/rest/v1/app_users')) {
      const id = linhaDe(u);
      if (method === 'GET') {
        const row = id ? banco.app_users[id] : null;
        return json(row ? [row] : []);
      }
      if (method === 'PATCH') {
        const patch = JSON.parse(opts.body);
        const row = banco.app_users[id];
        if (!row) return json([]);
        Object.assign(row, patch);
        return json([row]);
      }
    }
    if (u.startsWith('https://exemplo.supabase.co/rest/v1/xgame_participantes')) {
      if (method === 'PATCH') {
        const patch = JSON.parse(opts.body);
        const uid = /user_id=eq\.([^&]+)/.exec(u)?.[1];
        const soAtivos = /ativo=eq\.true/.test(u);
        const afetadas = banco.xgame_participantes.filter((p) => p.user_id === decodeURIComponent(uid || '') && (!soAtivos || p.ativo === true));
        afetadas.forEach((p) => Object.assign(p, patch));
        escritasParticipantes.push({ uid: decodeURIComponent(uid || ''), patch, afetadas: afetadas.length });
        return json(afetadas);
      }
    }
    if (u.startsWith('https://exemplo.supabase.co/rest/v1/system_logs')) {
      return json([]);
    }
    return json([]);
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function resposta() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {};
  r.status = (c) => { r.code = c; return r; };
  r.json = (v) => { r.corpo = v; return r; };
  return r;
}
async function chamar(body) {
  const m = await import(`../api/functions/adminUpdateUser.js?t=${Math.random()}`);
  const res = resposta();
  await m.default({ method: 'POST', body, headers: {} }, res);
  return res;
}

describe('adminUpdateUser — anti-rebaixamento não pode ser silencioso', () => {
  test('tirar admin + tirar diretoria juntos, SEM confirmar: os 3 campos ficam de pé, e a rota avisa quais', async () => {
    const r = await chamar({
      userId: ALVO,
      actorId: SUPER,
      updates: { role: 'user', career_levels: ['usuario'], primary_career_level: 'usuario', nickname: 'Ali' },
    });
    assert.equal(r.code, 200);
    assert.equal(r.corpo.success, true);
    assert.deepEqual(new Set(r.corpo.camposProtegidos), new Set(['role', 'career_levels', 'primary_career_level']), 'a rota precisa dizer o que foi barrado');
    // o resto do payload (nickname) devia ter ido — não é tudo-ou-nada
    assert.equal(r.corpo.user.nickname, 'Ali');
    assert.equal(banco.app_users[ALVO].role, 'admin', 'não pode ter rebaixado sem confirmar');
    assert.equal(banco.app_users[ALVO].primary_career_level, 'diretoria_operacao', 'não pode ter tirado o cargo sem confirmar');
    assert.equal(escritasParticipantes.length, 0, 'não desativa X-Game sem a mudança de cargo realmente ter acontecido');
  });

  test('com allow_role_downgrade=true: as duas coisas (admin e cargo) vão juntas, como a pessoa confirmou', async () => {
    const r = await chamar({
      userId: ALVO,
      actorId: SUPER,
      allow_role_downgrade: true,
      updates: { role: 'user', career_levels: ['usuario'], primary_career_level: 'usuario' },
    });
    assert.equal(r.code, 200);
    assert.equal(r.corpo.success, true);
    assert.deepEqual(r.corpo.camposProtegidos, []);
    assert.equal(banco.app_users[ALVO].role, 'user');
    assert.equal(banco.app_users[ALVO].primary_career_level, 'usuario');
  });
});

describe('adminUpdateUser — sair da diretoria desativa a participação no X-Game', () => {
  test('saiu do bloco diretor (career_levels sem cargo de diretoria) → xgame_participantes ativa vira inativa', async () => {
    const r = await chamar({
      userId: ALVO,
      actorId: SUPER,
      allow_role_downgrade: true, // ela também é admin — sem isto o cargo nem mudaria
      updates: { role: 'user', career_levels: ['usuario'], primary_career_level: 'usuario' },
    });
    assert.equal(r.corpo.success, true);
    assert.equal(r.corpo.participantesDesativados, 1);
    assert.equal(banco.xgame_participantes[0].ativo, false, 'a participação ficou ativa, órfã do cargo que a justificava');
    assert.equal(escritasParticipantes.length, 1);
  });

  test('continuar na diretoria (trocar de cargo institucional pra outro) NÃO mexe no X-Game', async () => {
    const r = await chamar({
      userId: ALVO,
      actorId: SUPER,
      updates: { career_levels: ['usuario', 'ceo'], primary_career_level: 'ceo' }, // ainda é 'diretor'
    });
    assert.equal(r.corpo.success, true);
    assert.equal(r.corpo.participantesDesativados, 0);
    assert.equal(banco.xgame_participantes[0].ativo, true);
  });

  test('quem nunca esteve na diretoria não gera nenhuma escrita em xgame_participantes', async () => {
    banco.app_users[ALVO].career_levels = ['usuario'];
    banco.app_users[ALVO].primary_career_level = 'usuario';
    banco.app_users[ALVO].role = 'user'; // já não é admin — sem trava pra atravessar
    const r = await chamar({
      userId: ALVO,
      actorId: SUPER,
      updates: { career_levels: ['usuario', 'vendedor'], primary_career_level: 'vendedor' },
    });
    assert.equal(r.corpo.success, true);
    assert.equal(r.corpo.participantesDesativados, 0);
    assert.equal(escritasParticipantes.length, 0);
  });
});

describe('adminUpdateUser — guarda de quem pode chamar (sem mexer nisto)', () => {
  test('actor que não é admin/super_admin é recusado', async () => {
    banco.app_users['user-comum'] = { id: 'user-comum', role: 'user', career_levels: ['usuario'] };
    const r = await chamar({ userId: ALVO, actorId: 'user-comum', updates: { nickname: 'x' } });
    assert.equal(r.code, 403);
  });
});
