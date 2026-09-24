/** 🫧 A sombra dos ícones Comparar · Ao Vivo · Compartilhar sai inteira, num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-rodape-jornada');
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
    const arq = path.join(SAIDA, rel === '/' ? 'rodape-jornada.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/rodape-jornada.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });


async function abrir(q = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  await pagina.goto(`${BASE}${q}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="rodape-jornada"]', { timeout: 20000 });
  return { ctx, pagina, erros };
}
const estados = (pagina) => pagina.$$eval('[data-teste="rodape-jornada"] button', (bs) => bs.map((b) => [b.getAttribute('data-teste'), b.getAttribute('data-estado'), b.disabled]));
const modo = (pagina) => pagina.$eval('[data-teste="rodape-jornada"]', (n) => n.getAttribute('data-modo'));
const textoDaBarra = (pagina) => pagina.$eval('[data-teste="rodape-jornada"]', (n) => n.innerText.replace(/\n+/g, ' | '));

// ── DIR-180 — no MOMENTO a barra é UM botão, e o rótulo é a ação certa da hora.
//    Antes eram cinco azulejos, e quatro deles (Amanhecer/Manhã/Tarde/Noite)
//    não levavam a lugar nenhum nessa tela: só expandiam a jornada. Dono:
//    "você vai sumir com esse manhã, tarde e noite."
test('🦉 DIR-180 · no momento: UM botão só, com o progresso do dia; a barra encosta na base', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    assert.equal(await modo(pagina), 'abrir');
    assert.deepEqual(await estados(pagina), [['rodape-dia-inteiro', null, false]], 'no momento a barra tem UM botão, não cinco');
    const texto = await textoDaBarra(pagina);
    assert.match(texto, /VER O DIA INTEIRO/i);
    assert.match(texto, /3 de 7 passos/, 'o progresso do dia mora dentro do botão');
    assert.match(texto, /43%/);
    const colada = await pagina.$eval('[data-teste="rodape-jornada"]', (n) => Math.abs(n.getBoundingClientRect().bottom - window.innerHeight) < 1);
    assert.equal(colada, true);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-1.png') });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

// 🎯 o ganho de verdade do DIR-180: as setas do momento TIRAVAM a pessoa do
//    passo de agora e NADA trazia ela de volta (o antigo "AGORA" só rolava a
//    tela). Agora o próprio botão muda de rótulo e devolve o foco.
test('DIR-180 · espiar outro passo com a seta vira "VOLTAR PRO AGORA" — e voltar devolve o passo certo', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    const tituloDoFoco = () => pagina.$eval('[data-teste="banca-rodape"] h2', (n) => n.textContent.trim());
    assert.equal(await tituloDoFoco(), 'Contato e convite: 3 ligações', 'o momento começa no passo de agora');

    await pagina.click('[aria-label^="Próximo passo"]');
    await pagina.waitForTimeout(200);
    assert.equal(await tituloDoFoco(), 'Apresentação de sucesso', 'a seta levou pro passo seguinte');
    assert.equal(await modo(pagina), 'voltar');
    assert.deepEqual(await estados(pagina), [['rodape-momento', null, false]]);
    assert.match(await textoDaBarra(pagina), /VOLTAR PRO AGORA/i);
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-2.png') });

    await pagina.click('[data-teste="rodape-momento"]');
    await pagina.waitForTimeout(300);
    assert.equal(await tituloDoFoco(), 'Contato e convite: 3 ligações', 'voltou pro passo de agora');
    assert.equal(await modo(pagina), 'abrir');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('DIR-180 · na jornada aberta os períodos VOLTAM: Tarde leva o troféu pra tela e AGORA recolhe', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir();
  try {
    await pagina.click('[data-teste="rodape-dia-inteiro"]');
    await pagina.waitForTimeout(400);
    assert.equal(await modo(pagina), 'mapa');
    assert.deepEqual(await estados(pagina), [
      ['rodape-momento', 'futuro', false], ['rodape-AMANHECER', 'feito', false], ['rodape-MANHÃ', 'atual', false],
      ['rodape-TARDE', 'futuro', false], ['rodape-NOITE', 'futuro', false],
    ], 'aberta, os cinco azulejos voltam — ali eles navegam de verdade');

    await pagina.click('[data-teste="rodape-TARDE"]');
    await pagina.waitForSelector('[data-periodo="TARDE"]', { timeout: 5000 });
    await pagina.waitForTimeout(1600); // a rolagem é suave e a trilha é longa
    // na metade de cima da tela e fora do rodapé (que ocupa ~80px na base)
    const vis = await pagina.$eval('[data-periodo="TARDE"]', (n) => { const r = n.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight - 80 && r.top < window.innerHeight / 2; });
    assert.equal(vis, true, 'o troféu da Tarde tem que estar na tela');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-3.png') });

    await pagina.click('[data-teste="rodape-momento"]');
    await pagina.waitForTimeout(500);
    assert.equal(await pagina.$('[data-periodo="TARDE"]'), null, 'recolheu');
    assert.equal(await modo(pagina), 'abrir');
    assert.match(await pagina.$eval('[data-teste="banca-rodape"]', (n) => n.innerText), /Viver esse momento/);
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

// 🩹 DIR-180 — o azulejo cinza apagado de um período SEM parada o olho lia
//    como "bloqueado / perdi". Agora ele DIZ o que é.
test('DIR-180 · período sem parada no dia diz "sem parada", em vez de parecer castigo', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('?semtarde=1');
  try {
    await pagina.click('[data-teste="rodape-dia-inteiro"]');
    await pagina.waitForTimeout(400);
    const tarde = await pagina.$eval('[data-teste="rodape-TARDE"]', (b) => ({
      estado: b.getAttribute('data-estado'), texto: b.innerText.trim(), travado: b.disabled, titulo: b.getAttribute('title'),
    }));
    assert.equal(tarde.estado, 'vazio');
    assert.equal(tarde.travado, true, 'sem parada não tem pra onde ir');
    assert.equal(tarde.texto, 'sem parada');
    assert.equal(tarde.titulo, 'Tarde — sem parada hoje');
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});
