// 📱 A barra do app: Comprar · Leilões · Lucre · Carrinho — 23/09/2026
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { ITENS_DA_BARRA, PAGINAS_COM_BARRA_DO_APP, mostraBarraDoApp, itemAtivo, contadorDoCarrinho } from '../src/lib/barraDoApp.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('os quatro atalhos, nesta ordem, com os destinos certos (Lucre = a página /Lucre)', () => {
  assert.deepEqual(ITENS_DA_BARRA.map((i) => [i.id, i.rotulo, i.pagina]), [
    ['comprar', 'Comprar', 'Catalog'], ['leiloes', 'Leilões', 'Home'], ['lucre', 'Lucre', 'Lucre'], ['carrinho', 'Carrinho', 'Cart'],
  ]);
});

test('a barra só entra no site: vitrine, loja, carrinho, Lucre — nunca sala de leilão, painel ou Central', () => {
  for (const p of ['Home', 'Recepcao', 'Catalog', 'CatalogProductDetails', 'Cart', 'Lucre', 'Partners', 'LuxuryCollection']) assert.equal(mostraBarraDoApp(p), true, p);
  for (const p of ['AuctionRoom', 'AuctionDetails', 'Licensing', 'Carteira', 'ProductManagement', 'Profile', 'MyCatalogOrders', undefined, null, '']) assert.equal(mostraBarraDoApp(p), false, String(p));
  assert.equal(PAGINAS_COM_BARRA_DO_APP.length, 8);
});

test('cada página acende o seu item; página sem dono não acende nenhum', () => {
  assert.equal(itemAtivo('Catalog'), 'comprar');
  assert.equal(itemAtivo('CatalogProductDetails'), 'comprar');
  assert.equal(itemAtivo('Home'), 'leiloes');
  assert.equal(itemAtivo('LuxuryCollection'), 'leiloes');
  assert.equal(itemAtivo('Lucre'), 'lucre');
  assert.equal(itemAtivo('Partners'), 'lucre');
  assert.equal(itemAtivo('Cart'), 'carrinho');
  assert.equal(itemAtivo('AuctionRoom'), null);
  assert.equal(itemAtivo(undefined), null);
});

test('contador do carrinho: 0/nulo some, 1 mostra, 100 vira 99+', () => {
  assert.equal(contadorDoCarrinho(0), null);
  assert.equal(contadorDoCarrinho(null), null);
  assert.equal(contadorDoCarrinho('abc'), null);
  assert.equal(contadorDoCarrinho(1), '1');
  assert.equal(contadorDoCarrinho(99), '99');
  assert.equal(contadorDoCarrinho(100), '99+');
});

test('o Layout monta a barra com o contador do carrinho, dá respiro ao conteúdo, e o dock sobe junto', () => {
  const LAYOUT = ler('../src/Layout.jsx');
  const DOCK = ler('../src/components/common/FloatingDock.jsx');
  const BARRA = ler('../src/components/nav/BarraDoApp.jsx');
  assert.ok(LAYOUT.includes('<BarraDoApp currentPageName={currentPageName} cartCount={cartCount} />'));
  assert.ok(LAYOUT.includes("mostraBarraDoApp(currentPageName) ? 'pb-[3.75rem] lg:pb-0' : ''"));
  assert.ok(DOCK.includes('const base = temBarraDoApp ? `calc(${base0} + 3.75rem)` : base0;'));
  assert.ok(DOCK.includes('@media (min-width: 1024px)'));
  assert.ok(BARRA.includes('if (!mostraBarraDoApp(currentPageName)) return null;'));
  assert.ok(BARRA.includes('className="fixed inset-x-0 bottom-0 z-40 lg:hidden"'));
  assert.ok(BARRA.includes('h-[3.75rem]'));
});
