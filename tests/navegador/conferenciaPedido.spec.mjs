/**
 * 🖼️ A CONFERÊNCIA DO PEDIDO MOSTRA A FOTO DE CADA PRODUTO — num Chromium.
 *
 * 01/10/2026: a operadora abriu um pedido de nove produtos e viu nove ícones
 * de caixa iguais. Não conseguia identificar o que separar. A foto de cada
 * item passa a aparecer; sem foto, ou com foto quebrada, fica o ícone.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-conferencia-pedido');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'conferencia-pedido.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/conferencia-pedido.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

test('cada item com foto mostra a miniatura; sem foto ou com foto quebrada, o ícone de caixa', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const pagina = await nav.newPage({ viewport: { width: 480, height: 900 } });
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  const cards = pagina.locator('[data-teste="banca"] button');
  await cards.first().waitFor();
  assert.equal(await cards.count(), 5, 'os cinco itens da banca');

  // os três primeiros têm foto que carrega
  for (const i of [0, 1, 2]) {
    const img = cards.nth(i).locator('img');
    assert.equal(await img.count(), 1, `item ${i + 1} tem miniatura`);
    const carregou = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
    assert.ok(carregou, `a miniatura do item ${i + 1} carregou de verdade`);
  }
  // o quarto não tem foto nenhuma: ícone
  assert.equal(await cards.nth(3).locator('img').count(), 0, 'sem foto não desenha <img>');
  assert.equal(await cards.nth(3).locator('svg').count() >= 1, true, 'sem foto fica o ícone');
  // o quinto tem foto quebrada: o onError derruba a <img> e volta o ícone
  await pagina.waitForFunction(() => {
    const quinto = document.querySelectorAll('[data-teste="banca"] button')[4];
    return quinto && quinto.querySelectorAll('img').length === 0;
  }, null, { timeout: 5000 });

  // marcar continua funcionando com a miniatura no lugar
  await cards.nth(0).click();
  assert.match(await cards.nth(0).innerText(), /Conferido/, 'clicar no card marca o item');
  await pagina.close();
});
