/** 📝 O botão D: anotar cria demanda + tarefa de hoje + card ligado, fecha a demanda e avisa as telas — num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-bloco-de-demandas');
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
    const arq = path.join(SAIDA, rel === '/' ? 'bloco-de-demandas.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/bloco-de-demandas.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('📝 anotar no "D": demanda + tarefa de hoje (sem horário) + card ligado + fechamento + evento', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 800 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="botao-d-demandas"]', { timeout: 20000 });
    // só logado: o segundo (deslogado) não desenha nada
    assert.equal(await pagina.locator('[data-teste="botao-d-demandas"]').count(), 1);
    assert.equal(await pagina.locator('[data-teste="deslogado"]').evaluate((n) => n.children.length), 0);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-cabecalho.png') });

    await pagina.click('[data-teste="botao-d-demandas"]');
    await pagina.waitForSelector('[data-teste="modal-bloco-demandas"]');
    // a lista mostra só as do bloco (a do mapa fica de fora)
    await pagina.waitForSelector('[data-teste="anotacao"]');
    assert.equal(await pagina.locator('[data-teste="anotacao"]').count(), 1);
    assert.match(await pagina.locator('[data-teste="anotacao"]').first().innerText(), /Anotação antiga[\s\S]*na jornada e no quadro/);

    await pagina.fill('[data-teste="texto-anotacao"]', 'Ligar pro fornecedor de caixas');
    await pagina.waitForTimeout(300);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA });
    await pagina.press('[data-teste="texto-anotacao"]', 'Enter');
    await pagina.waitForFunction(() => window.__eventos.length > 0, null, { timeout: 10000 });

    const r = await pagina.evaluate(() => {
      const b = window.__bancoFalso;
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      const dem = b.tabelas.xperf_demandas.find((d) => d.titulo === 'Ligar pro fornecedor de caixas');
      const tar = b.tabelas.metodo_tarefas.find((t) => t.titulo === 'Ligar pro fornecedor de caixas');
      const card = b.tabelas.metodo_quadro.find((c) => c.titulo === 'Ligar pro fornecedor de caixas');
      return {
        hoje, eventos: window.__eventos,
        demanda: dem && { origem: dem.origem, status: dem.status, agendada_para: dem.agendada_para, tarefa_id: dem.tarefa_id, card_id: dem.card_id, pessoa_id: dem.pessoa_id },
        tarefa: tar && { user_id: tar.user_id, data: tar.data, hora: tar.hora, ordem: tar.ordem, feito: tar.feito, demanda_id: tar.demanda_id, id: tar.id },
        card: card && { user_id: card.user_id, virou_tarefa_id: card.virou_tarefa_id, coluna: card.coluna, demanda_id: card.demanda_id, id: card.id },
        ordemEscritas: b.escritas.map((e) => `${e.tipo}:${e.tabela}`),
      };
    });
    assert.deepEqual(r.eventos, ['demandaAnotada']);
    assert.equal(r.demanda.origem, 'bloco'); assert.equal(r.demanda.pessoa_id, 'u1');
    assert.equal(r.tarefa.data, r.hoje, 'a tarefa é de HOJE');
    assert.equal(r.tarefa.hora, null, 'sem horário');
    assert.equal(r.tarefa.ordem, 1, 'entra depois da que já existia no dia');
    assert.equal(r.tarefa.feito, false);
    assert.equal(r.card.virou_tarefa_id, r.tarefa.id, 'o card não ficou ligado à tarefa');
    assert.equal(r.card.coluna, 'aberto');
    assert.equal(r.demanda.status, 'agendada'); assert.equal(r.demanda.agendada_para, r.hoje);
    assert.equal(r.demanda.tarefa_id, r.tarefa.id); assert.equal(r.demanda.card_id, r.card.id);
    assert.ok(r.tarefa.demanda_id && r.tarefa.demanda_id === r.card.demanda_id, 'tarefa e card apontam pra mesma demanda');
    assert.deepEqual(r.ordemEscritas, ['insert:xperf_demandas', 'insert:metodo_tarefas', 'insert:metodo_quadro', 'update:xperf_demandas']);

    // a lista do modal já mostra a nova em primeiro, e o campo limpou
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="anotacao"]').length === 2);
    assert.match(await pagina.locator('[data-teste="anotacao"]').first().innerText(), /Ligar pro fornecedor de caixas[\s\S]*na jornada e no quadro/);
    assert.equal(await pagina.inputValue('[data-teste="texto-anotacao"]'), '');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-depois.png') });
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('texto vazio não grava nada', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 800 } });
  const pagina = await ctx.newPage();
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.click('[data-teste="botao-d-demandas"]');
    await pagina.waitForSelector('[data-teste="modal-bloco-demandas"]');
    assert.equal(await pagina.locator('[data-teste="anotar"]').isDisabled(), true);
    await pagina.fill('[data-teste="texto-anotacao"]', '   ');
    await pagina.press('[data-teste="texto-anotacao"]', 'Enter');
    await pagina.waitForTimeout(500);
    assert.equal(await pagina.evaluate(() => window.__bancoFalso.escritas.length), 0);
  } finally { await ctx.close(); }
});
