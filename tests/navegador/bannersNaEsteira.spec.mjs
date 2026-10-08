/**
 * 🖼️ A ESTEIRA DE BANNERS NA TELA — O HOOK REAL, NUM CHROMIUM.
 *
 * Dono (08/10/2026): três artes de uma TV (3, 2 e 1 dia) entrando e saindo
 * sozinhas à meia-noite, e três fileiras (Leilão, Loja, Unificada).
 *
 * Prova, sem recarregar a página:
 *   1. a página do Leilão lê a fileira do Leilão e a da Loja lê a da Loja;
 *   2. com a Unificada ligada, as DUAS páginas mostram o mesmo conjunto;
 *   3. com a fileira da Loja desligada, a Loja fica sem banner e o Leilão segue;
 *   4. um banner agendado ENTRA e um com fim SAI no instante marcado, sozinhos.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-banners-na-esteira');
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
      cwd: path.join(AQUI, '..', '..'),
      env: { ...process.env, SAIDA_BANCA: SAIDA },
      stdio: 'inherit',
    });
  }
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'banners-na-esteira.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/banners-na-esteira.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO, proxy: { server: 'per-context' } } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
});

async function abrir(consulta) {
  const ctx = await (await garantirNavegador()).newContext({ proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' } });
  const pagina = await ctx.newPage();
  await pagina.goto(`${BASE}?${consulta}`, { waitUntil: 'networkidle' });
  return { ctx, pagina };
}
const noAr = (pagina) => pagina.locator('[data-teste="no-ar"] li').allInnerTexts();
const esperar = (pagina, esperado) => pagina.waitForFunction(
  (e) => JSON.stringify([...document.querySelectorAll('[data-teste="no-ar"] li')].map((x) => x.textContent)) === JSON.stringify(e),
  esperado, { timeout: 8000 },
);

test('cada página lê a sua fileira: Leilão e Loja, cada uma com os seus banners', { skip: semNavegador }, async () => {
  const leilao = await abrir('contexto=home&entra=600000&sai=600000');
  try { assert.deepEqual(await noAr(leilao.pagina), ['A', 'C']); } finally { await leilao.ctx.close(); }
  const loja = await abrir('contexto=catalog');
  try { assert.deepEqual(await noAr(loja.pagina), ['L']); } finally { await loja.ctx.close(); }
});

test('com a Unificada ligada, Leilão e Loja mostram o MESMO conjunto', { skip: semNavegador }, async () => {
  for (const contexto of ['home', 'catalog']) {
    const { ctx, pagina } = await abrir(`contexto=${contexto}&modo=unificado`);
    try { assert.deepEqual(await noAr(pagina), ['U1'], contexto); } finally { await ctx.close(); }
  }
});

test('com a fileira da Loja desligada, a Loja fica sem banner e o Leilão segue', { skip: semNavegador }, async () => {
  const loja = await abrir('contexto=catalog&loja=desligada');
  try { assert.deepEqual(await noAr(loja.pagina), []); } finally { await loja.ctx.close(); }
  const leilao = await abrir('contexto=home&loja=desligada&entra=600000&sai=600000');
  try { assert.deepEqual(await noAr(leilao.pagina), ['A', 'C']); } finally { await leilao.ctx.close(); }
});

test('a virada acontece SOZINHA, sem recarregar: o agendado entra e o que tem fim sai', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('contexto=home&entra=2500&sai=2500');
  try {
    assert.deepEqual(await noAr(pagina), ['A', 'C'], 'antes da virada: o B ainda não entrou, o C ainda está');
    await esperar(pagina, ['A', 'B']); // depois de ~2,5 s: o C saiu e o B entrou, na mesma tela
  } finally { await ctx.close(); }
});
