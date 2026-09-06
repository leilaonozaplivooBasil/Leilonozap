/**
 * A ORDEM DOS ÍCONES SE ARRASTA NO DEDO — E É A MESMA DO COMPUTADOR.
 *
 * 🔴 Dono (06/09/2026): "no celular não estou conseguindo arrastar de forma
 * simples os ícones, como no computador".
 *
 * O que só o navegador mede:
 *   • CELULAR (390px, toque REAL pelo CDP): segurar a alça ⠿ de um item e
 *     arrastar até a posição de outro muda a ordem na tela e grava no
 *     aparelho; recarregar mantém; um toque normal continua navegando;
 *     com busca digitada, arrastar fica desligado.
 *   • DESKTOP (1440px, mouse): a lateral continua arrastando como sempre
 *     E mostra a ordem que o celular gravou — é uma ordem só.
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

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
  const RAIZ = path.join(AQUI, '..', '..');
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    let arq = path.join(SAIDA, rel === '/' ? 'navegacao.html' : decodeURIComponent(rel));
    if (!existsSync(arq)) arq = path.join(RAIZ, 'public', decodeURIComponent(rel));
    if (!(arq.startsWith(SAIDA) || arq.startsWith(path.join(RAIZ, 'public'))) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/navegacao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function novoContexto({ celular = false } = {}) {
  const nav = await garantirNavegador();
  return nav.newContext(celular
    ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } });
}

async function abrirPagina(ctx) {
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="celular"]').waitFor();
  return { pagina, erros };
}

const CHAVE = 'navLateralOrdem_u1';
const ordemGravada = (pagina) => pagina.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), CHAVE);
const abas = async (pagina) => JSON.parse(await pagina.locator('[data-teste="abas"]').textContent());

// ─────────────── celular ───────────────

async function abrirMenu(pagina) {
  await pagina.getByText('Toque para navegar').tap();
  await pagina.locator('[data-teste="lista-navegacao"]').waitFor();
}
const ordemNaTela = (pagina) => pagina.locator('[data-item-navegacao]').evaluateAll((els) => els.map((e) => e.dataset.itemNavegacao));
const centroDe = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

// segura a alça (a biblioteca exige ~120ms parado antes de "levantar" o item),
// desliza em passos até o destino e solta — o mesmo gesto do polegar
async function arrastarNoDedo(pagina, ctx, de, ate) {
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: de.x, y: de.y }] });
  await pagina.waitForTimeout(300);
  for (let i = 1; i <= 12; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: de.x + (ate.x - de.x) * i / 12, y: de.y + (ate.y - de.y) * i / 12 }] });
    await pagina.waitForTimeout(30);
  }
  await pagina.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pagina.waitForTimeout(400); // animação de soltar
  await cdp.detach();
}

test('CELULAR: segurar a alça e arrastar muda a ordem na tela e grava no aparelho', { skip: semNavegador }, async () => {
  const ctx = await novoContexto({ celular: true });
  const { pagina, erros } = await abrirPagina(ctx);
  await abrirMenu(pagina);
  const antes = await ordemNaTela(pagina);
  assert.ok(antes.length >= 4, `poucos itens: ${antes.join(',')}`);
  assert.equal(await ordemGravada(pagina), null, 'não devia ter ordem gravada antes');
  await pagina.screenshot({ path: path.join(FOTOS, 'navegacao-celular-menu.png') });

  const alcas = pagina.locator('[data-teste="alca"]');
  const de = await centroDe(alcas.nth(0));
  const ate = await centroDe(alcas.nth(2));
  await arrastarNoDedo(pagina, ctx, de, { x: de.x, y: ate.y + 8 });

  const depois = await ordemNaTela(pagina);
  assert.notDeepEqual(depois, antes, 'a ordem na tela não mudou');
  assert.equal(depois[2], antes[0], `o 1º devia ter virado o 3º: ${depois.join(',')}`);
  assert.deepEqual(await ordemGravada(pagina), depois, 'o aparelho tem que guardar a mesma ordem da tela');
  await pagina.screenshot({ path: path.join(FOTOS, 'navegacao-celular-depois.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: recarregar mantém a ordem, e um toque normal continua navegando', { skip: semNavegador }, async () => {
  const ctx = await novoContexto({ celular: true });
  const { pagina } = await abrirPagina(ctx);
  await abrirMenu(pagina);
  const antes = await ordemNaTela(pagina);
  const alcas = pagina.locator('[data-teste="alca"]');
  await arrastarNoDedo(pagina, ctx, await centroDe(alcas.nth(0)), { ...(await centroDe(alcas.nth(0))), y: (await centroDe(alcas.nth(1))).y + 8 });
  const movida = await ordemNaTela(pagina);
  assert.equal(movida[1], antes[0]);

  await pagina.reload();
  await pagina.locator('[data-teste="celular"]').waitFor();
  await abrirMenu(pagina);
  assert.deepEqual(await ordemNaTela(pagina), movida, 'recarregou e perdeu a ordem');

  // toque normal no item de aba "Visão Geral": navega e fecha o menu
  await pagina.getByRole('button', { name: /visão geral/i }).first().tap();
  await pagina.waitForTimeout(200);
  assert.deepEqual((await abas(pagina)).at(-1), ['visao-geral', null]);
  assert.equal(await pagina.locator('[data-teste="lista-navegacao"]').count(), 0, 'o menu devia ter fechado');
  await ctx.close();
});

test('CELULAR: com busca digitada o arrastar fica desligado (a lista é um recorte)', { skip: semNavegador }, async () => {
  const ctx = await novoContexto({ celular: true });
  const { pagina } = await abrirPagina(ctx);
  await abrirMenu(pagina);
  await pagina.getByPlaceholder(/buscar seção/i).fill('a');
  const antes = await ordemNaTela(pagina);
  assert.ok(antes.length >= 2);
  const alcas = pagina.locator('[data-teste="alca"]');
  await arrastarNoDedo(pagina, ctx, await centroDe(alcas.nth(0)), { ...(await centroDe(alcas.nth(0))), y: (await centroDe(alcas.nth(1))).y + 8 });
  assert.deepEqual(await ordemNaTela(pagina), antes, 'com busca, arrastar não podia mudar nada');
  assert.equal(await ordemGravada(pagina), null);
  await ctx.close();
});

// ─────────────── desktop: o que NÃO pode quebrar ───────────────

test('DESKTOP: a lateral continua arrastando no mouse, e lê a MESMA ordem que o celular gravou', { skip: semNavegador }, async () => {
  const ctx = await novoContexto();
  const { pagina, erros } = await abrirPagina(ctx);
  const lateral = pagina.locator('aside [data-rfd-draggable-id]');
  const ordemLateral = () => lateral.evaluateAll((els) => els.map((e) => e.dataset.rfdDraggableId));
  const antes = await ordemLateral();
  assert.ok(antes.length >= 4);

  // arrasta o 1º ícone pra posição do 3º
  const de = await centroDe(lateral.nth(0));
  const ate = await centroDe(lateral.nth(2));
  await pagina.mouse.move(de.x, de.y);
  await pagina.mouse.down();
  await pagina.mouse.move(de.x, de.y + 10);
  for (let i = 1; i <= 12; i += 1) { await pagina.mouse.move(de.x, de.y + (ate.y + 8 - de.y) * i / 12); await pagina.waitForTimeout(30); }
  await pagina.waitForTimeout(150);
  await pagina.mouse.up();
  await pagina.waitForTimeout(400);
  const depois = await ordemLateral();
  assert.equal(depois[2], antes[0], `desktop: o 1º devia ter virado o 3º: ${depois.join(',')}`);
  assert.deepEqual(await ordemGravada(pagina), depois);

  // a mesma pessoa abre no celular: vê a ordem que arrumou no computador
  const celular = await navegador.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, storageState: await ctx.storageState() });
  const { pagina: fone } = await abrirPagina(celular);
  await abrirMenu(fone);
  assert.deepEqual(await ordemNaTela(fone), depois, 'o celular tinha que mostrar a ordem do computador');
  await celular.close();
  assert.deepEqual(erros, []);
  await ctx.close();
});
