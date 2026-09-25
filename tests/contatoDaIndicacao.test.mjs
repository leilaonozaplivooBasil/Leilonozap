// 🌳 O INDICADO VIRA CONTATO DE QUEM INDICOU (25/09/2026).
//
// Dono: "só vai para quem indicou mesmo, pelo menos por hora. Ex: João Paim
// indica alguém, esse alguém se cadastra, e automaticamente vira contato do
// João." Régua: só o indicador direto; conta do site não; nunca sobrepõe quem
// já está na lista; best-effort (nunca derruba o cadastro).
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
const { jaTemNaLista, contatoDoIndicado, criarContatoDaIndicacao, ORIGEM_CADASTRO_INDICADO } = await import('../api/_lib/contatoDaIndicacao.js');
const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

const JOAO = { id: 'joao', email: 'joao@x.com', referral_code: 'JOAOPAIM' };
const NOVO = { id: 'n1', full_name: 'Maria Souza', email: 'Maria@X.com', phone: '(21) 99999-0001', referred_by_id: 'joao' };

describe('a régua pura', () => {
  test('não sobrepõe: e-mail, telefone (10+ dígitos) ou nome igual já na lista do indicador', () => {
    const lista = [{ id: 'c1', full_name: 'Ângela', email: 'maria@x.com', phone: null }];
    assert.equal(jaTemNaLista(lista, NOVO), true, 'mesmo e-mail');
    assert.equal(jaTemNaLista([{ phone: '21999990001' }], NOVO), true, 'mesmo telefone');
    assert.equal(jaTemNaLista([{ full_name: '  maria   souza ' }], NOVO), true, 'mesmo nome');
    assert.equal(jaTemNaLista([{ full_name: 'Outra', email: 'outra@x.com', phone: '21988887777' }], NOVO), false);
    assert.equal(jaTemNaLista([{ phone: '999' }], { ...NOVO, phone: '999' }), false, 'telefone curto não conta como igual');
    assert.equal(jaTemNaLista(null, NOVO), false);
  });
  test('o contato nasce lead, source indicacao, na lista do indicador, com o carimbo que permite desfazer', () => {
    const c = contatoDoIndicado(NOVO, JOAO, new Date('2026-09-25T15:00:00Z'));
    assert.deepEqual(c, {
      full_name: 'Maria Souza', email: 'maria@x.com', phone: '(21) 99999-0001',
      status: 'lead', source: 'indicacao', created_by_id: 'joao', created_by: 'joao@x.com',
      notes: 'Cadastrou-se no site pelo seu link de indicação em 25/09/2026.',
      raw_base44: { origem: ORIGEM_CADASTRO_INDICADO, user_id: 'n1', em: '2026-09-25T15:00:00.000Z' },
    });
    assert.equal(contatoDoIndicado({ full_name: '  ' }, JOAO), null);
    assert.equal(contatoDoIndicado(NOVO, null), null);
  });
});

describe('criarContatoDaIndicacao — com o banco de mentira', () => {
  function duble({ indicador = JOAO, lista = [] } = {}) {
    const escritas = [];
    const f = async (path, opts = {}) => {
      const json = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
      if (path.startsWith('app_users?')) return json(indicador ? [indicador] : []);
      if (path.startsWith('customers?')) return json(lista);
      if (path === 'customers' && opts.method === 'POST') { escritas.push(JSON.parse(opts.body)); return { ok: true, status: 201, text: async () => '' }; }
      return json([]);
    };
    return { f, escritas };
  }
  afterEach(() => {});

  test('🌳 indicado com indicador de verdade e lista sem ele → cria UM contato na lista do indicador', async () => {
    const { f, escritas } = duble();
    const r = await criarContatoDaIndicacao(NOVO, { fetchImpl: f });
    assert.deepEqual(r, { criou: true, motivo: 'ok' });
    assert.equal(escritas.length, 1); assert.equal(escritas[0].created_by_id, 'joao'); assert.equal(escritas[0].source, 'indicacao');
  });
  test('🔒 já está na lista → não cria e não toca no que existe', async () => {
    const { f, escritas } = duble({ lista: [{ id: 'c1', full_name: 'Maria Souza' }] });
    assert.deepEqual(await criarContatoDaIndicacao(NOVO, { fetchImpl: f }), { criou: false, motivo: 'ja_tinha' });
    assert.equal(escritas.length, 0);
  });
  test('🔒 a conta técnica do site (fallback de quem chega sem link) NÃO ganha contato', async () => {
    const { f, escritas } = duble({ indicador: { id: 'site', email: 'site@x.com', referral_code: 'leilaonozap' } });
    assert.deepEqual(await criarContatoDaIndicacao({ ...NOVO, referred_by_id: 'site' }, { fetchImpl: f }), { criou: false, motivo: 'conta_do_site' });
    assert.equal(escritas.length, 0);
  });
  test('sem indicador, ou indicador inexistente → nada', async () => {
    const { f } = duble({ indicador: null });
    assert.deepEqual(await criarContatoDaIndicacao({ ...NOVO, referred_by_id: null }, { fetchImpl: f }), { criou: false, motivo: 'sem_indicador' });
    assert.deepEqual(await criarContatoDaIndicacao(NOVO, { fetchImpl: f }), { criou: false, motivo: 'indicador_nao_encontrado' });
  });
  test('🔴 nunca lança: fetch quebrado vira {criou:false}', async () => {
    const r = await criarContatoDaIndicacao(NOVO, { fetchImpl: async () => { throw new Error('rede'); } });
    assert.deepEqual(r, { criou: false, motivo: 'excecao' });
  });
});

test('🔴 as três portas de cadastro chamam o gancho DEPOIS de criar a conta, sem esperar por ele', () => {
  for (const f of ['publicRegister', 'registerNetworkUser']) {
    const S = ler(`../api/functions/${f}.js`);
    assert.match(S, /import \{ criarContatoDaIndicacao \} from '\.\.\/_lib\/contatoDaIndicacao\.js'/);
    const iIns = S.indexOf("await sb('app_users', { method: 'POST'"); const iGancho = S.indexOf('criarContatoDaIndicacao(rows[0]).catch(() => {});');
    assert.ok(iIns > -1 && iGancho > iIns, `${f}: o gancho tem que vir depois do insert`);
    assert.match(S, /origem_trafego: sanearOrigem\(body\?\.origem_trafego\)/, `${f}: a origem do tráfego entra no cadastro`);
  }
  const G = ler('../api/functions/googleLogin.js');
  assert.match(G, /if \(user\?\.id\) criarContatoDaIndicacao\(user\)\.catch\(\(\) => \{\}\);/);
  assert.match(G, /origem_trafego: sanearOrigem\(body\?\.origem_trafego\)/);
});
