/**
 * 👆 O DEDO TROCA O BANNER, E A SETA SOME NO CELULAR — MEDIDO NUM CHROMIUM.
 *
 * Ordem do dono (16/09/2026), com o print do celular na mão: "os banners devem
 * alterar com o deslizar do dedo no celular, esses botões brancos na versão
 * mobile ficaram grande e ruins, remova. Apenas no mobile."
 *
 * Por que não dá pra testar isto lendo classe:
 *   • "a seta some no celular" é `hidden md:block` RESOLVIDO pelo navegador numa
 *     largura concreta — a classe existir não prova que ela sumiu;
 *   • "o dedo troca" depende de eventos de toque de verdade, da ordem
 *     touchstart→touchend e de quem escuta o clique primeiro;
 *   • e o mais importante: o banner ocupa a largura toda da tela. Se o gesto
 *     prendesse o dedo, a ROLAGEM VERTICAL da página inteira travaria. Isso só
 *     se mede rolando.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-banner-deslizar');
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
    const arq = path.join(SAIDA, rel === '/' ? 'banner-deslizar.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/banner-deslizar.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

/** Abre a banca numa largura, com toque ligado quando for celular. */
async function abrir(largura, { toque = true } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({
    viewport: { width: largura, height: 780 },
    hasTouch: toque,
    isMobile: toque,
  });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="carrossel-de-banner"] img');
  return { ctx, pagina };
}

/**
 * Qual banner está na tela agora, pela arte — não pelo DOM.
 *
 * 🔴 A TROCA TEM TRANSIÇÃO DE 1 SEGUNDO (`duration-1000`). Comparar opacidade
 * com `=== '1'` lê o MEIO do fade e não acha ninguém: foi exatamente o que
 * derrubou três casos na primeira rodada. Aqui se escolhe o MAIS opaco, que é
 * o banner corrente em qualquer instante da animação.
 */
const bannerNaTela = (pagina) => pagina.evaluate(() => {
  const opacidade = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const candidatos = [...document.querySelectorAll('[data-teste="carrossel-de-banner"] img')]
    .filter((i) => !i.hasAttribute('aria-hidden'))
    .map((i) => ({ i, o: opacidade(i) }))
    .sort((a, b) => b.o - a.o);
  const src = candidatos[0]?.i.getAttribute('src') || '';
  if (src.includes('e0533f')) return 'um';
  if (src.includes('4d724b')) return 'dois';
  if (src.includes('6ba7d8')) return 'tres';
  return '(nenhum)';
});

/**
 * Arrasta o dedo DE VERDADE, pela entrada de toque do próprio navegador (CDP).
 *
 * 🔴 NÃO dá pra despachar TouchEvent por `evaluate`: evento sintético não passa
 * pelo pipeline de entrada, e o navegador NÃO sintetiza o clique que viria
 * depois. Com isso a trava de clique ficava sem teste — as mutações que a
 * removiam sobreviviam. Pelo CDP, quem decide se houve clique é o Chromium,
 * que é exatamente o que acontece no celular do cliente.
 */
async function deslizar(pagina, { dx = 0, dy = 0 }) {
  const caixa = await pagina.locator('[data-teste="carrossel-de-banner"]').boundingBox();
  const x0 = caixa.x + caixa.width / 2;
  const y0 = caixa.y + caixa.height / 2;
  const cdp = await pagina.context().newCDPSession(pagina);
  const ponto = (x, y) => [{ x: Math.round(x), y: Math.round(y), radiusX: 8, radiusY: 8, force: 1 }];

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: ponto(x0, y0) });
  for (let p = 1; p <= 6; p++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: ponto(x0 + (dx * p) / 6, y0 + (dy * p) / 6),
    });
    await pagina.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach().catch(() => {});
  // a transição é de 1s: ler antes disso é ler o meio do fade
  await pagina.waitForTimeout(1200);
}

// ─── a seta ────────────────────────────────────────────────────────────────

test('📱 no celular (390px) a seta NÃO é desenhada', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  const setas = pagina.locator('[aria-label="Banner anterior"], [aria-label="Próximo banner"]');
  assert.equal(await setas.count(), 2, 'premissa: os dois botões existem no DOM');
  assert.equal(await setas.first().isVisible(), false, 'a seta continua aparecendo no celular');
  assert.equal(await setas.last().isVisible(), false);
  // e o navegador confirma o porquê
  assert.equal(await setas.first().evaluate((e) => getComputedStyle(e).display), 'none');
  await ctx.close();
});

test('🖥️ no desktop (1280px) a seta continua lá', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(1280, { toque: false });
  const seta = pagina.locator('[aria-label="Próximo banner"]').first();
  assert.notEqual(await seta.evaluate((e) => getComputedStyle(e).display), 'none',
    'a seta sumiu no desktop também — o pedido era SÓ no mobile');
  await ctx.close();
});

test('o corte da seta é o MESMO do isMobile (768px), sem faixa órfã', { skip: semNavegador }, async () => {
  // a 767 a seta some e o dedo vale; a 768 a seta aparece. Se os dois cortes
  // divergissem, haveria largura sem seta E sem gesto.
  // 🔴 AS DUAS SETAS. Conferir só uma deixa passar quem mudar o corte de UMA
  // delas — foi o que sobreviveu na primeira rodada de mutação.
  for (const [largura, deveAparecer] of [[767, false], [768, true]]) {
    const { ctx, pagina } = await abrir(largura, { toque: false });
    for (const rotulo of ['Banner anterior', 'Próximo banner']) {
      const display = await pagina.locator(`[aria-label="${rotulo}"]`).first()
        .evaluate((e) => getComputedStyle(e).display);
      assert.equal(display !== 'none', deveAparecer, `${rotulo} a ${largura}px`);
    }
    await ctx.close();
  }
});

// ─── o dedo ────────────────────────────────────────────────────────────────

test('👆 arrastar pra ESQUERDA vai pro próximo banner', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  assert.equal(await bannerNaTela(pagina), 'um', 'premissa: começa no primeiro');
  await deslizar(pagina, { dx: -120 });
  assert.equal(await bannerNaTela(pagina), 'dois');
  await ctx.close();
});

test('👆 arrastar pra DIREITA volta — e dá a volta no primeiro', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  await deslizar(pagina, { dx: 120 });
  assert.equal(await bannerNaTela(pagina), 'tres', 'voltar do primeiro tem que dar a volta');
  await ctx.close();
});

test('🔴 arrastar pra BAIXO não troca de banner — é rolagem de página', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  const antes = await bannerNaTela(pagina);
  await deslizar(pagina, { dy: 200 });
  assert.equal(await bannerNaTela(pagina), antes, 'a rolagem vertical trocou o banner');
  await ctx.close();
});

test('🔴 rolar com o dedo torto (diagonal) NÃO troca de banner', { skip: semNavegador }, async () => {
  // 🔴 ESTE é o caso que prova a guarda `|dx| > |dy|`. Com dx = 0 o gesto já
  // cairia no piso de 40px — tirar a guarda passava batido. Ninguém rola a
  // página com o dedo perfeitamente reto: 60px pro lado e 200px pra baixo é
  // rolagem, não troca de banner.
  const { ctx, pagina } = await abrir(390);
  const antes = await bannerNaTela(pagina);
  await deslizar(pagina, { dx: -60, dy: 200 });
  assert.equal(await bannerNaTela(pagina), antes, 'rolar torto trocou o banner');
  await ctx.close();
});

test('🔴 a rolagem vertical da página CONTINUA funcionando por cima do banner', { skip: semNavegador }, async () => {
  // 🔴 ROLA COM O DEDO, não com a roda do mouse. A roda não sofre com
  // `preventDefault` de toque — com ela, pôr um preventDefault no touchstart
  // passava no teste e travaria a página no celular de verdade.
  // O banner ocupa a largura toda: prender o dedo aqui prende a página inteira.
  const { ctx, pagina } = await abrir(390);
  assert.equal(await pagina.evaluate(() => window.scrollY), 0, 'premissa: começa no topo');
  await deslizar(pagina, { dy: -300 });   // dedo sobe = página desce
  const rolou = await pagina.evaluate(() => window.scrollY);
  assert.ok(rolou > 100, `a página não rolou com o dedo por cima do banner (scrollY=${rolou})`);
  await ctx.close();
});

test('tremida de dedo (menos de 40px) não troca de banner', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  const antes = await bannerNaTela(pagina);
  await deslizar(pagina, { dx: -25 });
  assert.equal(await bannerNaTela(pagina), antes, 'um toque trêmulo virou troca de banner');
  await ctx.close();
});

test('🔗 terminar o gesto em cima do banner NÃO abre o link', { skip: semNavegador }, async () => {
  // 🔴 O BANNER ABRE EM NOVA ABA (`target="_blank"`). Olhar `pagina.url()` NUNCA
  // veria a navegação — por isso a mutação que derruba a trava do clique
  // sobreviveu na primeira rodada. Aqui se escuta a aba nova.
  const { ctx, pagina } = await abrir(390);
  const urlAntes = pagina.url();
  const abasNovas = [];
  ctx.on('page', (p) => abasNovas.push(p));

  await deslizar(pagina, { dx: -120 });
  await pagina.waitForTimeout(400);

  assert.equal(abasNovas.length, 0, `o deslize abriu ${abasNovas.length} aba(s) do link do banner`);
  assert.equal(pagina.url(), urlAntes, 'o deslize navegou na própria aba');
  assert.equal(await bannerNaTela(pagina), 'dois', 'e ainda assim tinha que ter trocado');
  await ctx.close();
});

test('🔗 tocar (sem deslizar) CONTINUA abrindo o link — a trava não pode matar o clique', { skip: semNavegador }, async () => {
  // a trava dura 250ms e só liga depois de um deslize de verdade: um toque
  // normal no banner tem que continuar levando a pessoa pro leilão
  const { ctx, pagina } = await abrir(390);
  const abasNovas = [];
  ctx.on('page', (p) => abasNovas.push(p));

  const caixa = await pagina.locator('[data-teste="carrossel-de-banner"]').boundingBox();
  await pagina.touchscreen.tap(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await pagina.waitForTimeout(500);

  assert.equal(abasNovas.length, 1, 'o toque simples parou de abrir o banner');
  await ctx.close();
});
