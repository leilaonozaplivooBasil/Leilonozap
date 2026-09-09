/**
 * A MOEDA EM FATIAS (Human Token) — prova visual real, DIR-113.
 *
 * 🪙 09/09/2026 — dono: "pode printar, você está se limitando... você pode
 * ter prova de vida." Esta banca monta o COMPONENTE REAL (MoedaPizza.jsx)
 * com dados de exemplo e tira um print de verdade, num Chromium de verdade —
 * sem precisar de login, porque o componente não fala com banco nenhum.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-moeda');
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
    const arq = path.join(SAIDA, rel === '/' ? 'moeda.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/moeda.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

test('MOEDA EM FATIAS: renderiza as 5 fatias + as marcas de liga, sem erro nenhum, e tira o print', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 760, height: 520 }, deviceScaleFactor: 2 });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  // 🩹 o favicon (não existe na banca, e não devia existir) some sozinho —
  // é um 404 de recurso, não um erro da tela; o console real da aplicação
  // continua vigiado normalmente.
  pagina.on('console', (m) => { if (m.type() === 'error' && !/404 \(Not Found\)/i.test(m.text())) erros.push(m.text()); });
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="moeda-pizza"]').waitFor();

  // borda (gradiente + contorno) + rosto (disco + face) + trilho + 5 fatias
  const arcos = await pagina.locator('[data-teste="moeda-pizza"] svg circle').count();
  assert.equal(arcos, 10, 'borda(2) + rosto(2) + trilho(1) + 5 fatias (mvm, produção, real time, bônus, vendas)');

  // as 3 marcas de liga que cabem no exemplo (prata/ouro/platina — bronze é o início, sem marca)
  const marcas = await pagina.locator('[data-teste="moeda-pizza"] svg text').allTextContents();
  assert.ok(marcas.some((t) => t.includes('🥈')), 'faltou a marca da liga prata no anel');
  assert.ok(marcas.some((t) => t.includes('🥇')), 'faltou a marca da liga ouro no anel');
  assert.ok(marcas.some((t) => t.includes('🏆')), 'faltou a marca da liga platina no anel');

  // a legenda embaixo do anel mostra cada componente com o peso % na moeda
  const legenda = (await pagina.locator('[data-teste="moeda-pizza"]').textContent()).replace(/\s+/g, ' ');
  assert.match(legenda, /MvM \(votação\).*peso \d+([.,]\d+)?% da moeda/);
  // 🏆 DIR-115 — o exemplo agora é a moeda CHEIA do modelo (soma exata dos
  // pesos, sem sobra) — "ainda não conquistado" só aparece quando falta
  // algo pro teto, então não pode aparecer aqui.
  assert.doesNotMatch(legenda, /ainda não conquistado/, 'a moeda cheia do modelo não deixa nada "não conquistado" — soma exata do teto');
  assert.match(legenda, /Recrutamos caráter e treinamos habilidade/, 'o jargão que decidiu os pesos precisa estar escrito junto do desenho');

  await pagina.screenshot({ path: path.join(FOTOS, 'moeda-pizza.png') });
  assert.deepEqual(erros, [], `a tela não pode quebrar sozinha: ${erros.join(' | ')}`);
  await ctx.close();
});
