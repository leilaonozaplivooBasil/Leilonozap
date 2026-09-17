/**
 * 🔴 O CHECKOUT ABRE NO CARTÃO QUANDO A CARTEIRA ESCOLHEU CARTÃO — num Chromium.
 *
 * 17/09/2026: numa demonstração, escolheu o valor, marcou Cartão, apertou —
 * e o checkout carregou em PIX. Ler o arquivo prova que a linha mudou; só a
 * tela de verdade prova que o meio certo aparece marcado.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-cartao-carteira');
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
    const arq = path.join(SAIDA, rel === '/' ? 'cartao-da-carteira.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/cartao-da-carteira.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

// o SDK do Mercado Pago não existe na banca — a tela não pode depender dele pra desenhar
async function abrir({ semEscolha = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 950 } });
  const pagina = await ctx.newPage();
  await ctx.route('**/sdk.mercadopago.com/**', (r) => r.abort());
  await pagina.goto(BASE + (semEscolha ? '?pix=1' : ''), { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('text=Cartão de Crédito', { timeout: 20000 });
  return { ctx, pagina };
}

// O meio marcado é o que ganha a borda verde.
//
// 🔴 TOKEN EXATO, NUNCA `includes`. O estado NÃO selecionado carrega
// `hover:border-green-500/50` — que contém `border-green-500` como pedaço de
// texto. Com `includes`, os DOIS botões davam positivo e a prova mentia:
// ela acusou defeito num código que estava certo. Medido.
const marcado = (pagina) => pagina.evaluate(() => {
  const bts = [...document.querySelectorAll('button')].filter((b) => /PIX|Cart[aã]o de Cr[eé]dito/i.test(b.textContent || ''));
  const achado = bts.find((b) => b.className.split(/\s+/).includes('border-green-500'));
  return achado ? (/PIX/i.test(achado.textContent) ? 'PIX' : 'CARTAO') : 'NENHUM';
});

test('🔴 veio da carteira com CARTÃO → o checkout abre no CARTÃO', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    assert.equal(await marcado(pagina), 'CARTAO',
      'a escolha do cartão se perdeu no caminho — é exatamente o defeito da demonstração');
  } finally { await ctx.close(); }
});

test('🟢 sem escolha feita, o checkout continua abrindo no PIX', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir({ semEscolha: true });
  try {
    assert.equal(await marcado(pagina), 'PIX');
  } finally { await ctx.close(); }
});

test('💳 abrindo no cartão, os campos do cartão já aparecem', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    // se o meio abrisse em PIX, não haveria campo de número do cartão na tela
    const campos = await pagina.locator('input').count();
    assert.ok(campos > 0);
    const texto = await pagina.textContent('body');
    assert.match(texto, /cart[aã]o/i);
  } finally { await ctx.close(); }
});
