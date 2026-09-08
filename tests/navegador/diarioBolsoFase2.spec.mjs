/**
 * O DIÁRIO DE BOLSO — Fase 2 ligada: materialização automática em segundo
 * plano + a nota pessoal (dono, 08/09/2026: "prepare o terreno" → "prossiga").
 * A tela continua lendo metodo_tarefas pra montar a lista (nunca depende da
 * tabela nova pra isso) — o que muda é que ela também grava sozinha, e deixa
 * a pessoa comentar por cima.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-diario-bolso-fase2');
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
    const arq = path.join(SAIDA, rel === '/' ? 'diario-bolso.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/diario-bolso.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('materializa sozinha em segundo plano — cada tarefa feita vira uma linha em diario_bolso_entradas', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 480, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Diário de bolso').waitFor();
  await pagina.locator('[data-teste="diario-dia"]').first().waitFor();

  await pagina.waitForFunction(() => (window.__bancoFalso?.tabelas?.diario_bolso_entradas || []).length === 4, null, { timeout: 5000 });
  const linhas = await pagina.evaluate(() => window.__bancoFalso.tabelas.diario_bolso_entradas);
  assert.equal(linhas.length, 4, 'as 4 tarefas de u1 (não a de outra pessoa) viram 4 linhas');
  assert.ok(linhas.every((l) => l.user_id === 'u1'), 'só materializa da própria pessoa');
  const porTarefa = Object.fromEntries(linhas.map((l) => [l.tarefa_id, l]));
  assert.equal(porTarefa.t1.fonte, 'resumo');
  assert.equal(porTarefa.t2.fonte, 'ia');
  assert.equal(porTarefa.t3.fonte, 'ensinamento');
  assert.equal(porTarefa.t4.texto, null, 'Almoço não tem nada pra contar — grava mesmo assim, com texto null');

  assert.deepEqual(erros, []);
  await ctx.close();
});

test('comentar: escreve uma nota, salva, aparece na tela e grava de verdade em diario_bolso_entradas (não só estado local)', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 480, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="diario-dia"]').first().waitFor();

  const primeiroComentar = pagina.locator('[data-teste="diario-adicionar-nota"]').first();
  await primeiroComentar.click();
  await pagina.locator('[data-teste="diario-nota-campo"]').fill('Isso me ajudou a fechar uma venda depois.');
  await pagina.locator('[data-teste="diario-nota-salvar"]').click();

  await pagina.getByText('Isso me ajudou a fechar uma venda depois.').waitFor();
  await pagina.screenshot({ path: path.join(FOTOS, 'diario-bolso-nota-salva.png') });

  // grava de verdade — não é só estado local do componente
  const linhas = await pagina.evaluate(() => window.__bancoFalso.tabelas.diario_bolso_entradas);
  const comNota = linhas.find((l) => l.nota_pessoal === 'Isso me ajudou a fechar uma venda depois.');
  assert.ok(comNota, 'a nota tem que estar gravada na tabela, não só na tela');
  assert.equal(comNota.user_id, 'u1');

  assert.deepEqual(erros, []);
  await ctx.close();
});
