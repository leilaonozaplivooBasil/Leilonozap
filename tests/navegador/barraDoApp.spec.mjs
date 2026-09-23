/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-barra-do-app');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';
let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'barra-do-app.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/barra-do-app.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });


async function abrir(q = '', viewport = { width: 390, height: 700 }) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport, isMobile: viewport.width < 1024, hasTouch: viewport.width < 1024 });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="banca-barra"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('📱 no celular: quatro atalhos colados na base, o da página acesa, e o contador do carrinho', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const m = await pagina.$eval('[data-teste="barra-do-app"]', (n) => {
      const r = n.getBoundingClientRect();
      return {
        itens: [...n.querySelectorAll('a')].map((a) => a.innerText.trim()),
        hrefs: [...n.querySelectorAll('a')].map((a) => a.getAttribute('href')),
        aceso: n.querySelector('a[aria-current="page"]')?.getAttribute('data-teste'),
        contador: n.querySelector('[data-teste="barra-carrinho-contador"]')?.innerText,
        colada: Math.abs(r.bottom - window.innerHeight) < 1, largura: r.width, altura: r.height,
      };
    });
    // o rótulo de cada atalho (o contador do carrinho vem junto no innerText: "3\nCarrinho")
    assert.deepEqual(m.itens.map((t) => t.split('\n').pop()), ['Comprar', 'Leilões', 'Lucre', 'Carrinho']);
    assert.deepEqual(m.hrefs, ['/Catalog', '/Home', '/Lucre', '/Cart']);
    assert.equal(m.aceso, 'barra-comprar');
    assert.equal(m.contador, '3');
    assert.equal(m.colada, true, 'a barra tem que encostar na base');
    assert.equal(m.largura, 390); assert.ok(m.altura >= 56 && m.altura <= 64, `altura ${m.altura}`);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('no desktop a barra some; na sala de leilão ela nem monta', { skip: semNavegador }, async () => {
  let { ctx, pagina, erros } = await abrir('', { width: 1280, height: 800 });
  try {
    assert.equal(await pagina.$eval('[data-teste="barra-do-app"]', (n) => getComputedStyle(n).display), 'none');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
  ({ ctx, pagina, erros } = await abrir('?pagina=AuctionRoom'));
  try {
    assert.equal(await pagina.$('[data-teste="barra-do-app"]'), null);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
