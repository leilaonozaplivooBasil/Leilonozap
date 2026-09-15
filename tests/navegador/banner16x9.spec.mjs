/**
 * 🖼️ A ARTE 16:9 APARECE INTEIRA — MEDIDO NUM CHROMIUM.
 *
 * Ordem do dono (15/09/2026): "é preciso viabilizar, com o tamanho que eles
 * possuem mesmo". As artes novas são 1920×1080 e as molduras eram 16:5 com
 * `cover` — na Home, ancorado no topo, o que cortava toda a parte de baixo
 * (no banner do PS5: o botão "Ver leilão" e a linha de confiança).
 *
 * Aqui se mede o que o navegador desenhou, em seis larguras:
 *   • a imagem cabe INTEIRA dentro da moldura (nada estourando pra fora);
 *   • a proporção desenhada continua 16:9 (não esticou);
 *   • a moldura respeita o teto de 520px no desktop;
 *   • e no celular a altura fica onde já estava (~219px), sem surpresa.
 *
 * Um teste de classe CSS não serviria: `object-fit` é decidido no desenho.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-banner-16x9');
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
    const arq = path.join(SAIDA, rel === '/' ? 'banner-16x9.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/banner-16x9.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

const LARGURAS = [360, 390, 768, 1024, 1440, 1920];
const TETO = 520;

async function medir(width) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width, height: 1000 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  // 🔴 `:not([aria-hidden])` NÃO É FRESCURA. Com `ambient`, o RotatingBanner
  // pinta DUAS imagens: primeiro a cópia desfocada que preenche as bordas
  // (aria-hidden, e ela usa `cover`), depois a arte de verdade. Pegar a
  // primeira media o borrão — foi o que eu fiz na primeira versão deste
  // arquivo, e por isso um `cover` passava batido.
  const img = pagina.locator('[data-parte="moldura"] img:not([aria-hidden])').first();
  await img.waitFor();
  await pagina.waitForFunction(() => {
    const i = document.querySelector('[data-parte="moldura"] img:not([aria-hidden])');
    return i && i.complete && i.naturalWidth > 0;
  });
  // O retângulo REALMENTE pintado da imagem dentro do <img>.
  //
  // ⚠️ A primeira versão disto calculava sempre como se fosse `contain`, e por
  // isso deixava passar uma mutação que trocava o encaixe por `cover` — o teste
  // media o que EU esperava, não o que o navegador fazia. Agora lê o
  // `object-fit` aplicado e faz a conta do encaixe de verdade: com `cover` a
  // arte ESTOURA a caixa numa das direções, e é justamente esse estouro que
  // significa corte.
  const pintado = await img.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const encaixe = getComputedStyle(el).objectFit;
    const ar = el.naturalWidth / el.naturalHeight;
    const caixaAr = r.width / r.height;
    const maior = caixaAr > ar;
    const cobre = encaixe === 'cover';
    const w = (cobre ? maior : !maior) ? r.width : r.height * ar;
    const h = (cobre ? maior : !maior) ? r.width / ar : r.height;
    return { w, h, caixaW: r.width, caixaH: r.height, encaixe };
  });
  const moldura = await pagina.locator('[data-parte="moldura"]').boundingBox();
  await ctx.close();
  return { pintado, moldura, erros };
}

for (const w of LARGURAS) {
  test(`🖼️ ${w}px — a arte aparece INTEIRA, sem corte`, { skip: semNavegador }, async () => {
    const { pintado, erros } = await medir(w);
    // "contain" nunca estoura: se a arte pintada couber na caixa, nada foi cortado
    assert.ok(pintado.w <= pintado.caixaW + 1,
      `a arte tem ${Math.round(pintado.w)}px e a caixa ${Math.round(pintado.caixaW)}px — está sendo cortada na largura`);
    assert.ok(pintado.h <= pintado.caixaH + 1,
      `a arte tem ${Math.round(pintado.h)}px e a caixa ${Math.round(pintado.caixaH)}px — está sendo cortada na altura`);
    assert.deepEqual(erros, []);
  });

  test(`🖼️ ${w}px — a arte não esticou: continua 16:9`, { skip: semNavegador }, async () => {
    const { pintado } = await medir(w);
    const proporcao = pintado.w / pintado.h;
    assert.ok(Math.abs(proporcao - 16 / 9) < 0.02,
      `a arte foi desenhada em ${proporcao.toFixed(3)} em vez de ${(16 / 9).toFixed(3)}`);
  });

  test(`🖼️ ${w}px — a moldura respeita o teto de ${TETO}px`, { skip: semNavegador }, async () => {
    const { moldura } = await medir(w);
    assert.ok(moldura.height <= TETO + 1,
      `a moldura ficou com ${Math.round(moldura.height)}px — passou do teto e empurra a página`);
  });
}

test('🖼️ o encaixe aplicado é `contain` — é ele que garante o "sem corte"', { skip: semNavegador }, async () => {
  // Lido do DOM, não do arquivo: é o `object-fit` que o navegador aplicou.
  // Sem esta trava, trocar `contain` por `cover` passaria despercebido nas
  // larguras em que a moldura por acaso fica 16:9 — e cortaria justamente onde
  // o teto de 520px muda a proporção da caixa (desktop largo).
  for (const w of [390, 1440]) {
    const { pintado } = await medir(w);
    assert.equal(pintado.encaixe, 'contain', `em ${w}px o encaixe veio "${pintado.encaixe}"`);
  }
});

test('🖼️ no celular a altura fica onde já estava (~220px), sem susto', { skip: semNavegador }, async () => {
  // ✏️ A conta certa é sobre a LARGURA DESENHADA, não sobre a do viewport: o
  // Chromium reserva ~15px pra barra de rolagem, então 390px de tela viram
  // ~375px de conteúdo e a moldura fica em 211px, não 219px. Medi antes de
  // afirmar — a primeira versão deste teste errou exatamente por essa conta.
  const { moldura } = await medir(390);
  const esperado = (moldura.width * 9) / 16;
  assert.ok(Math.abs(moldura.height - esperado) < 2,
    `a moldura ficou ${Math.round(moldura.height)}px para ${Math.round(moldura.width)}px de largura — fora do 16:9`);
  // e o ponto que importa pro dono: continua na casa dos 220px de antes
  assert.ok(moldura.height > 195 && moldura.height < 235,
    `a 390px a moldura ficou com ${Math.round(moldura.height)}px; antes eram 220px`);
});

test('🖼️ no desktop largo a arte usa o teto inteiro — não fica minúscula', { skip: semNavegador }, async () => {
  const { pintado, moldura } = await medir(1440);
  assert.ok(Math.abs(moldura.height - TETO) < 2, `a moldura deveria encostar no teto, veio ${Math.round(moldura.height)}px`);
  assert.ok(pintado.h >= TETO - 2, `a arte só usou ${Math.round(pintado.h)}px dos ${TETO}px disponíveis`);
  assert.ok(pintado.w > 900, `a arte ficou com ${Math.round(pintado.w)}px de largura — pequena demais`);
});
