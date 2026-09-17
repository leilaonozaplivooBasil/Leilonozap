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

// ─────────────── 🎬 O VÍDEO ABRE O CARD DO DESTAQUE (17/09/2026) ───────────────
//
// Pedido do dono: "como primeira foto do PS em destaque na página do leilão,
// deve ser o vídeo" — e "só no destaques".
//
// 🔎 O QUE ESTES TESTES PROVAM, E O QUE NÃO PROVAM.
// Não há ffmpeg nem arquivo de vídeo nesta máquina, então NÃO se prova aqui
// que o Chromium decodifica um mp4 — isso é do navegador, não é o que mudou.
// O que mudou, e é o que se prova: que o vídeo entra como SLIDE 1, que os
// atributos que o fazem tocar mudo estão lá, e que o rodízio SEGURA enquanto
// ele toca e SOLTA quando acaba. O evento `play`/`ended` é disparado no
// elemento de verdade, e quem reage é o React de verdade.

const atributosDoVideo = (pagina) => pagina.evaluate(() => {
  const v = document.querySelector('[data-teste="video-do-destaque"]');
  if (!v) return null;
  return {
    tag: v.tagName.toLowerCase(),
    autoplay: v.hasAttribute('autoplay'),
    muted: v.muted === true || v.hasAttribute('muted'),
    playsInline: v.hasAttribute('playsinline'),
    loop: v.hasAttribute('loop'),
    poster: v.getAttribute('poster') || '',
    visivel: getComputedStyle(v).opacity === '1',
  };
});

// qual slide está aparecendo: 'video' ou o índice da foto
//
// 🔴 MEDIDO DEPOIS DO CROSSFADE, sempre. Os slides trocam com
// `transition-opacity duration-300`: durante esses 300ms a opacidade computada
// é uma fração ("0.42"), e NADA está em 1. Ler ali devolve -1 e acusa buraco
// onde não há — foi o que aconteceu na primeira versão deste teste.
const assentar = (pagina) => pagina.waitForTimeout(500);

const slideVisivelAgora = (pagina) => pagina.evaluate(() => {
  const v = document.querySelector('[data-teste="video-do-destaque"]');
  if (v && getComputedStyle(v).opacity === '1') return 'video';
  const fotos = [...document.querySelectorAll('img[alt*="imagem"]')];
  const i = fotos.findIndex((f) => getComputedStyle(f).opacity === '1');
  return i;
});

const slideVisivel = async (pagina) => { await assentar(pagina); return slideVisivelAgora(pagina); };

test('🎬 com vídeo, ele é o SLIDE 1 — as fotos vêm depois', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    const v = await atributosDoVideo(pagina);
    assert.ok(v, 'o vídeo não entrou no card');
    assert.equal(v.tag, 'video', 'arquivo nosso tem que tocar em <video>, nunca em iframe');
    assert.equal(await slideVisivel(pagina), 'video', 'o vídeo não abriu o card');
  } finally { await ctx.close(); }
});

test('🔇 o vídeo toca mudo, sozinho, sem loop, e com a foto de cartaz', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    const v = await atributosDoVideo(pagina);
    assert.ok(v.autoplay, 'sem autoplay o vídeo vira uma foto preta parada');
    assert.ok(v.muted, '🔴 som ligado sozinho numa vitrine é inaceitável');
    assert.ok(v.playsInline, 'sem playsInline o iPhone abre o vídeo em tela cheia');
    assert.ok(!v.loop, 'com loop o rodízio nunca solta e as fotos nunca aparecem');
    assert.ok(v.poster.length > 0, 'sem cartaz o card nasce preto enquanto o vídeo carrega');
  } finally { await ctx.close(); }
});

test('⏸️ o rodízio SEGURA enquanto o vídeo toca, e SOLTA quando acaba', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    // o evento é disparado no elemento real; quem reage é o React real
    await pagina.evaluate(() => {
      document.querySelector('[data-teste="video-do-destaque"]')
        .dispatchEvent(new Event('play'));
    });
    // o carrossel troca a cada 2,5s — três segundos parado prova que segurou
    await pagina.waitForTimeout(3200);
    assert.equal(await slideVisivel(pagina), 'video',
      'o rodízio passou por cima do vídeo — ele seria cortado aos 2,5 segundos');

    await pagina.evaluate(() => {
      document.querySelector('[data-teste="video-do-destaque"]')
        .dispatchEvent(new Event('ended'));
    });
    await pagina.waitForFunction(() => {
      const v = document.querySelector('[data-teste="video-do-destaque"]');
      return v && getComputedStyle(v).opacity !== '1';
    }, null, { timeout: 8000 });
    assert.notEqual(await slideVisivel(pagina), 'video',
      'acabou o vídeo e as fotos não voltaram a girar');
  } finally { await ctx.close(); }
});

test('🕳️ vídeo que não carrega não deixa buraco — as fotos assumem', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=quebrado');
  try {
    // com o endereço quebrado o <video> dispara `error`; o card não pode travar
    await pagina.waitForFunction(() => {
      const v = document.querySelector('[data-teste="video-do-destaque"]');
      return v && getComputedStyle(v).opacity !== '1';
    }, null, { timeout: 10000 });
    const slide = await slideVisivel(pagina);
    assert.ok(typeof slide === 'number' && slide >= 0,
      `o rodízio não chegou nas fotos depois do vídeo falhar: ${slide}`);
  } finally { await ctx.close(); }
});

test('▶️ vídeo de embed entra como iframe e NÃO toca sozinho', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?youtube=1');
  try {
    const v = await atributosDoVideo(pagina);
    assert.equal(v.tag, 'iframe', 'YouTube/Vimeo têm que ir por iframe');
    assert.ok(!v.autoplay, 'rede e som de terceiro não se ligam sozinhos numa vitrine');
  } finally { await ctx.close(); }
});

test('🟢 SEM vídeo o card é o de sempre — nada de elemento sobrando', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    assert.equal(await pagina.locator('[data-teste="video-do-destaque"]').count(), 0,
      'card sem vídeo não pode carregar elemento de vídeo — a listagem de 80 leilões passa por aqui');
    assert.equal(await slideVisivel(pagina), 0, 'a primeira foto tem que abrir o card');
  } finally { await ctx.close(); }
});

// ─────────────── 🔊 O SOM DO VÍDEO (17/09/2026) ───────────────
//
// Dono: "deixa o som do vídeo sempre on com a opção de pause o som".
//
// 🔴 "Sempre on" na partida NÃO EXISTE: o navegador recusa `play()` com som
// antes de qualquer gesto, e o vídeo fica parado no primeiro quadro. O que se
// prova aqui é o que foi combinado no lugar disso, e é comportamento de
// verdade num Chromium: nasce mudo, e o PRIMEIRO clique da pessoa em qualquer
// lugar da página tira o mudo.

const estaMudo = (pagina) => pagina.evaluate(() => {
  const v = document.querySelector('[data-teste="video-do-destaque"]');
  return v ? v.muted : null;
});

test('🔇 o vídeo nasce MUDO — se nascesse com som, não tocaria', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    assert.equal(await estaMudo(pagina), true);
  } finally { await ctx.close(); }
});

test('🔊 o PRIMEIRO clique em qualquer lugar da página liga o som', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    assert.equal(await estaMudo(pagina), true, 'partiu com som — isso impediria o autoplay');
    // um clique longe do vídeo: é "qualquer lugar da página", como foi pedido
    await pagina.mouse.click(5, 5);
    await pagina.waitForFunction(
      () => document.querySelector('[data-teste="video-do-destaque"]')?.muted === false,
      null, { timeout: 5000 },
    );
    assert.equal(await estaMudo(pagina), false);
  } finally { await ctx.close(); }
});

test('🔇 o botão pausa o som, e a escolha sobrevive ao recarregar', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    await pagina.click('[data-teste="som-do-destaque"]');   // 1º: liga (é o gesto)
    await pagina.waitForFunction(
      () => document.querySelector('[data-teste="video-do-destaque"]')?.muted === false,
      null, { timeout: 5000 },
    );
    await pagina.click('[data-teste="som-do-destaque"]');   // 2º: pausa o som
    await pagina.waitForFunction(
      () => document.querySelector('[data-teste="video-do-destaque"]')?.muted === true,
      null, { timeout: 5000 },
    );

    // e agora o que importa: recarregar e clicar NÃO pode devolver o som
    await pagina.reload({ waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="video-do-destaque"]');
    await pagina.mouse.click(5, 5);
    await pagina.waitForTimeout(600);
    assert.equal(await estaMudo(pagina), true,
      '🔴 a escolha da pessoa foi ignorada — ela pediu silêncio e o gesto devolveu o som');
  } finally { await ctx.close(); }
});

test('📻 ligar o som pede à rádio que cale', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1');
  try {
    await pagina.evaluate(() => {
      window.__calou = 0;
      window.addEventListener('nz:silenciar-musica', () => { window.__calou += 1; });
    });
    await pagina.mouse.click(5, 5);
    await pagina.waitForFunction(() => window.__calou > 0, null, { timeout: 5000 });
    assert.ok(await pagina.evaluate(() => window.__calou) > 0,
      'sem este aviso, o X-MUSIC tocaria junto com o vídeo');
  } finally { await ctx.close(); }
});

test('🟢 sem vídeo não existe botão de som', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    assert.equal(await pagina.locator('[data-teste="som-do-destaque"]').count(), 0);
  } finally { await ctx.close(); }
});

// ─────────────── 🔇 SÓ UM VÍDEO TOCA POR VEZ (17/09/2026) ───────────────
//
// Dono: "sempre apenas o vídeo do primeiro destaque fica ativo, para evitar
// dois sons de vídeo ao mesmo tempo". Com o som ligando no primeiro toque da
// página, seis cards com vídeo dariam seis áudios juntos — e ~30 a 48 MB de
// download só pra desenhar a Home.

test('🎬 card que NÃO é o primeiro TAMBÉM abre com o vídeo', { skip: semNavegador }, async () => {
  // 🔄 ESTE TESTE MUDOU DE LADO na mesma noite, e de propósito.
  //
  // A primeira rodada travava o vídeo INTEIRO fora do primeiro destaque — e o
  // dono voltou: "não ficaram legal o patinete e a harley, seus respectivos
  // precisam ser primeira posição também, mas sem tocar o som". O que não pode
  // duplicar é o SOM, não o vídeo.
  const { ctx, pagina } = await abrir('?video=1&inativo=1');
  try {
    assert.equal(await pagina.locator('[data-teste="video-do-destaque"]').count(), 1,
      'o card perdeu o vídeo — é justamente o que o dono mandou desfazer');
    assert.equal(await slideVisivel(pagina), 'video', 'o vídeo tem que abrir o card, como no primeiro');
  } finally { await ctx.close(); }
});

test('🔇 mas SEM som: nem botão, nem áudio no primeiro clique', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?video=1&inativo=1');
  try {
    assert.equal(await pagina.locator('[data-teste="som-do-destaque"]').count(), 0,
      'card sem som não pode oferecer botão de som');
    // o teste que importa: o gesto que liga o som no PRIMEIRO card não pode
    // ligar neste — senão voltam os dois áudios juntos
    await pagina.mouse.click(5, 5);
    await pagina.waitForTimeout(800);
    assert.equal(await estaMudo(pagina), true,
      '🔴 o clique ligou o som num card que não é o primeiro — dois áudios ao mesmo tempo');
  } finally { await ctx.close(); }
});
