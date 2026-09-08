/**
 * A GRAMÁTICA COMPARTILHADA DA VERIFICAÇÃO DO PROGRESSO (DIR-96, 08/09/2026)
 * — nascida da análise "Nove Telas, Um Número". Prova em navegador real que
 * BarraProgresso/SeloConfianca/Semaforo renderizam certo sozinhos E dentro
 * de dois consumidores reais — CrmDashboardDiretoria (dialeto claro) e
 * ScoreEscada (dialeto escuro, com a marca de limite) — sem erro nenhum.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-verificacao-ui');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'verificacao-ui.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/verificacao-ui.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('BarraProgresso/SeloConfianca/Semaforo, e os dois consumidores reais, renderizam sem erro', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 700, height: 1100 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);

  await pagina.locator('[data-teste="showcase-claro"]').waitFor();
  const barras = pagina.locator('[data-teste="barra-progresso"]');
  assert.ok(await barras.count() >= 3, 'as 3 barras do showcase têm que estar todas na tela');
  assert.equal(await barras.nth(2).getAttribute('data-sem-dado'), 'sim', 'a barra "sem dado" tem que sinalizar isso no data-attribute');

  const selosDoShowcase = pagina.locator('[data-teste="showcase-claro"] [data-teste="selo-confianca"]');
  assert.deepEqual(await selosDoShowcase.evaluateAll((els) => els.map((e) => e.dataset.tipo)), ['dado', 'aproximacao', 'sem_fonte']);

  // CrmDashboardDiretoria (dialeto claro) — os 3 KPIs de exemplo
  await pagina.getByText('Dashboard da Diretoria').waitFor();
  await pagina.getByText('Faturamento do dia').waitFor();
  await pagina.getByText('R$ 8.200,00').waitFor();
  await pagina.getByText('NPS').waitFor(); // sem fonte, sem barra — ainda assim aparece

  // ScoreEscada (dialeto escuro, com a marca de limite dos 80%)
  await pagina.getByText('SCORE EXECUTIVO').waitFor();
  await pagina.getByText('63,5').waitFor();
  await pagina.locator('[data-teste="barra-limite"]').waitFor();
  await pagina.getByText('sem dado').waitFor(); // a fração "Cultura" sem dado

  await pagina.screenshot({ path: path.join(FOTOS, 'verificacao-ui-showcase.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});
