/**
 * O FUNIL MOVE CARD NO DEDO — E CONTINUA MOVENDO NO MOUSE.
 *
 * 🔴 Dono (06/09/2026): "não está funcionando no móvel". A causa era a API: o
 * funil usava o arrastar nativo do HTML5 (draggable/onDragStart/dataTransfer),
 * que é de mouse — navegador de celular não dispara nenhum desses eventos.
 *
 * E logo em seguida veio a pergunta que este arquivo existe pra responder:
 * "não vai quebrar o que está funcionando no computador, não né?".
 *
 * NENHUM TESTE EM NÓ RESPONDE ISSO. Arrastar e soltar do HTML5 e eventos de
 * toque só existem num navegador. Então aqui roda o componente de verdade, num
 * Chromium de verdade, e a banca guarda a última mudança pedida:
 *   • MOUSE  — arrastar o card até a coluna, como sempre foi;
 *   • DEDO   — tocar a alça ✥ e tocar a coluna de destino (o caminho novo);
 *   • e o que NÃO pode mudar: tocar no corpo do card abre o perfil, e cliente
 *     automático não ganha alça nenhuma.
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
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'funil.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/funil.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

/** @param {{toque?: boolean}} [opts] toque=true simula telefone de verdade */
async function abrir({ toque = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(toque
    ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Ana Manual').waitFor();
  return { pagina, ctx, erros };
}

const movido = (pagina) => pagina.locator('[data-teste="movido"]').textContent();
const aberto = (pagina) => pagina.locator('[data-teste="aberto"]').textContent();
const cartao = (pagina, nome) => pagina.locator('div').filter({ hasText: nome }).last();

// ─────────────── o que o dono perguntou: o mouse continua igual? ───────────────

test('MOUSE: arrastar o card até a coluna continua movendo — nada quebrou', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();

  // o arrastar do HTML5 não sai de mouse.move(): tem que ser o evento mesmo.
  // Isto reproduz exatamente o que o navegador faz quando alguém arrasta o
  // card "Ana Manual" e solta na coluna "Pago".
  const resultado = await pagina.evaluate(() => {
    const card = [...document.querySelectorAll('[draggable="true"]')]
      .find((n) => n.textContent.includes('Ana Manual'));
    const colunaPago = [...document.querySelectorAll('div')]
      .filter((n) => n.className.includes('min-w-[140px]'))
      .find((n) => n.textContent.includes('Pago') && !n.textContent.includes('Aguardando'));
    if (!card || !colunaPago) return { erro: 'não achei card ou coluna' };
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    colunaPago.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    colunaPago.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return { ok: true };
  });
  assert.ok(!resultado.erro, resultado.erro);

  await pagina.waitForFunction(() => document.querySelector('[data-teste="movido"]').textContent !== '');
  assert.deepEqual(JSON.parse(await movido(pagina)), { id: 'm1', destino: 'pago' },
    'o arrastar de mouse parou de mover o card — ISSO seria a quebra que o dono temia');
  assert.deepEqual(erros, []);
  await ctx.close();
});

// ─────────────── o defeito relatado: no celular não movia nada ───────────────

test('DEDO: tocar a alça e tocar a coluna move o card', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ toque: true });

  await pagina.getByTitle('pegar para mudar de etapa').first().tap();
  await pagina.getByText('na mão — toque na etapa de destino').waitFor();

  await pagina.getByRole('button', { name: /soltar em Pago/ }).first().tap();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="movido"]').textContent !== '');

  assert.deepEqual(JSON.parse(await movido(pagina)), { id: 'm1', destino: 'pago' });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('DEDO: dá pra desistir — larga o card sem mover nada', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ toque: true });
  await pagina.getByTitle('pegar para mudar de etapa').first().tap();
  await pagina.getByTitle('desistir').tap();
  await pagina.getByText('na mão — toque na etapa de destino').waitFor({ state: 'detached' });
  assert.equal(await movido(pagina), '', 'desistir moveu o card assim mesmo');
  await ctx.close();
});

// ─────────────── o que NÃO pode ter mudado junto ───────────────

test('tocar no corpo do card continua abrindo o perfil, não pegando o card', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ toque: true });
  await pagina.getByText('Ana Manual').tap();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="aberto"]').textContent !== '');
  assert.equal(await aberto(pagina), 'm1');
  assert.equal(await movido(pagina), '', 'abrir o perfil não pode mover card');
  await ctx.close();
});

test('cliente AUTOMÁTICO não ganha alça: status dele vem do pedido real', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const alcas = await pagina.getByTitle('pegar para mudar de etapa').count();
  assert.equal(alcas, 2, `esperava alça só nos 2 manuais, achei ${alcas}`);
  const carla = cartao(pagina, 'Carla Pedido');
  assert.ok(!(await carla.getByTitle('pegar para mudar de etapa').count()),
    'o cliente automático ganhou alça — mover ele na mão seria mentira');
  await ctx.close();
});
