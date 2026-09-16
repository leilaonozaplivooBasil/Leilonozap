/**
 * 🎬 O VÍDEO 1:1 NO CARROSSEL DO LOTE — MEDIDO NUM CHROMIUM.
 *
 * Três coisas que só o navegador responde:
 *   • o vídeo 1:1 ENCAIXA na moldura quadrada — 100% x 100%, zero sobra
 *     (9:16 deixaria 43,8% vazio; foi por isso que o dono escolheu 1:1)
 *   • o autoavanço de 4s PARA no vídeo — senão ele é cortado no 4º segundo
 *   • a bolinha do vídeo é VISIVELMENTE diferente das outras
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-video-no-lote');
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
    const arq = path.join(SAIDA, rel === '/' ? 'video-no-lote.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/video-no-lote.html`;
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
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="moldura-galeria"]');
  return { ctx, pagina };
}

const slide = (pagina) => pagina.locator('[data-teste="slide-atual"]').innerText().then(Number);

test('🖼️ a moldura da galeria é QUADRADA', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  const c = await pagina.locator('[data-teste="moldura-galeria"]').boundingBox();
  assert.ok(Math.abs(c.width - c.height) <= 1, `moldura ${c.width}x${c.height} não é quadrada`);
  await ctx.close();
});

test('🎬 o vídeo 1:1 ENCAIXA na moldura — zero sobra', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await pagina.locator('[data-teste="bolinha-do-video"]').click();
  await pagina.waitForSelector('[data-teste="video-do-lote"]');
  const moldura = await pagina.locator('[data-teste="moldura-galeria"]').boundingBox();
  const caixa = await pagina.locator('[data-teste="video-do-lote"]').boundingBox();
  assert.ok(Math.abs(caixa.width - moldura.width) <= 1, `vídeo ${caixa.width} x moldura ${moldura.width}`);
  assert.ok(Math.abs(caixa.height - moldura.height) <= 1, `vídeo ${caixa.height} x moldura ${moldura.height}`);
  await ctx.close();
});

test('🔴 o autoavanço PARA no vídeo — 9 segundos e ele continua lá', { skip: semNavegador }, async () => {
  // o relógio é de 4s: sem a trava, em 9s teria girado duas vezes
  const { ctx, pagina } = await abrir();
  await pagina.locator('[data-teste="bolinha-do-video"]').click();
  const antes = await slide(pagina);
  await pagina.waitForTimeout(9000);
  assert.equal(await slide(pagina), antes, 'o carrossel girou por cima do vídeo');
  await ctx.close();
});

test('🔴 nas FOTOS o autoavanço continua girando', { skip: semNavegador }, async () => {
  // a trava não pode ter matado o carrossel
  const { ctx, pagina } = await abrir();
  const antes = await slide(pagina);
  await pagina.waitForTimeout(5000);
  assert.notEqual(await slide(pagina), antes, 'o autoavanço das fotos parou junto');
  await ctx.close();
});

test('▶ a bolinha do vídeo é visivelmente diferente das outras', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  const doVideo = await pagina.locator('[data-teste="bolinha-do-video"]').boundingBox();
  const daFoto = await pagina.locator('[data-teste="bolinha-foto-1"]').boundingBox();
  assert.ok(doVideo.width > daFoto.width * 2, `bolinha do vídeo ${doVideo.width} não se destaca da foto ${daFoto.width}`);
  const texto = await pagina.locator('[data-teste="bolinha-do-video"]').innerText();
  assert.match(texto.toLowerCase(), /v[íi]deo/, 'a bolinha do vídeo não diz que é vídeo');
  await ctx.close();
});

test('clicar na bolinha da foto volta pra foto', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await pagina.locator('[data-teste="bolinha-do-video"]').click();
  assert.equal(await pagina.locator('[data-teste="video-do-lote"]').count(), 1);
  await pagina.locator('[data-teste="bolinha-foto-0"]').click();
  assert.equal(await pagina.locator('[data-teste="video-do-lote"]').count(), 0, 'o vídeo continuou montado atrás da foto');
  await ctx.close();
});
