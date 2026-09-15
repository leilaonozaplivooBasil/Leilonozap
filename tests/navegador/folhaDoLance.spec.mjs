/**
 * A FOLHA DE LANCE PRECISA CABER NA TELA — NUM CHROMIUM DE VERDADE.
 *
 * 🔴 Beatriz, 15/09/2026, com print: "não consigo ver a tela completa para dar
 * o lance". A folha "Escolha seu lance" abria espremida e cortada.
 *
 * Isto NÃO dá para provar lendo código: depende de como o navegador calcula o
 * bloco de referência de um `position: fixed`. O rodapé da sala tem
 * `backdrop-filter: blur(12px)`, e isso faz dele o bloco de referência de todo
 * `fixed` que estiver dentro — ou seja, `inset: 0` passava a significar "a
 * caixa do rodapé", não "a tela".
 *
 * Aqui a folha REAL é montada dentro de um rodapé REAL com backdrop-filter, num
 * telefone estreito e BAIXO, e mede-se o que o navegador realmente desenhou.
 *
 * A TESTEMUNHA: um `position: fixed` comum vai junto, no mesmo rodapé. Ele TEM
 * que sair contido. Se ele saísse tela cheia, o Chromium desta máquina não faria
 * containment e todo o resto do arquivo estaria medindo o nada.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-folha-do-lance');
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
    const arq = path.join(SAIDA, rel === '/' ? 'folha-do-lance.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/folha-do-lance.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

// Telefone estreito e BAIXO de propósito: é onde o corte aparecia.
async function abrirTela({ width = 390, height = 640 } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByRole('button', { name: /Dar Lance/i }).waitFor();
  return { pagina, ctx, erros, width, height };
}

const caixaDe = (pagina, seletor) => pagina.locator(seletor).boundingBox();

test('🧪 TESTEMUNHA: um `fixed` comum no rodapé SAI CONTIDO — o containment é real aqui', { skip: semNavegador }, async () => {
  const { pagina, ctx, height } = await abrirTela();
  const t = await caixaDe(pagina, '[data-parte="testemunha"]');
  const rodape = await caixaDe(pagina, '[data-parte="rodape"]');
  assert.ok(t.height < height * 0.6,
    `a testemunha ocupou ${Math.round(t.height)}px de ${height} — este Chromium não faz containment, o resto do arquivo não prova nada`);
  assert.ok(Math.abs(t.height - rodape.height) < 2,
    `a testemunha (${Math.round(t.height)}px) deveria ter a altura do rodapé (${Math.round(rodape.height)}px)`);
  await ctx.close();
});

test('🔴 O DEFEITO: a folha aberta cobre a TELA, não a caixa do rodapé', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros, height, width } = await abrirTela();
  await pagina.getByRole('button', { name: /Dar Lance/i }).tap();
  await pagina.getByText('Escolha seu lance').waitFor();

  const veu = await caixaDe(pagina, '.fixed.inset-0.z-\\[2100\\]');
  assert.ok(veu, 'não achei o véu da folha');
  assert.ok(Math.abs(veu.height - height) < 2, `o véu tem ${Math.round(veu.height)}px e a tela tem ${height}px — a folha continua presa no rodapé`);
  assert.ok(Math.abs(veu.width - width) < 2, `o véu tem ${Math.round(veu.width)}px de largura e a tela tem ${width}px`);
  assert.ok(veu.y <= 1, `o véu começa em y=${Math.round(veu.y)} — deveria começar no topo da tela`);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('🔴 TODAS as opções de lance ficam dentro da tela e clicáveis', { skip: semNavegador }, async () => {
  const { pagina, ctx, height } = await abrirTela();
  await pagina.getByRole('button', { name: /Dar Lance/i }).tap();
  await pagina.getByText('Escolha seu lance').waitFor();

  // as opções são os botões com "R$ " dentro da folha
  const dentro = pagina.locator('.fixed.inset-0.z-\\[2100\\] button');
  const n = await dentro.count();
  assert.ok(n >= 5, `esperava as 4 opções + fechar, achei ${n}`);
  for (let i = 0; i < n; i += 1) {
    const b = dentro.nth(i);
    const c = await b.boundingBox();
    if (!c) continue;
    assert.ok(c.y >= -1, `o botão ${i} começa acima da tela (y=${Math.round(c.y)})`);
    assert.ok(c.y + c.height <= height + 1,
      `o botão ${i} termina em ${Math.round(c.y + c.height)}px, abaixo da tela de ${height}px — é o corte do relato`);
  }
  await ctx.close();
});

test('escolher um valor funciona pelo dedo, e a folha fecha', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrirTela();
  await pagina.getByRole('button', { name: /Dar Lance/i }).tap();
  await pagina.getByText('Escolha seu lance').waitFor();
  await pagina.locator('.fixed.inset-0.z-\\[2100\\] button', { hasText: 'R$ 11,00' }).first().tap();
  assert.equal(await pagina.evaluate(() => window.__escolhido), 11, 'o valor escolhido não chegou ao onEscolher');
  await pagina.getByText('Escolha seu lance').waitFor({ state: 'detached' });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('o rodapé com o botão de lance cabe na tela mesmo com o miolo alto', { skip: semNavegador }, async () => {
  // Segunda metade do conserto: sem `min-height: 0` no miolo, o rodapé era
  // empurrado para fora e o overflow:hidden da página cortava.
  const { pagina, ctx, height } = await abrirTela();
  const botao = await caixaDe(pagina, 'button:has-text("Dar Lance")');
  assert.ok(botao, 'o botão de lance não foi desenhado');
  assert.ok(botao.y + botao.height <= height + 1,
    `o botão de lance termina em ${Math.round(botao.y + botao.height)}px, fora da tela de ${height}px`);
  await ctx.close();
});

test('numa tela ainda mais baixa a folha rola por dentro em vez de sumir', { skip: semNavegador }, async () => {
  const { pagina, ctx, height } = await abrirTela({ height: 420 });
  await pagina.getByRole('button', { name: /Dar Lance/i }).tap();
  await pagina.getByText('Escolha seu lance').waitFor();
  const painel = pagina.locator('.fixed.inset-0.z-\\[2100\\] > div');
  const c = await painel.boundingBox();
  assert.ok(c.y + c.height <= height + 1,
    `o painel passa da tela (${Math.round(c.y + c.height)}px > ${height}px)`);
  const rola = await painel.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  const cabe = await painel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
  assert.ok(rola || cabe, 'estado impossível');
  if (rola) {
    await painel.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const fim = await painel.evaluate((el) => el.scrollTop > 0);
    assert.ok(fim, 'o painel passou da tela e NÃO rola — as últimas opções ficam inalcançáveis');
  }
  await ctx.close();
});
