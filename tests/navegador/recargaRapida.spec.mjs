/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-recarga-rapida');
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
    const arq = path.join(SAIDA, rel === '/' ? 'recarga-rapida.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/recarga-rapida.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(query = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${query}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="recarga-gaveta"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('⚡ a gaveta sobe com os 6 pacotes, o que cobre o lance já marcado, e o "digite o valor" vale', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    for (const p of [27, 50, 100, 500, 1000, 3000]) assert.equal(await pagina.locator(`[data-teste="pacote-${p}"]`).count(), 1, `pacote ${p}`);
    // saldo 106,87 e lance 997 → faltam 890,13 → sugere 1000
    assert.match(await pagina.$eval('[data-teste="recarga-faltam"]', (n) => n.textContent), /890,13/);
    assert.equal(await pagina.getAttribute('[data-teste="pacote-1000"]', 'aria-checked'), 'true');
    assert.equal(await pagina.locator('[data-teste="pacote-sugerido"]').count(), 1);
    assert.match(await pagina.$eval('[data-teste="recarga-gerar"]', (n) => n.textContent), /Pagar R\$ 1\.000,00 com PIX/);
    // encostada embaixo, largura toda (é gaveta, não caixa no meio)
    const g = await pagina.$eval('[data-teste="recarga-gaveta"]', (n) => { const r = n.getBoundingClientRect(); return { fundo: r.bottom, esq: r.left, dir: r.right }; });
    assert.ok(g.fundo >= 843 && g.esq <= 1 && g.dir >= 389, JSON.stringify(g));
    if (process.env.FOTO_BANCA) { await pagina.waitForTimeout(400); await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-pacotes.png') }); }
    // escolher outro pacote e digitar
    await pagina.click('[data-teste="pacote-27"]');
    assert.match(await pagina.$eval('[data-teste="recarga-gerar"]', (n) => n.textContent), /R\$ 27,00/);
    await pagina.fill('[data-teste="recarga-valor"]', '3');
    assert.match(await pagina.$eval('[data-teste="recarga-problema"]', (n) => n.textContent), /mínimo é R\$ 5,00/);
    assert.equal(await pagina.isDisabled('[data-teste="recarga-gerar"]'), true);
    await pagina.fill('[data-teste="recarga-valor"]', '150,50');
    assert.match(await pagina.$eval('[data-teste="recarga-gerar"]', (n) => n.textContent), /R\$ 150,50/);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('💳 o PIX nasce AQUI (mesma rota do checkout), e quando cai a sala recarrega o saldo e a gaveta fecha', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    await pagina.click('[data-teste="pacote-100"]');
    await pagina.click('[data-teste="recarga-gerar"]');
    await pagina.waitForSelector('[data-teste="recarga-pix"]');
    const chamada = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.find((c) => c.nome === 'createMPWalletDeposit')?.corpo);
    assert.equal(chamada.amount, 100); assert.equal(chamada.billing_type, 'PIX'); assert.equal(chamada.deposit_type, 'digital_wallet');
    assert.equal(chamada.buyer_id, 'u1'); assert.equal(chamada.buyer_email, 'angela@x.com'); assert.equal(chamada.auction_id, null);
    assert.equal(await pagina.locator('[data-teste="recarga-qr"]').count(), 1);
    assert.equal(await pagina.locator('[data-teste="recarga-copiar"]').count(), 1);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-pix.png') });
    // o banco confirma → a gaveta vê, a sala recarrega o saldo, e fecha
    await pagina.evaluate(() => { window.__pagou = true; });
    await pagina.waitForSelector('[data-teste="recarga-confirmada"]', { timeout: 10000 });
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="recarga-gaveta"]'), null, { timeout: 5000 });
    assert.equal(await pagina.evaluate(() => window.__recargas), 1);
    assert.match(await pagina.$eval('[data-teste="saldo-da-sala"]', (n) => n.textContent), /1106\.87/);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('sem e-mail no cadastro, o botão manda pra tela completa; "só assistir" fecha', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?semEmail=1');
  try {
    assert.match(await pagina.$eval('[data-teste="recarga-gerar"]', (n) => n.textContent), /Adicionar R\$ 1\.000,00/);
    await pagina.click('[data-teste="recarga-gerar"]');
    assert.equal(await pagina.evaluate(() => window.__maisOpcoes), 1);
    assert.equal(await pagina.evaluate(() => window.__plataformaFalsa.chamadas.filter((c) => c.nome === 'createMPWalletDeposit').length), 0);
    await pagina.click('[data-teste="dar-lance"]');
    await pagina.click('[data-teste="recarga-assistir"]');
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="recarga-gaveta"]'));
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
