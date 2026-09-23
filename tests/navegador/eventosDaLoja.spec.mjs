/**
 * 🔴 O DATALAYER DA LOJA NUM CHROMIUM DE VERDADE — o que o Tag Assistant vê.
 * COMO RODAR: npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-eventos-loja');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';
let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'eventos-da-loja.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/eventos-da-loja.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(tela) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await ctx.route('**/api/functions/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, opcoes: [] }) }));
  await pagina.goto(`${BASE}?tela=${tela}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector(`[data-teste="tela-${tela}"]`, { timeout: 20000 });
  return { ctx, pagina, erros };
}
const eventos = (pagina, nome) => pagina.evaluate((n) => (window.dataLayer || []).filter((e) => e && e.event === n), nome);
const confereMetaEGa4 = (ev, ids) => {
  assert.equal(ev.currency, 'BRL', 'sem currency — o que o Vinicius viu');
  assert.deepEqual(ev.content_ids, ids, 'sem content_ids — o que o Vinicius viu');
  assert.equal(ev.content_type, 'product');
  assert.equal(ev.ecommerce.currency, 'BRL');
  assert.deepEqual(ev.ecommerce.items.map((i) => i.item_id), ids);
  assert.ok(ev.value > 0);
};

test('🔴 ADICIONAR no card da loja empurra add_to_cart com currency + content_ids', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('card');
  try {
    assert.equal((await eventos(pagina, 'add_to_cart')).length, 0, 'não pode disparar antes do clique');
    await pagina.evaluate(() => [...document.querySelectorAll('button')].find((b) => /ADICIONAR/i.test(b.textContent)).click());
    await pagina.waitForFunction(() => (window.dataLayer || []).some((e) => e && e.event === 'add_to_cart'), null, { timeout: 5000 });
    const [ev] = await eventos(pagina, 'add_to_cart');
    confereMetaEGa4(ev, ['p-arvore']);
    assert.equal(ev.value, 350); assert.equal(ev.content_name, 'Árvore De Natal Pinheiro Neve 2,10m Luxo');
    // o GTM exige o ecommerce limpo antes do evento
    const dl = await pagina.evaluate(() => window.dataLayer);
    const i = dl.findIndex((e) => e && e.event === 'add_to_cart');
    assert.deepEqual(dl[i - 1], { ecommerce: null });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🔴 abrir o produto empurra view_item; COMPRAR AGORA empurra begin_checkout', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('modal');
  try {
    await pagina.waitForFunction(() => (window.dataLayer || []).some((e) => e && e.event === 'view_item'), null, { timeout: 5000 });
    const [vi] = await eventos(pagina, 'view_item');
    confereMetaEGa4(vi, ['p-arvore']);
    await pagina.evaluate(() => [...document.querySelectorAll('button')].find((b) => /COMPRAR AGORA/i.test(b.textContent)).click());
    await pagina.waitForFunction(() => (window.dataLayer || []).some((e) => e && e.event === 'begin_checkout'), null, { timeout: 5000 });
    const [bc] = await eventos(pagina, 'begin_checkout');
    confereMetaEGa4(bc, ['p-arvore']);
    assert.equal((await eventos(pagina, 'add_to_cart')).length, 1, 'COMPRAR AGORA também adiciona ao carrinho, uma vez');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🔴 o carrinho com itens empurra begin_checkout com TODOS os itens, uma vez só', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('cart');
  try {
    await pagina.waitForFunction(() => (window.dataLayer || []).some((e) => e && e.event === 'begin_checkout'), null, { timeout: 10000 });
    await pagina.waitForTimeout(800); // dá tempo de re-renders re-dispararem, se fossem re-disparar
    const lista = await eventos(pagina, 'begin_checkout');
    assert.equal(lista.length, 1, 'begin_checkout disparou mais de uma vez no mesmo carrinho');
    confereMetaEGa4(lista[0], ['p-arvore', 'p-secador']);
    assert.equal(lista[0].value, 490); assert.equal(lista[0].num_items, 3); assert.equal(lista[0].content_name, '2 produtos');
  } finally { await ctx.close(); }
});
