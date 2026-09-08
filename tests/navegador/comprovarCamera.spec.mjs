/**
 * O MODAL DE COMPROVAÇÃO: virar câmera pra bater a foto do livro (DIR-93,
 * 08/09/2026). Dono: "toda comprovação tenha a possibilidade de virar a
 * camera para bater a foto do livro por exemplo".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-comprovar-camera');
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
    const arq = path.join(SAIDA, rel === '/' ? 'comprovar-camera.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/comprovar-camera.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('a câmera ao vivo tem um botão de virar, e ele não quebra a captura', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 480, height: 700 }, permissions: ['camera'] });
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
  await pagina.getByText('Tirar foto agora').click();
  await pagina.locator('[data-teste="virar-camera"]').waitFor();
  await pagina.screenshot({ path: path.join(FOTOS, 'comprovar-camera-aberta.png') });

  await pagina.locator('[data-teste="virar-camera"]').click();
  // continua com a câmera aberta (não fechou, não travou) — capturar segue disponível
  await pagina.getByText('📸 Capturar').waitFor();
  await pagina.screenshot({ path: path.join(FOTOS, 'comprovar-camera-depois-de-virar.png') });

  assert.deepEqual(erros, []);
  await ctx.close();
});
