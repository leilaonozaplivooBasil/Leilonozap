/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-atalho-top-college');
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
    const arq = path.join(SAIDA, rel === '/' ? 'atalho-top-college.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/atalho-top-college.html`;
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
  await pagina.waitForSelector('[data-teste="banca-atalho"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('⭐ logado: o ícone leva pra Jornada; abre o Quadro, fixa pela estrela, e o ícone passa a levar pro Quadro', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const href = () => pagina.$eval('[data-teste="atalho-topcollege"]', (a) => a.getAttribute('href'));
    assert.equal(await href(), '/Licensing?tab=catalogo&catalogTab=catalogo-clientes&secao=compromisso&visao=jornada');
    assert.equal(await pagina.$eval('[data-teste="fixar-atalho"]', (b) => b.getAttribute('aria-pressed')), 'true', 'a Jornada já é o atalho padrão');
    await pagina.click('[role="tab"][aria-label="Quadro"]');
    assert.equal(await pagina.$eval('[data-teste="fixar-atalho"]', (b) => b.getAttribute('aria-pressed')), 'false');
    await pagina.click('[data-teste="fixar-atalho"]');
    assert.equal(await pagina.$eval('[data-teste="fixar-atalho"]', (b) => b.getAttribute('aria-pressed')), 'true');
    assert.equal(await pagina.evaluate(() => localStorage.getItem('nz_atalho_topcollege')), 'quadro');
    assert.equal(await href(), '/Licensing?tab=catalogo&catalogTab=catalogo-clientes&secao=compromisso&visao=quadro');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('sem login, nenhum ícone', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?logado=0');
  try {
    assert.equal(await pagina.$('[data-teste="atalho-topcollege"]'), null);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
