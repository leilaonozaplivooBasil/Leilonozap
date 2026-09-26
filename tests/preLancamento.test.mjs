// 🚀 Pré-lançamento (26/09/2026): "Abre hoje às 19h" — sem preço, sem relógio, e não abre sozinho.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ehPreLancamento, textoDeAbertura } from '../src/lib/preLancamento.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const brt = (s) => new Date(`${s}-03:00`).getTime();

test('🔎 é pré-lançamento: scheduled + marca, ou scheduled sem lance inicial', () => {
  assert.equal(ehPreLancamento({ status: 'scheduled', raw_base44: { pre_lancamento: true }, starting_price: null }), true);
  assert.equal(ehPreLancamento({ status: 'scheduled', starting_price: null }), true);
  assert.equal(ehPreLancamento({ status: 'scheduled', starting_price: 497 }), false, 'agendado comum, com preço, não é');
  assert.equal(ehPreLancamento({ status: 'active', raw_base44: { pre_lancamento: true } }), false, 'depois de aberto, deixa de ser');
  assert.equal(ehPreLancamento(null), false);
});

test('🕖 o texto de abertura, no fuso da casa', () => {
  const agora = brt('2026-09-26T14:30:00');
  assert.equal(textoDeAbertura({ end_time: '2026-09-26T22:00:00Z' }, agora), 'Abre hoje às 19h');
  assert.equal(textoDeAbertura({ end_time: '2026-09-27T22:30:00Z' }, agora), 'Abre amanhã às 19:30');
  assert.equal(textoDeAbertura({ end_time: '2026-09-30T13:00:00Z' }, agora), 'Abre 30/09 às 10h');
  assert.equal(textoDeAbertura({ end_time: null }, agora), 'Em breve');
});

test('🃏 card: rótulo "Pré-lançamento", abertura no lugar do preço, sem contagem', () => {
  const C = ler('../src/components/auction/AuctionCard.jsx');
  assert.match(C, /const preLancamento = ehPreLancamento\(auction\);/);
  assert.match(C, /\(preLancamento \? 'Pré-lançamento' : 'Em breve'\)/);
  assert.match(C, /auction\.status === 'scheduled' && !preLancamento && timeRemaining && \(/);
  assert.match(C, /data-teste="abertura-pre-lancamento"[^\n]*\n\s*\{textoDeAbertura\(auction\)\}/);
});

test('🏟️ sala: "Pré-lançamento" em vez de "Encerrado", abertura em vez de "Lance atual", sem "Termina"', () => {
  const R = ler('../src/pages/AuctionRoom.jsx');
  assert.match(R, /if \(ehPreLancamento\(auction\)\) return "Pré-lançamento";\n\s*if \(auction\.status !== "active"\) return "Encerrado";/);
  assert.match(R, /const fimEmTexto = preLancamento \? '' : textoDeTermino\(auction\?\.end_time\);/);
  assert.match(R, /data-teste="abertura-pre-lancamento-sala"/);
  assert.match(R, /preLancamento=\{preLancamento\}\n\s*abertura=\{abertura\}/);
  const H = ler('../src/components/auction/HeaderPrecoTempo.jsx');
  assert.match(H, /const fimEmTexto = preLancamento \? '' : textoDeTermino\(endTime\);/);
  assert.match(H, /\{preLancamento \? 'Pré-lançamento' : 'Lance atual'\}/);
});

test('⏸️ o cron de agendados NÃO abre um pré-lançamento sem lance inicial', () => {
  const A = ler('../api/functions/activateScheduledAuctions.js');
  assert.match(A, /select=id,end_time,raw_base44,starting_price/);
  assert.match(A, /if \(a\?\.raw_base44\?\.pre_lancamento === true && !\(Number\(a\.starting_price\) > 0\)\) \{ pulados\+\+; continue; \}/);
});
