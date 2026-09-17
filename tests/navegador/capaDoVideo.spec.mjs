/**
 * 🎬 A CAPA PRETA É PEGA ANTES DE SUBIR — MEDIDO NUM CHROMIUM.
 *
 * Dono (17/09/2026): "preciso que o vídeo chegue no WhatsApp em um frame
 * melhor e não no primeiro frame dos vídeos, que costuma ser tudo preto".
 *
 * A régua pura já é provada em tests/capaDoVideo.test.mjs. O que só o
 * navegador responde é a outra metade: abrir o arquivo, procurar o instante,
 * desenhar no canvas e ler os pixels. É isso que roda aqui, com um vídeo
 * GRAVADO NA HORA pela banca — meio segundo preto e depois claro.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-capa-do-video');
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
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'capa-do-video.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/capa-do-video.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function analisar(busca = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext();
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  // gravar leva ~1,6s, analisar mais um pouco
  await pagina.waitForFunction(
    () => document.querySelector('[data-teste="estado"]')?.textContent === 'pronto',
    null, { timeout: 30000 },
  );
  const bruto = await pagina.textContent('[data-teste="resultado"]');
  await ctx.close();
  return JSON.parse(bruto);
}

test('🔴 vídeo que começa preto é pego, com o segundo para cortar', { skip: semNavegador }, async () => {
  const r = await analisar();
  assert.ok(!r.erro, `a banca falhou: ${r.erro}`);
  assert.equal(r.olhou, true, 'não conseguiu analisar o vídeo');
  assert.equal(r.tudoEscuro, false, 'o vídeo clareia — não é escuro do começo ao fim');
  assert.ok(typeof r.escuroAte === 'number' && r.escuroAte > 0,
    `não achou até onde está escuro: ${JSON.stringify(r)}`);
  // a banca grava 0,6s de preto; o primeiro instante claro tem que cair perto disso
  assert.ok(r.escuroAte >= 0.2 && r.escuroAte <= 2,
    `apontou ${r.escuroAte}s para um preto de 0,6s`);
  assert.match(r.recado, /Corte até/);
  assert.match(r.recado, /PRIMEIRO QUADRO/);
});

test('🟢 vídeo que já começa claro não ganha aviso nenhum', { skip: semNavegador }, async () => {
  const r = await analisar('?claro=1');
  assert.ok(!r.erro, `a banca falhou: ${r.erro}`);
  assert.equal(r.olhou, true);
  assert.equal(r.escuroAte, null, `avisou à toa: ${JSON.stringify(r)}`);
  assert.equal(r.tudoEscuro, false);
  assert.equal(r.recado, '', 'vídeo bom não pode ganhar faixa de aviso');
});

test('a duração do arquivo é lida, e a análise varre mais que o quadro 0', { skip: semNavegador }, async () => {
  // 🔎 ESTE TESTE JÁ MENTIU, e a mutação pegou. Ele dizia provar o contorno da
  // duração infinita (`duration === Infinity`, que vídeo de MediaRecorder tem
  // em algumas versões). Apagar o contorno deixava a banca VERDE — e o motivo,
  // medido: ESTE Chromium devolve duração finita para o webm que a banca
  // grava. `duracaoCrua` veio "1.556515", não "Infinity". O contorno nunca era
  // exercido aqui.
  //
  // Reescrito para dizer o que de fato prova: que a duração é lida e que a
  // varredura passa de um quadro só. O contorno em si é defensivo e ficou
  // travado no teste de código, com o motivo escrito ao lado.
  const r = await analisar();
  assert.match(r.duracaoCrua, /^\d/, `duração não foi lida: ${r.duracaoCrua}`);
  assert.ok(Number(r.duracaoCrua) > 1, `duração ${r.duracaoCrua}s — a banca grava 1,6s`);
  // varreu além do instante 0: achou um quadro claro DEPOIS do preto inicial
  assert.ok(r.escuroAte > 0 && r.tudoEscuro === false,
    `só o quadro 0 foi olhado: ${JSON.stringify(r)}`);
});
