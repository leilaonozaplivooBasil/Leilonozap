// 🏷️ Arremate já = preço da loja − 5%, e a sala diz isso — 23/09/2026
//
// A frase só pode sair quando o número bate: PS5 (arremate à mão) e Camiseta
// (sem preço de loja) não anunciam desconto que não existe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { ofertaDaLoja, fraseDaOferta, PCT_DESCONTO_LOJA } from '../src/lib/arremateAgora.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('loja 49,97 com arremate 47,47 é a oferta de 5%; 1 centavo de arredondamento não derruba', () => {
  assert.deepEqual(ofertaDaLoja({ buy_now_price: 47.47, starting_price: 19.92 }, 49.97), { arremate: 47.47, loja: 49.97, pct: 5 });
  assert.deepEqual(ofertaDaLoja({ buy_now_price: '47.48', starting_price: 19.92 }, '49.97'), { arremate: 47.48, loja: 49.97, pct: 5 });
  assert.equal(PCT_DESCONTO_LOJA, 5);
});

test('não bate → null: arremate à mão, 2 centavos fora, loja zerada/nula, arremate inválido', () => {
  assert.equal(ofertaDaLoja({ buy_now_price: 97, starting_price: 24 }, null), null);       // Camiseta: sem preço de loja
  assert.equal(ofertaDaLoja({ buy_now_price: 97, starting_price: 24 }, 0), null);
  assert.equal(ofertaDaLoja({ buy_now_price: 97, starting_price: 53.6 }, 67), null);       // Relógio antes da regra
  assert.equal(ofertaDaLoja({ buy_now_price: 47.49, starting_price: 19.92 }, 49.97), null); // 2 centavos: outra regra
  assert.equal(ofertaDaLoja({ buy_now_price: 18.97, starting_price: 21.6 }, 19.97), null);  // Bolinha: abaixo do inicial = inválido
  assert.equal(ofertaDaLoja({ buy_now_price: null, starting_price: 1 }, 10), null);
  assert.equal(ofertaDaLoja(null, 10), null);
});

test('outro percentual entra pela mesma porta', () => {
  assert.deepEqual(ofertaDaLoja({ buy_now_price: 85, starting_price: 10 }, 100, 15), { arremate: 85, loja: 100, pct: 15 });
  assert.equal(ofertaDaLoja({ buy_now_price: 85, starting_price: 10 }, 100), null);
});

test('a frase diz o valor, o percentual e o preço da loja, em reais brasileiros', () => {
  assert.equal(fraseDaOferta({ arremate: 47.47, loja: 49.97, pct: 5 }), 'Arremate já por R$ 47,47 — 5% abaixo do preço da nossa loja (R$ 49,97)');
  assert.equal(fraseDaOferta({ arremate: 5700, loja: 6000, pct: 5 }), 'Arremate já por R$ 5.700,00 — 5% abaixo do preço da nossa loja (R$ 6.000,00)');
  assert.equal(fraseDaOferta(null), null);
});

test('a sala carrega o preço da loja do produto e o rodapé só mostra a frase quando a oferta existe', () => {
  const SALA = ler('../src/pages/AuctionRoom.jsx');
  const RODAPE = ler('../src/components/auction/BidInput.jsx');
  assert.ok(SALA.includes('plataforma.entities.Product.get(pid)'));
  assert.ok(SALA.includes('setPrecoLoja(p?.price_catalog ?? null)'));
  assert.ok(SALA.includes('precoLoja={precoLoja} startingPrice={auction?.starting_price}'));
  assert.ok(RODAPE.includes("ofertaDaLoja({ buy_now_price: buyNowPrice, starting_price: startingPrice ?? currentPrice }, precoLoja)"));
  assert.ok(RODAPE.includes('{oferta && ('));
  assert.ok(RODAPE.includes('{fraseDaOferta(oferta)}'));
});
