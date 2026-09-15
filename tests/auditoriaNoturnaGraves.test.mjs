// 🌙 AUDITORIA NOTURNA (15→16/09/2026) — achados GRAVES corrigidos.
//
// O dono, antes de dormir: "preciso que você fique rodando uma auditoria em
// todo site pra achar erros de todas as formas... descrição faltando, exemplo
// como esses do telefone, erros bobos e graves também... trabalho sério."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// ─── G1: pedido pago no CARTÃO não gravava a lista de itens ───────────────────
// createMPPix.js grava raw_base44.items; createMPCatalogCardCheckout.js não
// gravava. CatalogOrdersAdmin lê raw_base44.items pra listar o que embalar:
// pedido de vários produtos no cartão chegava só com o produto principal.
// Medido no banco: 5 vendas pagas sem itens.
test('G1: o checkout no cartão grava os itens em raw_base44 no MESMO formato do PIX', () => {
  const cartao = ler('../api/functions/createMPCatalogCardCheckout.js');
  const pix = ler('../api/functions/createMPPix.js');
  const forma = /items: lines\.map\(\(l\) => \(\{ id: l\.p\.id, title: l\.p\.description, qty: l\.q, price: unitPrice\(l\.p\) \}\)\)/;
  assert.match(pix, forma, 'o PIX é a referência do formato');
  assert.match(cartao, forma, 'o cartão precisa gravar os itens igual ao PIX');
  // e dentro do raw_base44 da venda, não em outro lugar
  const i = cartao.indexOf('raw_base44: { items: lines.map(');
  assert.ok(i > 0, 'items precisa ser a primeira chave do raw_base44 da venda no cartão');
});
