/**
 * 🏷️ O SELO "NOVO - Com Garantia" NÃO PODE FICAR ATRÁS DOS BOTÕES.
 *
 * 19/09/2026, print do dono com o destaque do PS5 circulado de vermelho: só
 * aparecia "Com Garantia", saindo de trás do botão de compartilhar. Causa: o
 * selo e os botões de ação estavam na MESMA posição — os dois em
 * `absolute top-2 left-2` — e os botões, em z-20, cobriam o selo em z-10.
 * O "✨ NOVO" ficava embaixo do botão azul.
 *
 * Ler o arquivo prova que a classe mudou. Só o navegador responde se as duas
 * caixas ainda se cruzam — e é isso que estes testes medem, no card largo e
 * no estreito.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-selo-garantia');
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

/** Abre o card de fábrica e devolve as caixas do selo, dos botões e da foto. */
async function medir(busca, largura = 1280) {
  await garantirNavegador();
  const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } });
  await pagina.goto(`${BASE}${busca}`, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="selo-de-garantia"]', { timeout: 15000 });
  // deixa o carrossel assentar antes de medir
  await pagina.waitForTimeout(400);

  const caixas = await pagina.evaluate(() => {
    const cx = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, direita: r.right, esquerda: r.left }; };
    const selo = document.querySelector('[data-teste="selo-de-garantia"]');
    const moldura = selo.offsetParent;
    // todo botão que está DENTRO da foto: compartilhar, coração, som, lápis
    const dentroDaFoto = (el) => moldura.contains(el) || (() => {
      const r = el.getBoundingClientRect(); const m = moldura.getBoundingClientRect();
      return r.top >= m.top && r.bottom <= m.bottom && r.left >= m.left && r.right <= m.right;
    })();
    const botoes = [...document.querySelectorAll('button')].filter(dentroDaFoto).map(cx);
    const bolinhas = document.querySelector('[data-teste="bolinhas-do-carrossel"]');
    const legenda = moldura.querySelector('p.truncate');
    return {
      selo: cx(selo),
      botoes,
      moldura: cx(moldura),
      bolinhas: bolinhas ? cx(bolinhas) : null,
      legenda: legenda ? cx(legenda) : null,
    };
  });
  await pagina.close();
  return caixas;
}

// 🔴 COLISÃO É NOS DOIS EIXOS. A primeira versão comparava só o X e acusava
// sobreposição entre caixas que estavam em LINHAS diferentes — foi ela que
// reprovou o selo já corrigido, dizendo "104–316 cruza 85–125" quando um estava
// 56px abaixo do outro. Duas caixas só se cruzam se as faixas X e Y se cruzam.
const seCruzam = (a, b) => (
  a.esquerda < b.direita && b.esquerda < a.direita
  && a.y < b.y + b.h && b.y < a.y + a.h
);

test('🔴 no card largo, o selo NÃO encosta nos botões de ação', { skip: semNavegador }, async () => {
  const { selo, botoes } = await medir('?garantia=1&favorito=1');
  // 🔴 A CONTAGEM É PARTE DA PROVA. A primeira versão desta medição rodou sem
  // usuário logado: o coração não renderizava, a banca via UM botão só e teria
  // aprovado um selo que, na tela real, encosta no segundo.
  assert.equal(botoes.length, 2, `esperava compartilhar + favoritar, achei ${botoes.length}`);

  for (const b of botoes) {
    assert.ok(!seCruzam(selo, b),
      `o selo x:${Math.round(selo.esquerda)}–${Math.round(selo.direita)} y:${Math.round(selo.y)}–${Math.round(selo.y + selo.h)} cruza um botão x:${Math.round(b.esquerda)}–${Math.round(b.direita)} y:${Math.round(b.y)}–${Math.round(b.y + b.h)}`);
  }
});

// ↙️ 28/09/2026 — dono, print da Canon com seta vermelha: "a tag NOVO -
// Garantia deve ser fixa no canto inferior esquerdo do card". (Antes, de
// 25/09: canto superior direito, na linha dos botões — no celular descia para
// o meio da foto, que é o que o print mostrou.)
const noCantoInferiorEsquerdo = ({ selo, moldura }, onde = '') => {
  const folgaEsquerda = selo.esquerda - moldura.esquerda;
  assert.ok(folgaEsquerda >= 4 && folgaEsquerda <= 20, `${onde}o selo está a ${folgaEsquerda.toFixed(1)}px da borda esquerda — tinha que estar colado no canto`);
  const folgaBaixo = (moldura.y + moldura.h) - (selo.y + selo.h);
  assert.ok(folgaBaixo >= 4 && folgaBaixo <= 20, `${onde}o selo está a ${folgaBaixo.toFixed(1)}px do pé da foto — tinha que estar embaixo`);
};

test('🎯 o selo está no CANTO INFERIOR ESQUERDO da foto (card largo)', { skip: semNavegador }, async () => {
  noCantoInferiorEsquerdo(await medir('?garantia=1&favorito=1'));
});

test('🎯 no celular (2 cards por linha, ~170px) o selo também fica no canto inferior esquerdo', { skip: semNavegador }, async () => {
  noCantoInferiorEsquerdo(await medir('?garantia=1&favorito=1&largura=218', 390), 'no celular ');
});

test('🔴 com várias fotos, as bolinhas do carrossel NÃO ficam por cima do selo', { skip: semNavegador }, async () => {
  for (const [largura, tela] of [[218, 390], [420, 1280]]) {
    const m = await medir(`?garantia=1&favorito=1&fotos=6&largura=${largura}`, tela);
    assert.ok(m.bolinhas, 'com 6 fotos as bolinhas tinham que aparecer');
    assert.ok(!seCruzam(m.selo, m.bolinhas), `card ${largura}px: bolinhas x:${Math.round(m.bolinhas.esquerda)}–${Math.round(m.bolinhas.direita)} y:${Math.round(m.bolinhas.y)} cruzam o selo x:${Math.round(m.selo.esquerda)}–${Math.round(m.selo.direita)} y:${Math.round(m.selo.y)}`);
    noCantoInferiorEsquerdo(m, `card ${largura}px com fotos: `);
  }
});

test('🔴 no card do admin, o selo NÃO encosta no lápis de editar', { skip: semNavegador }, async () => {
  // 206px de banca = foto de ~158px: o card de um celular de 360px, o mais estreito comum
  const m = await medir('?garantia=1&favorito=1&admin=1&largura=206', 360);
  assert.equal(m.botoes.length, 3, `esperava compartilhar + coração + lápis, achei ${m.botoes.length}`);
  for (const b of m.botoes) assert.ok(!seCruzam(m.selo, b), `o selo x:${Math.round(m.selo.esquerda)}–${Math.round(m.selo.direita)} y:${Math.round(m.selo.y)}–${Math.round(m.selo.y + m.selo.h)} cruza x:${Math.round(b.esquerda)}–${Math.round(b.direita)} y:${Math.round(b.y)}–${Math.round(b.y + b.h)} (foto ${Math.round(m.moldura.w)}px)`);
});

test('🔴 foto com legenda: o selo sobe e NÃO cobre o texto', { skip: semNavegador }, async () => {
  const m = await medir('?garantia=1&legenda=1&largura=218', 390);
  assert.ok(m.legenda, 'a legenda tinha que aparecer');
  assert.ok(!seCruzam(m.selo, m.legenda), 'o selo está em cima do texto da legenda');
});

test('🔴 no slide do vídeo, o selo NÃO fica embaixo do botão de som', { skip: semNavegador }, async () => {
  const m = await medir('?garantia=1&video=1&largura=218', 390);
  assert.ok(m.botoes.length >= 2, 'o botão de som tinha que aparecer');
  for (const b of m.botoes) assert.ok(!seCruzam(m.selo, b), 'o selo cruza o botão de som');
  const folgaBaixo = (m.moldura.y + m.moldura.h) - (m.selo.y + m.selo.h);
  assert.ok(folgaBaixo <= 20, 'no vídeo o selo continua no pé da foto');
});

test('🔴 no card ESTREITO (celular) o selo continua sem encostar nos botões', { skip: semNavegador }, async () => {
  // 300px é mais estreito que o card real do celular — se passa aqui, passa lá.
  const { selo, botoes } = await medir('?garantia=1&favorito=1&largura=300', 380);
  for (const b of botoes) {
    assert.ok(!seCruzam(selo, b),
      `no estreito o selo x:${Math.round(selo.esquerda)}–${Math.round(selo.direita)} y:${Math.round(selo.y)}–${Math.round(selo.y + selo.h)} cruza um botão x:${Math.round(b.esquerda)}–${Math.round(b.direita)} y:${Math.round(b.y)}–${Math.round(b.y + b.h)}`);
  }
});

test('o selo cabe dentro da foto, sem vazar para fora', { skip: semNavegador }, async () => {
  const { selo, moldura } = await medir('?garantia=1&favorito=1&largura=300', 380);
  assert.ok(selo.esquerda >= moldura.esquerda - 1, 'o selo vaza pela esquerda');
  assert.ok(selo.direita <= moldura.direita + 1, 'o selo vaza pela direita');
  assert.ok(selo.h > 0 && selo.w > 0, 'o selo não tem tamanho');
});

test('card que NÃO é de fábrica não mostra selo nenhum', { skip: semNavegador }, async () => {
  await garantirNavegador();
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(400);
  assert.equal(await pagina.locator('[data-teste="selo-de-garantia"]').count(), 0);
  await pagina.close();
});
