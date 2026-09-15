// 🔎📞 DIR — Loja Virtual: modo busca em tempo real + WhatsApp oficial em
// todo o site (15/09/2026).
//
// O RELATO (dono, com dois prints):
//   1. "Como eu busco e a busca aparece lá embaixo, abaixo de ofertas relâmpago,
//      não sobe, a página não sobe, parece que não está buscando... quando eu
//      buscar, tem que sumir licenciado, tem que subir a oferta relâmpago, que
//      só apareçam os produtos."
//   2. Print do WhatsApp: "Você confia nesta empresa? +55 21 99999-9999" — o
//      botão de negociar do carrinho abria conversa com um número de EXEMPLO.
//      "o número oficial é o 21 984072064... atualizar em todo site."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const catalog = ler('../src/pages/Catalog.jsx');
const header = ler('../src/components/loja/LojaShopeeHeader.jsx');
const cart = ler('../src/pages/Cart.jsx');
const lib = ler('../src/lib/whatsappOficial.js');

// ─── modo busca ─────────────────────────────────────────────────────────────

test('com texto na busca a página entra em MODO BUSCA e sobe pro topo', () => {
  assert.match(catalog, /const modoBusca = \(searchTerm \|\| ''\)\.trim\(\)\.length > 0;/);
  assert.match(catalog, /if \(!modoBusca\) return;\s*\n\s*try \{ window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\); \}/);
});

test('no modo busca somem banner, ofertas relâmpago, cartão do licenciado, pílulas e destaques', () => {
  const i = catalog.indexOf('{!modoBusca && (');
  assert.ok(i > 0, 'o bloco condicional do modo busca precisa existir');
  const bloco = catalog.slice(i, i + 2200);
  assert.match(bloco, /<OfertasRelampago/);
  assert.match(bloco, /<CartaoLojaVirtual/);
  assert.match(bloco, /<PilulasVitrine/);
  assert.match(catalog, /featuredProducts\.length > 0 && !modoBusca && \(/);
  assert.match(header, /\{!modoBusca && \(\s*\n\s*<div className="ml-\[calc\(50%-50vw\)\]/, 'o HERO do cabeçalho some no modo busca');
  assert.match(catalog, /modoBusca=\{modoBusca\}/, 'o cabeçalho precisa receber o modo busca');
});

test('o cliente vê que a busca está acontecendo: termo, contagem e "buscando…"', () => {
  assert.match(catalog, /Resultados para <span className="text-green-300">“\{searchTerm\.trim\(\)\}”<\/span>/);
  assert.match(catalog, /buscando no catálogo…/);
  assert.match(catalog, /produtos encontrados/);
  assert.match(catalog, /const buscando = modoBusca && \(buscandoServidor \|\| \(searchTerm \|\| ''\)\.trim\(\) !== \(debouncedSearchTerm \|\| ''\)\.trim\(\)\);/);
});

test('enquanto busca, mostra esqueleto — nunca "nenhum produto" antes do servidor responder', () => {
  assert.match(catalog, /\{isLoading \|\| \(buscando && filteredProducts\.length === 0\) \?/);
  assert.match(catalog, /setBuscandoServidor\(true\);\s*\n\s*const t = setTimeout\(async \(\) => \{/);
  assert.match(catalog, /finally \{ if \(alive\) setBuscandoServidor\(false\); \}/);
  assert.match(catalog, /if \(!termo\) \{ setBuscandoServidor\(false\); return; \}/);
});

test('vazio da busca tem texto próprio e botão de voltar pra loja', () => {
  assert.match(catalog, /Nada encontrado para “\$\{searchTerm\.trim\(\)\}”/);
  assert.match(catalog, /Limpar busca e ver a loja/);
});

test('a caixa de busca tem X pra limpar e Enter fecha o teclado do celular', () => {
  assert.match(header, /aria-label="Limpar busca"/);
  assert.match(header, /onKeyDown=\{\(e\) => \{ if \(e\.key === 'Enter'\) e\.currentTarget\.blur\(\); \}\}/);
  assert.match(header, /enterKeyHint="search"/);
  assert.match(header, /modoBusca \? 'border-green-500\/70' : 'border-gray-700'/);
});

// ─── WhatsApp oficial ───────────────────────────────────────────────────────

test('existe UMA fonte do número oficial', () => {
  assert.match(lib, /export const WHATSAPP_OFICIAL = '5521984072064';/);
  assert.match(lib, /export const WHATSAPP_OFICIAL_FORMATADO = '\(21\) 98407-2064';/);
  assert.match(lib, /export function linkWhatsAppOficial\(texto = ''\)/);
});

test('o carrinho não abre mais conversa com o número de exemplo', () => {
  assert.ok(!cart.includes('5521999999999'), 'o 21 99999-9999 do print ainda está no carrinho');
  assert.match(cart, /window\.open\(linkWhatsAppOficial\('Olá! Gostaria de negociar sobre meu pedido da loja virtual\.'\), '_blank'\)/);
});

test('nenhum arquivo do site escreve o número oficial na mão — todos importam da lib', () => {
  const arquivos = [
    '../src/components/loja/LojaShopeeHeader.jsx',
    '../src/components/catalog/ProductDetailsModal.jsx',
    '../src/components/catalog/CatalogProductCard.jsx',
    '../src/components/auction/AcoesSalaHeader.jsx',
    '../src/pages/CatalogOrderTracking.jsx',
    '../src/pages/CatalogProductDetails.jsx',
    '../src/components/common/Footer.jsx',
    '../src/pages/CatalogCheckout2.jsx',
  ];
  for (const a of arquivos) {
    const s = ler(a);
    assert.ok(!/5521984072064|98407-2064/.test(s), `${a} ainda tem o número escrito na mão`);
    assert.match(s, /from '@\/lib\/whatsappOficial'/, `${a} precisa importar da lib`);
  }
});

test('nenhum link wa.me do site aponta pro número de exemplo', () => {
  assert.ok(!/wa\.me\/5521999999999/.test(cart));
  assert.ok(!/wa\.me\/5521999999999/.test(catalog));
  assert.ok(!/wa\.me\/5521999999999/.test(header));
});
