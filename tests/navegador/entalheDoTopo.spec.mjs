/** 📱 O topo da página não pode ficar atrás da barra fixa. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-entalhe-do-topo');
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
    const arq = path.join(SAIDA, rel === '/' ? 'entalhe-do-topo.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/entalhe-do-topo.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(q = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 393, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="banca-entalhe"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

const medir = (pagina) => pagina.evaluate(() => {
  const barra = document.querySelector('[data-teste="barra-do-topo"]').getBoundingClientRect();
  const banner = document.querySelector('[data-teste="banner"]').getBoundingClientRect();
  return { barraBaixo: Math.round(barra.bottom), bannerTopo: Math.round(banner.top), escondido: Math.round(barra.bottom - banner.top) };
});

// 🔴 O DEFEITO DO DONO, medido: com o entalhe de um iPhone com Dynamic Island,
//    a barra fica ~59px mais alta. Antes do conserto o <main> descia uma
//    altura FIXA, e esses 59px do banner sumiam atrás dela.
test('📱 com entalhe de iPhone (59px): o banner começa EXATAMENTE onde a barra acaba — nada escondido', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?entalhe=59');
  try {
    const m = await medir(pagina);
    assert.equal(m.barraBaixo, 59 + 56, 'a barra cresce o entalhe + a altura dela (h-14)');
    assert.equal(m.escondido, 0, `o topo do banner ficou ${m.escondido}px atrás da barra`);
    assert.equal(m.bannerTopo, m.barraBaixo);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-com-entalhe.png') });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('📱 sem entalhe (Android/desktop): nada muda — o conserto não empurra a página pra baixo à toa', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const m = await medir(pagina);
    assert.equal(m.barraBaixo, 56, 'sem entalhe a barra é só a altura dela');
    assert.equal(m.escondido, 0);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-sem-entalhe.png') });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
