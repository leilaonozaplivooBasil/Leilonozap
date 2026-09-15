// 🌙 AUDITORIA NOTURNA (15→16/09/2026) — lote 4: servidor (dinheiro e estoque).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('S1: fulfillStoreOrder baixa o estoque pelos itens de raw_base44.items quando não há items_json', () => {
  const s = ler('../api/_lib/storeFulfill.js');
  assert.match(s, /const rb = sale\.raw_base44 && typeof sale\.raw_base44 === 'object' \? sale\.raw_base44\.items : null;/);
  assert.match(s, /product_id: it\.product_id \|\| it\.id, qty: Math\.max\(1, Number\(it\.qty\) \|\| 1\), unit: round2\(Number\(it\.price\) \|\| 0\)/);
});

test('S2: regerarPixPedido lê a coluna que existe (quantity), não stock', () => {
  const s = ler('../api/functions/regerarPixPedido.js');
  assert.ok(!/Number\(prod\.stock\)/.test(s));
  assert.match(s, /Number\(prod\.quantity\)/);
});

test('S3: o PATCH do lance só aplica em leilão ATIVO (não sobrescreve leilão já finalizado)', () => {
  const s = ler('../api/functions/submitAtomicBid.js');
  assert.match(s, /`auctions\?id=eq\.\$\{encodeURIComponent\(auctionId\)\}&status=eq\.active&\$\{versionFilter\}`/);
});

test('S4: pedido de saque que não grava devolve a reserva (saldo não fica preso em saldo_alocado)', () => {
  const s = ler('../api/functions/requestWithdrawal.js');
  assert.match(s, /const ins = await sb\('withdrawal_requests'/);
  assert.match(s, /if \(!ins\.ok\) \{/);
  assert.match(s, /rpc\/credit_commission', \{ method: 'POST', body: JSON\.stringify\(\{ _user: userId, _amount: valor \}\) \}\)/);
  assert.match(s, /saldo_alocado: round2\(Math\.max\(0, aloc - valor\)\)/);
});

test('S5: comissão do PDV credita por RPC atômica, não lê-modifica-grava', () => {
  const s = ler('../api/_lib/commissions.js');
  assert.ok(!/commission_balance: round2\(\(Number\(earner\.commission_balance\) \|\| 0\) \+ amount\)/.test(s));
  assert.match(s, /rpc\/credit_commission', \{ method: 'POST', body: JSON\.stringify\(\{ _user: earner\.id, _amount: amount \}\) \}\)/);
});

test('S6: PIX e cartão só geram cobrança no Mercado Pago depois que a venda EXISTE no banco', () => {
  for (const f of ['../api/functions/createMPPix.js', '../api/functions/createMPCatalogCardCheckout.js']) {
    const s = ler(f);
    assert.match(s, /const insVenda = await sb\('catalog_sales', \{ method: 'POST'/, f);
    assert.match(s, /if \(!insVenda\.ok\) \{/, f);
    assert.match(s, /Nada foi cobrado — tente de novo em instantes\./, f);
    const iIns = s.indexOf('const insVenda = await sb(');
    const iMP = s.indexOf('api.mercadopago.com');
    assert.ok(iIns > 0 && iMP > iIns, `${f}: a venda precisa ser gravada ANTES da chamada ao Mercado Pago`);
  }
});
