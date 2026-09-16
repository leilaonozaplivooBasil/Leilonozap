/**
 * 🖼️ O BANNER APARECE INTEIRO — MEDIDO NUM CHROMIUM.
 *
 * Dono, 16/09/2026: "deixe-os na dimensão correta para ser visto completamente
 * onde estiverem". Três coisas que só o navegador responde:
 *   • a arte 16:9 cabe INTEIRA na moldura — nenhum pixel recortado
 *   • a moldura vai de BORDA A BORDA (o `aspect-[16/9]` com `max-h` encolhia
 *     a largura e a moldura descolava das laterais)
 *   • NADA cobre a arte — nem degradê, nem o card que subia por cima
 *
 * A terceira é a que pegou o defeito do print: o `contain` estava certo desde
 * 15/09, a arte era renderizada inteira — e um degradê de 176px escondia o
 * rodapé dela. Medir o tamanho da arte NÃO acusaria isso; só perguntar ao
 * navegador "quem está neste ponto da tela?" acusa.
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
import { inflateSync } from 'node:zlib';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-banner-inteiro');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

/**
 * 🎨 A COR DE UM PONTO DA TELA, COMO O OLHO VÊ.
 *
 * 🔴 POR QUE ISTO EXISTE, E POR QUE NÃO DÁ PARA PERGUNTAR AO DOM.
 * O defeito que o dono fotografou era um degradê escuro por cima do rodapé do
 * banner — e ele tinha `pointer-events-none`. Elemento com pointer-events-none
 * sai do teste de acerto do navegador: `elementFromPoint` E `elementsFromPoint`
 * devolvem a arte como se nada estivesse na frente. Duas versões desta prova
 * passaram VERDE com o degradê montado, antes de eu desconfiar.
 *
 * Então a prova não pergunta quem está ali: ela tira uma foto de 1×1 pixel
 * daquele ponto e lê a cor. Se tem alguma coisa escurecendo, a cor muda.
 *
 * Decodificar o PNG é trivial em 1×1: cabeçalho + um IDAT com uma linha só
 * (byte de filtro + RGBA). Com um pixel só não há vizinho à esquerda nem acima,
 * então TODO tipo de filtro do PNG devolve o valor cru — não é preciso
 * implementar Sub/Up/Average/Paeth.
 */
async function corDoPonto(pagina, x, y) {
  const png = await pagina.screenshot({ clip: { x, y, width: 1, height: 1 } });
  let i = 8; // assinatura PNG
  const pedacos = {};
  while (i < png.length) {
    const tam = png.readUInt32BE(i);
    const tipo = png.toString('ascii', i + 4, i + 8);
    const dados = png.subarray(i + 8, i + 8 + tam);
    if (tipo === 'IDAT') pedacos.IDAT = pedacos.IDAT ? Buffer.concat([pedacos.IDAT, dados]) : dados;
    if (tipo === 'IHDR') pedacos.cor = dados[9]; // 6 = RGBA, 2 = RGB
    if (tipo === 'IEND') break;
    i += 12 + tam;
  }
  const cru = inflateSync(pedacos.IDAT); // [filtro, R, G, B, (A)]
  return { r: cru[1], g: cru[2], b: cru[3] };
}

const distancia = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

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
    const arq = path.join(SAIDA, rel === '/' ? 'banner-inteiro.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/banner-inteiro.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir(largura) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="embrulho-do-banner"] img');
  return { ctx, pagina };
}

// 🔴 `getBoundingClientRect()` de um <img> devolve a CAIXA DO ELEMENTO, não o
// desenho. Com `object-contain` o elemento continua w-full/h-full e a arte fica
// encaixotada dentro dele — medir o elemento não acusa corte nenhum. Aqui a
// caixa PINTADA é calculada a partir do tamanho natural do arquivo, que é o que
// o olho vê. (Primeira versão desta prova media o elemento e acusava "2.433,
// não 16:9": estava medindo a moldura e chamando de arte.)
const medir = (pagina) => pagina.evaluate(() => {
  const img = document.querySelector('[data-teste="embrulho-do-banner"] img:not([aria-hidden])');
  const moldura = img.closest('.overflow-hidden');
  const caixa = img.getBoundingClientRect();
  const m = moldura.getBoundingClientRect();

  // 🔴 O `object-fit` VEM DO NAVEGADOR, não da nossa suposição. A primeira
  // versão desta prova fixava a matemática do `contain` (Math.min) — e então
  // trocar o componente para `cover` NÃO fazia o teste cair: ele reportava a
  // caixa que o contain daria, independentemente do CSS real. Teste que mede a
  // própria expectativa passa verde para sempre.
  const encaixe = getComputedStyle(img).objectFit;
  const escala = encaixe === 'cover'
    ? Math.max(caixa.width / img.naturalWidth, caixa.height / img.naturalHeight)
    : Math.min(caixa.width / img.naturalWidth, caixa.height / img.naturalHeight);
  const pw = img.naturalWidth * escala;
  const ph = img.naturalHeight * escala;
  const pintada = {
    left: caixa.left + (caixa.width - pw) / 2,
    top: caixa.top + (caixa.height - ph) / 2,
    width: pw, height: ph,
  };
  pintada.right = pintada.left + pw;
  pintada.bottom = pintada.top + ph;

  // 🔴 `elementFromPoint` (singular) IGNORA quem tem `pointer-events-none` — e o
  // degradê que escondia o rodapé do banner tinha exatamente isso. A primeira
  // versão desta prova usava o singular: devolvia "a-arte" com o degradê montado
  // por cima, ou seja, passava verde no defeito que o dono fotografou.
  //
  // `elementsFromPoint` (plural) devolve a PILHA inteira, de cima para baixo,
  // sem ligar para pointer-events. Quem está acima da arte e NÃO é ancestral
  // dela é uma cobertura — o degradê, um card que subiu, o que for.
  const coberturas = (x, y) => {
    const pilha = document.elementsFromPoint(x, y);
    const i = pilha.indexOf(img);
    if (i < 0) return ['a-arte-nao-esta-neste-ponto'];
    return pilha.slice(0, i)
      .filter((el) => !el.contains(img))
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className || '').split(' ').filter(Boolean).slice(0, 3).join('.')}`);
  };

  return {
    encaixe,
    arte: { w: Math.round(pw), h: Math.round(ph) },
    // o que `cover` daria: serve para provar que NÃO estamos em cover
    seFosseCover: (() => {
      const e = Math.max(caixa.width / img.naturalWidth, caixa.height / img.naturalHeight);
      return { w: Math.round(img.naturalWidth * e), h: Math.round(img.naturalHeight * e) };
    })(),
    moldura: { w: Math.round(m.width), h: Math.round(m.height) },
    // 🔴 A RÉGUA É O `body`, NÃO A JANELA. Medido neste Chromium com uma página
    // que rola: window.innerWidth = 1280, documentElement.clientWidth = 1280 e
    // body = 1265 — os 15px da barra de rolagem. As duas primeiras reprovavam um
    // banner que está colado nas bordas. A largura que um filho do body pode
    // ocupar é a do body.
    //
    // (Efeito colateral conhecido e aceito: `56.25vw` usa vw, que INCLUI a barra.
    // Numa página com rolagem a moldura fica uns poucos pixels mais alta que 16:9
    // da própria largura, e o `ambient` preenche as laterais. Com `contain` a arte
    // continua inteira, que é o que importa.)
    tela: document.body.clientWidth,
    // 3 pontos dentro da arte PINTADA — o rodapé é a faixa que o degradê escondia
    pontos: {
      meio:   { x: Math.round(pintada.left + pintada.width / 2), y: Math.round(pintada.top + pintada.height / 2) },
      rodape: { x: Math.round(pintada.left + pintada.width / 2), y: Math.round(pintada.bottom - 6) },
      quina:  { x: Math.round(pintada.left + 12), y: Math.round(pintada.bottom - 6) },
    },
    noMeio: coberturas(pintada.left + pintada.width / 2, pintada.top + pintada.height / 2),
    noRodape: coberturas(pintada.left + pintada.width / 2, pintada.bottom - 6),
    naQuinaDoRodape: coberturas(pintada.left + 12, pintada.bottom - 6),
  };
});

for (const largura of [1280, 768, 400]) {
  test(`🖼️ ${largura}px — a arte 16:9 cabe INTEIRA, sem um pixel cortado`, { skip: semNavegador }, async () => {
    const { ctx, pagina } = await abrir(largura);
    try {
      const m = await medir(pagina);
      const proporcao = m.arte.w / m.arte.h;
      assert.ok(Math.abs(proporcao - 16 / 9) < 0.02, `a arte saiu em ${proporcao.toFixed(3)}, não 16:9`);
      // cabe inteira: nenhum lado transborda a moldura
      assert.ok(m.arte.w <= m.moldura.w + 1 && m.arte.h <= m.moldura.h + 1,
        `a arte (${m.arte.w}x${m.arte.h}) transborda a moldura (${m.moldura.w}x${m.moldura.h}) — está recortada`);
      // e encosta em pelo menos um lado: contain aproveita o máximo do espaço
      assert.ok(m.arte.w >= m.moldura.w - 1 || m.arte.h >= m.moldura.h - 1,
        `a arte (${m.arte.w}x${m.arte.h}) não encosta em lado nenhum da moldura (${m.moldura.w}x${m.moldura.h})`);
      // 🔴 a prova de que NÃO é cover: em cover a arte seria maior que a moldura
      if (m.seFosseCover.h > m.moldura.h + 1 || m.seFosseCover.w > m.moldura.w + 1) {
        assert.notDeepEqual({ w: m.arte.w, h: m.arte.h }, m.seFosseCover,
          'a arte está do tamanho que `cover` daria — voltou a recortar');
      }
    } finally { await ctx.close(); }
  });

  test(`📐 ${largura}px — a moldura vai de BORDA A BORDA`, { skip: semNavegador }, async () => {
    const { ctx, pagina } = await abrir(largura);
    try {
      const m = await medir(pagina);
      assert.ok(m.moldura.w >= m.tela - 2,
        `a moldura tem ${m.moldura.w}px numa tela de ${m.tela}px — descolou das bordas (aspect-ratio com max-height?)`);
    } finally { await ctx.close(); }
  });

  test(`🔴 ${largura}px — NADA cobre a arte: o rodapé sai na COR dele`, { skip: semNavegador }, async () => {
    const { ctx, pagina } = await abrir(largura);
    try {
      const m = await medir(pagina);
      // a arte da banca é verde-escuro com uma FAIXA VERMELHA (#e0533f) nos
      // últimos 15% — é o rodapé do banner, a parte que o degradê escondia
      const VERMELHO = { r: 0xe0, g: 0x53, b: 0x3f };
      const VERDE = { r: 0x0b, g: 0x3d, b: 0x2e };
      const meio = await corDoPonto(pagina, m.pontos.meio.x, m.pontos.meio.y);
      const rodape = await corDoPonto(pagina, m.pontos.rodape.x, m.pontos.rodape.y);
      const quina = await corDoPonto(pagina, m.pontos.quina.x, m.pontos.quina.y);
      assert.ok(distancia(meio, VERDE) <= 12, `o meio do banner saiu em rgb(${meio.r},${meio.g},${meio.b}) — algo está por cima`);
      assert.ok(distancia(rodape, VERMELHO) <= 12, `o RODAPÉ do banner saiu em rgb(${rodape.r},${rodape.g},${rodape.b}) em vez do vermelho da arte — está coberto`);
      assert.ok(distancia(quina, VERMELHO) <= 12, `a quina do rodapé saiu em rgb(${quina.r},${quina.g},${quina.b}) — está coberta`);
      // e o teste de acerto continua, que pega quem BLOQUEIA o clique
      assert.deepEqual(m.noRodape, [], `algo intercepta o clique no rodapé: ${m.noRodape.join(', ')}`);
    } finally { await ctx.close(); }
  });
}

test('🔴 o bloco de baixo começa DEPOIS do banner, não em cima', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir(1280);
  try {
    const { baseDoBanner, topoDoBloco } = await pagina.evaluate(() => ({
      baseDoBanner: Math.round(document.querySelector('[data-teste="embrulho-do-banner"]').getBoundingClientRect().bottom),
      topoDoBloco: Math.round(document.querySelector('[data-teste="bloco-de-baixo"]').getBoundingClientRect().top),
    }));
    assert.ok(topoDoBloco >= baseDoBanner,
      `o bloco começa em ${topoDoBloco} e o banner termina em ${baseDoBanner} — subiu ${baseDoBanner - topoDoBloco}px por cima`);
  } finally { await ctx.close(); }
});
