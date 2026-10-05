/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-vitrine-mobile');
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
    const arq = path.join(SAIDA, rel === '/' ? 'vitrine-mobile.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/vitrine-mobile.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

const cruzam = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

async function medir(largura) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 }, isMobile: largura < 640, hasTouch: largura < 640 });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="grade-leiloes"]', { timeout: 20000 });
  await pagina.waitForTimeout(500);
  const m = await pagina.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
    const cards = [...document.querySelectorAll('[data-teste="grade-leiloes"] > *')];
    return {
      rolaHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      colunas: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size,
      cards: cards.map((c) => {
        const preco = [...c.querySelectorAll('p')].find((p) => /^R\$\s/.test(p.textContent.trim()) && p.className.includes('text-green-600'));
        const termina = [...c.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Termina')?.parentElement?.parentElement;
        const compre = [...c.querySelectorAll('div')].find((d) => d.textContent.trim().startsWith('Compre já') && d.children.length <= 2);
        const caixa = r(c);
        const fora = [...c.querySelectorAll('button, p, div, span')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > caixa.right + 1 || b.left < caixa.left - 1); }).length;
        return {
          largura: caixa.w,
          precoAltura: preco ? r(preco).h : null, precoTexto: preco?.textContent.trim(),
          precoLinhas: preco ? Math.round(r(preco).h / parseFloat(getComputedStyle(preco).lineHeight)) : null,
          precoCruzaTermina: preco && termina ? (() => { const a = r(preco), b = r(termina); return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; })() : false,
          compreCruzaLances: compre ? (() => { const a = r(compre); const lances = [...c.querySelectorAll('span')].find((s) => /lances?$/.test(s.textContent.trim())); if (!lances) return false; const b = r(lances); return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; })() : false,
          elementosFora: fora,
        };
      }),
    };
  });
  return { ctx, pagina, erros, m };
}

test('📱 390px: 2 colunas, preço numa linha só, nada cruzando nem saindo do card', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros, m } = await medir(390);
  try {
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA, fullPage: true });
    assert.equal(m.rolaHorizontal, false, 'a página rola de lado');
    assert.equal(m.colunas, 2, `esperava 2 colunas, achei ${m.colunas}`);
    for (const c of m.cards) {
      assert.ok(c.precoTexto, 'card sem preço');
      assert.equal(c.precoLinhas, 1, `o preço "${c.precoTexto}" quebrou em ${c.precoLinhas} linhas (${c.precoAltura}px) num card de ${Math.round(c.largura)}px`);
      assert.equal(c.precoCruzaTermina, false, `preço cruza o "Termina" no card de "${c.precoTexto}"`);
      assert.equal(c.compreCruzaLances, false, `"Compre já" cruza os lances no card de "${c.precoTexto}"`);
      assert.equal(c.elementosFora, 0, `${c.elementosFora} elemento(s) saindo do card de "${c.precoTexto}"`);
    }
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🖥️ 1280px: 3 colunas e o mesmo card continua inteiro', { skip: semNavegador }, async () => {
  const { ctx, erros, m } = await medir(1280);
  try {
    assert.equal(m.colunas, 3);
    for (const c of m.cards) { assert.equal(c.precoLinhas, 1); assert.equal(c.precoCruzaTermina, false); assert.equal(c.elementosFora, 0); }
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
