/**
 * 🕥 A ORGANIZAÇÃO DO DIA NUM CHROMIUM DE VERDADE.
 *
 * A conta tem 19 provas no Node, em JS puro. Isto mede o que a régua não
 * alcança:
 *
 *   • o time sai do BANCO sozinho — a aba não recebe `pessoas` de ninguém, e
 *     se essa busca quebrar a tela abre vazia sem dizer nada;
 *   • conta institucional e quem não é do time corporativo ficam FORA — é o
 *     que separa este relatório de "uma lista de todo mundo do banco";
 *   • quem NÃO organizou aparece em CIMA, que é a leitura que o dono pediu
 *     ("para a gente poder não falhar no nosso acompanhamento");
 *   • "exportar" gera arquivo de verdade, com os mesmos números da tela.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-organizacao');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'organizacao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/organizacao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="organizacao-tabela"]', { timeout: 20000 });
  return { ctx, pagina };
}

const linhas = (p) => p.locator('[data-teste="organizacao-linha"]');

test('🔴 o time sai do banco sozinho, sem conta institucional nem quem é de fora', { skip: semNavegador }, async () => {
  // 5 linhas em app_users; só 3 são gente do time corporativo.
  const { ctx, pagina } = await abrir();
  assert.equal(await linhas(pagina).count(), 3, 'esperava só as 3 pessoas do time');
  const texto = await pagina.locator('[data-teste="organizacao-tabela"]').innerText();
  assert.ok(!texto.includes('Site Oficial'), 'a conta institucional entrou no relatório');
  assert.ok(!texto.includes('Diego Rede'), 'entrou quem não é do time corporativo');
  await ctx.close();
});

test('🔴 quem NÃO organizou aparece em cima', { skip: semNavegador }, async () => {
  // é a leitura inteira da tela: o dono olha as primeiras linhas e já sabe
  // quem parou e quem não parou.
  const { ctx, pagina } = await abrir();
  const marcas = await linhas(pagina).evaluateAll((ls) => ls.map((l) => l.dataset.organizou));
  assert.deepEqual(marcas, ['nao', 'nao', 'sim'], 'a ordem não põe quem não organizou primeiro');
  const primeira = await linhas(pagina).first().innerText();
  assert.match(primeira, /Bruno Lima/, 'quem tem mais demanda esperando devia abrir a lista');
  await ctx.close();
});

test('🔴 tratar ONTEM não conta como ter organizado hoje', { skip: semNavegador }, async () => {
  // o defeito silencioso: sem o corte pelo dia, quem organizou uma vez na vida
  // aparece organizado para sempre e o acompanhamento morre.
  const { ctx, pagina } = await abrir();
  const carla = linhas(pagina).filter({ hasText: 'Carla Souza' });
  assert.equal(await carla.getAttribute('data-organizou'), 'nao');
  await ctx.close();
});

test('os números do time batem com as linhas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  const numeros = await pagina.locator('[data-teste="organizacao-numeros"]').innerText();
  assert.match(numeros, /1\/3/, 'só a Ana organizou'); // Organizaram
  assert.match(numeros, /2\s*\n?\s*feitas|2\/3/, 'tarefas feitas do dia'); // 2 de 3 tarefas
  await ctx.close();
});

test('🔴 exportar entrega um CSV com os mesmos números', { skip: semNavegador }, async () => {
  // "esse relatório pode ser exportado" — o pedido literal do áudio.
  const { ctx, pagina } = await abrir();
  const [baixado] = await Promise.all([
    pagina.waitForEvent('download', { timeout: 10000 }),
    pagina.locator('[data-teste="organizacao-exportar"]').click(),
  ]);
  assert.equal(baixado.suggestedFilename(), 'organizacao-2026-09-19.csv');
  const csv = readFileSync(await baixado.path(), 'utf8');
  assert.match(csv, /^﻿/, 'sem o BOM o Excel em português quebra o acento');
  assert.match(csv, /Ana Prado;sim;/, 'a Ana devia constar como organizou');
  assert.match(csv, /Bruno Lima;nao;/, 'o Bruno devia constar como não organizou');
  assert.ok(!csv.includes('Site Oficial'), 'a conta institucional vazou para o arquivo');
  assert.match(csv, /TOTAL;1\/3;/, 'a linha de total não fecha com a tela');
  await ctx.close();
});
