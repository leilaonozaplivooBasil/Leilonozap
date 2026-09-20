/**
 * 🔔 O POP-UP VOLTA A CADA PÁGINA — num Chromium.
 *
 * Dono, 20/09/2026: "cada vez que o usuário entrar em uma página é necessário
 * que estoure o pop-up do leilão do PS5 com botão para dar lance."
 *
 * A regra (src/lib/popupLeilaoDestaque.js) tem 25 provas no Node e sabe dizer
 * "pode aparecer nesta página". Mas quem impedia o pop-up de VOLTAR não era a
 * regra: era o componente. O Layout monta `PopupLeilaoDestaque` UMA vez, e um
 * `useRef` travava em uma tentativa por montagem — navegar nunca refazia a
 * consulta. Ler o arquivo prova que o ref mudou de nome; só a tela prova que,
 * trocando de página, o pop-up volta mesmo.
 *
 * 🔴 O CONTROLE QUE IMPORTA: a prova de que ele volta só vale se antes ele
 * tiver realmente SUMIDO. Sem medir o sumiço, "está na tela" passaria com um
 * pop-up que nunca fechou — que é o bug oposto, e pior.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-popup-do-leilao');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'popup-do-leilao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/popup-do-leilao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir(busca = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="navegar"]', { timeout: 20000 });
  return { ctx, pagina };
}

const popup = (p) => p.locator('[role="dialog"][aria-label="Leilão em destaque"]');

test('🔴 fecha numa página, entra em outra, e o pop-up VOLTA', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();

  // 1. estourou sozinho na primeira página
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  const paginaUm = await pagina.locator('[data-teste="pagina-atual"]').innerText();

  // 2. fecha pelo X — e some DE VERDADE (o controle: sem este sumiço, o passo 4
  //    é decorativo). O X é o botão DENTRO do card; o outro "Fechar" é o véu de
  //    tela inteira, que fica por baixo e não recebe o clique.
  await pagina.locator('[role="dialog"] > div button[aria-label="Fechar"]').click();
  await popup(pagina).waitFor({ state: 'detached', timeout: 5000 });

  // 3. redesenhar a MESMA página não pode trazer de volta — seria armadilha
  await pagina.evaluate(() => window.dispatchEvent(new Event('resize')));
  await pagina.waitForTimeout(300);
  assert.equal(await popup(pagina).count(), 0, 'voltou sem trocar de página — pop-up que não fecha');

  // 4. entra em outra página: tem que voltar
  await pagina.locator('[data-teste="navegar"]').click();
  const paginaDois = await pagina.locator('[data-teste="pagina-atual"]').innerText();
  assert.notEqual(paginaDois, paginaUm, 'a banca não trocou de página — a medição abaixo não valeria');
  await popup(pagina).waitFor({ state: 'visible', timeout: 10000 });

  await ctx.close();
});

test('o botão de lance leva para a sala do leilão anunciado', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });

  const botao = pagina.locator('[role="dialog"] a[href*="AuctionRoom"]').first();
  assert.match(
    (await botao.innerText()).trim(),
    /lance/i,
    'o botão não fala em lance — o pedido era "botão para dar lance"',
  );
  const destino = await botao.getAttribute('href');
  assert.ok(destino, 'não achei link para a sala do leilão no pop-up');
  assert.match(destino, /ps5-de-mentira/, `o botão aponta para outro lugar: ${destino}`);

  await ctx.close();
});

test('🔴 na sala do leilão o pop-up NÃO aparece — cronômetro correndo', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?pagina=AuctionRoom');
  await pagina.waitForTimeout(1200);
  assert.equal(await popup(pagina).count(), 0, 'cobriu a tela de quem está dando lance');
  await ctx.close();
});

test('🔴 no checkout o pop-up NÃO aparece — pior hora para interromper', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?pagina=CatalogCheckout');
  await pagina.waitForTimeout(1200);
  assert.equal(await popup(pagina).count(), 0, 'cobriu a tela de quem está pagando');
  await ctx.close();
});

test('🔴 a contagem ANDA na tela — não é um carimbo', { skip: semNavegador }, async () => {
  // A função `contagemRegressiva` já tem prova no Node. Esta é outra coisa: que
  // o componente REPINTA a cada segundo. Um `setInterval` esquecido, uma
  // dependência errada no useEffect, e o texto fica congelado no primeiro valor
  // — certo, bonito, e parado. Ler o arquivo não pega isso.
  const { ctx, pagina } = await abrir();
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });

  const relogio = pagina.locator('[data-teste="contagem"]');
  const antes = (await relogio.innerText()).trim();
  assert.match(antes, /\d{2}:\d{2}:\d{2}/, `a contagem não parece um relógio: ${antes}`);

  await pagina.waitForTimeout(2200);
  const depois = (await relogio.innerText()).trim();
  assert.notEqual(depois, antes, `a contagem congelou em ${antes}`);

  await ctx.close();
});

test('a identidade da marca está no pop-up, não um verde qualquer', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });

  // O verde do botão tem que ser o nz-verde-neon (#3FD07E), o verde do símbolo
  // do logo — não o green-500 do Tailwind (#22C55E), que foi o que estava lá.
  const fundo = await pagina
    .locator('[role="dialog"] a[href*="AuctionRoom"]')
    .first()
    .evaluate((n) => getComputedStyle(n).backgroundColor);
  assert.equal(fundo, 'rgb(63, 208, 126)', `o botão não usa o verde da marca: ${fundo}`);

  // E a casa assina o pop-up.
  await pagina.locator('[role="dialog"]').getByText('Leilão NoZap').waitFor({ timeout: 5000 });

  await ctx.close();
});
