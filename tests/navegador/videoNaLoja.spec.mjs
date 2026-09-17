/**
 * 🔴 O VÍDEO ENTRA NO CARROSSEL DA LOJA VIRTUAL — MEDIDO NUM CHROMIUM.
 *
 * Pedido do dono (17/09/2026): vídeo no carrossel de imagens dos produtos em
 * destaque. O card de destaque da Loja abre o `ProductDetailsModal`, que era a
 * única das quatro telas de produto sem vídeo nenhum.
 *
 * Aqui roda o modal REAL. A prova que mais importa é a da SETA: com o vídeo no
 * fim da fileira, girar por `images.length` (fotos) em vez de `midias.length`
 * deixa o último slide inalcançável — o vídeo existiria e ninguém chegaria
 * nele. Cópia da galeria não pegaria isso; só a tela de verdade.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-video-na-loja');
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
    const arq = path.join(SAIDA, rel === '/' ? 'video-na-loja.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/video-na-loja.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir({ sem = false, largura = 1100 } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 950 } });
  const pagina = await ctx.newPage();
  // o vídeo do dono é um arquivo real no Supabase; a banca não tem rede
  await ctx.route('**/videos-produtos/**', (r) => r.abort());
  await pagina.goto(BASE + (sem ? '?sem=1' : ''), { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="miniatura-da-foto"]', { timeout: 15000 });
  return { ctx, pagina };
}

test('▶ a miniatura do vídeo NASCE, e DEPOIS das fotos', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="miniatura-do-video"]', { timeout: 15000 });
    assert.equal(await pagina.locator('[data-teste="miniatura-do-video"]').count(), 1);
    assert.equal(await pagina.locator('[data-teste="miniatura-da-foto"]').count(), 2);
    // o vídeo é o ÚLTIMO da fileira — a capa continua sendo foto
    const ordem = await pagina.$$eval('[data-teste^="miniatura-d"]', (bs) => bs.map((b) => b.dataset.teste));
    assert.deepEqual(ordem, ['miniatura-da-foto', 'miniatura-da-foto', 'miniatura-do-video']);
  } finally { await ctx.close(); }
});

test('🎬 o <video> só é montado quando a pessoa pede', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="miniatura-do-video"]', { timeout: 15000 });
    assert.equal(await pagina.locator('[data-teste="video-do-produto"]').count(), 0,
      'o vídeo não pode estar montado antes de ser pedido — gastaria dados de quem só queria a foto');
    await pagina.click('[data-teste="miniatura-do-video"]');
    await pagina.waitForSelector('video[data-teste="video-do-produto"]', { timeout: 5000 });
    // arquivo NOSSO → <video>, nunca <iframe>
    assert.equal(await pagina.locator('iframe[data-teste="video-do-produto"]').count(), 0);
    const src = await pagina.locator('video[data-teste="video-do-produto"]').getAttribute('src');
    assert.match(src, /videos-produtos\/uploads\/1789569726600_ps5\.mp4$/);
  } finally { await ctx.close(); }
});

test('🔇 o vídeo da loja não toca sozinho nem faz barulho', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.click('[data-teste="miniatura-do-video"]');
    await pagina.waitForSelector('video[data-teste="video-do-produto"]', { timeout: 5000 });
    const attrs = await pagina.$eval('video[data-teste="video-do-produto"]', (v) => ({
      autoplay: v.hasAttribute('autoplay'),
      controls: v.hasAttribute('controls'),
      preload: v.getAttribute('preload'),
    }));
    assert.equal(attrs.autoplay, false, 'vitrine que fala sozinha faz a pessoa fechar a aba');
    assert.equal(attrs.controls, true, 'sem controles a pessoa não consegue dar play');
    assert.equal(attrs.preload, 'metadata', 'preload cheio baixaria o vídeo de quem só queria a foto');
  } finally { await ctx.close(); }
});

test('🔴 A SETA ALCANÇA O VÍDEO — é o que quebra se a fileira girar por fotos', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="miniatura-do-video"]', { timeout: 15000 });
    // 3 mídias: duas setas "próximo" a partir da capa têm que chegar no vídeo.
    // Girando por `images.length` (2), o índice volta a 0 e o vídeo nunca aparece.
    const proxima = '.aspect-square button:nth-of-type(2)';
    await pagina.click(proxima);
    await pagina.click(proxima);
    await pagina.waitForSelector('video[data-teste="video-do-produto"]', { timeout: 5000 });
    assert.equal(await pagina.locator('video[data-teste="video-do-produto"]').count(), 1,
      'a seta não alcançou o vídeo — a fileira está girando pelas fotos, não pelas mídias');
  } finally { await ctx.close(); }
});

test('🔎 o botão "ampliar" some no slide de vídeo', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const ampliar = 'button[title="Ampliar"]';
    assert.equal(await pagina.locator(ampliar).count(), 1, 'na foto o ampliar existe');
    await pagina.click('[data-teste="miniatura-do-video"]');
    await pagina.waitForSelector('video[data-teste="video-do-produto"]', { timeout: 5000 });
    assert.equal(await pagina.locator(ampliar).count(), 0,
      'a camada de tela cheia cobriria os controles do player e prenderia a pessoa no vídeo');
  } finally { await ctx.close(); }
});

test('🟢 SEM vídeo cadastrado, a galeria é exatamente a de antes', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir({ sem: true });
  try {
    assert.equal(await pagina.locator('[data-teste="miniatura-do-video"]').count(), 0);
    assert.equal(await pagina.locator('[data-teste="miniatura-da-foto"]').count(), 2);
    assert.equal(await pagina.locator('[data-teste="video-do-produto"]').count(), 0);
    assert.equal(await pagina.locator('button[title="Ampliar"]').count(), 1);
  } finally { await ctx.close(); }
});

test('🔴 a tela cheia NÃO reaparece sozinha depois de passar pelo vídeo', { skip: semNavegador }, async () => {
  // Achado da revisão: as setas de DENTRO da tela cheia alcançam o vídeo.
  // A camada some (não há foto para ampliar) mas o interruptor continua ligado —
  // e ao voltar para uma foto a tela cheia reabria sozinha, sem ninguém pedir.
  //
  // O caminho é pelas setas da própria camada: enquanto ela está aberta, ela
  // cobre a tira de miniaturas e nenhum clique chega lá atrás.
  const { ctx, pagina } = await abrir();
  const camada = '.fixed.inset-0.z-\\[110\\]';
  try {
    await pagina.waitForSelector('[data-teste="miniatura-do-video"]', { timeout: 15000 });
    await pagina.click('button[title="Ampliar"]');
    await pagina.waitForSelector(camada, { timeout: 5000 });

    // dentro da camada: [0] fechar, [1] anterior, [2] próxima
    const proxima = pagina.locator(`${camada} button`).nth(2);
    await proxima.click();          // foto 2
    await proxima.click();          // vídeo — aqui a camada tem que sumir
    await pagina.waitForSelector(camada, { state: 'detached', timeout: 5000 });

    // de volta para uma foto, com a camada já fora do caminho
    await pagina.click('[data-teste="miniatura-da-foto"]');
    await pagina.waitForTimeout(250);
    assert.equal(await pagina.locator(camada).count(), 0,
      'a tela cheia voltou sozinha — o interruptor ficou ligado quando a mídia deixou de ser foto');
  } finally { await ctx.close(); }
});
