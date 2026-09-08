/**
 * O ESPAÇO X-GAME (DIR-97, 08/09/2026) — prova em navegador real que a
 * página /XGame, atualizada, renderiza o MEU DIA rico (Human Token, MvM,
 * X-Pay, ofensiva, missões da semana) e O TIME (XGameVisaoExecutiva
 * embutida, escurecida pelo .xeos-palco) sem erro nenhum.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-xgame-espaco');
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
    const arq = path.join(SAIDA, rel === '/' ? 'xgame-espaco.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/xgame-espaco.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('o espaço X-GAME (meu dia + time) renderiza sem erro', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 760, height: 1400 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);

  await pagina.getByText('X-GAME', { exact: true }).waitFor();

  // MEU DIA — os 4 cartões, incluindo o X-Pay que a página órfã nunca mostrou
  await pagina.getByText('Human Token').waitFor();
  await pagina.getByText('X-Pay de hoje').waitFor();

  // Ofensiva
  await pagina.getByText(/de ofensiva/).waitFor();

  // Missões da semana — as 3 caixas com barra de progresso
  const missoes = pagina.locator('[data-teste="missoes-da-semana"] [data-teste="missao"]');
  assert.equal(await missoes.count(), 3, 'têm que aparecer as 3 missões da semana');

  // O TIME — a Visão Executiva embutida, escurecida pelo .xeos-palco
  await pagina.getByText('O time', { exact: true }).waitFor();
  await pagina.getByText('A X-GAME da equipe').waitFor();
  await pagina.getByText('Carla Souza').first().waitFor();
  const tintaEscurecida = await pagina.locator('[data-teste="xgame-o-time"]').evaluate(
    (el) => getComputedStyle(el).getPropertyValue('--nz-tinta').trim(),
  );
  assert.equal(tintaEscurecida, '#F4F4F4', 'o .xeos-palco tem que escurecer os tokens --nz-* pro time renderizar legível');

  await pagina.screenshot({ path: path.join(FOTOS, 'xgame-espaco.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});
