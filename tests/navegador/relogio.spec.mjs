/**
 * Relógio de leilão — teste NUM NAVEGADOR DE VERDADE, com os componentes reais.
 *
 * 🔴 "Semana passada dizia 1 semana, e agora segue 1 semana."
 *
 * A Fase 1 acrescenta a DATA de término. Três riscos que só o navegador mede:
 *   1. `end_time` nulo virando "31/12 às 21:00" — a Época de 1970 em Brasília.
 *      Não parece erro, PARECE INFORMAÇÃO.
 *   2. a data estourando a largura do cabeçalho num celular estreito.
 *   3. o contador que já existia sumindo — a Fase 1 é ADITIVA: nada sai.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-carrossel');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos abaixo se marcam como PULADOS */ }

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
    const arq = path.join(SAIDA, rel === '/' ? 'relogio.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/relogio.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

/** Abre a banca. `largura` menor simula celular estreito. */
async function abrir({ largura = 360 } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-caso="normal"]').waitFor();
  return { pagina, ctx, erros };
}
const caso = (pagina, id) => pagina.locator(`[data-caso="${id}"]`);

// ─────────────── o que teria evitado o chamado ───────────────

test('a data de término aparece no cabeçalho da sala', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const texto = await caso(pagina, 'normal').locator('[data-parte="cabecalho"]').innerText();
  assert.match(texto, /11\/09 às 12:28/, `não achei a data. Saiu: ${JSON.stringify(texto)}`);
  await ctx.close();
});

test('a data aparece também na barra fixa do celular', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const texto = await pagina.locator('[data-parte="barra-fixa"]').innerText();
  assert.match(texto, /Termina 11\/09 às 12:28/, `saiu: ${JSON.stringify(texto)}`);
  // e a frase antiga continua inteira, em linha própria — sem "Termina em 11/09"
  assert.ok(!/Termina em 11\/09/.test(texto), 'a data foi colada na frase e virou português errado');
  await ctx.close();
});

// ─────────────── a guarda que existe por causa de um valor medido ───────────────

test('end_time nulo NÃO vira "31/12 às 21:00" na tela', { skip: semNavegador }, async () => {
  // A Época de 1970 em Brasília. Não parece erro: parece informação.
  const { pagina, ctx } = await abrir();
  for (const id of ['nulo', 'indefinido', 'lixo', 'zero']) {
    const texto = await caso(pagina, id).innerText();
    assert.ok(!/31\/12/.test(texto), `caso "${id}" mostrou a Época de 1970: ${JSON.stringify(texto)}`);
    assert.ok(!/Invalid/i.test(texto), `caso "${id}" mostrou "Invalid Date"`);
    assert.ok(!/às/.test(texto), `caso "${id}" inventou uma data: ${JSON.stringify(texto)}`);
  }
  await ctx.close();
});

test('leilão de outro ano mostra o ano, para "04/01" não enganar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const texto = await caso(pagina, 'outro-ano').locator('[data-parte="cabecalho"]').innerText();
  assert.match(texto, /04\/01\/2027 às 12:42/, `saiu: ${JSON.stringify(texto)}`);
  await ctx.close();
});

// ─────────────── Fase 1 é ADITIVA: nada do que existia saiu ───────────────

test('o contador antigo continua na tela, intacto', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // o cronômetro do cabeçalho segue mostrando o rótulo que a sala já mostrava
  assert.match(await caso(pagina, 'normal').locator('[data-parte="cabecalho"]').innerText(), /1 semana/);
  // e o CountdownTimer segue calculando sozinho, sem a data
  const contador = await caso(pagina, 'normal').locator('[data-parte="contador"]').innerText();
  assert.match(contador, /semana|dias?|\d{2}:\d{2}:\d{2}/, `o contador sumiu: ${JSON.stringify(contador)}`);
  assert.ok(!/às/.test(contador), 'a Fase 1 mexeu no contador — era para ser aditiva');
  await ctx.close();
});

test('o preço e o líder continuam onde estavam', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const texto = await caso(pagina, 'normal').locator('[data-parte="cabecalho"]').innerText();
  assert.match(texto, /117,00/);
  assert.match(texto, /Alexandre walenkamp/);
  await ctx.close();
});

// ─────────────── layout: não pode estourar no celular estreito ───────────────

test('a data não estoura a largura num celular de 320px', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ largura: 320 });
  const estouro = await pagina.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    janela: window.innerWidth,
  }));
  assert.ok(estouro.documento <= estouro.janela + 1,
    `a página rola na horizontal: ${estouro.documento}px em ${estouro.janela}px`);
  await ctx.close();
});

test('nenhum erro de JavaScript em nenhum dos casos', { skip: semNavegador }, async () => {
  // Um erro de render aqui derrubaria a SALA DE LEILÃO inteira.
  const { pagina, ctx, erros } = await abrir();
  await pagina.waitForTimeout(300);
  assert.deepEqual(erros, [], `erros na página: ${erros.join(' | ')}`);
  await ctx.close();
});
