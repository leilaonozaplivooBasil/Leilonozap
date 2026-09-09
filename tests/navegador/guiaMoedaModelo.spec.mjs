/**
 * A MOEDA-MODELO NO GUIA (Como Funciona) — prova visual real, DIR-115.
 *
 * 🪙 09/09/2026 — dono: "a moeda tem que aparecer aqui, como modelo, pra
 * explicar o modelo, pra ensinar as pessoas — ela tem que ter algum lugar,
 * cadê ela?" Esta banca monta o GUIA REAL (GuiaXGame.jsx), abre a lição
 * "Entender sua pontuação" (o mesmo clique que qualquer usuário dá) e tira
 * um print de verdade, num Chromium de verdade, provando que a moeda cheia
 * do modelo mora aí agora.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-guia-moeda-modelo');
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
    const arq = path.join(SAIDA, rel === '/' ? 'guiaMoedaModelo.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/guiaMoedaModelo.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

test('GUIA: a lição "Entender sua pontuação" mostra a moeda CHEIA do modelo, sem erro nenhum, e tira o print', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  pagina.on('console', (m) => { if (m.type() === 'error' && !/404 \(Not Found\)/i.test(m.text())) erros.push(m.text()); });
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="guia-xgame"]').waitFor();

  // abre a lição "Entender sua pontuação" — o mesmo clique de qualquer usuário
  await pagina.locator('[data-teste="aula-pontuacao"] button').first().click();
  const moedaModelo = pagina.locator('[data-teste="aula-pontuacao"] svg[aria-label="A moeda do Human Token, dividida por componente"]');
  await moedaModelo.waitFor();

  // a legenda diz explicitamente que é o MODELO, não o progresso de ninguém
  const secao = (await pagina.locator('[data-teste="aula-pontuacao"]').textContent()).replace(/\s+/g, ' ');
  assert.match(secao, /moeda CHEIA do modelo/, 'tem que deixar claro que não é o progresso de quem está lendo');
  assert.match(secao, /Recrutamos caráter e treinamos habilidade/, 'o jargão que decidiu os pesos precisa estar escrito junto do desenho');
  assert.match(secao, /LIGA PLATINA/i, 'a moeda cheia (22,22) tem que mostrar a liga do topo — Platina, não Diamante');

  await pagina.locator('[data-teste="aula-pontuacao"]').screenshot({ path: path.join(FOTOS, 'guia-moeda-modelo.png') });
  assert.deepEqual(erros, [], `a tela não pode quebrar sozinha: ${erros.join(' | ')}`);
  await ctx.close();
});
