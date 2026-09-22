/**
 * 🧠 A ABA DEMANDAS NUM CHROMIUM DE VERDADE.
 *
 * As regras têm 19 provas no Node, em JS puro. Isto mede o que a régua não
 * alcança:
 *
 *   • a lista abre AGRUPADA pelo dia da anotação — é o pedido literal do
 *     áudio ("entra numa lista com a data do dia que foi anotado");
 *   • demanda de outra pessoa, e demanda que já virou trabalho, não aparecem;
 *   • "transformar em tarefa" CRIA a tarefa e o cartão de verdade, e só então
 *     tira a demanda da caixa — é aqui que uma anotação poderia sumir sem
 *     virar nada, que é o pior defeito possível desta tela.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-demandas');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'demandas.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/demandas.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="demandas-lista"]', { timeout: 20000 });
  return { ctx, pagina };
}

const demandas = (p) => p.locator('[data-teste="demanda"]');

test('🔴 abre agrupada pelo DIA da anotação', { skip: semNavegador }, async () => {
  // o pedido literal do áudio. Sem o agrupamento, é só mais uma lista.
  const { ctx, pagina } = await abrir();
  const dias = pagina.locator('[data-teste="demandas-dia"]');
  assert.equal(await dias.count(), 2, 'esperava dois dias (19/09 e 17/09)');
  assert.match(await dias.first().innerText(), /Hoje/, 'o dia de hoje devia se chamar "Hoje"');
  await ctx.close();
});

test('🔴 não mostra demanda de outra pessoa nem o que já virou trabalho', { skip: semNavegador }, async () => {
  // a banca semeia 5 linhas: 3 abertas dele, 1 já agendada, 1 de outro usuário.
  const { ctx, pagina } = await abrir();
  assert.equal(await demandas(pagina).count(), 3);
  const texto = await pagina.locator('[data-teste="demandas-lista"]').innerText();
  assert.ok(!texto.includes('demanda alheia'), 'vazou demanda de outra pessoa');
  assert.ok(!texto.includes('isso já foi'), 'mostrou demanda que já virou trabalho');
  await ctx.close();
});

test('🔴 transformar CRIA a tarefa de verdade e tira da caixa', { skip: semNavegador }, async () => {
  // o ponto onde uma anotação poderia sumir sem virar nada.
  const { ctx, pagina } = await abrir();
  await demandas(pagina).first().locator('[data-teste="demanda-transformar"]').click();
  await pagina.locator('[data-teste="demanda-destinos"] button').first().click(); // "Minha jornada"
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="demanda"]').length === 2, null, { timeout: 8000 });

  const tarefas = await pagina.evaluate(() => window.__bancoFalso.tabelas.metodo_tarefas);
  assert.equal(tarefas.length, 1, 'não criou a tarefa');
  assert.equal(tarefas[0].titulo, 'ligar pro fornecedor');
  assert.equal(tarefas[0].data, '2026-09-19', 'a tarefa não nasceu no dia de hoje');

  const demanda = await pagina.evaluate(() => window.__bancoFalso.tabelas.xperf_demandas.find((d) => d.id === 'd1'));
  assert.equal(demanda.status, 'agendada');
  assert.equal(demanda.tarefa_id, tarefas[0].id, 'a demanda não guardou o vínculo com a tarefa');
  await ctx.close();
});

test('🔴 "os dois" cria tarefa E cartão, ligados entre si', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await demandas(pagina).first().locator('[data-teste="demanda-transformar"]').click();
  await pagina.locator('[data-teste="demanda-destinos"] button').nth(2).click(); // "Os dois"
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="demanda"]').length === 2, null, { timeout: 8000 });

  const { tarefas, cards } = await pagina.evaluate(() => ({
    tarefas: window.__bancoFalso.tabelas.metodo_tarefas,
    cards: window.__bancoFalso.tabelas.metodo_quadro,
  }));
  assert.equal(tarefas.length, 1, 'não criou a tarefa');
  assert.equal(cards.length, 1, 'não criou o cartão');
  assert.equal(cards[0].virou_tarefa_id, tarefas[0].id, 'o cartão não aponta para a tarefa');
  await ctx.close();
});

test('a origem aparece, para o dono saber de onde veio', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  const texto = await pagina.locator('[data-teste="demandas-lista"]').innerText();
  assert.match(texto, /do mapa mental/);
  assert.match(texto, /do encontro/);
  await ctx.close();
});

test('🔴 "Abrir no mapa" leva o título e NÃO tira a demanda da caixa', { skip: semNavegador }, async () => {
  // Áudio de 19/09 (10h32): "dali eu transformo em ou mapa mental, PARA ABRIR
  // o mapa mental, ou no quadro". O mapa é o desenho do pensamento, não um
  // destino — a demanda vira trabalho quando virar tarefa ou cartão, não
  // quando alguém resolve pensar nela. Tirá-la aqui a faria sumir sem nada
  // ter sido criado.
  const { ctx, pagina } = await abrir();
  const antes = await demandas(pagina).count();
  await demandas(pagina).first().locator('[data-teste="demanda-transformar"]').click();
  await pagina.locator('[data-teste="demanda-destinos"] button').nth(3).click(); // "Abrir no mapa"

  await pagina.waitForFunction(() => (window.__proMapa || []).length === 1, null, { timeout: 8000 });
  assert.deepEqual(await pagina.evaluate(() => window.__proMapa), ['ligar pro fornecedor']);

  assert.equal(await demandas(pagina).count(), antes, 'a demanda saiu da caixa só por ir pro mapa');
  const { tarefas, demanda } = await pagina.evaluate(() => ({
    tarefas: window.__bancoFalso.tabelas.metodo_tarefas,
    demanda: window.__bancoFalso.tabelas.xperf_demandas.find((d) => d.id === 'd1'),
  }));
  assert.equal(tarefas.length, 0, 'criou tarefa para algo que era só pensamento');
  assert.equal(demanda.status, 'recebida', 'marcou como agendada sem nada ter sido criado');
  await ctx.close();
});
