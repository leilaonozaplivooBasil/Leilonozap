/**
 * Carrossel de ofertas — teste NUM NAVEGADOR DE VERDADE, com o componente real.
 *
 * 🔴 POR QUE ISTO EXISTE (02/09/2026)
 * "No preview não consigo clicar nos produtos em oferta."
 *
 * O arrasto chamava `setPointerCapture` no `pointerdown`. Com captura ativa o
 * NAVEGADOR ENTREGA O `click` A QUEM CAPTUROU, e não ao card — nenhum produto
 * abria. Teste de texto nenhum pega isso: é comportamento do navegador.
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
 *   npm run test:navegador
 * Sem o playwright instalado, este arquivo se anuncia e sai — não finge que
 * passou.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = path.join(tmpdir(), 'banca-carrossel');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: o teste se marca como PULADO abaixo */ }

// Sem playwright isto tem de aparecer como PULADO, nunca como verde: um "pass"
// mentiroso é pior que teste nenhum, porque dá a impressão de que foi conferido.
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

/** Constrói a banca, sobe o servidor e abre o navegador — só na primeira vez. */
async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  // Módulo ES não carrega por `file://` (CORS). A banca precisa de HTTP de verdade.
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'index.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

/** Abre a banca e devolve a página já com a faixa medida. */
async function abrir({ largura = 1200 } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 700 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE);
  const faixa = pagina.locator('.ofr-trilho');
  await faixa.waitFor();
  // o rolo sozinho anda; para medir arrasto e seta, ele precisa estar parado
  await pagina.mouse.move(largura / 2, 400);
  return { pagina, faixa, ctx };
}
const rolagem = (faixa) => faixa.evaluate((el) => el.scrollLeft);
const aberto = (pagina) => pagina.locator('[data-teste="produto-aberto"]').innerText();

// ─────────────── o que o dono não conseguia fazer ───────────────

test('clicar num card ABRE o produto', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('.ofr-trilho button').first().click();
  assert.notEqual(await aberto(pagina), '', 'o clique não chegou no card — o produto não abre');
  await ctx.close();
});

test('clicar num card do meio da faixa também abre', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('.ofr-trilho button').nth(4).click();
  assert.equal(await aberto(pagina), 'p4');
  await ctx.close();
});

// ─────────────── arrastar ───────────────

test('arrastar com o mouse rola a faixa', { skip: semNavegador }, async () => {
  const { pagina, faixa, ctx } = await abrir();
  const antes = await rolagem(faixa);
  const cx = await faixa.evaluate((el) => el.getBoundingClientRect());
  await pagina.mouse.move(cx.x + 400, cx.y + cx.height / 2);
  await pagina.mouse.down();
  for (const p of [350, 280, 200, 120]) await pagina.mouse.move(cx.x + p, cx.y + cx.height / 2);
  await pagina.mouse.up();
  assert.ok(await rolagem(faixa) > antes + 100, `a faixa não andou (${antes} → ${await rolagem(faixa)})`);
  await ctx.close();
});

test('arrastar por cima de um card NÃO abre o produto', { skip: semNavegador }, async () => {
  // Soltar o mouse em cima de um card depois de arrastar abriria o produto.
  const { pagina, faixa, ctx } = await abrir();
  const cx = await faixa.evaluate((el) => el.getBoundingClientRect());
  await pagina.mouse.move(cx.x + 400, cx.y + cx.height / 2);
  await pagina.mouse.down();
  for (const p of [350, 280, 200, 120]) await pagina.mouse.move(cx.x + p, cx.y + cx.height / 2);
  await pagina.mouse.up();
  assert.equal(await aberto(pagina), '', 'arrastar abriu o produto sem querer');
  await ctx.close();
});

test('mexer 2px ainda é clique, não arrasto', { skip: semNavegador }, async () => {
  const { pagina, faixa, ctx } = await abrir();
  const cx = await faixa.evaluate((el) => el.getBoundingClientRect());
  await pagina.mouse.move(cx.x + 60, cx.y + cx.height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(cx.x + 62, cx.y + cx.height / 2);
  await pagina.mouse.up();
  assert.notEqual(await aberto(pagina), '', 'tremida de 2px matou o clique');
  await ctx.close();
});

// ─────────────── setas ───────────────

test('a seta rola a faixa', { skip: semNavegador }, async () => {
  const { pagina, faixa, ctx } = await abrir();
  const antes = await rolagem(faixa);
  await pagina.locator('[aria-label="Ver mais ofertas"]').click();
  await pagina.waitForTimeout(700);   // scrollBy é suave
  assert.ok(await rolagem(faixa) > antes + 100, 'a seta não rolou a faixa');
  await ctx.close();
});

test('as setas ficam à mostra, sem precisar descobrir com o mouse', { skip: semNavegador }, async () => {
  // Escondê-las até o hover foi a primeira ideia e estava errada: seta que só
  // aparece quando o mouse passa por cima é seta que metade das pessoas nunca
  // acha — e o pedido era "setas para conseguir ver as demais ofertas".
  const { pagina, ctx } = await abrir();
  for (const nome of ['Ver ofertas anteriores', 'Ver mais ofertas']) {
    const seta = pagina.locator(`[aria-label="${nome}"]`);
    const est = await seta.evaluate((el) => {
      const c = getComputedStyle(el);
      return { opacidade: Number(c.opacity), clicavel: c.pointerEvents !== 'none' };
    });
    assert.ok(est.opacidade > 0.5, `"${nome}" está invisível (opacidade ${est.opacidade})`);
    assert.equal(est.clicavel, true, `"${nome}" não aceita clique`);
  }
  await ctx.close();
});

test('a seta não tapa o card: o produto embaixo continua abrindo', { skip: semNavegador }, async () => {
  // As setas ficam nas bordas, sobre a faixa. Um card do meio tem de continuar
  // clicando normalmente — é o bug que o dono viu, só que por outro caminho.
  const { pagina, faixa, ctx } = await abrir();
  const seta = await pagina.locator('[aria-label="Ver mais ofertas"]').boundingBox();
  const cards = pagina.locator('.ofr-trilho button:not([aria-label])');
  const total = await cards.count();
  let clicados = 0;
  for (let i = 0; i < Math.min(total, 5); i++) {
    const cx = await cards.nth(i).boundingBox();
    if (!cx) continue;
    const centro = { x: cx.x + cx.width / 2, y: cx.y + cx.height / 2 };
    const sobASeta = seta && centro.x >= seta.x && centro.x <= seta.x + seta.width
      && centro.y >= seta.y && centro.y <= seta.y + seta.height;
    if (sobASeta) continue;
    await cards.nth(i).click();
    assert.notEqual(await aberto(pagina), '', `card ${i} não abriu`);
    clicados++;
  }
  assert.ok(clicados >= 3, `só ${clicados} cards foram testados`);
  await ctx.close();
});

// ─────────────── a faixa rola de verdade (é o que o dedo usa) ───────────────

test('a faixa é rolável — é isso que dá o deslizar do celular de graça', { skip: semNavegador }, async () => {
  const { faixa, ctx } = await abrir({ largura: 420 });
  const m = await faixa.evaluate((el) => ({
    rolavel: el.scrollWidth > el.clientWidth,
    overflow: getComputedStyle(el).overflowX,
  }));
  assert.equal(m.rolavel, true, 'a faixa não tem para onde rolar');
  assert.equal(m.overflow, 'auto', 'a faixa voltou a não rolar (transform não é rolagem)');
  await ctx.close();
});

test('a roda do mouse rola a faixa e pausa o rolo sozinho', { skip: semNavegador }, async () => {
  const { pagina, faixa, ctx } = await abrir();
  const cx = await faixa.evaluate((el) => el.getBoundingClientRect());
  await pagina.mouse.move(cx.x + 300, cx.y + cx.height / 2);
  const antes = await rolagem(faixa);
  await pagina.mouse.wheel(250, 0);
  await pagina.waitForTimeout(120);
  assert.ok(await rolagem(faixa) > antes + 100, 'a roda não rolou a faixa');
  await ctx.close();
});

// ─────────────── e o preço de referência, na tela de verdade ───────────────

test('só o produto com preço de referência que se sustenta mostra o riscado', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const riscados = await pagina.locator('.ofr-trilho .line-through').count();
  const cards = await pagina.locator('.ofr-trilho button').count();
  // 12 produtos desenhados 2x = 24 cards; só o `p3` tem market_value
  assert.equal(cards, 24);
  assert.equal(riscados, 2, `${riscados} preços riscados — só o p3 deveria ter`);
  await ctx.close();
});
