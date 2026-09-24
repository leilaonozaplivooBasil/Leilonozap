/** 🎯 O placar do dia: um alerta só, um número grande e a explicação que abre no toque. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-placar-do-dia');
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
    const arq = path.join(SAIDA, rel === '/' ? 'placar-do-dia.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/placar-do-dia.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });


async function abrir(q = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 393, height: 800 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="placar-do-dia"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}
const alertas = (pagina) => pagina.$$eval('[data-teste="alerta-do-dia"]', (ns) => ns.map((n) => n.getAttribute('data-tipo')));

// 🔴 O DEFEITO: com dois avisos disparando junto, a pessoa lia TRÊS blocos
//    vermelhos antes do próprio número — e os dois vermelhos dizem a mesma
//    coisa ("DIA ZERADO"). Agora vence o mais grave, e só ele aparece.
test('🎯 os quatro avisos disparando juntos viram UM só — o mais grave', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?caso=zerado');
  try {
    assert.deepEqual(await alertas(pagina), ['zerado-nao-votou'], 'a pilha de avisos voltou');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-zerado.png') });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('cada caso mostra o seu alerta, e o dia limpo não mostra nenhum', { skip: semNavegador }, async () => {
  for (const [caso, esperado] of [['limpo', []], ['aviso', ['aviso-pronto']], ['liberado', ['liberado']]]) {
    const { ctx, pagina, erros } = await abrir(`?caso=${caso}`);
    try {
      assert.deepEqual(await alertas(pagina), esperado, `caso ${caso}`);
      assert.deepEqual(erros, []);
    } finally { await ctx.close(); }
  }
});

// 🔴 O DEFEITO: os quatro números tinham o MESMO tamanho, a MESMA borda e o
//    MESMO cartão branco — nada dizia qual importa. Só que o Human Token JÁ É
//    a soma dos outros. Medido: ele tem que ser visivelmente o maior.
test('🎯 hierarquia: o Human Token é o número GRANDE; os outros três são finos', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?caso=limpo');
  try {
    const tamanho = (marca) => pagina.$eval(`[data-teste="numero-${marca}"]`, (n) => {
      const grande = [...n.querySelectorAll('span')].map((s) => parseFloat(getComputedStyle(s).fontSize));
      return Math.max(...grande);
    });
    const token = await tamanho('token');
    const mvm = await tamanho('mvm');
    const cotacao = await tamanho('cotacao');
    const xpay = await tamanho('xpay');
    assert.ok(token >= mvm * 1.8, `o Human Token (${token}px) precisa dominar o MvM (${mvm}px)`);
    assert.ok(token > cotacao && token > xpay, 'o Human Token tem que ser o maior número da tela');
    assert.equal(new Set([mvm, cotacao, xpay]).size, 1, 'os três de apoio têm que ter o mesmo peso entre si');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-limpo.png') });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

// 📱 O DEFEITO: a metodologia inteira morava num `title=`, que só abre com o
//    MOUSE PARADO em cima. No telefone NUNCA abria. Aqui a prova é por TOQUE.
test('📱 tocar no número abre a folha com a explicação — nos quatro', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?caso=limpo');
  try {
    const esperado = {
      token: ['Human Token', 'Recrutamos caráter'],
      mvm: ['MvM (oficial)', '10 Virtudes'],
      cotacao: ['Cotação do dia', 'ANTECIPAÇÃO É PODER'],
      xpay: ['X-Pay', 'Venda NÃO paga aqui'],
    };
    for (const [marca, [titulo, trecho]] of Object.entries(esperado)) {
      assert.equal(await pagina.$('[data-teste="folha-explicacao"]'), null, 'a folha nasceu aberta');
      await pagina.locator(`[data-teste="numero-${marca}"]`).tap();
      const folha = pagina.locator('[data-teste="folha-explicacao"]');
      await folha.waitFor({ timeout: 5000 });
      const texto = await folha.innerText();
      assert.ok(texto.includes(titulo), `a folha do ${marca} não trouxe o título "${titulo}"`);
      assert.ok(texto.includes(trecho), `a folha do ${marca} não trouxe o conteúdo ("${trecho}")`);
      if (marca === 'token' && process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-folha.png') });
      await pagina.locator('[data-teste="folha-fechar"]').tap();
      await folha.waitFor({ state: 'detached', timeout: 5000 });
    }
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('"Eu no Game" abre e fecha daqui — e o relógio de teste mora no PÉ do placar, longe da navegação', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?caso=limpo');
  try {
    const estado = async () => JSON.parse(await pagina.locator('[data-teste="estado-placar"]').textContent());
    const botao = pagina.locator('[data-teste="placar-botao"]');
    await botao.tap();
    assert.equal((await estado()).aberto, true);
    assert.equal(await botao.getAttribute('aria-expanded'), 'true');
    await botao.tap();
    assert.equal((await estado()).aberto, false);

    // 🧪 o relógio de teste está DEPOIS dos números, no pé do bloco
    const ordem = await pagina.evaluate(() => {
      const n = document.querySelector('[data-teste="numero-token"]').getBoundingClientRect().top;
      const t = document.querySelector('[data-teste="modo-teste-pastilha"]').getBoundingClientRect().top;
      return t > n;
    });
    assert.equal(ordem, true, 'o relógio de teste voltou pra cima, perto da navegação');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
