/**
 * 🔴 A PÁGINA DE DETALHES DE VERDADE MOSTRA O VÍDEO — MEDIDO NUM CHROMIUM.
 *
 * Dono, 16/09/2026: "o vídeo só apareceu na sala do leilão". A banca
 * `videoNoLote` mede o DESENHO numa cópia da galeria; cópia não prova
 * ligação. Aqui roda o `AuctionDetails` REAL — rota, entidade e
 * `useVideoDoLote` — com o leilão e o produto semeados.
 *
 * Se a corrente leilão → product_id → products.video_urls → slide quebrar em
 * qualquer elo, a bolinha do vídeo não nasce e estes testos caem.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-detalhes-do-lote');
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
    const arq = path.join(SAIDA, rel === '/' ? 'detalhes-do-lote.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/detalhes-do-lote.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir(largura = 420) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
  const pagina = await ctx.newPage();
  // o vídeo do dono é um arquivo real no Supabase; a banca não tem rede
  await ctx.route('**/videos-produtos/**', (r) => r.abort());
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  // a página carrega o leilão primeiro e o vídeo depois — espera a galeria
  await pagina.waitForSelector('[data-teste="bolinha-foto-0"]', { timeout: 15000 });
  return { ctx, pagina };
}

test('▶ a bolinha do vídeo NASCE na página de detalhes de verdade', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="bolinha-do-video"]', { timeout: 15000 });
    assert.equal(await pagina.locator('[data-teste="bolinha-do-video"]').count(), 1);
    // 2 fotos + 1 vídeo — o vídeo entra DEPOIS das fotos, não no lugar da capa
    assert.equal(await pagina.locator('[data-teste^="bolinha-foto-"]').count(), 2);
  } finally { await ctx.close(); }
});

test('🎬 clicar na bolinha do vídeo troca a foto pelo <video> do arquivo', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="bolinha-do-video"]', { timeout: 15000 });
    assert.equal(await pagina.locator('[data-teste="video-do-lote"]').count(), 0, 'o vídeo não pode estar montado antes de ser pedido');
    await pagina.click('[data-teste="bolinha-do-video"]');
    await pagina.waitForSelector('[data-teste="video-do-lote"] video', { timeout: 5000 });
    // arquivo nosso → <video>, nunca <iframe>
    assert.equal(await pagina.locator('[data-teste="video-do-lote"] iframe').count(), 0);
    const src = await pagina.locator('[data-teste="video-do-lote"] video').getAttribute('src');
    assert.match(src, /videos-produtos\/uploads\/1789569726600_ps5\.mp4$/);
  } finally { await ctx.close(); }
});

test('🖼️ o vídeo ENCAIXA na moldura quadrada da página real', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="bolinha-do-video"]', { timeout: 15000 });
    await pagina.click('[data-teste="bolinha-do-video"]');
    await pagina.waitForSelector('[data-teste="video-do-lote"] video', { timeout: 5000 });
    const { moldura, video } = await pagina.evaluate(() => {
      const v = document.querySelector('[data-teste="video-do-lote"] video');
      const m = v.closest('.aspect-square');
      return { moldura: m.getBoundingClientRect().toJSON(), video: v.getBoundingClientRect().toJSON() };
    });
    assert.ok(Math.abs(moldura.width - moldura.height) <= 1, `moldura não é quadrada: ${moldura.width}x${moldura.height}`);
    // 2px de folga, não 1: a moldura tem `border: 1px` de cada lado e o
    // `inset-0` do vídeo mede por dentro da borda. Medido: 371 dentro de 373.
    assert.ok(Math.abs(video.width - moldura.width) <= 2 && Math.abs(video.height - moldura.height) <= 2,
      `o vídeo não preenche a moldura: ${video.width}x${video.height} em ${moldura.width}x${moldura.height}`);
    assert.ok(Math.abs(video.width - video.height) <= 1, `o vídeo não ficou quadrado: ${video.width}x${video.height}`);
  } finally { await ctx.close(); }
});

test('🔴 o autoavanço de 4s PARA no vídeo — 9 segundos e ele continua lá', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="bolinha-do-video"]', { timeout: 15000 });
    await pagina.click('[data-teste="bolinha-do-video"]');
    await pagina.waitForSelector('[data-teste="video-do-lote"] video', { timeout: 5000 });
    await pagina.waitForTimeout(9000);
    assert.equal(await pagina.locator('[data-teste="video-do-lote"] video').count(), 1,
      'o relógio girou por cima do vídeo — ele seria cortado no 4º segundo');
  } finally { await ctx.close(); }
});

test('🔴 sem produto ligado a galeria segue só com as fotos', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 420, height: 900 } });
  const pagina = await ctx.newPage();
  // tira o `product_id` do leilão ANTES de a página montar
  await pagina.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(window, '__entidadesFalsas');
    Object.defineProperty(window, '__entidadesFalsas', {
      configurable: true,
      set(v) { v.Auction.forEach((a) => { delete a.product_id; }); Object.defineProperty(window, '__entidadesFalsas', { value: v, writable: true, configurable: true }); },
      get() { return original?.value; },
    });
  });
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="bolinha-foto-0"]', { timeout: 15000 });
    await pagina.waitForTimeout(1500);
    assert.equal(await pagina.locator('[data-teste="bolinha-do-video"]').count(), 0);
    assert.equal(await pagina.locator('[data-teste^="bolinha-foto-"]').count(), 2);
  } finally { await ctx.close(); }
});
