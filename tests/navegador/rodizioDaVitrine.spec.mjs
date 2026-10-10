/**
 * PROVAS NO NAVEGADOR — rodízio da Home de leilões e da Loja (10/10/2026).
 * Monta a Home e a Loja DE VERDADE (tests/navegador/rodizio-da-vitrine.harness.jsx) com 33
 * leilões e 40 produtos de mentira e confere o que o dono pediu:
 *   destaques fixos → fileira "Faltam 2 dias" fixa → resto da grade em rodízio por acesso.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-rodizio-da-vitrine');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  if (!process.env.BANCA_PRONTA) {
    execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
      cwd: path.join(AQUI, '..', '..'),
      env: { ...process.env, SAIDA_BANCA: SAIDA },
      stdio: 'inherit',
    });
  }
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'rodizio-da-vitrine.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/rodizio-da-vitrine.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO, proxy: { server: 'per-context' } } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
});

async function abrir(consulta, pagina0) {
  const ctx = await (await garantirNavegador()).newContext({
    viewport: { width: 1280, height: 1600 },
    proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' },
  });
  const pagina = pagina0 || await ctx.newPage();
  await pagina.goto(`${BASE}${consulta}`, { waitUntil: 'networkidle' });
  return { ctx, pagina };
}

const titulosDa = (pagina, seletor) => pagina.locator(`${seletor} h3`).allInnerTexts();
const grade = (pagina) => titulosDa(pagina, '[data-teste="grade-leiloes"]');

test('Home: Destaques fixos → fileira "Faltam 2 dias" fixa → grade sem repetir nenhum deles', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?semente=1');
  try {
    await pagina.waitForSelector('[data-teste="grade-leiloes"] h3');
    assert.deepEqual(await titulosDa(pagina, '[data-teste="grade-destaques"]'), ['Leilão em destaque']);
    assert.deepEqual(await titulosDa(pagina, '[data-teste="fileira-faltam-2-dias"]'), ['Fileira dois dias A', 'Fileira dois dias B']);
    const g = await grade(pagina);
    assert.equal(g.length, 12, 'a grade tem 12 por página');
    for (const repetido of ['Leilão em destaque', 'Fileira dois dias A', 'Fileira dois dias B']) {
      assert.ok(!g.includes(repetido), `${repetido} apareceu na grade também`);
    }
    // a ordem dos blocos na página: destaques, depois a fileira, depois a grade
    const ordem = await pagina.evaluate(() => {
      const pos = (s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1;
      return [pos('[data-teste="grade-destaques"]'), pos('[data-teste="fileira-faltam-2-dias"]'), pos('[data-teste="grade-leiloes"]')];
    });
    assert.ok(ordem[0] > 0 && ordem[0] < ordem[1] && ordem[1] < ordem[2], `ordem dos blocos: ${ordem}`);
  } finally { await ctx.close(); }
});

test('Home: o resto roda — sementes diferentes (acessos diferentes) dão grades diferentes', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?semente=1');
  try {
    await pagina.waitForSelector('[data-teste="grade-leiloes"] h3');
    const a = await grade(pagina);
    const { pagina: p2 } = await abrir('?semente=987654', await ctx.newPage());
    await p2.waitForSelector('[data-teste="grade-leiloes"] h3');
    const b = await grade(p2);
    assert.notDeepEqual(a, b, 'dois acessos viram a mesma grade');
    // os blocos fixos não mexem
    assert.deepEqual(await titulosDa(p2, '[data-teste="fileira-faltam-2-dias"]'), ['Fileira dois dias A', 'Fileira dois dias B']);
  } finally { await ctx.close(); }
});

test('Home: durante o acesso a ordem NÃO muda (recarregar mantém), e a página 2 não repete a 1', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?semente=4242');
  try {
    await pagina.waitForSelector('[data-teste="grade-leiloes"] h3');
    const p1 = await grade(pagina);
    // recarrega SEM mexer na semente (o sessionStorage do acesso fica) — o `?semente=` só vale se vier na URL
    await pagina.goto(BASE, { waitUntil: 'networkidle' });
    await pagina.waitForSelector('[data-teste="grade-leiloes"] h3');
    assert.deepEqual(await grade(pagina), p1, 'recarregar dentro do acesso trocou a ordem');
    await pagina.getByRole('button', { name: /Próxima/ }).click();
    await pagina.waitForFunction((ant) => {
      const t = [...document.querySelectorAll('[data-teste="grade-leiloes"] h3')].map((e) => e.textContent);
      return t.length > 0 && t[0] !== ant;
    }, p1[0]);
    const p2 = await grade(pagina);
    assert.ok(p2.length > 0 && p2.every((t) => !p1.includes(t)), 'a página 2 repetiu leilão da página 1');
  } finally { await ctx.close(); }
});

test('Home: com BUSCA não há rodízio nem fileira — resultado na ordem de sempre (quem encerra primeiro)', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?semente=1');
  try {
    await pagina.waitForSelector('[data-teste="grade-leiloes"] h3');
    await pagina.getByPlaceholder('O que você procura hoje?').fill('Leilão do resto');
    await pagina.waitForFunction(() => !document.querySelector('[data-teste="fileira-faltam-2-dias"]'));
    const g = await grade(pagina);
    assert.ok(g.length > 0 && g.every((t) => t.startsWith('Leilão do resto')));
    const fins = await pagina.evaluate(() => window.__entidadesFalsas.Auction.filter((a) => a.title.startsWith('Leilão do resto')).sort((a, b) => new Date(a.end_time) - new Date(b.end_time)).map((a) => a.title));
    assert.deepEqual(g, fins.slice(0, g.length), 'a busca mudou de ordem');
  } finally { await ctx.close(); }
});

test('Loja: produtos em rodízio por acesso (e a ordem difere da de criação)', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?pagina=loja&semente=11');
  try {
    await pagina.waitForSelector('text=/Produto da loja/');
    const nomes = () => pagina.evaluate(() => [...document.querySelectorAll('h3, h2, h4')].map((e) => e.textContent.trim()).filter((t) => /^Produto da loja \d+/.test(t)));
    const a = await nomes();
    assert.ok(a.length >= 12, `a loja mostrou só ${a.length} produtos`);
    const ordenadoPorData = [...a].sort();
    assert.notDeepEqual(a, ordenadoPorData, 'a loja continua na ordem de sempre');
    const { pagina: p2 } = await abrir('?pagina=loja&semente=99999', await ctx.newPage());
    await p2.waitForSelector('text=/Produto da loja/');
    const b = await p2.evaluate(() => [...document.querySelectorAll('h3, h2, h4')].map((e) => e.textContent.trim()).filter((t) => /^Produto da loja \d+/.test(t)));
    assert.notDeepEqual(a.slice(0, 12), b.slice(0, 12), 'dois acessos viram a mesma loja');
  } finally { await ctx.close(); }
});
