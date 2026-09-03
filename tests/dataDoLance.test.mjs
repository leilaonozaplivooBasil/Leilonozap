// "No histórico dos lances, tem lance feito 'há 57 anos'."
//
// 03/09/2026. 57 anos antes de 2026 é 1969 — a ÉPOCA DO UNIX. Um lance no leilão
// "Copo Dosador Ingredientes Kit 2 Und 570ml" tinha `created_date` E `timestamp`
// nulos; só o `created_at` do banco guardou a data real (04/08 03:00 BRT).
//
// A tela fazia, sem guarda nenhuma:
//     formatDistanceToNowStrict(new Date(m.created_date))   → "57 anos"
//     new Date(message.created_date).toLocaleTimeString()   → "21:00"
// A Época em Brasília é 31/12/1969 21:00 — daí os dois sintomas.
//
// E havia um SEGUNDO estrago, invisível: a sala pede ORDER BY created_date DESC,
// e no Postgres DESC põe NULL PRIMEIRO. O lance mais ANTIGO (R$ 1,60) aparecia
// como o mais recente, na frente do R$ 9,60 — exatamente o print do dono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  instanteDoLance, dataDoLance, horaDoLance, maisRecentesPrimeiro,
} from '../src/lib/dataDoLance.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// Os quatro lances reais daquele leilão, com os valores exatos do banco.
const CULPADO = { bid_amount: 1.6, created_date: null, timestamp: null, created_at: '2026-08-04T06:00:23.339Z' };
const L360    = { bid_amount: 3.6, created_date: '2026-08-04T06:31:20.921Z', timestamp: '2026-08-04T06:31:20.921Z', created_at: '2026-08-04T06:31:20.999Z' };
const L560    = { bid_amount: 5.6, created_date: '2026-08-04T13:50:52.101Z', timestamp: '2026-08-04T13:50:52.101Z', created_at: '2026-08-04T13:50:52.192Z' };
const L960    = { bid_amount: 9.6, created_date: '2026-08-04T13:51:40.848Z', timestamp: '2026-08-04T13:51:40.848Z', created_at: '2026-08-04T13:51:41.187Z' };

// ─────────────── o "há 57 anos" e o "21:00" ───────────────

test('lance sem created_date usa a data que o banco guardou, não 1970', () => {
  // `created_at` é a única das três colunas que o banco preenche sozinho.
  assert.equal(horaDoLance(CULPADO), '03:00');
  assert.equal(dataDoLance(CULPADO).toISOString(), '2026-08-04T06:00:23.339Z');
});

test('NUNCA sai a Época do Unix', () => {
  // O ano 1969/1970 na tela é o sintoma. Qualquer entrada, nenhum 1970.
  const semNada = [
    { created_date: null, timestamp: null, created_at: null },
    { created_date: 0, timestamp: 0, created_at: 0 },
    { created_date: '', timestamp: '', created_at: '' },
    { created_date: undefined },
    {},
  ];
  for (const m of semNada) {
    assert.equal(instanteDoLance(m), null, `${JSON.stringify(m)} produziu um instante`);
    assert.equal(dataDoLance(m), null);
    assert.equal(horaDoLance(m), '', 'saiu uma hora falsa');
  }
  // e o "21:00" da bolha, que era a Época em Brasília, não pode voltar
  assert.notEqual(horaDoLance({ created_date: 0 }), '21:00');
});

test('a ordem das três colunas: created_date → timestamp → created_at', () => {
  const base = { created_at: '2026-08-04T06:00:00Z' };
  assert.equal(horaDoLance({ ...base, created_date: '2026-08-04T15:00:00Z' }), '12:00');
  assert.equal(horaDoLance({ ...base, created_date: null, timestamp: '2026-08-04T18:00:00Z' }), '15:00');
  assert.equal(horaDoLance({ ...base, created_date: null, timestamp: null }), '03:00');
});

test('a coluna preferida sendo lixo cai para a próxima, não desiste', () => {
  // 371 dos 627 lances têm `timestamp` nulo: o fallback é o que segura a base.
  const m = { created_date: 'amanhã', timestamp: null, created_at: '2026-08-04T13:51:40.848Z' };
  assert.equal(horaDoLance(m), '10:51');
});

test('a hora sai no fuso da casa, não no do aparelho', () => {
  // Dois participantes da mesma sala não podem ver horas diferentes do mesmo lance.
  const original = process.env.TZ;
  try {
    for (const tz of ['UTC', 'Asia/Tokyo', 'America/New_York', 'America/Sao_Paulo']) {
      process.env.TZ = tz;
      assert.equal(horaDoLance(L960), '10:51', `mudou no fuso ${tz}`);
    }
  } finally {
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  }
});

test('lixo não derruba a sala', () => {
  for (const m of [null, undefined, 'texto', 42, [], { created_date: {} }, { created_date: Symbol.iterator }]) {
    assert.doesNotThrow(() => instanteDoLance(m), `explodiu em ${String(m)}`);
    assert.doesNotThrow(() => horaDoLance(m));
    assert.equal(horaDoLance(m), '');
  }
});

test('piso de sanidade: 1 milissegundo não é data de lance', () => {
  // `new Date(true)` dá 1ms e passaria por "maior que zero".
  assert.equal(instanteDoLance({ created_date: true }), null);
  assert.equal(instanteDoLance({ created_date: 1 }), null);
  assert.equal(instanteDoLance({ created_date: '1999-12-31T23:59:59Z' }), null);
  assert.ok(instanteDoLance({ created_date: '2000-01-01T00:00:00Z' }) !== null);
});

// ─────────────── o nulo não fura mais a fila ───────────────

test('"Últimos lances" mostra os ÚLTIMOS, com o nulo no fim', () => {
  // Era este o print: R$ 1,60 (o mais ANTIGO) no topo, porque DESC põe NULL antes.
  const semDataNenhuma = { bid_amount: 0.5, created_date: null, timestamp: null, created_at: null };
  // ordem de entrada bagunçada de propósito, com o sem-data na frente
  const entrada = [semDataNenhuma, CULPADO, L960, L360, L560];
  const saida = maisRecentesPrimeiro(entrada).map((m) => m.bid_amount);
  assert.deepEqual(saida, [9.6, 5.6, 3.6, 1.6, 0.5]);
  assert.equal(saida[0], 9.6, 'o mais recente não ficou em primeiro');
  assert.equal(saida[saida.length - 1], 0.5, 'lance sem data nenhuma devia ir para o FIM');
});

test('ordenar não estraga a lista original nem explode com lixo', () => {
  const original = [L360, L960];
  const copia = maisRecentesPrimeiro(original);
  assert.deepEqual(original, [L360, L960], 'a lista de entrada foi reordenada no lugar');
  assert.notEqual(copia, original);
  assert.deepEqual(maisRecentesPrimeiro(null), []);
  assert.deepEqual(maisRecentesPrimeiro(undefined), []);
  assert.doesNotThrow(() => maisRecentesPrimeiro([null, undefined, {}, 'x']));
});

// ─────────────── as telas usam a régua, e o banco não põe nulo na frente ───────────────

test('nenhuma tela lê created_date cru para mostrar tempo', () => {
  for (const arq of [
    '../src/components/auction/FeedUltimosLances.jsx',
    '../src/components/chat/PlacaLance.jsx',
    '../src/components/chat/AIMessage.jsx',
  ]) {
    const tela = ler(arq);
    assert.match(tela, /from ['"]@\/lib\/dataDoLance['"]/, `${arq} não importa a régua`);
    assert.ok(!/new Date\(m\.created_date\)/.test(tela), `${arq}: voltou o new Date(created_date) cru`);
    assert.ok(!/new Date\(message\.created_date\)/.test(tela), `${arq}: idem`);
    assert.ok(!/new Date\(timestamp \|\| message\.created_date\)/.test(tela), `${arq}: idem`);
  }
});

test('a lista ordena por conta própria, sem confiar na ordem do banco', () => {
  const feed = ler('../src/components/auction/FeedUltimosLances.jsx');
  assert.match(feed, /maisRecentesPrimeiro\(/, '"Últimos lances" voltou a confiar na ordem que chegou');
});

test('nenhuma consulta do app põe NULL na frente', () => {
  // No Postgres, `ORDER BY x DESC` põe NULL PRIMEIRO. Era isso que punha um
  // lance sem data no topo de "Últimos lances". Consertado no adapter, de uma
  // vez, para toda entidade e toda consulta.
  const adapter = ler('../src/api/plataformaAdapter.js');
  // bate na CHAMADA, não na prosa: o comentário acima dela também diz
  // "nullsFirst: false", e um regex solto passaria mesmo com o código removido.
  assert.match(adapter, /\.order\([^)]*ascending:\s*o\.ascending,\s*nullsFirst:\s*false[^)]*\)/,
    'o adapter voltou a deixar NULL na frente');
});
