/** 👥 Tarefa para várias pessoas: marcar, contar, e cada uma ganhar a própria tarefa, card e sino — num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-tarefa-para-varios');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';
let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'tarefa-para-varios.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/tarefa-para-varios.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('👥 marcar 3 pessoas → cada uma recebe tarefa, card ligado e sino', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1000, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="modo-varios"]', { timeout: 20000 });
    await pagina.click('[data-teste="modo-varios"]');
    // a lista é a COMPLETA (5), não só o time corporativo (3); começa com a pessoa do seletor marcada
    assert.equal(await pagina.locator('[data-teste="pessoa-varios"]').count(), 5);
    assert.match(await pagina.locator('[data-teste="contagem-varios"]').innerText(), /^1 pessoa marcada/);
    await pagina.locator('[data-teste="pessoa-varios"]', { hasText: 'Iara' }).click();
    await pagina.locator('[data-teste="pessoa-varios"]', { hasText: 'Sophia' }).click();
    assert.match(await pagina.locator('[data-teste="contagem-varios"]').innerText(), /^3 pessoas marcadas/);
    await pagina.fill('[data-teste="titulo"]', 'Ligar para 5 leads da lista');
    const botao = pagina.locator('[data-teste="distribuir"]');
    assert.match(await botao.innerText(), /Distribuir pra 3 pessoas/);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA, fullPage: true });
    await botao.click();
    await pagina.waitForFunction(() => window.__bancoFalso.escritas.some((e) => e.tabela === 'xgame_mensagens'), null, { timeout: 10000 });
    const r = await pagina.evaluate(() => {
      const tarefas = window.__bancoFalso.escritas.filter((e) => e.tabela === 'metodo_tarefas' && e.tipo === 'insert');
      const cards = window.__bancoFalso.escritas.filter((e) => e.tabela === 'metodo_quadro' && e.tipo === 'insert');
      const avisos = window.__bancoFalso.escritas.filter((e) => e.tabela === 'xgame_mensagens' && e.tipo === 'insert');
      const t = tarefas.flatMap((e) => e.linhas); const c = cards.flatMap((e) => e.linhas); const a = avisos.flatMap((e) => e.linhas);
      return {
        insertsTarefa: tarefas.length, insertsCard: cards.length, insertsAviso: avisos.length,
        donosTarefa: t.map((x) => x.user_id).sort(), titulos: [...new Set(t.map((x) => x.titulo))],
        cardLigado: c.every((x) => t.some((y) => y.id === x.virou_tarefa_id && y.user_id === x.user_id)),
        donosCard: c.map((x) => x.user_id).sort(), destinosAviso: a.map((x) => x.destino_id).sort(),
      };
    });
    assert.equal(r.insertsTarefa, 1, 'um insert só de tarefas'); assert.equal(r.insertsCard, 1); assert.equal(r.insertsAviso, 1);
    assert.deepEqual(r.donosTarefa, ['ailton', 'iara', 'sophia']);
    assert.deepEqual(r.titulos, ['Ligar para 5 leads da lista']);
    assert.deepEqual(r.donosCard, ['ailton', 'iara', 'sophia']);
    assert.equal(r.cardLigado, true, 'algum card não ficou ligado à tarefa da própria pessoa');
    assert.deepEqual(r.destinosAviso, ['ailton', 'iara', 'sophia']);
    await pagina.getByText(/Tarefa distribuída pra 3 pessoas/).waitFor({ timeout: 5000 });
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('modo de sempre (uma pessoa) continua mandando só pra ela', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1000, height: 900 } });
  const pagina = await ctx.newPage();
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="distribuir"]', { timeout: 20000 });
    await pagina.fill('[data-teste="titulo"]', 'Organizar o estoque');
    assert.match(await pagina.locator('[data-teste="distribuir"]').innerText(), /^Distribuir tarefa$/);
    await pagina.click('[data-teste="distribuir"]');
    await pagina.waitForFunction(() => window.__bancoFalso.escritas.some((e) => e.tabela === 'xgame_mensagens'), null, { timeout: 10000 });
    const donos = await pagina.evaluate(() => window.__bancoFalso.escritas.filter((e) => e.tabela === 'metodo_tarefas').flatMap((e) => e.linhas).map((x) => x.user_id));
    assert.deepEqual(donos, ['ailton']);
  } finally { await ctx.close(); }
});
