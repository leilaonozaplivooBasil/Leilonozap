/**
 * 📅 O CARD DIZ A DATA, NÃO SÓ "1 SEMANA" — num Chromium.
 *
 * O contador do card tem resolução de semana: "1 semana" cobre de 7,00 a 13,99
 * dias e fica PARADO sete dias seguidos. Em 03/09 um cliente abriu chamado
 * achando a Caixa de Som Mondial travada; em 17/09 a Beatriz cobrou o mesmo
 * nos relógios.
 *
 * Ler o arquivo prova que a linha existe no código. Só a tela prova que ela
 * aparece JUNTO do contador — e que não aparece onde não deve.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-data-do-leilao');
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
    const arq = path.join(SAIDA, rel === '/' ? 'data-do-leilao.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/data-do-leilao.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir(busca = '') {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('text=Playstation 5', { timeout: 20000 });
  return { ctx, pagina };
}

test('🔴 com 12 dias pela frente o contador diz "1 semana" — e a data aparece do lado', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const corpo = await pagina.textContent('body');
    // primeiro a prova de que o problema é real: o contador MESMO diz "1 semana"
    assert.match(corpo, /1 semana/,
      'se o contador deixou de dizer "1 semana" aos 12 dias, este teste perdeu o sentido — revisar');

    const linha = pagina.locator('[data-teste="data-de-termino"]');
    assert.equal(await linha.count(), 1, 'a data não foi desenhada no card');
    const data = (await linha.textContent()).trim();
    assert.match(data, /^\d{2}\/\d{2}( às | )\d{2}:\d{2}$/,
      `a data saiu fora do formato dd/mm às hh:mm: ${JSON.stringify(data)}`);

    // e ela tem que estar VISÍVEL, não escondida atrás de algum overflow
    assert.ok(await linha.isVisible(), 'a data está no DOM mas não na tela');
  } finally { await ctx.close(); }
});

test('a data confere com o end_time do leilão — 12 dias à frente', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const data = (await pagina.textContent('[data-teste="data-de-termino"]')).trim();
    const esperado = await pagina.evaluate(() => {
      const d = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
      const dia = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
      return dia;
    });
    assert.ok(data.startsWith(esperado),
      `a data mostrada (${data}) não bate com o fim do leilão (${esperado})`);
  } finally { await ctx.close(); }
});

test('leilão sem end_time não inventa data — nada de 31/12 às 21:00', { skip: semNavegador }, async () => {
  // 🔎 MEDIDO, não suposto: com `end_time` nulo o próprio contador já devolve
  // "Encerrado" (`new Date(null)` é a Época de 1970, diferença negativa), e o
  // bloco inteiro do contador não renderiza. Quem barra a data aqui é ESSE
  // bloco — não a guarda `fimEmTexto &&` de dentro dele, que fica inalcançável.
  //
  // Este teste nasceu dizendo que provava a guarda. Não provava: apagar a
  // guarda deixava a rodada VERDE. O que ele prova de verdade é o que está
  // escrito abaixo — nenhuma data inventada chega à tela. A guarda em si é
  // travada no teste de código (tests/relogioLeilao.test.mjs).
  const { ctx, pagina } = await abrir('?semdata=1');
  try {
    const corpo = await pagina.textContent('body');
    assert.ok(!/31\/12 às 21:00/.test(corpo), 'apareceu a Época de 1970 disfarçada de data');
    assert.ok(!/\d{2}\/\d{2} às \d{2}:\d{2}/.test(corpo), `apareceu uma data onde não há data: ${corpo.slice(0, 200)}`);
  } finally { await ctx.close(); }
});

test('leilão encerrado não mostra a linha do contador', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?encerrado=1');
  try {
    assert.equal(await pagina.locator('[data-teste="data-de-termino"]').count(), 0,
      'a data mora dentro do bloco do contador, que só existe em leilão ativo');
  } finally { await ctx.close(); }
});
