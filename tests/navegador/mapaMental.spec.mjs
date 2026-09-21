/**
 * 🗺️ O MAPA MENTAL NUM CHROMIUM DE VERDADE.
 *
 * A árvore (ciclo, órfão, virar demanda) tem 19 provas no Node, em JS puro.
 * Isto aqui mede só o que a REGRA não alcança:
 *
 *   • o mapa nasce com a raiz na primeira vez — senão a tela abre vazia e sem
 *     nenhuma pista de por onde começar;
 *   • pendurar um item cria o nó E a linha que liga ao pai;
 *   • arrastar MOVE o card de verdade (o defeito clássico: ouvinte no próprio
 *     nó, o card gruda no cursor ao soltar fora — aconteceu no carrossel da
 *     home em 19/09);
 *   • escrever no nó guarda o texto.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-mapa-mental');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'mapa-mental.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/mapa-mental.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="mapa-no"]', { timeout: 20000 });
  return { ctx, pagina };
}

const nos = (p) => p.locator('[data-teste="mapa-no"]');

test('🔴 na primeira vez o mapa nasce com a raiz — e não vazio', { skip: semNavegador }, async () => {
  // Tela vazia não dá nenhuma pista de por onde começar a esvaziar a cabeça.
  const { ctx, pagina } = await abrir();
  assert.equal(await nos(pagina).count(), 1, 'o mapa abriu sem nó nenhum');
  await ctx.close();
});

test('🔴 pendurar um item cria o nó E a linha que liga ao pai', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  // Conta só as linhas DOS CONECTORES. A primeira versão desta prova usava
  // `svg line` solto e contava as linhas dos ÍCONES junto — o "+" é feito de
  // dois <line>. Acusou 3 onde havia 1 conector.
  const linhasAntes = await pagina.locator('[data-teste="mapa-linhas"] line').count();

  await pagina.locator('[data-teste="mapa-filho"]').first().click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="mapa-no"]').length === 2, null, { timeout: 5000 });

  const linhasDepois = await pagina.locator('[data-teste="mapa-linhas"] line').count();
  assert.equal(linhasDepois, linhasAntes + 1, 'o nó nasceu solto, sem linha ligando ao pai');
  await ctx.close();
});

test('🔴 arrastar MOVE o card de verdade', { skip: semNavegador }, async () => {
  // O defeito clássico: ouvinte de movimento no próprio nó em vez da janela.
  // Soltar fora do card deixa ele grudado no cursor — aconteceu no carrossel
  // da home em 19/09 e só a tela pega.
  const { ctx, pagina } = await abrir();
  const no = nos(pagina).first();
  const antes = await no.boundingBox();

  await pagina.mouse.move(antes.x + 30, antes.y + 10);
  await pagina.mouse.down();
  await pagina.mouse.move(antes.x + 230, antes.y + 130, { steps: 12 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(200);

  const depois = await no.boundingBox();
  const andou = Math.hypot(depois.x - antes.x, depois.y - antes.y);
  assert.ok(andou > 120, `o card mal se moveu (${andou.toFixed(0)}px)`);
  await ctx.close();
});

test('🔴 soltar o arrasto FORA da tela não deixa o card grudado no cursor', { skip: semNavegador }, async () => {
  // O controle do teste acima: mover é fácil; PARAR de mover é o que quebra.
  const { ctx, pagina } = await abrir();
  const no = nos(pagina).first();
  const inicio = await no.boundingBox();

  await pagina.mouse.move(inicio.x + 30, inicio.y + 10);
  await pagina.mouse.down();
  await pagina.mouse.move(inicio.x + 150, inicio.y + 60, { steps: 6 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(150);

  const parado = await no.boundingBox();
  // Agora mexe o mouse SEM botão: o card não pode acompanhar.
  await pagina.mouse.move(parado.x + 300, parado.y + 200, { steps: 10 });
  await pagina.waitForTimeout(200);
  const depois = await no.boundingBox();

  const deslizou = Math.hypot(depois.x - parado.x, depois.y - parado.y);
  assert.ok(deslizou < 4, `o card continuou seguindo o cursor depois de soltar (${deslizou.toFixed(0)}px)`);
  await ctx.close();
});

test('escrever no nó guarda o texto', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await nos(pagina).first().locator('button').first().click();
  const campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor({ timeout: 5000 });
  await campo.fill('Fechar o leilão do PS5');
  await campo.press('Enter');
  await pagina.waitForTimeout(300);

  await nos(pagina).first().getByText('Fechar o leilão do PS5').waitFor({ timeout: 5000 });
  await ctx.close();
});

test('🔴 a raiz não tem botão de apagar — apagá-la levaria o mapa inteiro', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  assert.equal(
    await nos(pagina).first().locator('[data-teste="mapa-apagar"]').count(), 0,
    'a raiz ganhou botão de apagar',
  );
  await ctx.close();
});
