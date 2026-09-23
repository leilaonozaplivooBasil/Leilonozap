/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-leve-junto');
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
    const arq = path.join(SAIDA, rel === '/' ? 'leve-junto.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/leve-junto.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });


async function abrir(q = '', largura = 390) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 700 }, isMobile: largura < 768, hasTouch: largura < 768 });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="leve-junto"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}
const visiveis = (pagina) => pagina.$$eval('[data-teste="leve-junto-item"]', (ls) => ls.filter((l) => getComputedStyle(l).display !== 'none').map((l) => l.querySelector('p').innerText));

test('🧺 celular: 2 lado a lado da mesma categoria (o mais recente primeiro); "+ Adicionar" soma sem sair e o bloco se atualiza', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    assert.deepEqual(await visiveis(pagina), ['Esmalte Top Coat 9ml', 'Sérum Gel Cílios & Sobrancelhas']);
    const lado = await pagina.$$eval('[data-teste="leve-junto-item"]', (ls) => { const a = ls[0].getBoundingClientRect(); const b = ls[1].getBoundingClientRect(); return Math.abs(a.top - b.top) < 1 && b.left > a.right; });
    assert.equal(lado, true, 'os dois ficam lado a lado');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    await pagina.click('[data-teste="leve-junto-adicionar"]');
    const add = await pagina.evaluate(() => window.__adicionados);
    assert.equal(add.length, 1); assert.equal(add[0].id, 'p2'); assert.equal(add[0].quantity, 1); assert.equal(add[0].availableStock, 3);
    assert.deepEqual(await visiveis(pagina), ['Sérum Gel Cílios & Sobrancelhas', 'Batom Bala Hidratante Bauny'], 'o adicionado sai do bloco');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('desktop mostra 4; carrinho vazio mostra "Pra começar" com os mais baratos', { skip: semNavegador }, async () => {
  let { ctx, pagina, erros } = await abrir('', 1280);
  try { assert.equal((await visiveis(pagina)).length, 4); assert.deepEqual(erros, []); } finally { await ctx.close(); }
  ({ ctx, pagina, erros } = await abrir('?vazio=1'));
  try {
    assert.match(await pagina.$eval('[data-teste="leve-junto"]', (n) => n.innerText), /Pra começar/i);
    assert.deepEqual(await visiveis(pagina), ['Corda Polia', 'Batom Bala Hidratante Bauny']);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
