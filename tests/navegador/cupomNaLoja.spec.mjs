/**
 * 🔴 O CUPOM DA LOJA FUNCIONA — E A TELA NÃO MENTE SOBRE ELE — num Chromium.
 *
 * 22/09/2026: pedido de cupom pra um cliente. O campo "Aplicar cupom" do
 * checkout do produto estava `disabled` no código — digitava, clicava, nada.
 *
 * Duas coisas são provadas aqui, e a segunda é a que custa dinheiro:
 *   1. o campo responde e o desconto aparece no total;
 *   2. quando o SERVIDOR engole o cupom (createMPPix faz isso de propósito pra
 *      não derrubar a compra) a tela DESFAZ o desconto que mostrou e avisa.
 *      Sem (2), o cliente lê "−R$ 20,46" e recebe um PIX do valor inteiro.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-cupom-na-loja');
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
    const arq = path.join(SAIDA, rel === '/' ? 'cupom-na-loja.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/cupom-na-loja.html?product_id=p1`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

const campoCupom = (p) => p.$('input[placeholder="Insira o cupom aqui"]');

// clica pelo texto exato: os rótulos têm espaços do JSX
const clicar = (pagina, alvo) => pagina.evaluate((alvo) => {
  const b = [...document.querySelectorAll('button')]
    .find((x) => (x.textContent || '').replace(/\s+/g, ' ').trim() === alvo);
  if (!b) return false;
  b.click();
  return true;
}, alvo);

// o "Valor total" do resumo, como o cliente lê
const valorTotal = (pagina) => pagina.$eval('[data-teste="valor-total"]',
  (e) => (e.textContent || '').replace(/\s+/g, ' ').trim());

const textoDaTela = (pagina) => pagina.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

async function abrir({ servidorAceita = true } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 1000 } });
  const pagina = await ctx.newPage();
  await pagina.addInitScript((aceita) => { window.__servidorAceitaCupomInicial = aceita; }, servidorAceita);
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('input[placeholder="Insira o cupom aqui"]', { timeout: 20000 });
  await pagina.evaluate(() => { window.__servidorAceitaCupom = window.__servidorAceitaCupomInicial; });
  return { ctx, pagina };
}

async function digitarEAplicar(pagina, codigo) {
  const campo = await campoCupom(pagina);
  await campo.fill(codigo);
  assert.ok(await clicar(pagina, 'Aplicar'), 'não achei o botão Aplicar');
  await pagina.waitForTimeout(400);
}

test('🔴 o campo de cupom NÃO nasce desligado', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const campo = await campoCupom(pagina);
    assert.ok(campo, 'o campo de cupom sumiu da tela');
    assert.equal(await campo.isDisabled(), false,
      'o campo voltou a nascer `disabled` — é o defeito de 22/09: digita, clica e nada acontece');

    const botao = await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Aplicar');
      return b ? { existe: true, desligado: b.disabled } : { existe: false };
    });
    assert.equal(botao.existe, true, 'o botão Aplicar sumiu');
    // nasce desligado só porque o campo está vazio — e liga ao digitar (teste abaixo)
    assert.equal(botao.desligado, true);
  } finally { await ctx.close(); }
});

test('cupom válido aparece no resumo e ABATE do total', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    assert.equal(await valorTotal(pagina), 'R$ 87,25', 'o total de partida mudou');

    await digitarEAplicar(pagina, 'RONILSON2046');

    const texto = await textoDaTela(pagina);
    assert.match(texto, /Cupom RONILSON2046/, 'o cupom aplicado não apareceu no resumo');
    assert.match(texto, /− R\$ 20,46/, 'a linha de desconto não apareceu');
    assert.equal(await valorTotal(pagina), 'R$ 66,79',
      'o total não caiu: 87,25 − 20,46 = 66,79');
  } finally { await ctx.close(); }
});

test('cupom recusado mostra o MOTIVO e não mexe no total', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await digitarEAplicar(pagina, 'BEMVINDO10');
    const texto = await textoDaTela(pagina);
    assert.match(texto, /Cupom expirado/,
      'a tela precisa dizer POR QUE recusou — "inválido" genérico manda o cliente pro suporte');
    assert.equal(await valorTotal(pagina), 'R$ 87,25', 'total mudou com cupom recusado');
  } finally { await ctx.close(); }
});

test('digitar liga o botão Aplicar', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const campo = await campoCupom(pagina);
    await campo.fill('QUALQUERCOISA');
    await pagina.waitForTimeout(150);
    const desligado = await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Aplicar');
      return b?.disabled;
    });
    assert.equal(desligado, false, 'o botão continuou desligado mesmo com cupom digitado');
  } finally { await ctx.close(); }
});

test('o código do cupom é MANDADO pro createMPPix', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await digitarEAplicar(pagina, 'RONILSON2046');
    assert.ok(await clicar(pagina, 'GERAR PIX'), 'não achei o botão Gerar PIX');
    await pagina.waitForTimeout(700);

    const enviado = await pagina.evaluate(() => {
      const c = (window.__plataformaFalsa?.chamadas || []).find((x) => x.nome === 'createMPPix');
      return c ? c.corpo?.coupon_code : '(createMPPix não foi chamado)';
    });
    assert.equal(enviado, 'RONILSON2046',
      'a tela aplicou o cupom na vitrine e não mandou pro servidor — desconto só no papel');
  } finally { await ctx.close(); }
});

test('🔴 se o SERVIDOR engolir o cupom, a tela desfaz o desconto e AVISA', { skip: semNavegador }, async () => {
  // Este é o caro. createMPPix ignora cupom inválido de propósito e cobra
  // cheio. Sem esta conferência o cliente lê "−R$ 20,46" e paga R$ 87,25.
  const { ctx, pagina } = await abrir({ servidorAceita: false });
  try {
    await digitarEAplicar(pagina, 'RONILSON2046');
    assert.equal(await valorTotal(pagina), 'R$ 66,79', 'a prévia deveria ter mostrado o desconto');

    assert.ok(await clicar(pagina, 'GERAR PIX'), 'não achei o botão Gerar PIX');
    await pagina.waitForTimeout(900);

    const texto = await textoDaTela(pagina);
    assert.match(texto, /cupom não valeu/i,
      'o servidor cobrou cheio e a tela não avisou — cliente vê desconto e paga o valor inteiro');
    assert.equal(await valorTotal(pagina), 'R$ 87,25',
      'a tela continuou mostrando o total com desconto depois de o servidor recusar o cupom');
  } finally { await ctx.close(); }
});
