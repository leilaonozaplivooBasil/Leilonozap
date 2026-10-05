// 🎯 Degraus fixos da folha de lance: 50, 100, 500, 1.000, 3.000 e Escolha (26/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { opcoesDeLance, DEGRAUS } from '../src/lib/opcoesDeLance.js';

const valores = (o) => o.map((x) => x.valor);

test('🎯 os degraus são fixos e iguais em todo leilão', () => {
  assert.deepEqual(DEGRAUS, [50, 100, 500, 1000, 3000]);
  // iPhone 17 hoje: R$ 27 atual, incremento R$ 50 (2º lance em diante)
  const o = opcoesDeLance({ currentPrice: 27, increment: 50 });
  assert.deepEqual(valores(o), [77, 127, 527, 1027, 3027]);
  assert.equal(o[0].minimo, true, 'o primeiro degrau coincide com o mínimo e é marcado');
  assert.match(o[0].rotulo, /lance mínimo/);
  assert.equal(o[1].rotulo, '+ R$ 100');
  assert.equal(o[4].rotulo, '+ R$ 3.000');
});

test('📏 degrau menor que o incremento do leilão não aparece (o servidor recusaria)', () => {
  // PS5: incremento R$ 100 → o +50 some
  assert.deepEqual(valores(opcoesDeLance({ currentPrice: 1697, increment: 100 })), [1797, 2197, 2697, 4697]);
  // incremento R$ 500
  assert.deepEqual(valores(opcoesDeLance({ currentPrice: 1000, increment: 500 })), [1500, 2000, 4000]);
});

test('🧮 mínimo que não é degrau entra na frente, marcado', () => {
  const o = opcoesDeLance({ currentPrice: 100, increment: 30 });
  assert.deepEqual(valores(o), [130, 150, 200, 600, 1100, 3100]);
  assert.equal(o[0].minimo, true);
  assert.equal(o[1].minimo, false);
  // incremento maior que todos os degraus: só o mínimo
  assert.deepEqual(valores(opcoesDeLance({ currentPrice: 10000, increment: 5000 })), [15000]);
});

test('1️⃣ primeiro lance: inicial + degraus como valor direto de abertura (27/09)', () => {
  // iPhone 17: "R$ 27,00 · 50 · 100 · 500 · 1.000 · 3.000 e outro valor"
  const o = opcoesDeLance({ currentPrice: 27, increment: 50, isFirstBid: true });
  assert.deepEqual(valores(o), [27, 50, 100, 500, 1000, 3000]);
  assert.deepEqual(o[0], { valor: 27, rotulo: 'lance inicial', minimo: true });
  assert.equal(o[1].minimo, false);
  assert.equal(o[1].rotulo, 'abrir direto neste valor');
  // degrau igual ou abaixo do inicial não aparece
  assert.deepEqual(valores(opcoesDeLance({ currentPrice: 100, increment: 50, isFirstBid: true })), [100, 500, 1000, 3000]);
  // inicial acima de todos os degraus: só o inicial
  assert.deepEqual(valores(opcoesDeLance({ currentPrice: 5000, increment: 100, isFirstBid: true })), [5000]);
});

test('🔓 servidor e tela aceitam primeiro lance ≥ inicial (não mais "exatamente")', () => {
  const S = readFileSync(new URL('../api/functions/submitAtomicBid.js', import.meta.url), 'utf8');
  assert.match(S, /isFirstBid && money\(bidAmount\) < money\(minBid\)/);
  assert.doesNotMatch(S, /precisa ser exatamente/);
  const I = readFileSync(new URL('../src/components/auction/BidInput.jsx', import.meta.url), 'utf8');
  assert.match(I, /isFirstBid && !gteMoney\(finalAmount, minBid\)/);
  assert.doesNotMatch(I, /precisa ser exatamente/);
  const P = readFileSync(new URL('../src/components/auction/BidPopover.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(P, /\{!isFirstBid && \(/, 'o campo "Escolha o valor" aparece também no primeiro lance');
});

test('🪟 a folha usa os degraus e recebe o preço atual', () => {
  const P = readFileSync(new URL('../src/components/auction/BidPopover.jsx', import.meta.url), 'utf8');
  assert.match(P, /import \{ opcoesDeLance \} from "@\/lib\/opcoesDeLance";/);
  assert.doesNotMatch(P, /\[0, 1, 2, 3\]\.map/);
  assert.match(P, /placeholder=\{`Escolha o valor \(mín\. R\$ \$\{fmtBR\(minBid\)\}\)`\}/);
  const I = readFileSync(new URL('../src/components/auction/BidInput.jsx', import.meta.url), 'utf8');
  assert.match(I, /currentPrice=\{money\(currentPrice\)\}/);
});
