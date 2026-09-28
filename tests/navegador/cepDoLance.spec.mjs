/**
 * 📮 O CEP DO LANCE É DIGITADO NO PRÓPRIO MODAL — num Chromium, tela de celular.
 *
 * 28/09/2026, vídeo do dono: "leilaonozap.net diz — Informe seu CEP para
 * calcular o frete antes de dar o lance" num alert() do navegador. Pedido:
 * modal moderno, a pessoa digita o CEP ali mesmo, sem vermelho, sem amarelo,
 * sem emoji, convidativo. Aqui roda o modal real e o caminho inteiro:
 * digitar → cotar sozinho → ver o frete → continuar para o lance.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-cep-do-lance');
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
    const arq = path.join(SAIDA, rel === '/' ? 'cep-do-lance.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/cep-do-lance.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const alertas = [];
  pagina.on('dialog', (d) => { alertas.push(d.message()); d.dismiss(); });
  await ctx.route('https://viacep.com.br/**', (r) => {
    const cep = r.request().url().match(/ws\/(\d{8})/)?.[1];
    const corpo = cep === '99999999' ? { erro: true }
      : { logradouro: cep === '26000000' ? 'Rua Doutor Barros Júnior' : 'Avenida Rio Branco', bairro: 'Centro', localidade: cep === '26000000' ? 'Nova Iguaçu' : 'Rio de Janeiro', uf: 'RJ' };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
  });
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="campo-cep"]', { timeout: 15000 });
  return { ctx, pagina, alertas };
}

test('abre com o campo de CEP já em foco, texto convidativo e sem alert()', { skip: semNavegador }, async () => {
  const { ctx, pagina, alertas } = await abrir();
  try {
    const foco = await pagina.evaluate(() => document.activeElement?.getAttribute('data-teste'));
    assert.equal(foco, 'campo-cep', 'a pessoa tem de poder digitar sem tocar no campo antes');
    const texto = await pagina.$eval('[data-teste="modal-cep-do-lance"]', (m) => m.textContent);
    assert.match(texto, /Qual é o seu CEP\?/);
    assert.match(texto, /Calculamos o frete na hora/);
    assert.doesNotMatch(texto, /\p{Extended_Pictographic}/u, 'sem emoji');
    assert.equal(alertas.length, 0);
    await pagina.screenshot({ path: path.join(SAIDA, 'cep-1-aberto.png') });
  } finally { await ctx.close(); }
});

test('8 números: cota sozinho, mostra cidade e frete, e o toque segue para o lance', { skip: semNavegador }, async () => {
  const { ctx, pagina, alertas } = await abrir();
  try {
    await pagina.type('[data-teste="campo-cep"]', '20000000', { delay: 20 });
    assert.equal(await pagina.$eval('[data-teste="campo-cep"]', (i) => i.value), '20000-000', 'máscara 00000-000');
    await pagina.waitForSelector('[data-teste="frete-no-modal"]', { timeout: 5000 });
    const caixa = await pagina.$eval('[data-teste="frete-no-modal"]', (c) => c.textContent.replace(/\s+/g, ' '));
    assert.match(caixa, /R\$ 21,90/);
    assert.match(caixa, /Rio de Janeiro\/RJ/);
    const botao = await pagina.$eval('[data-teste="continuar-lance"]', (b) => b.textContent.trim());
    assert.equal(botao, 'Dar lance de R$ 127,00');
    await pagina.screenshot({ path: path.join(SAIDA, 'cep-2-frete.png') });
    await pagina.tap('[data-teste="continuar-lance"]');
    assert.equal(await pagina.evaluate(() => window.__continuou), 1);
    assert.equal(alertas.length, 0);
  } finally { await ctx.close(); }
});

test('CEP que não existe: aviso neutro no próprio modal, e dá para corrigir ali', { skip: semNavegador }, async () => {
  const { ctx, pagina, alertas } = await abrir();
  try {
    await pagina.type('[data-teste="campo-cep"]', '99999999', { delay: 20 });
    await pagina.waitForFunction(() => /Não achamos esse CEP/.test(document.querySelector('[data-teste="cep-lugar"]')?.textContent || ''), null, { timeout: 5000 });
    // nenhum texto do modal pode estar em vermelho, laranja ou amarelo
    const quentes = await pagina.evaluate(() => [...document.querySelectorAll('[data-teste="modal-cep-do-lance"] *')]
      .map((el) => getComputedStyle(el).color)
      .filter((c) => { const [r, g, b] = (c.match(/\d+/g) || []).map(Number); return r > 150 && r > g + 40 && r > b + 60; }));
    assert.deepEqual(quentes, [], 'texto em cor quente no modal');
    await pagina.screenshot({ path: path.join(SAIDA, 'cep-3-nao-achou.png') });
    await pagina.fill('[data-teste="campo-cep"]', '');
    await pagina.type('[data-teste="campo-cep"]', '20000000', { delay: 20 });
    await pagina.waitForSelector('[data-teste="continuar-lance"]', { timeout: 5000 });
    assert.equal(alertas.length, 0);
  } finally { await ctx.close(); }
});

test('cotou mas falta o número: digita o número no modal e segue direto', { skip: semNavegador }, async () => {
  const { ctx, pagina, alertas } = await abrir();
  try {
    await pagina.type('[data-teste="campo-cep"]', '26000000', { delay: 20 });
    await pagina.waitForSelector('[data-teste="campo-numero"]', { timeout: 5000 });
    await pagina.waitForFunction(() => document.querySelector('input[aria-label="Rua"]')?.value === 'Rua Doutor Barros Júnior', null, { timeout: 5000 });
    await pagina.fill('[data-teste="campo-numero"]', '120');
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="salvar-endereco-e-seguir"]').disabled);
    await pagina.waitForTimeout(300); // a cor do botão tem transição
    await pagina.screenshot({ path: path.join(SAIDA, 'cep-4-numero.png') });
    await pagina.tap('[data-teste="salvar-endereco-e-seguir"]');
    await pagina.waitForFunction(() => window.__continuou === 1, null, { timeout: 5000 });
    const gravado = await pagina.evaluate(() => window.__gravou);
    assert.equal(gravado.address_number, '120');
    assert.equal(gravado.address_zip_code, '26000000');
    assert.equal(gravado.address_city, 'Nova Iguaçu');
    assert.equal(gravado.address_state, 'RJ');
    assert.equal(alertas.length, 0);
  } finally { await ctx.close(); }
});

test('fecha no Esc — sem lance nenhum', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.keyboard.press('Escape');
    await pagina.waitForSelector('[data-teste="fechado"]');
    assert.equal(await pagina.evaluate(() => window.__fechou), 1);
    assert.equal(await pagina.evaluate(() => window.__continuou), 0);
  } finally { await ctx.close(); }
});
