/**
 * GUIA MÓVEL + FAIXA DA TOP COLLEGE: limpo no celular, intacto no desktop.
 *
 * 🔴 Dono (06/09/2026): "no celular está com muito texto embaixo do Sonho,
 * do Compromisso… tem que ter um guia; a frase da faculdade pode entrar na
 * lateral, do lado da logo. Só no celular — e não pode ficar feio."
 *
 * O que só o navegador mede: a MESMA tela a 1440px e a 390px.
 *   • desktop: o texto do hábito continua visível de cara, sem botão nenhum;
 *   • celular: o texto nasce dobrado numa linha "📖 …", e um toque abre o
 *     texto INTEIRO (nada cortado); a primeira ação sobe pra primeira dobra;
 *   • celular: a frase da faculdade fica AO LADO das marcas, não embaixo.
 * E tira as fotos que o dono julga ("não pode ficar feio").
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  const RAIZ = path.join(AQUI, '..', '..');
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    // as marcas (/marca/*.webp) vêm da pasta public do app
    let arq = path.join(SAIDA, rel === '/' ? 'guia.html' : decodeURIComponent(rel));
    if (!existsSync(arq)) arq = path.join(RAIZ, 'public', decodeURIComponent(rel));
    if (!(arq.startsWith(SAIDA) || arq.startsWith(path.join(RAIZ, 'public'))) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/guia.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir({ celular = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(celular
    ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Hábito 1 — Sonho').waitFor();
  await pagina.waitForTimeout(250);
  return { pagina, ctx, erros };
}

// ─────────────── desktop: nada muda ───────────────

test('DESKTOP: o texto do hábito continua visível de cara, sem botão de guia', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  assert.ok(await pagina.locator('[data-teste="texto-guia"]').isVisible(), 'o texto sumiu no desktop');
  assert.equal(await pagina.locator('[data-guia-movel]').count(), 0, 'apareceu o botão de guia no desktop');
  assert.deepEqual(erros, []);
  await ctx.close();
});

// ─────────────── celular: dobrado, e abre inteiro ───────────────

test('CELULAR: o texto nasce dobrado numa linha, e a primeira ação fica acima da dobra', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  assert.equal(await pagina.locator('[data-guia-movel="fechado"]').count(), 1, 'o guia não nasceu fechado');
  assert.equal(await pagina.locator('[data-teste="texto-guia"]').count(), 0, 'o texto está renderizado mesmo fechado');
  const acao = await pagina.locator('[data-teste="primeira-acao"]').boundingBox();
  assert.ok(acao && acao.y + acao.height < 780, `a primeira ação caiu pra fora da primeira dobra: y=${acao?.y}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-fechado.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: um toque abre o texto INTEIRO — nada foi cortado', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.getByRole('button', { name: /como montar o seu quadro/i }).tap();
  await pagina.locator('[data-guia-movel="aberto"]').waitFor();
  const texto = await pagina.locator('[data-teste="texto-guia"]').innerText();
  assert.match(texto, /três prazos/);
  assert.match(texto, /Sonho detalhado vira meta/);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-aberto.png'), fullPage: true });
  await ctx.close();
});

// ─────────────── a faixa: frase ao lado das marcas ───────────────

test('CELULAR: a frase da faculdade fica AO LADO das marcas, não embaixo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  const marca = await pagina.getByAltText('Top College').boundingBox();
  const frase = await pagina.getByText('A primeira faculdade de empreendedorismo do planeta').boundingBox();
  assert.ok(marca && frase, 'não achei a marca ou a frase');
  assert.ok(frase.x > marca.x + marca.width, `a frase não está à direita da marca: frase.x=${frase.x} marca.dir=${marca.x + marca.width}`);
  assert.ok(frase.y < marca.y + marca.height, `a frase caiu pra baixo da marca: frase.y=${frase.y} marca.baixo=${marca.y + marca.height}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-faixa.png'), clip: { x: 0, y: 0, width: 390, height: 260 } });
  await ctx.close();
});

test('DESKTOP: a faixa continua em uma linha, como estava', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const frase = await pagina.getByText(/A primeira faculdade de empreendedorismo do planeta/).first().boundingBox();
  assert.ok(frase && frase.height < 30, `a frase quebrou em mais de uma linha no desktop: altura=${frase?.height}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'desktop-faixa.png'), clip: { x: 0, y: 0, width: 1440, height: 160 } });
  await ctx.close();
});

// ─────────────── o cartão LOJA & VENDAS e o modal, vestidos de Top College ───────────────

test('CELULAR: o cartão de navegação veste a Top College — sem a caixa verde', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  const gatilho = pagina.locator('[data-vestuario="top-college"]');
  assert.equal(await gatilho.count(), 1, 'o cartão não está no vestuário Top College');
  const classes = await gatilho.getAttribute('class');
  assert.ok(!/nz-verde|rounded-xl|shadow-\[/.test(classes), `sobrou caixa/verde no cartão: ${classes}`);
  const fonte = await gatilho.evaluate((n) => getComputedStyle(n).fontFamily);
  assert.match(fonte, /Sora/, `a fonte do cartão não é a da faculdade: ${fonte}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-cartao.png'), clip: { x: 0, y: 0, width: 390, height: 110 } });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: o modal abre assinado pelas duas marcas, no preto da faculdade', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  await pagina.locator('[data-vestuario="top-college"]').tap();
  await pagina.getByPlaceholder('BUSCAR SEÇÃO...').waitFor();
  const marcas = pagina.locator('.fixed.inset-0 img[alt="Top College"], .fixed.inset-0 img[alt="X-eos"]');
  assert.equal(await marcas.count(), 2, 'as duas marcas não assinam o modal');
  assert.equal(await pagina.getByText('Navegar no Painel').count(), 0, 'o título genérico continua no modal da faculdade');
  await pagina.waitForTimeout(200);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-modal.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});
