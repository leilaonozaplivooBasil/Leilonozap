/** 🖼️ A miniatura do produto no cabeçalho da sala, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-miniatura-sala');
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
    const arq = path.join(SAIDA, rel === '/' ? 'miniatura-da-sala.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/miniatura-da-sala.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(q = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="cabecalho-banca"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('🖼️ a miniatura aparece, cabe na altura do cabeçalho e tocar abre o painel do produto', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const m = await pagina.$eval('[data-teste="miniatura-produto"]', (n) => {
      const r = n.getBoundingClientRect(); const img = n.querySelector('img');
      return { w: r.width, h: r.height, alt: img?.alt, temSrc: !!img?.src, label: n.getAttribute('aria-label') };
    });
    assert.ok(m.w >= 36 && m.w <= 44 && m.h >= 36 && m.h <= 44, `tamanho ${m.w}x${m.h} — tem que ser pequena`);
    assert.equal(m.alt, 'Playstation 5'); assert.ok(m.temSrc); assert.match(m.label, /Playstation 5/);
    // não pode empurrar o cronômetro pra fora: tudo dentro dos 390px
    const fora = await pagina.evaluate(() => [...document.querySelectorAll('[data-teste="cabecalho-banca"] *')].some((el) => el.getBoundingClientRect().right > 390.5));
    assert.equal(fora, false, 'algo saiu da largura do celular');
    await pagina.click('[data-teste="miniatura-produto"]');
    assert.equal(await pagina.evaluate(() => window.__abriuPainel), 1);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('sem foto, a sala fica como era (nenhuma miniatura, nenhum buraco)', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?foto=0');
  try {
    assert.equal(await pagina.$('[data-teste="miniatura-produto"]'), null);
    assert.match(await pagina.$eval('[data-teste="cabecalho-banca"]', (n) => n.innerText), /497,00/);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
