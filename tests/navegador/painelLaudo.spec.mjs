/** 📄 O painel só-laudo trava a pessoa em quem só vê o próprio dia (Emannuel), num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-painel-laudo');
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
    const arq = path.join(SAIDA, rel === '/' ? 'painel-laudo.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/painel-laudo.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('📄 escopo "proprio": pessoa travada, laudo do dia na tela, botão do PDF — e nada de menu de gente', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="banca-proprio"] [data-teste="laudo-linha"]', { timeout: 20000 });
    const m = await pagina.$eval('[data-teste="banca-proprio"]', (n) => ({
      fixa: n.querySelector('[data-teste="laudo-pessoa-fixa"]')?.textContent || '',
      temMenu: !!n.querySelector('[data-teste="laudo-pessoa"]'),
      linhas: n.querySelectorAll('[data-teste="laudo-linha"]').length,
      titulos: [...n.querySelectorAll('[data-teste="laudo-linha"]')].map((l) => l.textContent),
      veredito: n.querySelector('[data-teste="laudo-veredito"]')?.textContent || '',
      pdf: !!n.querySelector('button'),
      dia: n.querySelector('[data-teste="laudo-dia"]')?.value,
    }));
    assert.match(m.fixa, /Emannuel/, `o rótulo travado era "${m.fixa}"`);
    assert.equal(m.temMenu, false, 'quem só vê o próprio dia não pode ter menu de pessoas');
    assert.equal(m.linhas, 2, `o laudo tinha ${m.linhas} linhas — só as DELE (a de outra pessoa não entra)`);
    assert.ok(!m.titulos.join(' ').includes('outra pessoa'), 'entrou comprovação de outra pessoa no laudo dele');
    assert.ok(m.veredito.length > 5, 'a frase do veredito não apareceu');
    assert.equal(m.pdf, true, 'faltou o botão do PDF');
    assert.equal(m.dia, '2026-09-24');
    if (process.env.FOTO_BANCA) await pagina.screenshot({ path: process.env.FOTO_BANCA, fullPage: true });
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('📄 escopo "todos" continua com o menu de pessoas; quem não pode nada não vê painel', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 900, height: 900 } });
  const pagina = await ctx.newPage();
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="banca-todos"] [data-teste="laudo-pessoa"] option', { state: 'attached', timeout: 20000 });
    const m = await pagina.evaluate(() => ({
      opcoes: [...document.querySelectorAll('[data-teste="banca-todos"] [data-teste="laudo-pessoa"] option')].map((o) => o.textContent),
      fixa: !!document.querySelector('[data-teste="banca-todos"] [data-teste="laudo-pessoa-fixa"]'),
      ninguem: document.querySelector('[data-teste="banca-ninguem"]').children.length,
    }));
    assert.ok(m.opcoes.length >= 2, `o gestor via ${m.opcoes.length} pessoa(s) no menu`);
    assert.equal(m.fixa, false);
    assert.equal(m.ninguem, 0, 'o painel apareceu pra quem não tem escopo nenhum');
  } finally { await ctx.close(); }
});
