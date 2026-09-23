/**
 * 🔴 O SAQUE DO VENDEDOR NUM CHROMIUM DE VERDADE.
 * A página real + o cliente de mentira. O que se prova:
 *   • a página desenha o saldo mesmo com o dashboard de vendas inexistente;
 *   • o botão de saque existe e abre o modal;
 *   • sem KYC, o modal mostra o caminho (Carteira), não um erro mudo;
 *   • com KYC, o pedido vai pra requestWithdrawal com user_id e valor, e dá sucesso.
 * COMO RODAR: npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-saque-vendedor');
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
    const arq = path.join(SAIDA, rel === '/' ? 'saque-vendedor.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/saque-vendedor.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(kyc) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}?kyc=${kyc}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="card-saldo-saque"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('🔴 a página desenha o saldo mesmo com o dashboard de vendas inexistente', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('aprovado');
  try {
    const saldo = await pagina.$eval('[data-teste="saldo-sacavel"]', (n) => n.textContent.replace(/\s+/g, ' ').trim());
    assert.match(saldo, /321,71/);
    assert.ok(await pagina.$('[data-teste="abrir-saque"]'), 'o botão de saque não apareceu — era o defeito');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('sem KYC: o modal mostra o caminho, e "Validar identidade" leva pra Carteira', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('nao_iniciado');
  try {
    assert.ok(await pagina.$('[data-teste="aviso-kyc"]'));
    await pagina.click('[data-teste="abrir-saque"]');
    await pagina.waitForSelector('[data-teste="saque-precisa-kyc"]', { timeout: 5000 });
    assert.equal(await pagina.$('[data-teste="form-saque"]'), null, 'sem KYC não pode haver formulário de valor');
    await pagina.click('[data-teste="ir-validar-identidade"]');
    await pagina.waitForSelector('[data-teste="pagina-carteira"]', { timeout: 5000 });
  } finally { await ctx.close(); }
});

test('🔴 com KYC: o pedido vai pra requestWithdrawal com user_id e valor, e dá sucesso', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('aprovado');
  try {
    await pagina.click('[data-teste="abrir-saque"]');
    await pagina.waitForSelector('[data-teste="form-saque"]', { timeout: 5000 });
    await pagina.fill('[data-teste="valor-saque"]', '100,50');
    await pagina.click('[data-teste="confirmar-saque"]');
    await pagina.waitForFunction(() => document.body.innerText.includes('Pedido de saque enviado'), null, { timeout: 5000 });
    const chamadas = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.filter((c) => c.nome === 'requestWithdrawal'));
    assert.equal(chamadas.length, 1);
    assert.deepEqual(chamadas[0].corpo, { user_id: 'a1b2c3d4e5f60718293a4b5c', valor: 100.5 });
    // a rota antiga, inexistente, NÃO pode ter sido chamada
    const antiga = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.some((c) => c.nome === 'requestSellerWithdrawal'));
    assert.equal(antiga, false);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('valor maior que o saldo é barrado na tela, sem chamar o servidor', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('aprovado');
  try {
    await pagina.click('[data-teste="abrir-saque"]');
    await pagina.waitForSelector('[data-teste="form-saque"]');
    await pagina.fill('[data-teste="valor-saque"]', '999');
    await pagina.click('[data-teste="confirmar-saque"]');
    await pagina.waitForFunction(() => document.body.innerText.includes('Saldo insuficiente'), null, { timeout: 5000 });
    const n = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.filter((c) => c.nome === 'requestWithdrawal').length);
    assert.equal(n, 0);
  } finally { await ctx.close(); }
});
