/**
 * O ARRASTAR NÃO PODE MATAR O CLIQUE.
 *
 * 🔴 Dono (06/09/2026): a pílula do X-Music virou arrastável e "não está mais
 * abrindo o modal". A causa é pointer capture no pointerdown: com a captura
 * ativa, o navegador entrega o `click` ao elemento que capturou (a pílula), e
 * não ao botão embaixo do dedo — o onClick do botão não roda.
 *
 * Isto só existe num navegador. Então aqui roda o hook num Chromium real, com
 * eventos de ponteiro REAIS (mouse.down/move/up via CDP, não dispatchEvent):
 *   • um clique simples no botão de dentro CHEGA ao botão (o defeito);
 *   • arrastar move o alvo;
 *   • depois de arrastar, o clique-fantasma NÃO aciona o botão.
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
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
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

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
    const arq = path.join(SAIDA, rel === '/' ? 'arrastar.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/arrastar.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir({ toque = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(toque
    ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 800 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="botao"]').waitFor();
  return { pagina, ctx, erros };
}

const estado = async (pagina) => JSON.parse(await pagina.locator('[data-teste="estado"]').textContent());

// ─────────────── o defeito relatado ───────────────

test('MOUSE: clique simples no botão de dentro CHEGA ao botão', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  // mouse real: down e up no mesmo ponto, sem andar — é o toque que "não abria"
  const caixa = await pagina.locator('[data-teste="botao"]').boundingBox();
  await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await pagina.mouse.down();
  await pagina.mouse.up();
  assert.equal((await estado(pagina)).cliques, 1, 'o clique não chegou ao botão — é o defeito do pointer capture');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('DEDO: toque simples no botão de dentro CHEGA ao botão', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ toque: true });
  await pagina.locator('[data-teste="botao"]').tap();
  assert.equal((await estado(pagina)).cliques, 1, 'o toque não chegou ao botão');
  assert.deepEqual(erros, []);
  await ctx.close();
});

// ─────────────── o que continua precisando funcionar ───────────────

test('MOUSE: arrastar move o alvo e NÃO aciona o botão no fim', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const caixa = await pagina.locator('[data-teste="botao"]').boundingBox();
  const x0 = caixa.x + caixa.width / 2; const y0 = caixa.y + caixa.height / 2;
  await pagina.mouse.move(x0, y0);
  await pagina.mouse.down();
  for (let i = 1; i <= 10; i += 1) await pagina.mouse.move(x0 + i * 30, y0 + i * 20);
  await pagina.mouse.up();
  const s = await estado(pagina);
  assert.ok(s.x > 100, `o alvo não se moveu: x=${s.x}`);
  assert.equal(s.soltou, 1, 'aoSoltar não foi chamado');
  assert.equal(s.cliques, 0, 'o clique-fantasma do fim do arrasto acionou o botão');
  await ctx.close();
});

test('DEDO: arrastar move o alvo e NÃO aciona o botão no fim', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ toque: true });
  const caixa = await pagina.locator('[data-teste="botao"]').boundingBox();
  const x0 = caixa.x + caixa.width / 2; const y0 = caixa.y + caixa.height / 2;
  // toque real via CDP: down, uma sequência de moves, up
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 10; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + i * 20, y: y0 + i * 25 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const s = await estado(pagina);
  assert.ok(s.y > 100, `o alvo não se moveu no dedo: y=${s.y}`);
  assert.equal(s.cliques, 0, 'o toque-fantasma do fim do arrasto acionou o botão');
  await ctx.close();
});

test('depois do arrasto, um clique NOVO volta a chegar ao botão', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const caixa = await pagina.locator('[data-teste="botao"]').boundingBox();
  const x0 = caixa.x + caixa.width / 2; const y0 = caixa.y + caixa.height / 2;
  await pagina.mouse.move(x0, y0);
  await pagina.mouse.down();
  for (let i = 1; i <= 8; i += 1) await pagina.mouse.move(x0 + i * 25, y0);
  await pagina.mouse.up();
  await pagina.waitForTimeout(120); // a janela de 60ms do clique-fantasma passa
  await pagina.locator('[data-teste="botao"]').click();
  assert.equal((await estado(pagina)).cliques, 1, 'o botão ficou surdo depois de um arrasto');
  await ctx.close();
});
