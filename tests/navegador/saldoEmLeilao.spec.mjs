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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-saldo-em-leilao');
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
    const arq = path.join(SAIDA, rel === '/' ? 'saldo-em-leilao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/saldo-em-leilao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(largura = 1280, busca = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 1100 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste^="tela-"]', { timeout: 15000 });
  return { ctx, pagina };
}

const AVISO = 'R$ 175,22 estão no leilão Apple iPhone 17 512GB 48MP 5G… e liberam para a loja quando ele terminar (02/10, 18h).';

test('Carteira: o quadro diz quanto, onde e até quando', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390, '?tela=carteira');
  try {
    await pagina.waitForSelector('[data-teste="saldo-em-leilao"]', { timeout: 15000 });
    const t = (await pagina.innerText('[data-teste="saldo-em-leilao"]')).replace(/\s+/g, ' ');
    assert.match(t, /EM LEILÕES ROLANDO R\$ 175,22 Livre para dar lance\. Para a loja, libera quando o leilão terminar, se você não arrematar\./i);
    assert.match(t, /Libera para a loja em 02\/10, 18h R\$ 175,22/);
    assert.equal(await pagina.getAttribute('[data-teste="saldo-em-leilao-item"]', 'href'), '/AuctionRoom?id=iphone');
  } finally { await ctx.close(); }
});

test('checkout: embaixo do saldo, a frase que explica os R$ 44,78', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390, '?tela=cart');
  try {
    await pagina.waitForSelector('[data-teste="saldo-em-leilao-checkout"]', { timeout: 20000 });
    assert.equal((await pagina.innerText('[data-teste="saldo-em-leilao-checkout"]')).trim(), AVISO);
    assert.match(await pagina.content(), /Saldo da carteira/);
  } finally { await ctx.close(); }
});

test('checkout: com TODO o saldo em leilão o botão some, mas a explicação fica', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390, '?tela=cart&tudo=1');
  try {
    await pagina.waitForSelector('[data-teste="saldo-em-leilao-checkout"]', { timeout: 20000 });
    assert.equal((await pagina.innerText('[data-teste="saldo-em-leilao-checkout"]')).trim(), AVISO);
    assert.doesNotMatch(await pagina.innerText('body'), /Saldo da carteira \(/);
  } finally { await ctx.close(); }
});
