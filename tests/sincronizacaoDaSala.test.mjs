// 🏟️ Como a sala fica sabendo (01/10/2026) — ver src/lib/sincronizacaoDaSala.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cadenciaDaSincronizacao, LIMBO_MAXIMO_MS, fundirLinhaDoLeilao, segundosDesdeOFim } from '../src/lib/sincronizacaoDaSala.js';

test('⏱️ cadência: 15 s rolando, 3 s no limbo (relógio zerado e status active), nada fora de active', () => {
  assert.equal(cadenciaDaSincronizacao({ status: 'active', timeRemaining: 90 }), 15000);
  assert.equal(cadenciaDaSincronizacao({ status: 'active', timeRemaining: 0 }), 3000);
  assert.equal(cadenciaDaSincronizacao({ status: 'ended', timeRemaining: 0 }), null);
  assert.equal(cadenciaDaSincronizacao({ status: 'active', timeRemaining: null }), 15000, 'ainda sem relógio: cadência normal');
  assert.equal(LIMBO_MAXIMO_MS, 120000);
});

test('🧩 fundir a linha: aplica o que mudou, devolve o mesmo objeto quando nada mudou, ignora outro leilão', () => {
  const atual = { id: 'a1', status: 'active', current_price: 100, winner_name: null, starting_price: 50 };
  const igual = fundirLinhaDoLeilao(atual, { id: 'a1', status: 'active', current_price: 100 });
  assert.equal(igual, atual, 'sem mudança, sem re-render');
  const vendido = fundirLinhaDoLeilao(atual, { id: 'a1', status: 'ended', winner_name: 'Ana', winner_id: 'u1' });
  assert.notEqual(vendido, atual);
  assert.equal(vendido.status, 'ended'); assert.equal(vendido.winner_name, 'Ana'); assert.equal(vendido.current_price, 100, 'o resto fica');
  assert.equal(fundirLinhaDoLeilao(atual, { id: 'OUTRO', status: 'ended' }), atual, 'linha de outro leilão não entra');
  assert.equal(fundirLinhaDoLeilao(null, { id: 'a1' }), null);
  assert.equal(fundirLinhaDoLeilao(atual, null), atual);
});

test('🛡️ fundir sanea os numéricos nulos (o crash do .toFixed)', () => {
  const r = fundirLinhaDoLeilao({ id: 'a1', status: 'active', starting_price: 50, current_price: 60, increment: 5, buy_now_price: 0 }, { id: 'a1', current_price: null, increment: null, buy_now_price: null, status: 'active' });
  assert.equal(r.current_price, 50); assert.equal(r.increment, 0); assert.equal(r.buy_now_price, 0);
});

test('🕒 segundos desde o fim', () => {
  const fim = '2026-10-01T15:00:00.000Z';
  assert.equal(segundosDesdeOFim(fim, Date.parse('2026-10-01T15:00:10.000Z')), 10);
  assert.equal(segundosDesdeOFim(fim, Date.parse('2026-10-01T14:59:55.000Z')), -5);
  assert.equal(segundosDesdeOFim(null, Date.now()), null);
  assert.equal(segundosDesdeOFim('lixo', Date.now()), null);
});

test('🏟️ a sala assina a linha do leilão em tempo real, força a consulta no fim e tem o limbo', () => {
  const H = readFileSync(new URL('../src/hooks/useAuctionSync.js', import.meta.url), 'utf8');
  assert.match(H, /Auction\.subscribe\(\(evento\) => \{[\s\S]*?\}, \{ event: 'UPDATE', filter: filtroPorId\(auctionId\) \}\)/, 'assina só a linha do leilão');
  assert.match(H, /fundirLinhaDoLeilao\(prev, linha\)/);
  assert.match(H, /if \(forcar !== true && now - lastAuctionSyncTimeRef\.current < 10000\) return;/, 'a trava de 10 s cede ao forçar');
  assert.match(H, /const noLimbo = auction\?\.status === 'active' && timeRemaining === 0;/);
  assert.match(H, /visibilitychange/, 'consulta ao voltar para a aba');
  assert.match(H, /\{ event: 'INSERT', filter: `auction_id=eq\.\$\{auctionId\}` \}/, 'mensagens: só as deste leilão');
  const R = readFileSync(new URL('../src/pages/AuctionRoom.jsx', import.meta.url), 'utf8');
  assert.equal((R.match(/await syncAuctionDataOnly\(true\);/g) || []).length, 2, 'as duas consultas do fim são forçadas');
  assert.match(R, /onEndAuction: endAuction,\n\s*timeRemaining,\n\s*\}\);/, 'o hook recebe o relógio');
});

test('📜 a migração liga o tempo real nas duas tabelas, sem repetir', () => {
  const M = readFileSync(new URL('../supabase/migrations/20261001150000_realtime_sala_do_leilao.sql', import.meta.url), 'utf8');
  assert.match(M, /alter publication supabase_realtime add table public\.auctions;/);
  assert.match(M, /alter publication supabase_realtime add table public\.auction_messages;/);
  assert.match(M, /if not exists \(/, 'idempotente');
});
