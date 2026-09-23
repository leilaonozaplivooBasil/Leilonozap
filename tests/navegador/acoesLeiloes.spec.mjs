/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-acoes-leiloes');
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
    const arq = path.join(SAIDA, rel === '/' ? 'acoes-leiloes.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/acoes-leiloes.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('🫧 a fileira dos ícones não recorta a sombra de baixo — nada de "por baixo do card"', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 600 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="acoes-leiloes"]', { timeout: 20000 });
    const m = await pagina.$eval('[data-teste="acoes-leiloes"]', (n) => {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      const icone = n.querySelector('img').getBoundingClientRect();
      const card = document.querySelector('[data-teste="carrossel-falso"]').getBoundingClientRect();
      return { overflowX: cs.overflowX, overflowY: cs.overflowY, z: cs.zIndex, pos: cs.position,
        folgaEmbaixo: r.bottom - icone.bottom, rola: n.scrollWidth > n.clientWidth + 1, cardAbaixo: card.top >= icone.bottom };
    });
    // a causa: eixo X rolável fazia o eixo Y virar `auto` e cortar a sombra 4px abaixo do círculo
    assert.equal(m.overflowX, 'visible', `overflow-x era ${m.overflowX}`);
    assert.equal(m.overflowY, 'visible', `overflow-y era ${m.overflowY}`);
    assert.equal(m.rola, false, 'três ícones cabem em 390px sem rolar');
    // a folga pra sombra (0 8px 22px ≈ 30px) e a camada por cima do carrossel
    assert.ok(m.folgaEmbaixo >= 16, `folga embaixo ${m.folgaEmbaixo}px — a sombra precisa de espaço`);
    assert.equal(m.pos, 'relative'); assert.equal(m.z, '10');
    assert.equal(m.cardAbaixo, true, 'o card do carrossel continua abaixo dos ícones, não em cima');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
