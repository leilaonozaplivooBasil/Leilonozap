/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-oferta-da-loja');
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
    const arq = path.join(SAIDA, rel === '/' ? 'oferta-da-loja.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/oferta-da-loja.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });


async function abrir(q = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 500 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="rodape-banca"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('🏷️ com arremate = loja − 15%, a frase aparece embaixo do ARREMATE, dentro dos 390px', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const txt = await pagina.$eval('[data-teste="oferta-da-loja"]', (n) => n.innerText);
    assert.equal(txt, 'Arremate já por R$ 42,47 — 15% abaixo do preço da nossa loja (R$ 49,97)');
    const ordem = await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /ARREMATE/.test(x.innerText)).getBoundingClientRect();
      const f = document.querySelector('[data-teste="oferta-da-loja"]').getBoundingClientRect();
      return { frase_abaixo: f.top >= b.bottom, cabe: f.right <= 390.5 && f.left >= 0 };
    });
    assert.equal(ordem.frase_abaixo, true); assert.equal(ordem.cabe, true);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('sem preço de loja, ou com arremate à mão, NENHUMA frase — e o botão continua', { skip: semNavegador }, async () => {
  for (const q of ['?loja=0', '?loja=67&arremate=97']) {
    const { ctx, pagina, erros } = await abrir(q);
    try {
      assert.equal(await pagina.$('[data-teste="oferta-da-loja"]'), null, q);
      assert.match(await pagina.$eval('[data-teste="rodape-banca"]', (n) => n.innerText), /ARREMATE/);
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  }
});
