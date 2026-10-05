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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-depositos-comissao');
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
    const arq = path.join(SAIDA, rel === '/' ? 'depositos-com-comissao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/depositos-com-comissao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(largura = 1280) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 1100 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="comissao-do-deposito"]', { timeout: 15000 });
  return { ctx, pagina };
}
const linhas = (p) => p.$$eval('tbody tr', (trs) => trs.map((tr) => ({
  cliente: tr.querySelector('td')?.textContent.trim(),
  indicou: tr.querySelector('[data-teste="quem-indicou"]')?.textContent.replace(/\s+/g, ' ').trim(),
  comissao: tr.querySelector('[data-teste="comissao-do-deposito"]')?.textContent.replace(/\s+/g, ' ').trim(),
})));

test('cada depósito mostra quem indicou e a comissão, em português', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const todas = await linhas(pagina);
    const acha = (nome) => todas.find((x) => x.cliente.startsWith(nome));
    assert.equal(acha('Cliente Um').indicou, 'Vera Rede');
    assert.equal(acha('Cliente Um').comissao, 'R$ 200,00Libera em 03/10');
    assert.equal(acha('Cliente Dois').comissao, 'R$ 125,00Paga');
    assert.equal(acha('Cliente Três').comissao, 'R$ 60,00Liberada — pode pagar');
    // o espaço antes de "(empresa)" é margem na tela, não caractere
    assert.equal(acha('Cliente Quatro').indicou, 'Leilão NoZap - Site Oficial(empresa)');
    assert.equal(acha('Cliente Cinco').comissao, 'Sem comissão — antes de 23/09');
    assert.equal(acha('Cliente Seis').comissao, '—');
    const topo = await pagina.$eval('[data-teste="resumo-comissoes"]', (e) => e.textContent.replace(/\s+/g, ' '));
    assert.match(topo, /Comissão em espera \(7 dias\)R\$ 202,70/);
    assert.match(topo, /pode pagarR\$ 60,00/);
    assert.match(topo, /já pagaR\$ 125,00/);
    await pagina.screenshot({ path: path.join(SAIDA, 'depositos-1-tela.png'), fullPage: true });
  } finally { await ctx.close(); }
});

test('buscar "Vera" traz só os clientes que ela indicou, e os números do topo acompanham', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.fill('input[placeholder="Ex.: Verônica"]', 'Vera');
    await pagina.waitForTimeout(200);
    const l = await linhas(pagina);
    assert.equal(l.length, 4);
    assert.ok(l.every((x) => x.indicou === 'Vera Rede'));
    const topo = await pagina.$eval('[data-teste="resumo-comissoes"]', (e) => e.textContent.replace(/\s+/g, ' '));
    assert.match(topo, /Comissão em espera \(7 dias\)R\$ 200,00/);
    await pagina.screenshot({ path: path.join(SAIDA, 'depositos-2-busca.png'), fullPage: true });
  } finally { await ctx.close(); }
});
