/**
 * 📄 OS DOCUMENTOS DO PARCEIRO DE COMPRA DEPOIS DE 02/10/2026 — num Chromium.
 *
 * Decisão da diretoria na véspera de uma apresentação: sem a linha dos 5%,
 * quadros recalculados, 30 dias de primeiro ciclo, repasses de 12 a 36 meses.
 * Aqui renderizam o memorando, o valuation e o ciclo de verdade.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-docs-do-parceiro');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'docs-do-parceiro.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/docs-do-parceiro.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

test('memorando, valuation e ciclo: sem "Parceiros de compra", sem 60 dias, lote a R$ 8.952, 12 a 36 meses', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const pagina = await nav.newPage({ viewport: { width: 980, height: 1200 } });
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.locator('[data-teste="ciclo"]').waitFor();
  const texto = async (k) => pagina.locator(`[data-teste="${k}"]`).innerText();
  for (const k of ['memorando', 'valuation']) {
    const t = await texto(k);
    assert.doesNotMatch(t, /Parceiros de compra/, `${k} sem a linha dos 5%`);
    assert.doesNotMatch(t, /60 dias/, `${k} sem 60 dias`);
    assert.match(t, /R\$\s?8\.952/, `${k} com o resultado do lote recalculado`);
  }
  const memo = await texto('memorando');
  assert.match(memo, /30 dias \(Cláusula 8\.2\)/);
  assert.match(memo, /R\$\s?10\.383/, 'resultado líquido Hoje');
  const val = await texto('valuation');
  assert.match(val, /R\$\s?221\.450/, 'resultado líquido a R$ 1M');
  assert.match(val, /35,8%/, 'retorno do lote');
  const ciclo = await texto('ciclo');
  assert.match(ciclo, /De 12 a 36 meses de repasses/);
  assert.doesNotMatch(ciclo, /12 meses de repasses, mais/);
  await pagina.close();
});
