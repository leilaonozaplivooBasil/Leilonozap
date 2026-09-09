/**
 * A MOEDA REAL ao lado da MOEDA-MODELO — prova visual real.
 *
 * 🪙 09/09/2026 — dono: "a moeda tem que estar ali, pra ele se inspirar nela
 * cheia, e entender como ela fica cheia, junto com a dele que está sendo
 * preenchida." Esta banca monta os DOIS componentes REAIS (MoedaPizza.jsx)
 * com dados de exemplo — a moeda parcial (início de ciclo) e a moeda-modelo
 * cheia — num Chromium de verdade, sem precisar de login.
 *
 * COMO RODAR
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-moeda-lado-a-lado');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'moedaLadoALado.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/moedaLadoALado.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

test('MOEDA REAL + MOEDA-MODELO: as duas aparecem juntas, a modelo sempre cheia no teto, sem erro nenhum, e tira o print', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  pagina.on('console', (m) => { if (m.type() === 'error' && !/404 \(Not Found\)/i.test(m.text())) erros.push(m.text()); });
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="moeda-pizza"]').waitFor();
  await pagina.locator('[data-teste="moeda-pizza-modelo"]').waitFor();

  // a moeda real (parcial) mostra "ainda não conquistado" — início de ciclo
  const legendaReal = (await pagina.locator('[data-teste="moeda-pizza"]').textContent()).replace(/\s+/g, ' ');
  assert.match(legendaReal, /ainda não conquistado/, 'a moeda real parcial precisa mostrar o que falta pro teto');

  // a moeda-modelo é a mesma fórmula, sempre no teto — nunca "não conquistado"
  const legendaModelo = (await pagina.locator('[data-teste="moeda-pizza-modelo"]').textContent()).replace(/\s+/g, ' ');
  assert.match(legendaModelo, /O Modelo/, 'o rótulo precisa deixar claro que essa moeda é a referência, não o progresso da pessoa');
  assert.doesNotMatch(legendaModelo, /ainda não conquistado/, 'a moeda-modelo cheia não pode sobrar "não conquistado" — soma exata do teto');
  assert.match(legendaModelo, /🏆 LIGA PLATINA/, 'a moeda-modelo no teto tem que bater na liga máxima');

  await pagina.screenshot({ path: path.join(FOTOS, 'moeda-lado-a-lado.png') });
  assert.deepEqual(erros, [], `a tela não pode quebrar sozinha: ${erros.join(' | ')}`);
  await ctx.close();
});
