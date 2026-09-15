// 🧹 (15/09/2026) — depois do deploy da DIR-159, os logs ainda mostravam três
// telas batendo em tabelas herdadas vazias do Base44.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('cartão do leilão confere saldo pela função canônica, não pela digital_wallets vazia', () => {
  const s = ler('../src/components/auction/AuctionCard.jsx');
  assert.ok(!/DigitalWallet\.filter/.test(s));
  assert.match(s, /invoke\('getDigitalWalletBalance', \{ user_id: user\.id \}\)/);
});

test('rastreador de visualizações não toca mais na auction_views (0 linhas, 400 em toda sala)', () => {
  const s = ler('../src/components/recommendations/ViewTracker.jsx');
  assert.ok(!/AuctionView\./.test(s));
  assert.match(s, /export default function ViewTracker\(\) \{\s*\n\s*return null;/);
});

test('métricas ao vivo usam a presença real (live_sessions) e o Arquiteto ordena por created_at', () => {
  const m = ler('../src/components/admin/LiveMetrics.jsx');
  assert.ok(!/AuctionView\.filter/.test(m));
  assert.match(m, /LiveSession\.list\('-last_heartbeat', 300\)/);
  assert.match(ler('../src/pages/ArquitetoIA.jsx'), /SystemLog\.filter\(\{ status: 'error' \}, '-created_at', 100\)/);
});
