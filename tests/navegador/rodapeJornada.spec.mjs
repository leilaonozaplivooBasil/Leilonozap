/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-rodape-jornada');
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
    const arq = path.join(SAIDA, rel === '/' ? 'rodape-jornada.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/rodape-jornada.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });


async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="rodape-jornada"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}
const estados = (pagina) => pagina.$$eval('[data-teste="rodape-jornada"] button', (bs) => bs.map((b) => [b.getAttribute('data-teste'), b.getAttribute('data-estado'), b.disabled]));

test('🦉 recolhida: AGORA aceso, Amanhecer feito, Manhã atual, Tarde/Noite futuros; a barra encosta na base', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    assert.deepEqual(await estados(pagina), [
      ['rodape-momento', 'atual', false], ['rodape-AMANHECER', 'feito', false], ['rodape-MANHÃ', 'atual', false],
      ['rodape-TARDE', 'futuro', false], ['rodape-NOITE', 'futuro', false],
    ]);
    const colada = await pagina.$eval('[data-teste="rodape-jornada"]', (n) => Math.abs(n.getBoundingClientRect().bottom - window.innerHeight) < 1);
    assert.equal(colada, true);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-1.png') });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('tocar em TARDE expande a jornada e leva o troféu da Tarde pra tela; AGORA recolhe de volta', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    await pagina.click('[data-teste="rodape-TARDE"]');
    await pagina.waitForSelector('[data-periodo="TARDE"]', { timeout: 5000 });
    await pagina.waitForTimeout(1600); // a rolagem é suave e a trilha é longa
    // na metade de cima da tela e fora do rodapé (que ocupa ~80px na base)
    const vis = await pagina.$eval('[data-periodo="TARDE"]', (n) => { const r = n.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight - 80 && r.top < window.innerHeight / 2; });
    assert.equal(vis, true, 'o troféu da Tarde tem que estar na tela');
    assert.equal((await estados(pagina))[0][1], 'futuro', 'expandida: AGORA não é mais o aceso');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-2.png') });
    await pagina.click('[data-teste="rodape-momento"]');
    await pagina.waitForTimeout(500);
    assert.equal(await pagina.$('[data-periodo="TARDE"]'), null, 'recolheu');
    assert.match(await pagina.$eval('[data-teste="banca-rodape"]', (n) => n.innerText), /Viver esse momento/);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
