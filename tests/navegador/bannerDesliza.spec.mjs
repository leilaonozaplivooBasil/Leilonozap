/**
 * 👆 O BANNER DESLIZA COM O DEDO, E AS SETAS SOMEM DO CELULAR — num Chromium.
 *
 * Pedido do dono, duas vezes (a segunda em 17/09/2026): "os dois botões brancos
 * para passar o banner seguem muito grandes e atrapalhando a visão" e "os
 * banners no mobile devem deslizar".
 *
 * As duas metades andam juntas de propósito: tirar as setas do celular SEM o
 * deslize deixaria o aparelho sem NENHUMA forma de passar o banner além de
 * esperar os 10 segundos. Por isso a mesma prova cobre as duas.
 *
 * COMO RODAR
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-banner-desliza');
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
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'banner-desliza.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/banner-desliza.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir(largura) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 }, hasTouch: true });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="moldura-do-carrossel"]', { timeout: 15000 });
  return { ctx, pagina };
}

// Qual slide está à mostra.
//
// 🔴 SÓ LÊ ESTADO ASSENTADO. A troca é um crossfade de 1 segundo
// (`transition-opacity duration-1000`) e o assentamento é esperado DENTRO do
// gesto — ver `deslizar`. Duas versões desta prova erraram aqui antes:
// a primeira media 150ms depois do gesto e pegava as camadas em 0,63 e 0,37;
// a segunda esperava "uma só camada acima de 0,98" logo após disparar o
// evento, e isso era satisfeito pelo estado de ANTES da transição começar —
// o React ainda nem tinha redesenhado. As duas acusaram defeito num código
// que funcionava.
const slideAtivo = async (pagina) => {
  await pagina.waitForFunction(() => {
    const cs = [...document.querySelectorAll('[data-teste="moldura-do-carrossel"] > div > div')];
    return cs.filter((d) => Number(getComputedStyle(d).opacity) > 0.98).length === 1;
  }, null, { timeout: 5000 });
  return pagina.evaluate(() => [...document.querySelectorAll('[data-teste="moldura-do-carrossel"] > div > div')]
    .findIndex((d) => Number(getComputedStyle(d).opacity) > 0.98));
};

// as setas de verdade, com o tamanho que elas ocupam na tela
const setas = (pagina) => pagina.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => /Banner anterior|Próximo banner/.test(b.getAttribute('aria-label') || ''))
  .map((b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })
  .filter((r) => r.w > 0));

// um deslize de verdade: touchstart num ponto, touchend noutro
const deslizar = (pagina, dx, dy = 0) => pagina.evaluate(([dx, dy]) => {
  const alvo = document.querySelector('[data-teste="moldura-do-carrossel"]');
  const r = alvo.getBoundingClientRect();
  const x0 = r.left + r.width / 2; const y0 = r.top + r.height / 2;
  const toque = (x, y) => new Touch({ identifier: 1, target: alvo, clientX: x, clientY: y });
  const t0 = toque(x0, y0); const t1 = toque(x0 + dx, y0 + dy);
  alvo.dispatchEvent(new TouchEvent('touchstart', { touches: [t0], changedTouches: [t0], bubbles: true }));
  alvo.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t1], bubbles: true }));
}, [dx, dy]).then(() => pagina.waitForTimeout(1300));
// 1300ms: o crossfade dura 1000. Esperar aqui, e não na leitura, é o que
// mantém honestas TAMBÉM as provas de que nada aconteceu — elas esperam o
// mesmo tempo e continuam vendo o mesmo slide.

// ─────────────────────────── as setas ───────────────────────────

test('📱 390px — NENHUMA seta no celular', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    assert.deepEqual(await setas(pagina), [],
      'as setas brancas voltaram ao celular — foi a reclamação do dono duas vezes');
  } finally { await ctx.close(); }
});

test('📱 767px — ainda é celular, ainda sem seta', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(767);
  try {
    assert.deepEqual(await setas(pagina), []);
  } finally { await ctx.close(); }
});

test('🖥️ 1354px — as setas existem, e são discretas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(1354);
  try {
    const s = await setas(pagina);
    assert.equal(s.length, 2, 'no desktop não há dedo para deslizar: as setas precisam existir');
    for (const r of s) {
      assert.ok(r.w <= 40 && r.h <= 40, `seta de ${r.w}x${r.h}px — grande demais, tapa a arte`);
    }
  } finally { await ctx.close(); }
});

// ─────────────────────────── o deslize ───────────────────────────

test('👆 deslizar para a ESQUERDA avança o banner', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    assert.equal(await slideAtivo(pagina), 0);
    await deslizar(pagina, -120);
    assert.equal(await slideAtivo(pagina), 1, 'o dedo deslizou e o banner não andou');
  } finally { await ctx.close(); }
});

test('👆 deslizar para a DIREITA volta o banner, dando a volta', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    await deslizar(pagina, 120);
    assert.equal(await slideAtivo(pagina), 2, 'voltar do primeiro tem que cair no último');
  } finally { await ctx.close(); }
});

test('🔴 ROLAR a página não troca o banner', { skip: semNavegador }, async () => {
  // o gesto de rolar começa igual ao de deslizar; quem separa é a direção.
  // sem esta trava, ler a Home no celular trocaria o banner sem querer.
  const { ctx, pagina } = await abrir(390);
  try {
    await deslizar(pagina, 10, -200);
    assert.equal(await slideAtivo(pagina), 0, 'um gesto vertical trocou o slide — vai trocar sozinho ao rolar a página');
  } finally { await ctx.close(); }
});

test('🔴 toque curto e trêmulo não troca o banner', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    await deslizar(pagina, -18);
    assert.equal(await slideAtivo(pagina), 0, '18px não é deslize, é tremor de dedo');
  } finally { await ctx.close(); }
});
