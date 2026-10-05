/** 🃏 Padrão dos cards: todos da mesma altura, preço e botão na mesma linha, nada saindo (FOTO_BANCA=<caminho>.png tira a foto). COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-padrao-dos-cards');
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
    const arq = path.join(SAIDA, rel === '/' ? 'padrao-dos-cards.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/padrao-dos-cards.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function medir(largura) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 }, isMobile: largura < 640, hasTouch: largura < 640, deviceScaleFactor: 2 });
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
        const caixa = r(c);
        const preco = [...c.querySelectorAll('p')].find((p) => /^R\$\s/.test(p.textContent.trim()) && p.className.includes('text-green-600'));
        const botao = [...c.querySelectorAll('button')].find((b) => /Entrar e Dar Lance/.test(b.textContent));
        const prazo = c.querySelector('[data-teste="data-de-termino"], [data-teste="prazo-compacto"]');
        const fora = [...c.querySelectorAll('button, p, div, span')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > caixa.right + 1 || b.left < caixa.left - 1 || b.bottom > caixa.bottom + 1); }).length;
        return {
          altura: Math.round(caixa.h), topo: Math.round(caixa.top),
          precoTexto: preco?.textContent.trim(), precoLinhas: preco ? Math.round(r(preco).h / parseFloat(getComputedStyle(preco).lineHeight)) : null,
          precoTopoRelativo: preco ? Math.round(r(preco).top - caixa.top) : null,
          botaoTopoRelativo: botao ? Math.round(r(botao).top - caixa.top) : null,
          prazoTexto: prazo?.textContent.trim() || null, prazoEhData: prazo?.dataset.teste === 'data-de-termino',
          elementosFora: fora,
        };
      }),
    };
  });
  return { ctx, pagina, erros, m };
}

{
  test('📱 390px: 2 colunas, todos os cards da MESMA altura, preço e botão na mesma linha, nada saindo', { skip: semNavegador }, async () => {
    const { ctx, pagina, erros, m } = await medir(390);
    try {
      if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA, fullPage: true });
      assert.equal(m.rolaHorizontal, false, 'a página rola de lado');
      assert.equal(m.colunas, 2, `esperava 2 colunas, achei ${m.colunas}`);
      assert.equal(m.cards.length, 6);
      const alturas = new Set(m.cards.map((c) => c.altura));
      assert.ok(alturas.size <= 1 || Math.max(...alturas) - Math.min(...alturas) <= 1, `alturas diferentes: ${[...alturas].join(', ')}`);
      const precoTopos = new Set(m.cards.map((c) => c.precoTopoRelativo));
      assert.equal(precoTopos.size, 1, `o preço nasce em alturas diferentes: ${[...precoTopos].join(', ')}`);
      const botaoTopos = new Set(m.cards.map((c) => c.botaoTopoRelativo));
      assert.equal(botaoTopos.size, 1, `o botão de lance nasce em alturas diferentes: ${[...botaoTopos].join(', ')}`);
      for (const c of m.cards) {
        assert.equal(c.precoLinhas, 1, `o preço "${c.precoTexto}" quebrou`);
        assert.equal(c.elementosFora, 0, `${c.elementosFora} elemento(s) saindo do card de "${c.precoTexto}"`);
      }
      // 📅 em semanas o prazo é a DATA (régua de 03/09 e 17/09); em dias e minutos, a contagem
      const porPreco = Object.fromEntries(m.cards.map((c) => [c.precoTexto, c]));
      assert.match(porPreco['R$ 15,98'].prazoTexto, /^até \d{2}\/\d{2}$/, 'Chinelo (12 dias) devia mostrar a data');
      assert.equal(porPreco['R$ 15,98'].prazoEhData, true);
      assert.equal(porPreco['R$ 477,60'].prazoTexto, '3 dias', 'Harley (4 dias) devia mostrar a contagem');
      assert.match(porPreco['R$ 1.250,00'].prazoTexto, /^00:0[67]:\d{2}$/, 'JBL (8 min) devia mostrar HH:MM:SS');
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });

  test('🖥️ 1280px: 3 colunas, mesma altura, nada saindo', { skip: semNavegador }, async () => {
    const { ctx, erros, m } = await medir(1280);
    try {
      assert.equal(m.colunas, 3);
      const alturas = [...new Set(m.cards.map((c) => c.altura))];
      assert.ok(Math.max(...alturas) - Math.min(...alturas) <= 1, `alturas diferentes: ${alturas.join(', ')}`);
      for (const c of m.cards) { assert.equal(c.precoLinhas, 1); assert.equal(c.elementosFora, 0); }
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  });
}
