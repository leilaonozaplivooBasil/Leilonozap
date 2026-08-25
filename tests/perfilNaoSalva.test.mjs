// "Erro ao atualizar perfil: Cannot coerce the result to a single JSON object"
//
// Print da cliente, 25/08/2026, salvando o endereço no Perfil. Essa frase é do
// PostgREST quando `.single()` recebe ZERO linhas — o UPDATE não pegou nada.
//
// Causa, escrita no topo do proprio adminUpdateUser.js desde que ele nasceu:
// o app usa so a anon key, e UPDATE direto em app_users e no-op silencioso.
// O adapter so usava rota de servidor para admin/estoque (_operatorActor), entao
// cliente comum nao salvava endereco, telefone, apelido nem CEP. Foi isso que
// prendeu os clientes novos no leilao.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const rota = ler('../api/functions/atualizarMeuCadastro.js');
const adapter = ler('../src/api/plataformaAdapter.js');
const admin = ler('../api/functions/adminUpdateUser.js');

test('a causa continua valendo: escrita direta em app_users e no-op', () => {
  // Se um dia isto mudar (RLS liberada), a rota nova vira redundante — e este
  // teste avisa que da pra revisitar.
  assert.match(admin, /no-op silencioso/);
});

test('cliente comum passa a salvar pelo servidor', () => {
  assert.match(adapter, /if \(!op && table === 'app_users' && action === 'update'\)/);
  assert.match(adapter, /\/api\/functions\/atualizarMeuCadastro/);
});

test('so o proprio cadastro — nunca o de outra pessoa', () => {
  assert.match(adapter, /if \(!eu\?\.id \|\| String\(eu\.id\) !== String\(id\)\) return \{ _skip: true \}/);
});

test('a identidade sai do cracha, nunca do corpo', () => {
  assert.match(rota, /const ses = exigirSessao\(req, null, 'atualizarMeuCadastro'\)/);
  assert.match(rota, /const eu = String\(ses\.userId\)/);
  assert.match(rota, /if \(pedido && pedido !== eu\)/);
  assert.match(rota, /app_users\?id=eq\.\$\{encodeURIComponent\(eu\)\}/);
});

test('sem cracha valido nao grava, mesmo em modo observacao', () => {
  assert.match(rota, /if \(!ses\.liberado \|\| ses\.motivo !== 'ok' \|\| !ses\.userId\)/);
});

test('zero linhas deixa de passar calado', () => {
  // Era exatamente esse silencio que fazia a tela achar que tinha salvado.
  assert.match(rota, /if \(!Array\.isArray\(linhas\) \|\| !linhas\.length\)/);
  assert.match(rota, /Prefer: 'return=representation'/);
});

// ── A lista fechada: o que decide dinheiro, acesso ou hierarquia fica fora ────
const permitidos = (rota.match(/const MEUS_CAMPOS = \[([\s\S]*?)\];/)?.[1] || '')
  .split(',').map((t) => t.trim().replace(/^'|'$/g, '')).filter(Boolean);

test('a pessoa pode mudar o que a tela de Perfil edita', () => {
  for (const campo of ['nickname', 'phone', 'address_street', 'address_number', 'address_city', 'address_state', 'address_zip_code']) {
    assert.ok(permitidos.includes(campo), `faltou ${campo} — a tela de Perfil edita esse campo`);
  }
});

test('a pessoa NAO pode mexer em dinheiro, acesso nem hierarquia', () => {
  const proibidos = [
    'role', 'career_levels', 'primary_career_level', 'commission_balance',
    'active', 'referred_by_id', 'referral_code', 'email', 'full_name',
    'password', 'password_hash', 'is_seller', 'store_slug',
    'executive_owner_id', 'executive_owner_pinned',
  ];
  for (const campo of proibidos) {
    assert.ok(!permitidos.includes(campo), `${campo} entrou na lista — a pessoa passaria a mudar isso sozinha`);
  }
});

// Réplica da peneira, para provar o efeito e nao so o texto.
function peneirar(entrada) {
  const fora = [];
  const dentro = {};
  for (const [campo, valor] of Object.entries(entrada)) {
    if (permitidos.includes(campo)) dentro[campo] = valor;
    else fora.push(campo);
  }
  return { dentro, fora };
}

test('o efeito: endereco passa, cargo nao', () => {
  const r = peneirar({ address_zip_code: '22790669', address_city: 'Rio de Janeiro', role: 'super_admin' });
  assert.deepEqual(Object.keys(r.dentro).sort(), ['address_city', 'address_zip_code']);
  assert.deepEqual(r.fora, ['role']);
});

test('o efeito: tentativa de se dar saldo e descartada', () => {
  const r = peneirar({ phone: '21999999999', commission_balance: 999999 });
  assert.deepEqual(Object.keys(r.dentro), ['phone']);
  assert.deepEqual(r.fora, ['commission_balance']);
});

test('o efeito: pedido so com campo proibido nao vira gravacao', () => {
  const r = peneirar({ career_levels: ['super_admin'] });
  assert.equal(Object.keys(r.dentro).length, 0);
  assert.match(rota, /nada_para_salvar/);
});
