/**
 * 🗓️ A DATA DE ENCERRAMENTO APARECE NA TELA DE CADASTRO — num Chromium.
 *
 * 17/09/2026: quatro relógios nasceram com 72h quando o pedido era 48h.
 * "3 dias (72h)" e "2 dias (48h)" são linhas vizinhas numa lista, e ninguém
 * faz a conta de cabeça no meio do cadastro.
 *
 * Ler o arquivo prova que a linha existe no código. Só a tela de verdade
 * prova que ela APARECE, e que MUDA quando o operador troca a duração — que é
 * a única coisa capaz de evitar o erro de novo.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-fim-do-leilao');
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
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'fim-do-leilao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/fim-do-leilao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="fim-previsto"]', { timeout: 20000 });
  return { ctx, pagina };
}

const fraseDoFim = (pagina) => pagina.textContent('[data-teste="fim-previsto"]');

// troca a duração pelo Select REAL (Radix), como o operador faria
async function escolherDuracao(pagina, rotulo) {
  await pagina.click('[role="combobox"]');
  await pagina.click(`[role="option"]:has-text("${rotulo}")`);
  await pagina.waitForFunction(
    (r) => !document.querySelector(`[role="option"]`) && (document.querySelector('[role="combobox"]')?.textContent || '').includes(r),
    rotulo, { timeout: 10000 },
  );
  return fraseDoFim(pagina);
}

// "sábado, 19/09/2026 às 14:15" → { dia: Date(2026-09-19), hora: '14:15' }
function lerFrase(texto) {
  const m = /(\d{2})\/(\d{2})\/(\d{4}) às (\d{2}:\d{2})/.exec(texto || '');
  assert.ok(m, `a frase não trouxe data e hora legíveis: ${JSON.stringify(texto)}`);
  return { dia: Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])), hora: m[4], data: `${m[1]}/${m[2]}/${m[3]}` };
}

test('a tela mostra a data e a hora exatas do encerramento', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const frase = await fraseDoFim(pagina);
    assert.match(frase, /Publicando agora, encerra/);
    assert.match(frase, /(segunda|terça|quarta|quinta|sexta)-feira|sábado|domingo/,
      'sem o dia da semana por extenso, "18/09" e "19/09" continuam parecidos demais');
    lerFrase(frase); // trava o formato dd/mm/aaaa às hh:mm
  } finally { await ctx.close(); }
});

test('a tela diz de que fuso é aquela hora', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    assert.match(await fraseDoFim(pagina), /horário de Brasília/);
  } finally { await ctx.close(); }
});

test('🔴 48h e 72h mostram DIAS DIFERENTES — o erro dos relógios fica visível', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const deQuarentaEOito = lerFrase(await escolherDuracao(pagina, '2 dias (48h)'));
    const deSetentaEDuas = lerFrase(await escolherDuracao(pagina, '3 dias (72h)'));

    assert.notEqual(deQuarentaEOito.data, deSetentaEDuas.data,
      'se as duas durações mostrassem a mesma data, a frase não evitaria nada');
    assert.equal(deSetentaEDuas.dia - deQuarentaEOito.dia, 24 * 60 * 60 * 1000,
      '72h tem que cair exatamente UM dia depois de 48h');
    assert.equal(deSetentaEDuas.hora, deQuarentaEOito.hora,
      'a hora do encerramento não muda entre 48h e 72h — só o dia');
  } finally { await ctx.close(); }
});

test('trocar para 1 dia puxa a data pra trás — a frase acompanha, não congela', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const umaSemana = lerFrase(await escolherDuracao(pagina, '1 semana'));
    const umDia = lerFrase(await escolherDuracao(pagina, '1 dia (24h)'));
    assert.equal(umaSemana.dia - umDia.dia, 6 * 24 * 60 * 60 * 1000,
      '1 semana tem que cair 6 dias depois de 1 dia');
  } finally { await ctx.close(); }
});
