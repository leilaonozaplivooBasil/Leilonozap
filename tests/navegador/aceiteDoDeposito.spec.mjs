/**
 * 🔴 O BOTÃO DE DEPÓSITO RESPONDE, MESMO SEM O ACEITE — num Chromium.
 *
 * 17/09/2026: "clica no botão para pagar com o cartão e a tela só finge que vai
 * abrir e não abre". O botão nascia `disabled` por causa de uma caixa de aceite
 * que fica acima dos valores. Botão desligado não dispara onClick — então o
 * aviso que já existia no código nunca aparecia. Silêncio total.
 *
 * A exigência continua: sem aceite NÃO há depósito. O que mudou é que o botão
 * agora diz o que falta em vez de fingir que não foi apertado.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-aceite-deposito');
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
    const arq = path.join(SAIDA, rel === '/' ? 'aceite-do-deposito.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/aceite-do-deposito.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

// clica pelo texto exato, direto no DOM: os rótulos têm espaços do JSX e
// seletores por texto do Playwright erram neles
const clicar = (pagina, alvo) => pagina.evaluate((alvo) => {
  const b = [...document.querySelectorAll('button')]
    .find((x) => (x.textContent || '').replace(/\s+/g, ' ').trim() === alvo);
  if (!b) return false;
  b.click();
  return true;
}, alvo);

const botaoDeAcao = (pagina) => pagina.evaluate(() => {
  const b = [...document.querySelectorAll('button')]
    .filter((x) => /Continuar no Cart[aã]o|Gerar PIX/.test(x.textContent || ''));
  const a = b[b.length - 1];
  return a ? { texto: (a.textContent || '').replace(/\s+/g, ' ').trim(), desligado: a.disabled } : null;
});

async function abrir({ meio = 'Cartão', valor = 'R$ 500,00' } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 950 } });
  const pagina = await ctx.newPage();
  await ctx.route('**/api/functions/**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, saldo_disponivel: 0, saldo_livre_loja: 0, commission_balance: 0, saldo_reservado: 0, saldo_alocado: 0, saldo_a_liberar: 0, kyc_status: 'aprovado', commissions: [], withdrawals: [], transactions: [] }),
  }));
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="caixa-de-aceite"]', { timeout: 15000 });
  assert.ok(await clicar(pagina, valor), `não achei o valor ${valor}`);
  await pagina.waitForTimeout(200);
  assert.ok(await clicar(pagina, meio), `não achei o meio ${meio}`);
  await pagina.waitForTimeout(300);
  return { ctx, pagina };
}

test('🔴 SEM o aceite, o botão do cartão NÃO nasce desligado', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const b = await botaoDeAcao(pagina);
    assert.equal(b.texto, 'Continuar no Cartão');
    assert.equal(b.desligado, false,
      'o botão voltou a nascer desligado — é o defeito de 17/09: clique mudo, sem aviso nenhum');
  } finally { await ctx.close(); }
});

test('🔴 SEM o aceite, o botão do PIX também responde', { skip: semNavegador }, async () => {
  // a mesma trava valia nos DOIS botões; quem testou só PIX nunca viu
  const { ctx, pagina } = await abrir({ meio: 'PIX' });
  try {
    const b = await botaoDeAcao(pagina);
    assert.match(b.texto, /Gerar PIX/);
    assert.equal(b.desligado, false);
  } finally { await ctx.close(); }
});

test('🔴 clicar sem aceite AVISA e DESTACA a caixa', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const antes = await pagina.$eval('[data-teste="caixa-de-aceite"]', (l) => l.className.includes('ring-amber-400/60'));
    assert.equal(antes, false, 'a caixa não pode nascer destacada');

    await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter((x) => /Continuar no Cart[aã]o/.test(x.textContent || ''));
      b[b.length - 1].click();
    });
    await pagina.waitForTimeout(400);

    const depois = await pagina.$eval('[data-teste="caixa-de-aceite"]', (l) => l.className.includes('ring-amber-400/60'));
    assert.equal(depois, true, 'o clique não apontou para a caixa — a pessoa continua sem saber o que falta');
    const corpo = await pagina.textContent('body');
    assert.match(corpo, /Marque o aceite do cr[eé]dito/i, 'o aviso não apareceu');
  } finally { await ctx.close(); }
});

test('🟢 o destaque apaga sozinho, não fica piscando pra sempre', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('button')].filter((x) => /Continuar no Cart[aã]o/.test(x.textContent || ''));
      b[b.length - 1].click();
    });
    await pagina.waitForTimeout(3200);
    const fim = await pagina.$eval('[data-teste="caixa-de-aceite"]', (l) => l.className.includes('ring-amber-400/60'));
    assert.equal(fim, false);
  } finally { await ctx.close(); }
});

test('🔴 valor abaixo do mínimo SEGUE desligando o botão', { skip: semNavegador }, async () => {
  // essa trava a pessoa entende sozinha (o texto do mínimo está logo abaixo) —
  // e ela continua valendo: o conserto é só sobre o aceite
  const { ctx, pagina } = await abrir({ valor: 'R$ 100,00' });
  try {
    await pagina.evaluate(() => {
      const i = document.querySelector('input[inputmode="decimal"], input[type="text"][placeholder*="utro"], input[placeholder*="valor" i]');
      if (i) { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(i, '10'); i.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await pagina.waitForTimeout(300);
    const b = await botaoDeAcao(pagina);
    if (b) assert.equal(b.desligado, true, 'abaixo de R$ 100 o botão tem que continuar desligado');
  } finally { await ctx.close(); }
});
