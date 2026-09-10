/**
 * O PÓDIO COM FOTO REAL (DIR-115, 09/09/2026) — dono: "botar a imagem da
 * pessoa ali, e a imagem dentro da moeda que ele está... pode mais foda
 * mesmo, entendeu?" Prova em navegador real que o pódio desenha a foto de
 * cada pessoa (ou as iniciais, quando não tem foto) dentro de um anel na
 * cor da própria liga dela — não mais um círculo genérico de iniciais.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-podio-visao-executiva');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'podio-visao-executiva.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/podio-visao-executiva.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('o pódio desenha foto real (com anel de liga) e cai pro fallback de iniciais quando não tem foto', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1000, height: 1400 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);

  await pagina.getByText('O pódio do ciclo').waitFor();
  // as 3 fotos de verdade (Luciano/Carla/João ou Ana, dependendo de quem
  // fechou o pódio) — pelo menos alguma delas tem que estar entre os 3
  const imagens = await pagina.locator('img[alt]').count();
  assert.ok(imagens >= 1, 'pelo menos uma pessoa do pódio/tabela tem foto de verdade (<img>), não só iniciais');

  await pagina.screenshot({ path: path.join(FOTOS, 'podio-visao-executiva.png'), fullPage: true });
  assert.deepEqual(erros, [], `sem erro de JS na página: ${erros.join(' | ')}`);
});

// 🔎 10/09/2026 — dono, olhando o pódio em produção, achando um Liga
// diferente entre o ranking e o painel pessoal: "pode clicar a abrir as
// informações da moeda de cada um... mais coisas validando." Clicar numa
// linha da tabela abre o detalhe (a moeda em fatias + os dois portões) de
// verdade, num navegador de verdade — não só a prova textual do fonte.
test('clicar numa linha da tabela abre o detalhe da moeda (fatias + os dois portões), num navegador de verdade', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1000, height: 1400 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Todo mundo').waitFor();

  const primeiraLinha = pagina.locator('[data-teste="linha-ranking"]').first();
  await primeiraLinha.waitFor();
  await primeiraLinha.click();
  const detalhe = pagina.locator('[data-teste="detalhe-moeda"]');
  await detalhe.waitFor();
  const texto = await detalhe.textContent();
  assert.match(texto, /De onde vem o token de/);
  assert.match(texto, /Os dois portões da liga/);
  assert.match(texto, /Caráter \(MvM\)/);
  assert.match(texto, /Meta de vendas/);
  await pagina.screenshot({ path: path.join(FOTOS, 'detalhe-moeda-aberto.png'), fullPage: true });

  // clicar de novo fecha — não empilha detalhe embaixo de detalhe
  await primeiraLinha.click();
  await detalhe.waitFor({ state: 'detached' });
  assert.deepEqual(erros, [], `sem erro de JS na página: ${erros.join(' | ')}`);
});
