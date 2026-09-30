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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-retirada');
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
    const arq = path.join(SAIDA, rel === '/' ? 'retirada.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/retirada.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(largura = 1280, busca = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 1100 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('#raiz > *', { timeout: 15000 });
  return { ctx, pagina };
}


test('balcão: código do cliente → registrar → assinatura → retirado com comprovante', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390, '?tela=balcao');
  try {
    await pagina.waitForSelector('[data-teste="pedido-balcao"]');
    assert.match(await pagina.innerText('body'), /Aguardando \(2\)/);
    await pagina.fill('[data-teste="codigo-balcao"]', '482913');
    await pagina.click('text=Buscar');
    await pagina.waitForSelector('[data-teste="registrar-retirada"]');
    assert.equal(await pagina.inputValue('[data-teste="codigo"]'), '482913', 'o código digitado no balcão já vem preenchido');
    assert.match(await pagina.innerText('[data-teste="termo"]'), /pedido #LZ42C79347/);
    // sem local, sem aceite e sem assinatura: não envia, e diz o que falta
    await pagina.click('[data-teste="confirmar-retirada"]');
    assert.match(await pagina.innerText('[data-teste="erro-retirada"]'), /local/);
    assert.ok(!(await pagina.evaluate(() => window.__plataformaFalsa.chamadas.some((c) => c.corpo?.acao === 'registrar'))));
    await pagina.click('[data-teste="local-ponto_bangu"]');
    await pagina.check('input[type="checkbox"]');
    const cv = await pagina.$('[data-teste="assinatura"]'); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox();
    await pagina.mouse.move(bb.x + 40, bb.y + 100); await pagina.mouse.down();
    await pagina.mouse.move(bb.x + 160, bb.y + 60, { steps: 8 }); await pagina.mouse.move(bb.x + 280, bb.y + 90, { steps: 8 }); await pagina.mouse.up();
    await pagina.click('[data-teste="confirmar-retirada"]');
    await pagina.waitForSelector('[data-teste="registrar-retirada"]', { state: 'detached' });
    const reg = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.find((c) => c.corpo?.acao === 'registrar').corpo);
    assert.equal(reg.local, 'ponto_bangu');
    assert.equal(reg.codigo, '482913');
    assert.equal(reg.quem, 'comprador');
    assert.match(reg.assinatura, /^data:image\/png;base64,/);
    assert.match(await pagina.innerText('body'), /Aguardando \(1\)/);
    await pagina.click('text=Retirados');
    assert.match(await pagina.innerText('body'), /Ponto de Retirada Bangu · por você/);
  } finally { await ctx.close(); }
});

test('comprovante: local, quem retirou, termo e assinatura', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(390, '?tela=balcao');
  try {
    await pagina.waitForSelector('[data-teste="pedido-balcao"]');
    await pagina.click('text=Retirados');
    await pagina.click('[data-teste="pedido-balcao"] >> text=Comprovante');
    await pagina.waitForSelector('[data-teste="comprovante-retirada"] img');
    const t = (await pagina.innerText('[data-teste="comprovante-retirada"]')).replace(/\s+/g, ' ');
    assert.match(t, /Local Escritório/);
    assert.match(t, /Marcos Reis \(doc\. final 4471\), em nome do comprador/);
    assert.match(t, /Entregue por Beatriz Sant'anna/);
    assert.match(t, /Declaro que retirei/);
  } finally { await ctx.close(); }
});

test('cliente: vê o código enquanto não retira; depois, onde e quando retirou', { skip: semNavegador }, async () => {
  let { ctx, pagina } = await abrir(390, '?tela=cliente');
  try {
    await pagina.waitForSelector('[data-teste="codigo-de-retirada"]');
    assert.match(await pagina.innerText('[data-teste="codigo-de-retirada"]'), /482 913/);
  } finally { await ctx.close(); }
  ({ ctx, pagina } = await abrir(390, '?tela=cliente-retirado'));
  try {
    await pagina.waitForSelector('[data-teste="retirada-feita"]');
    assert.match(await pagina.innerText('[data-teste="retirada-feita"]'), /Retirado em .* · Ponto de Retirada Bangu/);
  } finally { await ctx.close(); }
});
