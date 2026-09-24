/**
 * 🔴 LEAD NO CARD + NEGOCIAÇÃO, NUM CHROMIUM DE VERDADE.
 * COMO RODAR: npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-lead-negociacao');
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
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'lead-e-negociacao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/lead-e-negociacao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir(tela, seletor) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 1000 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  // 🌐 sem Google aqui: qualquer ida ao Google falha na hora, como sem internet
  await ctx.route('**/*.google.com/**', (r) => r.abort());
  await ctx.route('**/*.googleapis.com/**', (r) => r.abort());
  await ctx.route('**/*.gstatic.com/**', (r) => r.abort());
  await pagina.goto(`${BASE}?tela=${tela}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector(seletor, { timeout: 20000 });
  return { ctx, pagina, erros };
}

test('🤝 o card vincula um cliente da MINHA lista e abre a qualificação', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('quadro', '[data-teste="lead-do-cartao"]');
  try {
    await pagina.click('[data-teste="vincular-lead"]');
    await pagina.waitForSelector('[data-teste="opcao-cliente"]');
    const nomes = await pagina.$$eval('[data-teste="opcao-cliente"]', (ns) => ns.map((n) => n.textContent.trim()));
    assert.ok(nomes.includes('Ângela Conceição'));
    assert.equal(nomes.includes('Cliente de Outro'), false, 'a lista de outra pessoa vazou pro card');
    await pagina.fill('[data-teste="busca-cliente"]', 'ângela');
    await pagina.click('[data-teste="opcao-cliente"]');
    await pagina.waitForSelector('[data-teste="chip-cliente"]');
    assert.match(await pagina.$eval('[data-teste="chip-cliente"]', (n) => n.textContent), /Ângela Conceição/);
    // o vínculo foi GRAVADO no card
    const gravado = await pagina.evaluate(() => window.__bancoFalso.tabelas.metodo_quadro[0]);
    assert.equal(gravado.cliente_id, 'c1'); assert.equal(gravado.cliente_nome, 'Ângela Conceição');
    // e o modal de qualificação (o do CRM) abriu pra ela
    await pagina.waitForFunction(() => document.body.innerText.includes('Qualificar contato'), null, { timeout: 5000 });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('📅 sem conta Google conectada, o botão cai no LINK pré-preenchido e grava o follow-up', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('quadro', '[data-teste="lead-do-cartao"]');
  try {
    await pagina.click('[data-teste="vincular-lead"]');
    await pagina.waitForSelector('[data-teste="opcao-cliente"]');
    await pagina.click('[data-teste="opcao-cliente"]');
    await pagina.waitForSelector('[data-teste="chip-cliente"]');
    // vincular abre a qualificação por cima; fecho pelo X do modal (o único botão de ícone dele)
    await pagina.waitForSelector('.fixed.inset-0 button');
    await pagina.click('.fixed.inset-0 button');
    await pagina.waitForSelector('.fixed.inset-0', { state: 'detached' });
    await pagina.click('[data-teste="agendar-google"]');
    await pagina.waitForFunction(() => (window.__abriu || []).length > 0, null, { timeout: 15000 });
    const url = new URL(await pagina.evaluate(() => window.__abriu[0]));
    assert.equal(url.host, 'calendar.google.com');
    assert.equal(url.searchParams.get('text'), 'Apresentar o Método — Ângela Conceição');
    assert.equal(url.searchParams.get('dates'), '20260924T140000/20260924T150000');
    // o cliente ganhou follow-up na data do evento
    const upd = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.filter((c) => c.tipo === 'update' && c.entidade === 'Customer'));
    assert.ok(upd.some((c) => c.dados?.follow_up_date === '2026-09-24'), JSON.stringify(upd));
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

test('🤝 Negociação: só a minha lista, vencido no topo, pago fora', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('negociacao', '[data-teste="cartao-negociacao"]');
  try {
    const nomes = await pagina.$$eval('[data-teste="coluna-em_negociacao"] [data-teste="cartao-negociacao"]', (ns) => ns.map((n) => n.querySelector('p').textContent.trim()));
    assert.deepEqual(nomes, ['Ângela Conceição', 'José Antônio', 'Luís Gonçalves']);
    const texto = await pagina.$eval('[data-teste="negociacao"]', (n) => n.innerText);
    assert.equal(texto.includes('Cliente de Outro'), false, 'vazou a lista de outra pessoa');
    assert.equal(texto.includes('Já Pagou'), false, 'quem pagou não está em negociação');
    assert.match(texto, /venceu 10\/09/); assert.match(texto, /12\/15/);
    const resumo = await pagina.$eval('[data-teste="resumo-negociacao"]', (n) => n.innerText.replace(/\s+/g, ' '));
    // os rótulos saem em MAIÚSCULAS por CSS (uppercase) — innerText traz assim
    assert.match(resumo, /Em negociação 3/i); assert.match(resumo, /Follow-up vencido 1/i); assert.match(resumo, /Follow-up hoje 1/i);
    // "Falei hoje" tira a urgência
    await pagina.click('[data-teste="coluna-em_negociacao"] [data-teste="falei-hoje"]');
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="resumo-negociacao"]').innerText.includes('vencido 1'), null, { timeout: 5000 });
    assert.deepEqual(erros, []);
  } finally { await ctx.close(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧩 24/09/2026 — "TUDO AQUI": o painel do lead dentro do card
// ═══════════════════════════════════════════════════════════════════════════
test('🧩 o painel abre do card: só a MINHA lista, vincular por ali, e a qualificação abre por cima', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('quadro', '[data-teste="lead-do-cartao"]');
  try {
    await pagina.click('[data-teste="abrir-modal-lead"]');
    await pagina.waitForSelector('[data-teste="modal-do-lead"]');
    await pagina.waitForSelector('[data-teste="modal-contato"]');
    const nomes = await pagina.$$eval('[data-teste="modal-contato"]', (ns) => ns.map((n) => n.querySelector('p').textContent.trim()));
    assert.ok(nomes.includes('Ângela Conceição') && nomes.includes('José Antônio'));
    assert.ok(!nomes.includes('Cliente de Outro'), 'a lista de outra pessoa vazou no painel');
    // a qualificação já feita aparece na linha
    assert.match(await pagina.locator('[data-teste="modal-contato"]', { hasText: 'José Antônio' }).innerText(), /12\/15 · 75%/);
    if (process.env.FOTO_BANCA) { await pagina.waitForTimeout(400); await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-lista.png') }); }
    // buscar filtra
    await pagina.fill('[data-teste="modal-busca"]', 'angela');
    assert.equal(await pagina.locator('[data-teste="modal-contato"]').count(), 1);
    // vincular pelo painel → o card ganha o chip, e a qualificação abre POR CIMA do painel
    await pagina.locator('[data-teste="modal-vincular"]').first().click();
    await pagina.waitForSelector('[data-teste="chip-cliente"]');
    assert.match(await pagina.$eval('[data-teste="chip-cliente"]', (n) => n.textContent), /Ângela Conceição/);
    await pagina.getByText('Qualificar contato').waitFor();
    const porCima = await pagina.evaluate(() => {
      const q = [...document.querySelectorAll('div.fixed.inset-0')].find((d) => d.textContent.includes('Qualificar contato'));
      const m = document.querySelector('[data-teste="modal-do-lead"]');
      return !!q && !!m && (m.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
    });
    assert.equal(porCima, true, 'o modal de qualificação precisa montar depois do painel (pra ficar por cima)');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA.replace('.png', '-painel.png') });
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('🧩 contato NOVO pelo painel: a trava de duplicado, o carimbo, o vínculo ao card', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('quadro', '[data-teste="lead-do-cartao"]');
  try {
    await pagina.click('[data-teste="abrir-modal-lead"]');
    await pagina.waitForSelector('[data-teste="modal-do-lead"]');
    await pagina.click('[data-teste="aba-novo"]');
    await pagina.waitForSelector('[data-teste="novo-nome"]');
    // e-mail já da minha lista? tranca sem apelação
    await pagina.fill('[data-teste="novo-nome"]', 'Fulana');
    await pagina.fill('[data-teste="novo-email"]', 'x@y.z');
    assert.equal(await pagina.locator('[data-teste="novo-duplicado"]').count(), 0);
    // nome igual ao de alguém da lista: pede confirmação
    await pagina.fill('[data-teste="novo-email"]', '');
    await pagina.fill('[data-teste="novo-nome"]', 'jose antonio');
    await pagina.waitForSelector('[data-teste="novo-duplicado"][data-motivo="nome"]');
    assert.equal(await pagina.locator('[data-teste="novo-salvar"]').isDisabled(), true);
    await pagina.check('[data-teste="novo-e-outra-pessoa"]');
    assert.equal(await pagina.locator('[data-teste="novo-salvar"]').isDisabled(), false);
    // cadastra um de verdade
    await pagina.fill('[data-teste="novo-nome"]', 'Carlos Souza');
    await pagina.fill('[data-teste="novo-telefone"]', '21988887777');
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="novo-duplicado"]'));
    await pagina.click('[data-teste="novo-salvar"]');
    await pagina.waitForSelector('[data-teste="chip-cliente"]');
    assert.match(await pagina.$eval('[data-teste="chip-cliente"]', (n) => n.textContent), /Carlos Souza/);
    const gravado = await pagina.evaluate(() => (window.__bancoFalso.escritas.find((e) => e.tabela === 'customers' && e.tipo === 'insert') || {}).linhas?.[0]);
    assert.equal(gravado.full_name, 'Carlos Souza');
    assert.equal(gravado.created_by_id, 'a1b2c3d4e5f60718293a4b5c', 'o carimbo de quem cadastrou é o que dá o escopo depois');
    assert.equal(gravado.status, 'lead');
    // e a qualificação abre em seguida, como quando se escolhe um da lista
    await pagina.getByText('Qualificar contato').waitFor();
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('🧩 registrar contato pelo painel grava no histórico do cliente com o carimbo', { skip: semNavegador }, async () => {
  const { ctx, pagina, erros } = await abrir('quadro', '[data-teste="lead-do-cartao"]');
  try {
    await pagina.click('[data-teste="abrir-modal-lead"]');
    await pagina.waitForSelector('[data-teste="modal-contato"]');
    await pagina.locator('[data-teste="modal-contato"]', { hasText: 'Luís Gonçalves' }).locator('[data-teste="modal-contatar-linha"]').click();
    await pagina.getByText('Registrar contato').first().waitFor();
    // o registro de desfecho: "Contato feito" e salvar
    await pagina.getByRole('button', { name: /Contato feito/ }).click();
    await pagina.getByRole('button', { name: /^Salvar/ }).click();
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update' && c.entidade === 'Customer' && c.dados?.contatos_metodo));
    const upd = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.find((c) => c.tipo === 'update' && c.entidade === 'Customer' && c.dados?.contatos_metodo));
    assert.equal(upd.id, 'c3');
    const reg = upd.dados.contatos_metodo.at(-1);
    assert.equal(reg.resultado, 'feito');
    assert.equal(reg.registrado_por_id, 'a1b2c3d4e5f60718293a4b5c');
    assert.ok(reg.id && reg.em);
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});
