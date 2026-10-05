/**
 * 💸 A COMISSÃO DE CADA DEPÓSITO NA TELA DE DEPÓSITOS — num Chromium.
 * 28/09/2026, Beatriz: "eu só preciso ver essa questão de depósito geral dentro
 * do site […] esses relatórios aí me lascam demais".
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-sino-do-cliente');
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
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'sino-do-cliente.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/sino-do-cliente.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(largura = 1280, busca = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 1100 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="sino"]', { timeout: 15000 });
  return { ctx, pagina };
}

test('o sino mostra só o contador — nada salta na tela ao entrar', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="sino-contador"]', { timeout: 10000 });
    assert.equal((await pagina.textContent('[data-teste="sino-contador"]')).trim(), '2');
    assert.equal(await pagina.$('[data-teste="sino-painel"]'), null, 'painel fechado até a pessoa tocar');
    await pagina.screenshot({ path: path.join(SAIDA, 'sino-fechado.png') });
  } finally { await ctx.close(); }
});

test('abrir: as novas primeiro destacadas, texto curto e tempo relativo', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="sino-contador"]');
    await pagina.click('[data-teste="sino"]');
    await pagina.waitForSelector('[data-teste="sino-item"]');
    const itens = await pagina.$$eval('[data-teste="sino-item"]', (els) => els.map((e) => ({ nova: e.dataset.nova, texto: e.innerText.replace(/\s+/g, ' ').trim() })));
    assert.equal(itens.length, 4);
    assert.deepEqual(itens.map((i) => i.nova), ['sim', 'sim', 'nao', 'nao']);
    assert.match(itens[0].texto, /^Cobriram seu lance há 3 min Harley 117 .* agora está em R\$ 577,60/);
    assert.match(itens[1].texto, /Pedido a caminho há 1 h O pedido #LZ42C79347 saiu pra entrega\. Rastreio: AD966744131BR\./);
    assert.match(itens[2].texto, /Você arrematou! ontem/);
    await pagina.screenshot({ path: path.join(SAIDA, 'sino-aberto.png') });
  } finally { await ctx.close(); }
});

test('tocar numa notificação: marca como lida e leva pro lugar certo', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.waitForSelector('[data-teste="sino-contador"]');
    await pagina.click('[data-teste="sino"]');
    await pagina.click('[data-teste="sino-item"] >> nth=0');
    await pagina.waitForFunction(() => document.querySelector('[data-teste="rota"]')?.textContent === '/AuctionRoom?id=harley');
    assert.equal(await pagina.$('[data-teste="sino-painel"]'), null, 'fecha ao navegar');
    assert.equal((await pagina.textContent('[data-teste="sino-contador"]')).trim(), '1');
    const lidas = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.filter((c) => c.nome === 'minhasNotificacoes' && c.corpo?.acao === 'lidas').map((c) => c.corpo));
    assert.deepEqual(lidas, [{ acao: 'lidas', ids: [5] }]);
  } finally { await ctx.close(); }
});

test('marcar todas como lidas: o contador some', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390);
  try {
    await pagina.waitForSelector('[data-teste="sino-contador"]');
    await pagina.click('[data-teste="sino"]');
    await pagina.click('[data-teste="sino-marcar-todas"]');
    await pagina.waitForSelector('[data-teste="sino-contador"]', { state: 'detached' });
    assert.equal(await pagina.$('[data-teste="sino-marcar-todas"]'), null);
    // a consulta que já estava no ar quando a pessoa tocou NÃO pode desmarcar
    await pagina.waitForTimeout(600);
    assert.equal(await pagina.$('[data-teste="sino-contador"]'), null);
    assert.deepEqual(await pagina.$$eval('[data-teste="sino-item"]', (els) => els.map((e) => e.dataset.nova)), ['nao', 'nao', 'nao', 'nao']);
    const caixa = await pagina.$eval('[data-teste="sino-painel"]', (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right }; });
    assert.ok(caixa.l >= 0 && caixa.r <= 390, 'no celular o painel cabe na tela');
    await pagina.screenshot({ path: path.join(SAIDA, 'sino-celular.png') });
  } finally { await ctx.close(); }
});

test('sem nada: o sino fica quieto e explica o que vai aparecer', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(1280, '?vazio=1');
  try {
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.nome === 'minhasNotificacoes'));
    assert.equal(await pagina.$('[data-teste="sino-contador"]'), null);
    await pagina.click('[data-teste="sino"]');
    await pagina.waitForFunction(() => /Nada por aqui/.test(document.querySelector('[data-teste="sino-vazio"]')?.textContent || ''));
    assert.match(await pagina.textContent('[data-teste="sino-vazio"]'), /Nada por aqui ainda.*pedido sair pra entrega/);
  } finally { await ctx.close(); }
});
