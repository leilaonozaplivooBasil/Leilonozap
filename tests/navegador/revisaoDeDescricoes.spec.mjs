/**
 * PROVAS NO NAVEGADOR — Revisar descrições (10/10/2026).
 * A página de verdade + uma rota de mentira com as regras da real. Prova: o resumo por nível, o
 * teste de 10 (só rascunhos, nada vai ao ar), o lote um por um, a parada sozinha quando a IA cai,
 * editar antes de aprovar, aprovar, rejeitar e desfazer.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-revisao-de-descricoes');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  if (!process.env.BANCA_PRONTA) {
    execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
      cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
    });
  }
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'revisao-de-descricoes.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/revisao-de-descricoes.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO, proxy: { server: 'per-context' } } : {});
  return navegador;
}
test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
});

async function abrir(consulta = '') {
  const ctx = await (await garantirNavegador()).newContext({ viewport: { width: 1100, height: 1000 }, proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' } });
  const pagina = await ctx.newPage();
  pagina.on('dialog', (d) => d.accept());
  await pagina.goto(`${BASE}${consulta}`, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="resumo"]');
  return { ctx, pagina };
}
const geradas = (pagina) => pagina.evaluate(() => window.__chamadasDescricoes.filter((c) => c.action === 'gerar').length);

test('o resumo conta por nível e diz quantos faltam gerar', async () => {
  const { ctx, pagina } = await abrir();
  try {
    const t = await pagina.locator('[data-teste="resumo"]').innerText();
    assert.match(t, /16 produtos na loja/);
    assert.match(await pagina.locator('[data-nivel="boa"]').innerText(), /^2 · boa/);
    assert.match(await pagina.locator('[data-teste="comandos"]').innerText(), /14 para gerar/);
    assert.equal(await pagina.locator('[data-teste="rascunhos"]').count(), 0);
  } finally { await ctx.close(); }
});

test('"Testar com 10" gera 10 rascunhos, um por vez, e NÃO muda nenhum produto', async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.locator('[data-teste="gerar-teste"]').click();
    await pagina.waitForFunction(() => document.querySelectorAll('[data-rascunho]').length === 10);
    assert.equal(await geradas(pagina), 10);
    // nada foi aprovado/gravado: a "base" segue com os 14 sem descrição boa
    assert.equal(await pagina.evaluate(() => window.__bd.produtos.filter((p) => p.nivel !== 'boa').length), 14);
    assert.equal(await pagina.evaluate(() => window.__chamadasDescricoes.filter((c) => c.action === 'aprovar').length), 0);
    assert.match(await pagina.locator('[data-teste="comandos"]').innerText(), /4 para gerar/);
  } finally { await ctx.close(); }
});

test('"Gerar todos" faz os 14, em sequência (nunca duas chamadas ao mesmo tempo)', async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.evaluate(() => {
      window.__simultaneas = 0; window.__maxSimultaneas = 0;
      const orig = window.__plataformaFalsa.respostas.descricoesEmLote;
      window.__plataformaFalsa.respostas.descricoesEmLote = (c) => {
        if (c.action !== 'gerar') return orig(c);
        window.__simultaneas += 1; window.__maxSimultaneas = Math.max(window.__maxSimultaneas, window.__simultaneas);
        const r = orig(c); window.__simultaneas -= 1; return r;
      };
    });
    await pagina.locator('[data-teste="gerar-todos"]').click();
    await pagina.waitForFunction(() => document.querySelectorAll('[data-rascunho]').length === 14);
    assert.equal(await geradas(pagina), 14);
    assert.equal(await pagina.evaluate(() => window.__maxSimultaneas), 1);
  } finally { await ctx.close(); }
});

test('IA caiu: para sozinho depois de 3 falhas seguidas e explica', async () => {
  const { ctx, pagina } = await abrir('?ia=caiu');
  try {
    await pagina.locator('[data-teste="gerar-todos"]').click();
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="pausar"]') && window.__chamadasDescricoes.filter((c) => c.action === 'gerar').length >= 3);
    assert.equal(await geradas(pagina), 3, 'insistiu depois de falhar 3 vezes seguidas');
    assert.match(await pagina.locator('[data-teste="progresso"]').innerText(), /3 sem rascunho/);
  } finally { await ctx.close(); }
});

test('sem chave de IA: para na primeira chamada', async () => {
  const { ctx, pagina } = await abrir('?ia=semchave');
  try {
    await pagina.locator('[data-teste="gerar-todos"]').click();
    await pagina.waitForFunction(() => window.__chamadasDescricoes.some((c) => c.action === 'gerar') && !document.querySelector('[data-teste="pausar"]'));
    assert.equal(await geradas(pagina), 1);
  } finally { await ctx.close(); }
});

test('aprovar grava o texto EDITADO; rejeitar descarta; desfazer devolve o anterior', async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.locator('[data-teste="gerar-teste"]').click();
    await pagina.waitForFunction(() => document.querySelectorAll('[data-rascunho]').length === 10);
    // edita o primeiro rascunho e aprova
    const primeiro = pagina.locator('[data-rascunho]').first();
    const id = await primeiro.getAttribute('data-rascunho');
    await primeiro.locator('[data-campo="texto"]').fill('Texto revisado pelo dono, sem inventar nada.');
    await primeiro.locator('[data-teste="aprovar"]').click();
    await pagina.waitForFunction(() => document.querySelectorAll('[data-rascunho]').length === 9);
    const gravado = await pagina.evaluate((i) => window.__bd.produtos.find((p) => p.id === i).atual, id);
    assert.equal(gravado, 'Texto revisado pelo dono, sem inventar nada.', 'não gravou o texto editado');
    assert.equal(await pagina.locator('[data-teste="aprovadas"]').count(), 1);
    // rejeita o seguinte: sai da lista e o produto não muda
    const seg = pagina.locator('[data-rascunho]').first();
    const idSeg = await seg.getAttribute('data-rascunho');
    await seg.locator('[data-teste="rejeitar"]').click();
    await pagina.waitForFunction(() => document.querySelectorAll('[data-rascunho]').length === 8);
    assert.notEqual(await pagina.evaluate((i) => window.__bd.produtos.find((p) => p.id === i).nivel, idSeg), 'boa');
    // desfaz a aprovada: volta ao que era
    await pagina.locator('[data-teste="desfazer"]').click();
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="aprovadas"]').length === 0);
    assert.notEqual(await pagina.evaluate((i) => window.__bd.produtos.find((p) => p.id === i).nivel, id), 'boa');
  } finally { await ctx.close(); }
});
