// 🔗 Compartilhar com link limpo (25/09/2026) — o adesivo do Instagram só aceita URL pura.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { mensagemSemLink, ehLinkPuro } from '../src/lib/compartilhar.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const URL_ = 'https://leilaonozap.net/l/b1fa901dcdb2304c32dbc564';

test('a mensagem perde o link (a folha recebe `url` à parte) sem perder o resto', () => {
  const m = `🔨📦 LEILÃO NO🔥ZAP!\n📱 Harley 117\n💰 Lance: R$ 477,60\n⚡ Dê seu lance: ${URL_}`;
  assert.equal(mensagemSemLink(m, URL_), '🔨📦 LEILÃO NO🔥ZAP!\n📱 Harley 117\n💰 Lance: R$ 477,60\n⚡ Dê seu lance');
  assert.equal(mensagemSemLink('🛒 Compre agora:\n' + URL_, URL_), '🛒 Compre agora');
  assert.equal(mensagemSemLink('sem link aqui', URL_), 'sem link aqui');
  assert.equal(mensagemSemLink('x', ''), 'x');
});

test('link puro: só URL, sem espaço, sem quebra — é o que o adesivo aceita', () => {
  assert.equal(ehLinkPuro(URL_), true);
  assert.equal(ehLinkPuro(`Dê seu lance: ${URL_}`), false, 'texto + link é o que dava "link inválido"');
  assert.equal(ehLinkPuro(URL_ + '\n'), false);
  assert.equal(ehLinkPuro('leilaonozap.net/l/x'), false, 'sem protocolo o adesivo recusa');
});

test('🔴 o card do leilão e o da loja copiam o link limpo ANTES de abrir a folha, e o texto não repete o link', () => {
  const A = ler('../src/components/auction/AuctionCard.jsx');
  assert.match(A, /const linkCopiado = await copiarLinkLimpo\(productUrl\);/);
  assert.match(A, /toast\.success\('Link copiado\. Cole onde quiser — story, bio, WhatsApp\.'/);
  assert.match(A, /text: mensagemSemLink\(shareMessage, productUrl\), url: productUrl/);
  assert.doesNotMatch(A, /text: shareMessage, url: productUrl/, 'a folha ainda recebe o link duas vezes');
  const P = ler('../src/components/catalog/CatalogProductCard.jsx');
  assert.match(P, /const linkCopiado = await copiarLinkLimpo\(productUrl\);/);
  assert.match(P, /text: mensagemSemLink\(shareMessage, productUrl\), url: productUrl/);
  assert.doesNotMatch(P, /text: shareMessage, url: productUrl/);
});
