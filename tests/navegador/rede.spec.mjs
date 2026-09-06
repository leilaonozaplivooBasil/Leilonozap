/**
 * A REDE (TreeHierarchy) MOVE PESSOA NO DEDO — E NO MOUSE.
 *
 * 🔴 Dono (06/09/2026): "vamos fazer esse arrasta onde faltou, sem quebrar
 * nada que esteja funcionando".
 *
 * O que a investigação achou: o NetworkTree com arrastar de HTML5 (só mouse)
 * era CÓDIGO MORTO — a página renderiza o TreeHierarchy, que já usa Pointer
 * Events. Então a pergunta certa virou: o componente VIVO move no dedo de
 * verdade? Só toque real responde. Aqui o TreeHierarchy real recebe
 * touchStart/Move/End pelo CDP (não é clique por script), e a banca guarda o
 * onRelink pedido.
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
    const arq = path.join(SAIDA, rel === '/' ? 'rede.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/rede.html`;
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
    : { viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Bruno Raiz').first().waitFor();
  await pagina.getByText('Carla Filha').first().waitFor();
  // 🗺️ "Ver tudo" enquadra a rede inteira na tela. Sem isto, a 390px a Carla
  // nasce parcialmente FORA da área visível — e toque em ponto fora da tela
  // não existe (o mouse do CDP não sofre esse recorte, por isso só o dedo
  // reprovava). No telefone real a pessoa arrasta o fundo pra trazer o nó;
  // aqui a banca enquadra, que é o equivalente determinístico.
  // Clicado cedo demais (antes de a árvore medir o próprio tamanho) o botão
  // não faz efeito — então repete até os três nós estarem dentro da tela.
  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    await pagina.getByRole('button', { name: /ver tudo/i }).first().click();
    await pagina.waitForTimeout(350); // a transição do enquadramento é de 180ms
    if (await todosNaTela(pagina)) break;
  }
  return { pagina, ctx, erros };
}

const NO = 'xpath=ancestor::*[contains(@class,"group/ident") or contains(@class,"group/node")][1]';
const dentro = (c, vp) => c.x > 0 && c.x < vp.width && c.y > 0 && c.y < vp.height;
async function todosNaTela(pagina) {
  const vp = pagina.viewportSize();
  for (const nome of ['Ana Raiz', 'Bruno Raiz', 'Carla Filha']) {
    const b = await pagina.getByText(nome).first().locator(NO).boundingBox();
    if (!b || !dentro({ x: b.x + b.width / 2, y: b.y + b.height / 2 }, vp)) return false;
  }
  return true;
}

const relinks = async (pagina) => JSON.parse(await pagina.locator('[data-teste="relinks"]').textContent());
// o centro do CARD do nó (não do texto): é o card que tem os pointerProps, e
// a banca ainda confere que o ponto está DENTRO da tela — senão a prova
// estaria tocando o vazio e reprovando por motivo errado
const centro = async (pagina, nome) => {
  const b = await pagina.getByText(nome).first().locator(NO).boundingBox();
  const c = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  assert.ok(dentro(c, pagina.viewportSize()), `${nome} fora da tela: ${JSON.stringify(c)}`);
  return c;
};
// o cartão "Mover X para baixo de Y?" pede confirmação — é o botão que não é Cancelar
const confirmar = (pagina) => pagina.getByRole('button', { name: /^(mover|confirmar|sim)/i }).first();

// ─────────────── o que NÃO pode quebrar: o mouse ───────────────

test('MOUSE: arrastar Carla até Bruno pede o movimento, e confirmar grava', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  const de = await centro(pagina, 'Carla Filha');
  const ate = await centro(pagina, 'Bruno Raiz');
  await pagina.mouse.move(de.x, de.y);
  await pagina.mouse.down();
  for (let i = 1; i <= 12; i += 1) await pagina.mouse.move(de.x + (ate.x - de.x) * i / 12, de.y + (ate.y - de.y) * i / 12);
  await pagina.mouse.up();
  await pagina.getByText(/para baixo de/).waitFor();
  await confirmar(pagina).click();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="relinks"]').textContent !== '[]');
  assert.deepEqual(await relinks(pagina), [{ movedId: 'carla', parentId: 'bruno', permitir: true }]);
  assert.deepEqual(erros, []);
  await ctx.close();
});

// ─────────────── a pergunta certa: o dedo ───────────────

test('DEDO: arrastar Carla até Bruno com toque real pede o movimento, e confirmar grava', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ toque: true });
  const de = await centro(pagina, 'Carla Filha');
  const ate = await centro(pagina, 'Bruno Raiz');
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: de.x, y: de.y }] });
  for (let i = 1; i <= 12; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: de.x + (ate.x - de.x) * i / 12, y: de.y + (ate.y - de.y) * i / 12 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pagina.getByText(/para baixo de/).waitFor({ timeout: 5000 });
  // ⏱️ Medido em 06/09/2026: um toque no "Confirmar" disparado NO MESMO
  // INSTANTE em que o cartão aparece (dentro dos 180ms da transição da
  // árvore) recebe pointerdown/pointerup e o Chrome não sintetiza o click.
  // Com 300ms de folga, funciona em todas as variantes testadas (tap cru,
  // tap com dedo parado, sem backdrop-blur, touchscreen.tap). Nenhum humano
  // toca nessa janela; a banca espera o cartão assentar, como a pessoa faz.
  await pagina.waitForTimeout(400);
  await confirmar(pagina).tap();
  await pagina.waitForFunction(() => document.querySelector('[data-teste="relinks"]').textContent !== '[]');
  assert.deepEqual(await relinks(pagina), [{ movedId: 'carla', parentId: 'bruno', permitir: true }]);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('DEDO: toque simples num nó NÃO vira movimento (abre o perfil, como sempre)', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ toque: true });
  const de = await centro(pagina, 'Carla Filha');
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: de.x, y: de.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pagina.waitForTimeout(400);
  assert.equal(await pagina.getByText(/para baixo de/).count(), 0, 'um toque simples abriu o cartão de mover');
  assert.deepEqual(await relinks(pagina), []);
  await ctx.close();
});

test('regra de negócio intacta: não move alguém pra baixo do próprio indicado', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const de = await centro(pagina, 'Ana Raiz');
  const ate = await centro(pagina, 'Carla Filha');
  await pagina.mouse.move(de.x, de.y);
  await pagina.mouse.down();
  for (let i = 1; i <= 12; i += 1) await pagina.mouse.move(de.x + (ate.x - de.x) * i / 12, de.y + (ate.y - de.y) * i / 12);
  await pagina.mouse.up();
  await pagina.waitForTimeout(400);
  assert.equal(await pagina.getByText(/para baixo de/).count(), 0, 'ofereceu mover Ana pra baixo da própria indicada');
  assert.deepEqual(await relinks(pagina), []);
  await ctx.close();
});
