/**
 * 🔔 O POP-UP APARECE UMA VEZ POR ACESSO — num Chromium.
 *
 * Dono, 08/10/2026: "isso precisa aparecer só quando o usuário ENTRA, novo ou
 * antigo. Sempre que acessar, um em destaque; depois que ele fechar, não aparece
 * mais — senão a experiência do cliente fica ruim." (Em 20/09 o pedido era o
 * contrário, "a cada página"; o cliente trocava de página e levava o pop-up de
 * novo e de novo.)
 *
 * A regra (src/lib/popupLeilaoDestaque.js) tem prova no Node. Mas o que o
 * cliente sente é a TELA: trocar de página, recarregar, voltar de um app parado.
 * Isso só se mede com o componente real montado, como o Layout monta (uma vez só,
 * com a página mudando por baixo).
 *
 * 🔴 O CONTROLE QUE IMPORTA: "não voltou" só vale se antes ele tiver realmente
 * APARECIDO e SUMIDO. Sem medir isso, "não está na tela" passaria com um pop-up
 * que nunca abre — que é o bug oposto, e pior.
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

async function abrir(busca = '', { relogio = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 } });
  const pagina = await ctx.newPage();
  // relógio falso: o tempo corre normal, mas dá para PULAR minutos (app parado em segundo plano)
  if (relogio) await pagina.clock.install({ time: new Date() });
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="navegar"]', { timeout: 20000 });
  return { ctx, pagina };
}

const popup = (p) => p.locator('[role="dialog"][aria-label="Leilão em destaque"]');

test('🔴 abre uma vez: fecha, troca de página várias vezes e NÃO volta', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();

  // 1. estourou sozinho ao entrar
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  const paginaUm = await pagina.locator('[data-teste="pagina-atual"]').innerText();

  // 2. fecha pelo X — e some DE VERDADE (o controle: sem este sumiço, o passo 3
  //    é decorativo). O X é o botão DENTRO do card; o outro "Fechar" é o véu.
  await pagina.locator('[role="dialog"] > div button[aria-label="Fechar"]').click();
  await popup(pagina).waitFor({ state: 'detached', timeout: 5000 });

  // 3. troca de página VÁRIAS vezes (inclusive voltando à primeira): nunca volta
  for (let i = 0; i < 4; i += 1) {
    await pagina.locator('[data-teste="navegar"]').click();
    await pagina.waitForTimeout(500);
    assert.equal(await popup(pagina).count(), 0, `voltou ao trocar de página (troca ${i + 1}) — estressa o cliente`);
  }
  const paginaFinal = await pagina.locator('[data-teste="pagina-atual"]').innerText();
  assert.ok(paginaFinal, 'a banca não leu a página — a medição acima não valeria');
  assert.equal(paginaUm, 'Home', 'a banca começou numa página inesperada');

  await ctx.close();
});

test('🔴 mesmo SEM fechar, trocar de página não traz um segundo pop-up', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  // troca de página com o pop-up aberto (botão voltar do navegador, link de fora): o véu do
  // pop-up bloqueia o clique do dedo, então a troca é disparada por código
  await pagina.locator('[data-teste="navegar"]').dispatchEvent('click');
  await pagina.waitForTimeout(600);
  await pagina.locator('[data-teste="navegar"]').dispatchEvent('click');
  await pagina.waitForTimeout(800);
  assert.equal(await popup(pagina).count(), 0, 'o pop-up reapareceu depois da troca de página');
  await ctx.close();
});

test('🔴 acesso NOVO traz o pop-up de novo; recarregar no mesmo acesso, não', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?manter=1');
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  await pagina.locator('[role="dialog"] > div button[aria-label="Fechar"]').click();
  await popup(pagina).waitFor({ state: 'detached', timeout: 5000 });

  // recarregar a página (mesma sessão, minutos depois): é o mesmo acesso
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="navegar"]', { timeout: 20000 });
  await pagina.waitForTimeout(1200);
  assert.equal(await popup(pagina).count(), 0, 'recarregar trouxe o pop-up de volta no mesmo acesso');

  // acesso novo (abriu o site/app de novo = sessão nova): aparece
  await pagina.evaluate(() => sessionStorage.clear());
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="navegar"]', { timeout: 20000 });
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  await ctx.close();
});

test('🔴 app parado por mais de 30 min e de volta é um acesso novo; menos que isso, não', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?manter=1', { relogio: true });
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  await pagina.locator('[role="dialog"] > div button[aria-label="Fechar"]').click();
  await popup(pagina).waitFor({ state: 'detached', timeout: 5000 });

  // o app fica 5 minutos em segundo plano e volta: o mesmo acesso
  await pagina.clock.fastForward('05:00');
  await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await pagina.waitForTimeout(1200);
  assert.equal(await popup(pagina).count(), 0, 'voltou depois de só 5 minutos parado');

  // mais 30 minutos parado (35 no total desde a última atividade): o acesso venceu, é um novo
  await pagina.clock.fastForward('30:00');
  await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
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

test('🔴 mostra o leilão ESCOLHIDO, de ponta a ponta — título e foto dele, nunca o resíduo de outro (Hoverboard × PS5)', { skip: semNavegador }, async () => {
  // A configuração guardava a imagem e o título do PS5; o link já apontava para o Hoverboard.
  const { ctx, pagina } = await abrir('?velho=1');
  await popup(pagina).waitFor({ state: 'visible', timeout: 20000 });
  assert.equal((await popup(pagina).locator('h2').innerText()).trim(), 'Hoverboard Skate Elétrico 6.5 Polegadas');
  const foto = await popup(pagina).locator('img').first().getAttribute('src');
  const ps5 = await pagina.evaluate(() => window.__fotoPS5);
  const hoverboard = await pagina.evaluate(() => window.__fotoHoverboard);
  assert.notEqual(foto, ps5, 'abriu com a foto do PS5');
  assert.equal(foto, hoverboard, 'a foto não é a do leilão escolhido');
  assert.match(await popup(pagina).locator('a[href*="AuctionRoom"]').first().getAttribute('href'), /hoverboard-de-mentira/);
  await ctx.close();
});
