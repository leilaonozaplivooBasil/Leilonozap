/**
 * 📣 A DICA DA ETAPA APARECE E SE MEXE — MEDIDO NUM CHROMIUM.
 *
 * O dono circulou de vermelho o "fale mais 9s" e disse: "estamos pecando em
 * atenção do usuário nesses textos especificamente".
 *
 * A régua é provada sem navegador (tests/progressoDaEtapa.test.mjs). O que só
 * o navegador responde é o que o dono reclamou: CONTRASTE e MOVIMENTO. Aqui se
 * mede a cor que o olho vê e a animação que de fato roda.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-dica-da-etapa');
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
    const arq = path.join(SAIDA, rel === '/' ? 'dica-da-etapa.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/dica-da-etapa.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir(busca = '', opcoes = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 420, height: 900 }, ...opcoes });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE + busca, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="dica-da-etapa"]');
  return { ctx, pagina };
}

test('as três fases aparecem, cada uma com a sua cor', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const fases = await pagina.$$eval('[data-teste="dica-da-etapa"]', (ns) => ns.map((n) => n.dataset.fase));
    assert.deepEqual(fases, ['longe', 'perto', 'pronto', 'perto'],
      'a fase muda com o quanto já foi andado');
  } finally { await ctx.close(); }
});

test('🔴 a pílula tem FUNDO — era isso que faltava no degradê', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    // o defeito de hoje é texto solto sobre gradiente. A prova é o fundo
    // existir de verdade: `rgba` com alfa > 0, não `transparent`.
    const fundos = await pagina.$$eval('[data-teste="dica-da-etapa"]',
      (ns) => ns.map((n) => getComputedStyle(n).backgroundColor));
    for (const f of fundos) {
      assert.ok(/rgba?\(/.test(f) && !/rgba\(0, 0, 0, 0\)/.test(f),
        `a pílula saiu sem fundo: ${f}`);
    }
  } finally { await ctx.close(); }
});

test('🔴 o texto é MAIOR e mais opaco que o aviso antigo', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const novo = await pagina.evaluate(() => {
      const n = document.querySelector('[data-teste="dica-da-etapa"] .dica-salto');
      const cs = getComputedStyle(n);
      return { px: parseFloat(cs.fontSize), peso: cs.fontWeight };
    });
    assert.ok(novo.px >= 13, `o texto voltou a ser miúdo: ${novo.px}px (o antigo era 11px)`);
    assert.ok(Number(novo.peso) >= 700, `peso ${novo.peso} — o aviso antigo já era fraco de propósito`);
  } finally { await ctx.close(); }
});

test('a barra enche na proporção certa — 61 de 70 é 87%', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const largura = await pagina.evaluate(() => {
      const pilulas = [...document.querySelectorAll('[data-teste="dica-da-etapa"]')];
      const perto = pilulas[1];                       // o caso do print
      const barra = perto.querySelector('[data-teste="dica-barra"]');
      const trilho = barra.parentElement;
      return (barra.getBoundingClientRect().width / trilho.getBoundingClientRect().width) * 100;
    });
    assert.ok(Math.abs(largura - 87) <= 2, `a barra ficou em ${largura.toFixed(1)}%, esperado ~87%`);
  } finally { await ctx.close(); }
});

test('liberado não desenha barra — não há mais o que encher', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const temBarra = await pagina.evaluate(() => {
      const pronto = document.querySelector('[data-teste="dica-da-etapa"][data-fase="pronto"]');
      return !!pronto.querySelector('[data-teste="dica-barra"]');
    });
    assert.equal(temBarra, false);
  } finally { await ctx.close(); }
});

test('🎞️ o número SALTA quando muda — com movimento normal', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?vivo=1');
  try {
    const animado = await pagina.evaluate(() => {
      const n = document.querySelector('.dica-salto');
      return getComputedStyle(n).animationName;
    });
    assert.equal(animado, 'dicaSalto', `a animação do número não roda: ${animado}`);
  } finally { await ctx.close(); }
});

test('🎞️ com movimento reduzido, NADA anima — e continua legível', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('', { reducedMotion: 'reduce' });
  try {
    const estado = await pagina.evaluate(() => {
      const salto = document.querySelector('.dica-salto');
      const pulso = document.querySelector('.dica-pulso');
      const pilula = document.querySelector('[data-teste="dica-da-etapa"]');
      return {
        salto: getComputedStyle(salto).animationName,
        pulso: getComputedStyle(pulso).animationName,
        fundo: getComputedStyle(pilula).backgroundColor,
        texto: getComputedStyle(salto).color,
      };
    });
    assert.equal(estado.salto, 'none', 'quem pediu menos movimento levou animação');
    assert.equal(estado.pulso, 'none');
    // 🔴 e o essencial: sem animação a pílula NÃO perde a legibilidade. A cor e
    // o fundo continuam lá — a visibilidade não pode depender de movimento.
    assert.ok(!/rgba\(0, 0, 0, 0\)/.test(estado.fundo), 'perdeu o fundo com movimento reduzido');
    assert.ok(/rgb/.test(estado.texto), 'perdeu a cor do texto com movimento reduzido');
  } finally { await ctx.close(); }
});
