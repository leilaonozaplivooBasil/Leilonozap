/**
 * 🔴 O RELATÓRIO DE LEILÃO NUM CHROMIUM DE VERDADE.
 *
 * A conta (tests/relatorioDoLeilao.test.mjs) e o PDF
 * (tests/pdfRelatorioDoLeilao.test.mjs) já têm prova em Node. O que só o
 * navegador prova:
 *   • a tela MONTA com a resposta da rota, sem quebrar em nenhum campo;
 *   • a RESSALVA aparece junto dos números, não escondida;
 *   • o botão PDF gera ARQUIVO — o caminho inteiro (bundle → jspdf → download).
 *
 * COMO RODAR
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-relatorio-leilao');
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
    const arq = path.join(SAIDA, rel === '/' ? 'relatorio-do-leilao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/relatorio-do-leilao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 1000 }, acceptDownloads: true });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="escolher-leilao"]', { timeout: 20000 });
  await pagina.selectOption('[data-teste="escolher-leilao"]', 'a1');
  await pagina.waitForSelector('[data-teste="relatorio-pronto"]', { timeout: 15000 });
  return { ctx, pagina, erros };
}

test('a tela monta com os números da regra', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const texto = await pagina.$eval('[data-teste="relatorio-pronto"]', (n) => n.innerText.replace(/\s+/g, ' '));
    // 2 depósitos pagos, R$ 1.200,00; 1 tentativa não paga de R$ 900,00
    assert.match(texto, /Dep[óo]sitos pagos 2/i, texto.slice(0, 400));
    assert.match(texto, /R\$ 1\.200,00/);
    assert.match(texto, /R\$ 900,00/);
    // os dois participantes aparecem, com o acento inteiro
    assert.ok(texto.includes('Ângela Conceição'));
    assert.ok(texto.includes('José Antônio da Conceição'));
    // quem arrematou é marcado
    assert.ok(texto.includes('arrematou'));
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🔴 a RESSALVA está na tela, junto do número', { skip: semNavegador }, async () => {
  // sem ela "R$ 1.200 de depósitos" é lido como o caixa do leilão, e não é
  const { ctx, pagina } = await abrir();
  try {
    const r = await pagina.$eval('[data-teste="ressalva-do-relatorio"]', (n) => ({
      texto: n.innerText, visivel: n.getBoundingClientRect().height > 0,
    }));
    assert.ok(r.visivel, 'a ressalva está no DOM mas não aparece');
    assert.match(r.texto, /não fica marcado com o leilão/);
  } finally { await ctx.close(); }
});

test('🔒 o selo de uso interno fecha a tela', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const texto = await pagina.$eval('[data-teste="relatorio-pronto"]', (n) => n.innerText);
    assert.match(texto, /USO INTERNO/);
    assert.match(texto, /não circular/);
  } finally { await ctx.close(); }
});

test('🔴 o botão PDF gera arquivo DE VERDADE', { skip: semNavegador }, async () => {
  // é isto que Node não prova: bundle → jspdf → download
  const { ctx, pagina, erros } = await abrir();
  try {
    const [baixado] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 20000 }),
      pagina.click('[data-teste="baixar-pdf"]'),
    ]);
    assert.match(baixado.suggestedFilename(), /^depositos-.*\.pdf$/);
    const caminho = await baixado.path();
    const tamanho = statSync(caminho).size;
    assert.ok(tamanho > 3000, `o PDF saiu pequeno demais (${tamanho} bytes)`);
    assert.equal(readFileSync(caminho).subarray(0, 5).toString('latin1'), '%PDF-');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
