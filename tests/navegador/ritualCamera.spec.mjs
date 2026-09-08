/**
 * O RITUAL DO AMANHECER: o piso de 60s na visualização gravada + virar
 * câmera (DIR-93, 08/09/2026).
 *
 * 🔴 Dono: "toda comprovação tenha a possibilidade de virar a câmera...
 * precisa de pelo menos 01 minuto obrigatório e isso precisa ficar claro
 * pra pessoa, e deixar livre até a pessoa quiser".
 *
 * O que só o navegador mede: o botão "concluir a visualização" nasce
 * TRAVADO com o cronômetro contando o que falta, libera sozinho quando
 * bate 60s, e o botão de virar câmera não quebra a gravação em andamento.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-ritual-camera');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'ritual-camera.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/ritual-camera.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

// 🎥 câmera de mentira: um <canvas> vira MediaStream de verdade (o
// MediaRecorder não liga pro conteúdo, só precisa de uma trilha viva).
async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 480, height: 900 }, permissions: ['camera'] });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.addInitScript(() => {
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
    navigator.mediaDevices.getUserMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      return c.captureStream ? c.captureStream(10) : new MediaStream();
    };
  });
  await pagina.goto(BASE);
  await pagina.getByText('Começar o ritual').waitFor();
  return { pagina, ctx, erros };
}

async function chegarNaVisualizacao(pagina) {
  await pagina.getByText('Começar o ritual').click();
  await pagina.locator('textarea').first().fill('Sou grato pela minha família e pela saúde de todos.');
  await pagina.getByText('Continuar').click();
  await pagina.getByText('Gravar minha visualização').waitFor();
}

test('a gravação nasce travada com o cronômetro contando o que falta pro piso de 60s', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await chegarNaVisualizacao(pagina);
  await pagina.getByText('Gravar minha visualização').click();
  await pagina.locator('[data-teste="concluir-visualizacao"]').waitFor();

  // logo no início: travado, cronômetro diz quanto falta
  await pagina.waitForFunction(() => document.body.textContent.includes('grava mais'));
  assert.equal(await pagina.locator('[data-teste="concluir-visualizacao"]').isDisabled(), true);
  assert.match(await pagina.locator('[data-teste="concluir-visualizacao"]').textContent(), /libera em \d+s/);
  assert.match(await pagina.locator('[data-teste="cronometro-visualizacao"]').textContent(), /grava mais \d+ segundos? pra poder concluir/);

  await pagina.screenshot({ path: path.join(FOTOS, 'ritual-gravando-travado.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('virar câmera no meio da gravação não quebra a tela — reinicia gravando e travado de novo', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await chegarNaVisualizacao(pagina);
  await pagina.getByText('Gravar minha visualização').click();
  await pagina.locator('[data-teste="virar-camera-ritual"]').waitFor();

  await pagina.locator('[data-teste="virar-camera-ritual"]').click();
  // continua gravando (não fechou a tela), e o botão de concluir segue lá
  await pagina.locator('[data-teste="concluir-visualizacao"]').waitFor();
  assert.equal(await pagina.locator('[data-teste="concluir-visualizacao"]').isDisabled(), true);

  await pagina.screenshot({ path: path.join(FOTOS, 'ritual-depois-de-virar-camera.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});
