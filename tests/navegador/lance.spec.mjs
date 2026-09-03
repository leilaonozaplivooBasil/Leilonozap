/**
 * Histórico de lances — teste NUM NAVEGADOR DE VERDADE, com os componentes reais.
 *
 * 🔴 "No histórico dos lances, tem lance feito 'há 57 anos'."
 *
 * O lance de R$ 1,60 tinha `created_date` e `timestamp` nulos: a tela caía na
 * Época do Unix — "há 57 anos" na lista e "21:00" na bolha. E o nulo furava a
 * fila, porque `ORDER BY created_date DESC` põe NULL primeiro no Postgres.
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
// uma pasta por banca — ver a nota em carrossel.spec.mjs
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((c) => existsSync(c));

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
    const arq = path.join(SAIDA, rel === '/' ? 'lance.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/lance.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 420, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-parte="feed"]').waitFor();
  return { pagina, ctx, erros };
}
const parte = (pagina, nome) => pagina.locator(`[data-parte="${nome}"]`);

// ─────────────── o que o dono viu ───────────────

test('"há 57 anos" não aparece em lugar nenhum', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const tudo = await pagina.locator('body').innerText();
  assert.ok(!/57 anos/.test(tudo), `ainda tem "57 anos" na tela: ${JSON.stringify(tudo)}`);
  assert.ok(!/\d{2,} anos/.test(tudo), `apareceu tempo em anos: ${JSON.stringify(tudo)}`);
  await ctx.close();
});

test('a bolha não marca mais "21:00" (a Época em Brasília)', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const culpado = await parte(pagina, 'placa-culpado').innerText();
  assert.ok(!/21:00/.test(culpado), `a bolha voltou à Época do Unix: ${JSON.stringify(culpado)}`);
  // e mostra a hora REAL que o banco guardou em created_at: 03:00 BRT
  assert.match(culpado, /03:00/, `não mostrou a hora real. Saiu: ${JSON.stringify(culpado)}`);
  await ctx.close();
});

test('lance sem NENHUMA das três datas não mostra hora inventada', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const texto = await parte(pagina, 'placa-sem-nada').innerText();
  assert.match(texto, /0,50/, 'o lance sumiu — devia aparecer, só sem hora');
  assert.ok(!/\d{2}:\d{2}/.test(texto), `inventou uma hora: ${JSON.stringify(texto)}`);
  await ctx.close();
});

// ─────────────── o nulo não fura mais a fila ───────────────

test('"Últimos lances" mostra o mais recente em primeiro', { skip: semNavegador }, async () => {
  // A ordem de ENTRADA é a que o banco devolvia: R$ 1,60 (nulo) na frente.
  const { pagina, ctx } = await abrir();
  const linhas = await parte(pagina, 'feed').locator('li').allInnerTexts();
  assert.equal(linhas.length, 3, `saíram ${linhas.length} linhas`);
  assert.match(linhas[0], /9,60/, `o topo devia ser o R$ 9,60. Saiu: ${JSON.stringify(linhas)}`);
  assert.match(linhas[1], /5,60/);
  assert.match(linhas[2], /3,60/);
  await ctx.close();
});

test('lance sem data nenhuma vai para o FIM, e sem "há"', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const linhas = await parte(pagina, 'feed-sem-data-nenhuma').locator('li').allInnerTexts();
  assert.match(linhas[0], /9,60/, `o sem-data furou a fila: ${JSON.stringify(linhas)}`);
  assert.match(linhas[1], /0,50/);
  assert.ok(!/há/.test(linhas[1]), `escreveu tempo para lance sem data: ${JSON.stringify(linhas[1])}`);
  await ctx.close();
});

test('o lance normal continua com o tempo relativo certo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const linhas = await parte(pagina, 'feed').locator('li').allInnerTexts();
  assert.match(linhas[0], /há \d+/, `o "há X" desapareceu: ${JSON.stringify(linhas[0])}`);
  await ctx.close();
});

test('a placa de lance normal segue intacta', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const texto = await parte(pagina, 'placa-normal').innerText();
  assert.match(texto, /9,60/);
  assert.match(texto, /10:51/, `a hora certa do lance sumiu: ${JSON.stringify(texto)}`);
  assert.match(texto, /vale-do-recreio/);
  await ctx.close();
});

test('nenhum erro de JavaScript — a sala não pode cair por causa disso', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.waitForTimeout(300);
  assert.deepEqual(erros, [], `erros na página: ${erros.join(' | ')}`);
  await ctx.close();
});
