// 🔨 O arremate que o segundo motor de encerramento comia — 11/09/2026
//
// Retrato de produção no dia em que isto foi escrito:
//
//   status='ended' + order_status='paid' .... 12 leilões, o último em 26/08
//   status='sold'  + order_status=NULL ......  6 leilões, de 23/08 a 11/09
//
// Os 6 são vencedores reais com R$ 1.098,01 presos na carteira. O pg_cron do
// banco (`expire_auctions`) fechava o leilão como 'sold' antes do nosso cron, e
// o claim do finalizador filtrava `status=in.(active,processing)` — então ele
// nunca mais via o leilão, order_status ficava NULL, e a tela de pagamento
// respondia "já pago" sem cobrar nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  ESTADOS_APURAVEIS, FILTRO_CLAIM, consultasDeApuracao,
} from '../api/_lib/apuracaoDoLeilao.js';

// A base, como ela estava em 11/09 às 14h.
const PRODUCAO = [
  // os 57 abertos (amostra dos dois status que existem)
  { id: 'ativo-1', status: 'active', order_status: null, winner_id: 'u1', vencido: true },
  { id: 'ativo-2', status: 'active', order_status: null, winner_id: null, vencido: true },
  { id: 'processando', status: 'processing', order_status: null, winner_id: 'u9', vencido: true },
  { id: 'ativo-futuro', status: 'active', order_status: null, winner_id: 'u2', vencido: false },
  // os 6 roubados pelo pg_cron
  { id: 'mesa', status: 'sold', order_status: null, winner_id: 'gean', vencido: true },
  { id: 'caixa-som', status: 'sold', order_status: null, winner_id: 'rosenberg', vencido: true },
  { id: 'bike', status: 'sold', order_status: null, winner_id: 'karen', vencido: true },
  { id: 'spot', status: 'sold', order_status: null, winner_id: 'lucas', vencido: true },
  { id: 'viseira', status: 'sold', order_status: null, winner_id: 'lucio', vencido: true },
  { id: 'luminaria', status: 'sold', order_status: null, winner_id: 'albertina', vencido: true },
  // os 12 que deram certo antes de 26/08
  { id: 'pago-1', status: 'ended', order_status: 'paid', winner_id: 'u3', vencido: true },
  // leilão que venceu SEM NENHUM LANCE: termina assim e é o fim legítimo dele
  { id: 'sem-lance-1', status: 'ended', order_status: null, winner_id: null, vencido: true },
  { id: 'sem-lance-2', status: 'ended', order_status: null, winner_id: null, vencido: true },
  // já apurado por nós, esperando o cron de liquidação
  { id: 'esperando', status: 'sold', order_status: 'awaiting_payment', winner_id: 'u4', vencido: true },
];

// Roda uma consulta do PostgREST (no formato que consultasDeApuracao devolve)
// contra a base acima. Só entende o que estas consultas usam — se alguém
// acrescentar um operador novo, o teste quebra em vez de fingir que entendeu.
function rodar(consulta, linhas) {
  const filtros = consulta.split('?')[1].split('&')
    .map((p) => p.split('='))
    .filter(([k]) => !['select', 'order', 'limit'].includes(k));
  return linhas.filter((l) => filtros.every(([campo, expr]) => {
    if (campo === 'end_time') { assert.ok(expr.startsWith('lte.'), expr); return l.vencido; }
    if (expr.startsWith('in.(')) return expr.slice(4, -1).split(',').includes(l[campo]);
    if (expr === 'is.null') return l[campo] === null || l[campo] === undefined;
    if (expr === 'not.is.null') return l[campo] !== null && l[campo] !== undefined;
    throw new Error(`operador não previsto no teste: ${campo}=${expr}`);
  }));
}

const apurar = (linhas) =>
  [...new Set(consultasDeApuracao(new Date().toISOString(), 25).flatMap((q) => rodar(q, linhas).map((l) => l.id)))];

// ───────────────────────────────────────────────────────────────────────────
// ARR-1 — os seis voltam a ser vistos
// ───────────────────────────────────────────────────────────────────────────
test('ARR-1 os 6 arremates roubados entram na apuração', () => {
  const vistos = apurar(PRODUCAO);
  for (const id of ['mesa', 'caixa-som', 'bike', 'spot', 'viseira', 'luminaria']) {
    assert.ok(vistos.includes(id), `${id} continuaria preso`);
  }
});

test('ARR-1b a consulta ANTIGA não via nenhum deles — a prova de que o teste mede o defeito', () => {
  const antiga = 'auctions?select=*&status=in.(active,processing)&end_time=lte.X&order=end_time.asc&limit=25';
  const vistos = rodar(antiga, PRODUCAO).map((l) => l.id);
  for (const id of ['mesa', 'caixa-som', 'bike', 'spot', 'viseira', 'luminaria']) {
    assert.ok(!vistos.includes(id), `${id} não deveria ser visível pela consulta antiga`);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// ARR-2 — e nada além deles
// ───────────────────────────────────────────────────────────────────────────
test('ARR-2 leilão sem lance nenhum NÃO é reapurado (senão seria a cada minuto, pra sempre)', () => {
  const vistos = apurar(PRODUCAO);
  assert.ok(!vistos.includes('sem-lance-1'), 'ended sem vencedor é fim legítimo');
  assert.ok(!vistos.includes('sem-lance-2'), 'ended sem vencedor é fim legítimo');
});

test('ARR-2b quem já foi apurado por nós fica de fora', () => {
  const vistos = apurar(PRODUCAO);
  assert.ok(!vistos.includes('pago-1'), 'já pago');
  assert.ok(!vistos.includes('esperando'), 'já esperando pagamento — é do cron de liquidação');
});

test('ARR-2c leilão que ainda não venceu continua intocado', () => {
  assert.ok(!apurar(PRODUCAO).includes('ativo-futuro'));
});

test('ARR-2d o caminho normal não regrediu', () => {
  const vistos = apurar(PRODUCAO);
  for (const id of ['ativo-1', 'ativo-2', 'processando']) {
    assert.ok(vistos.includes(id), `${id} é o encerramento de sempre e tem que continuar`);
  }
});

test('ARR-2e nenhum leilão é apurado duas vezes', () => {
  const todos = consultasDeApuracao(new Date().toISOString(), 25).flatMap((q) => rodar(q, PRODUCAO).map((l) => l.id));
  assert.equal(todos.length, new Set(todos).size, `as duas consultas se sobrepõem: ${todos.join(', ')}`);
});

// ───────────────────────────────────────────────────────────────────────────
// ARR-3 — o claim continua rodando UMA VEZ SÓ
// ───────────────────────────────────────────────────────────────────────────
test('ARR-3 o claim exige order_status nulo — é a trava de execução única', () => {
  assert.match(FILTRO_CLAIM, /order_status=is\.null/,
    'sem isto o claim reescreveria o mesmo leilão a cada minuto, reanunciando vitória');
  for (const estado of ['active', 'processing', 'ended', 'sold']) {
    assert.ok(ESTADOS_APURAVEIS.includes(estado), `${estado} fora dos estados apuráveis`);
  }
});

test('ARR-3b depois de apurado, o mesmo leilão não é reclamado de novo', () => {
  const depois = PRODUCAO.map((l) => (l.id === 'mesa' ? { ...l, order_status: 'awaiting_payment' } : l));
  assert.ok(!apurar(depois).includes('mesa'), 'a segunda volta do cron pegaria o leilão outra vez');
});

// ───────────────────────────────────────────────────────────────────────────
// ARR-4 — os arquivos de produção usam isto de verdade
// ───────────────────────────────────────────────────────────────────────────
test('ARR-4 o core reclama pelo FILTRO_CLAIM, e não pela lista solta', () => {
  const core = semComentarios(readFileSync(new URL('../api/_lib/finalizeAuctionCore.js', import.meta.url), 'utf8'));
  assert.match(core, /auctions\?id=eq\.\$\{enc\(auctionId\)\}&\$\{FILTRO_CLAIM\}/);
  assert.ok(!/id=eq\.\$\{enc\(auctionId\)\}&status=in\.\(active,processing\)/.test(core),
    'voltou o claim que perdia o leilão pro pg_cron');
});

test('ARR-4b o cron consulta pelo módulo', () => {
  const cron = semComentarios(readFileSync(new URL('../api/functions/finalizeExpiredAuctions.js', import.meta.url), 'utf8'));
  assert.match(cron, /consultasDeApuracao\(nowISO, BATCH_LIMIT\)/);
  assert.ok(!/status=in\.\(active,processing\)&end_time/.test(cron), 'voltou a consulta única antiga');
  // consulta que falha não pode virar "nada a fazer": era assim que o defeito
  // ficava calado.
  assert.match(cron, /consulta de apuração falhou/);
});

// ───────────────────────────────────────────────────────────────────────────
// ARR-5 — a causa, no banco
// ───────────────────────────────────────────────────────────────────────────
test('ARR-5 a migração tira o leilão COM vencedor das mãos do pg_cron', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20260911210000_expire_auctions_nao_rouba_arremate.sql', import.meta.url), 'utf8');
  const corpo = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.match(corpo, /create or replace function public\.expire_auctions/i);
  assert.match(corpo, /winner_id is null/i, 'sem esta guarda a corrida continua');
  assert.ok(!/'sold'/.test(corpo), "o ramo 'sold' tinha que sair: é ele que roubava o arremate");
  assert.match(corpo, /security definer/i, 'a função é chamada pelo pg_cron — não pode perder o dono');
});
