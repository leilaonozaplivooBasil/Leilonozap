/**
 * O CARTÃO DE SEÇÕES no navegador (dono, 06/09/2026: organização e abertura).
 *   • desktop: as duas famílias lado a lado, cada uma com selo e legenda; o menu não sai da tela;
 *   • perto do rodapé: abre PRA CIMA;
 *   • celular: uma coluna, com altura limitada e rolagem própria;
 *   • escolher uma seção fecha o menu e muda o botão.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-secoes');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';
let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'secoes.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/secoes.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });
async function abrir({ celular = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(celular ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="topo"] button[aria-haspopup="menu"]').waitFor();
  return { pagina, ctx, erros };
}
const caixa = (loc) => loc.boundingBox();

test('DESKTOP: abre pra baixo com as duas famílias lado a lado, selo e legenda, dentro da tela; escolher fecha e muda o botão', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.locator('[data-teste="topo"] button[aria-haspopup="menu"]').click();
  const menu = pagina.locator('[data-menu-central-vendas]');
  await menu.waitFor();
  await pagina.waitForTimeout(250); // o respiro da entrada
  assert.equal(await menu.getAttribute('data-abre'), 'baixo');
  assert.equal(await menu.locator('[data-familia]').count(), 2);
  const [loja, top] = await Promise.all([caixa(menu.locator('[data-familia="loja"]')), caixa(menu.locator('[data-familia="top"]'))]);
  assert.ok(top.x > loja.x + loja.width - 2, 'a Top College fica AO LADO da Loja & Vendas, não embaixo');
  assert.match(await menu.locator('[data-familia="top"]').textContent(), /Top College.*o que forma: método, encontro, time, carreira/);
  assert.match(await menu.locator('[data-familia="loja"]').textContent(), /Loja & Vendas.*o caixa: vender, receber, entregar/);
  const m = await caixa(menu);
  assert.ok(m.y + m.height <= 800 && m.x + m.width <= 1280, `o menu saiu da tela: ${JSON.stringify(m)}`);
  assert.ok(m.height < 340, `o menu ficou alto demais (${m.height}px): as famílias deviam estar lado a lado`);
  assert.deepEqual(await menu.locator('[data-familia="top"] [role="menuitem"]').allTextContents(), ['O Método', 'Mentalidade', 'Time', 'X-Performance', 'Carreira']);
  await pagina.screenshot({ path: path.join(FOTOS, 'secoes-desktop.png') });
  await menu.locator('[role="menuitem"]', { hasText: 'Mentalidade' }).click();
  await menu.waitFor({ state: 'detached' });
  assert.equal(await pagina.locator('[data-teste="secao-atual"]').textContent(), 'catalogo-encontro');
  assert.match(await pagina.locator('[data-teste="topo"] button[aria-haspopup="menu"]').textContent(), /Top College.*Mentalidade/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('RODAPÉ: sem espaço embaixo, abre PRA CIMA e continua dentro da tela', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const botao = pagina.locator('[data-teste="rodape"] button[aria-haspopup="menu"]');
  await botao.scrollIntoViewIfNeeded();
  await botao.click();
  const menu = pagina.locator('[data-menu-central-vendas]');
  await menu.waitFor();
  await pagina.waitForTimeout(250);
  assert.equal(await menu.getAttribute('data-abre'), 'cima');
  const [m, b] = await Promise.all([caixa(menu), caixa(botao)]);
  assert.ok(m.y + m.height <= b.y + 2, 'o menu fica acima do botão');
  assert.ok(m.y >= 0, 'não vaza pelo topo');
  await pagina.screenshot({ path: path.join(FOTOS, 'secoes-para-cima.png') });
  await ctx.close();
});

test('CELULAR: uma coluna, altura limitada com rolagem própria, sem sair da tela', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.locator('[data-teste="topo"] button[aria-haspopup="menu"]').tap();
  const menu = pagina.locator('[data-menu-central-vendas]');
  await menu.waitFor();
  await pagina.waitForTimeout(250);
  const [loja, top, m] = await Promise.all([caixa(menu.locator('[data-familia="loja"]')), caixa(menu.locator('[data-familia="top"]')), caixa(menu)]);
  assert.ok(top.y >= loja.y + loja.height - 2, 'no celular a Top College vem EMBAIXO da Loja & Vendas');
  assert.ok(m.x >= 0 && m.x + m.width <= 390 && m.y + m.height <= 844, `o menu saiu da tela: ${JSON.stringify(m)}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'secoes-celular.png') });
  await ctx.close();
});
