/**
 * 🎬 O MAESTRO DOS VÍDEOS — OS CARDS DE VERDADE, NUM CHROMIUM.
 *
 * Dono (08/10/2026): "o vídeo não está aparecendo, precisa apresentar o vídeo de cada produto;
 * o som NÃO toca sozinho, só se o cliente tocar no ícone; quando começar o vídeo de um, o
 * outro fica em imagem; precisa tudo ficar sincronizado; e funcionar igual aos vídeos da
 * rádio, de forma automática, usando mais o YouTube".
 *
 * O que se prova, com AuctionCard e CatalogProductCard reais dentro do maestro real:
 *   1. UM vídeo toca por vez, na ordem da tela, e a vez dá a volta;
 *   2. quem espera fica na FOTO e não baixa nada (o player do YouTube só nasce na sua vez);
 *   3. tudo nasce MUDO e tocar em qualquer lugar NÃO liga o som — só o ícone;
 *   4. o som ligado vale para o vídeo seguinte; desligar cala;
 *   5. a vez passa pelo tempo máximo e quando o vídeo dá erro (o card fica na foto);
 *   6. tocar em "Vídeo" num card que espera faz ele assumir a vez;
 *   7. compartilhar um card do YouTube leva o link do VÍDEO na frente, sem anexar a foto;
 *   8. aba em segundo plano pausa;
 *   9. economia de dados: nada toca sozinho, e o toque na pílula toca uma vez;
 *  10. o card da Loja entra no mesmo rodízio.
 *
 * Só a API do YouTube (a banca não alcança youtube.com) e o arquivo de vídeo (8 KB) são de mentira.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-maestro-de-videos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webm': 'video/webm' };

async function garantirNavegador() {
  if (navegador) return navegador;
  if (!process.env.BANCA_PRONTA) {
    execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
      cwd: path.join(AQUI, '..', '..'),
      env: { ...process.env, SAIDA_BANCA: SAIDA },
      stdio: 'inherit',
    });
  }
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'maestro-de-videos.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/maestro-de-videos.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO, proxy: { server: 'per-context' } } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
});

async function abrir(consulta = '', { relogio = false, altura = 760 } = {}) {
  const ctx = await (await garantirNavegador()).newContext({
    viewport: { width: 1320, height: altura },
    proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' },
  });
  const pagina = await ctx.newPage();
  if (relogio) await pagina.clock.install({ time: new Date() });
  await pagina.goto(`${BASE}?${consulta}`, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="grade"]');
  return { ctx, pagina };
}

/** Quem está com o vídeo à mostra agora, por posição na grade ('sim'/'nao'/'—' = player nem nasceu). */
const estados = (pagina, total = 3) => pagina.evaluate((n) => {
  const cards = [...document.querySelectorAll('[data-teste="grade"] > *')].slice(0, n);
  return cards.map((c) => c.querySelector('[data-teste="camada-do-video"]')?.getAttribute('data-visivel') ?? '—');
}, total);
const logYt = (pagina) => pagina.evaluate(() => window.__yt.log.map((l) => ({ ...l })));
const players = (pagina) => pagina.evaluate(() => window.__yt.players.length);
const noAr = (e) => e.map((v, i) => (v === 'sim' ? i : -1)).filter((i) => i >= 0);

async function esperarEstado(pagina, predicado, { limite = 12000, total = 3 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const e = await estados(pagina, total);
    if (predicado(e)) return e;
    if (Date.now() - t0 > limite) throw new Error(`o estado esperado não veio em ${limite} ms: ${JSON.stringify(e)}`);
    await pagina.waitForTimeout(60);
  }
}

test('🔴 UM vídeo por vez, na ordem da tela, e a vez dá a volta', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=900');
  try {
    const visto = [];
    let maximo = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 9500) {
      const ativos = noAr(await estados(pagina));
      maximo = Math.max(maximo, ativos.length);
      for (const i of ativos) if (visto[visto.length - 1] !== i) visto.push(i);
      await pagina.waitForTimeout(50);
    }
    assert.equal(maximo, 1, 'dois vídeos à mostra ao mesmo tempo — dessincronizado');
    assert.deepEqual(visto.slice(0, 4), [0, 1, 2, 0], `a ordem da vez não seguiu a da tela: ${visto}`);
  } finally { await ctx.close(); }
});

test('🔴 quem espera fica na FOTO e não baixa nada: o player do YouTube só nasce na sua vez', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=900');
  try {
    await esperarEstado(pagina, (e) => e[0] === 'sim');
    assert.equal(await players(pagina), 0, 'criou player do YouTube antes da vez');
    assert.equal(await pagina.locator('video').count(), 1, 'há mais de um <video> na tela enquanto só um toca');
    assert.equal(await pagina.locator('[data-teste="tocar-video"]').count(), 2, 'os dois que esperam mostram o botão "Vídeo"');
    // a foto continua lá, por baixo, nos que esperam
    assert.ok(await pagina.getByText('FOTO Hoverboard').count() === 0, 'a foto é imagem (SVG), não texto: o card segue sem player');
  } finally { await ctx.close(); }
});

test('🔴 tudo nasce MUDO e tocar em qualquer lugar NÃO liga o som — só o ícone liga', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=900');
  try {
    await esperarEstado(pagina, (e) => e[0] === 'sim');
    const mudo = () => pagina.evaluate(() => document.querySelector('[data-teste="video-do-card"][src], video[data-teste="video-do-card"]').muted);
    assert.equal(await mudo(), true, 'o vídeo nasceu com som');
    // o comportamento ANTIGO: o primeiro toque em qualquer ponto da página ligava o som
    await pagina.mouse.click(8, 8);
    await pagina.keyboard.press('Space');
    assert.equal(await mudo(), true, 'um toque fora do ícone ligou o som');
    const botao = pagina.locator('[data-teste="som-do-card"]');
    assert.equal(await botao.getAttribute('aria-label'), 'Ligar o som do vídeo');
    await botao.click();
    assert.equal(await mudo(), false, 'o ícone não ligou o som');
    assert.equal(await botao.getAttribute('aria-label'), 'Desligar o som do vídeo');
    await botao.click();
    assert.equal(await mudo(), true, 'o ícone não desligou o som');
  } finally { await ctx.close(); }
});

test('o som ligado vale para o vídeo SEGUINTE; desligar cala', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=2500');
  try {
    await esperarEstado(pagina, (e) => e[0] === 'sim');
    await pagina.locator('[data-teste="som-do-card"]').click();
    await esperarEstado(pagina, (e) => e[1] === 'sim', { limite: 15000 });
    const log = await logYt(pagina);
    const iB = log.findIndex((l) => l.id === 'YT_B' && l.ev === 'play');
    const antes = log.slice(0, iB + 1).filter((l) => l.id === 'YT_B');
    assert.ok(antes.some((l) => l.ev === 'unMute'), 'o vídeo seguinte não herdou o som ligado');
    assert.equal(log[iB].mudo, false, 'tocou mudo apesar do som ligado');
    // desliga no vídeo do YouTube
    await pagina.locator('[data-teste="som-do-card"]').click();
    const depois = await logYt(pagina);
    assert.ok(depois.slice(iB + 1).some((l) => l.id === 'YT_B' && l.ev === 'mute'), 'desligar não calou o YouTube');
  } finally { await ctx.close(); }
});

test('a vez passa pelo TEMPO MÁXIMO (15 s) quando o vídeo não termina', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=999999&ordem=yt', { relogio: true });
  try {
    await esperarEstado(pagina, (e) => e[0] === 'sim');
    await pagina.clock.runFor(16000);
    const e = await esperarEstado(pagina, (x) => x[0] !== 'sim' && x[1] !== '—', { limite: 8000 });
    assert.ok(noAr(e).every((i) => i !== 0), `o primeiro vídeo passou de 15 s: ${e}`);
  } finally { await ctx.close(); }
});

test('🔴 vídeo com ERRO passa a vez na hora e o card fica na foto', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=700&erroB=1');
  try {
    const visto = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < 7000) {
      for (const i of noAr(await estados(pagina))) visto.add(i);
      await pagina.waitForTimeout(40);
    }
    assert.ok(visto.has(0) && visto.has(2), `o rodízio travou no erro: ${[...visto]}`);
    assert.ok(!visto.has(1), 'o vídeo com erro chegou a aparecer');
    const log = await logYt(pagina);
    assert.ok(log.filter((l) => l.id === 'YT_B' && l.ev === 'play').length <= 1, 'insistiu no vídeo com erro');
  } finally { await ctx.close(); }
});

test('tocar em "Vídeo" num card que espera faz ele assumir a vez agora', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=999999&ordem=yt');
  try {
    await esperarEstado(pagina, (e) => e[0] === 'sim');
    // o card do arquivo (posição 2 nesta ordem) espera e mostra o botão
    await pagina.locator('[data-teste="grade"] > *').nth(2).locator('[data-teste="tocar-video"]').click();
    const e = await esperarEstado(pagina, (x) => x[2] === 'sim', { limite: 8000 });
    assert.deepEqual(noAr(e), [2], `a vez não mudou só para o card tocado: ${e}`);
  } finally { await ctx.close(); }
});

test('🔴 compartilhar um card do YouTube leva o link do VÍDEO na frente e NÃO anexa a foto', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=900');
  try {
    await pagina.locator('[data-teste="grade"] > *').nth(1).locator('button:has(svg[class*="share"])').first().click();
    await pagina.waitForFunction(() => window.__compartilhou.length > 0, null, { timeout: 8000 });
    const [d] = await pagina.evaluate(() => window.__compartilhou);
    assert.equal(d.files, undefined, 'anexou a foto no lugar do vídeo');
    assert.ok(d.text.startsWith('🎥 Veja em vídeo:'), `o vídeo não vai na frente: ${d.text.slice(0, 60)}`);
    assert.ok(d.text.includes('youtube.com/shorts/YT_B'));
    assert.match(d.url, /\/l\/b/, 'o nosso link (do leilão) segue em `url`');
  } finally { await ctx.close(); }
});

test('aba em segundo plano PAUSA o vídeo; ao voltar, retoma', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=999999&ordem=yt');
  try {
    await esperarEstado(pagina, (e) => e[0] === 'sim');
    await pagina.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await pagina.waitForFunction(() => window.__yt.log.some((l) => l.id === 'YT_B' && l.ev === 'pause'), null, { timeout: 5000 });
    const antes = (await logYt(pagina)).filter((l) => l.id === 'YT_B' && l.ev === 'play').length;
    await pagina.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await pagina.waitForFunction((n) => window.__yt.log.filter((l) => l.id === 'YT_B' && l.ev === 'play').length > n, antes, { timeout: 5000 });
  } finally { await ctx.close(); }
});

test('economia de dados: nada toca sozinho; o toque em "Vídeo" toca UMA vez e volta à foto', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('economia=1&dur=900');
  try {
    await pagina.waitForTimeout(1500);
    assert.deepEqual(noAr(await estados(pagina)), [], 'tocou sozinho com economia de dados ligada');
    assert.equal(await pagina.locator('video').count(), 0, 'baixou vídeo com economia de dados ligada');
    await pagina.locator('[data-teste="grade"] > *').nth(0).locator('[data-teste="tocar-video"]').click();
    await esperarEstado(pagina, (e) => e[0] === 'sim', { limite: 8000 });
    await esperarEstado(pagina, (e) => e[0] !== 'sim', { limite: 12000 });
    await pagina.waitForTimeout(800);
    assert.deepEqual(noAr(await estados(pagina)), [], 'repetiu sozinho depois de terminar');
  } finally { await ctx.close(); }
});

test('o card da LOJA entra no mesmo rodízio, com o mesmo botão de som', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('dur=700&loja=1', { altura: 1500 });
  try {
    const visto = new Set();
    const t0 = Date.now();
    let maximo = 0;
    while (Date.now() - t0 < 10000 && !visto.has(3)) {
      const e = await estados(pagina, 4);
      maximo = Math.max(maximo, noAr(e).length);
      for (const i of noAr(e)) visto.add(i);
      await pagina.waitForTimeout(50);
    }
    assert.ok(visto.has(3), `o card da Loja nunca recebeu a vez: ${[...visto]}`);
    assert.equal(maximo, 1, 'dois vídeos ao mesmo tempo entre Leilão e Loja');
    // na vez da Loja, o ícone de som existe nele
    const log = await logYt(pagina);
    assert.ok(log.some((l) => l.id === 'YT_LOJA' && l.ev === 'play'));
  } finally { await ctx.close(); }
});
