/**
 * GUIA MÓVEL + FAIXA DA TOP COLLEGE: limpo no celular, intacto no desktop.
 *
 * 🔴 Dono (06/09/2026): "no celular está com muito texto embaixo do Sonho,
 * do Compromisso… tem que ter um guia; a frase da faculdade pode entrar na
 * lateral, do lado da logo. Só no celular — e não pode ficar feio."
 *
 * O que só o navegador mede: a MESMA tela a 1440px e a 390px.
 *   • desktop: o texto do hábito continua visível de cara, sem botão nenhum;
 *   • celular: o texto nasce dobrado numa linha "📖 …", e um toque abre o
 *     texto INTEIRO (nada cortado); a primeira ação sobe pra primeira dobra;
 *   • celular: a frase da faculdade fica AO LADO das marcas, não embaixo.
 * E tira as fotos que o dono julga ("não pode ficar feio").
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
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
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  const RAIZ = path.join(AQUI, '..', '..');
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    // as marcas (/marca/*.webp) vêm da pasta public do app
    let arq = path.join(SAIDA, rel === '/' ? 'guia.html' : decodeURIComponent(rel));
    if (!existsSync(arq)) arq = path.join(RAIZ, 'public', decodeURIComponent(rel));
    if (!(arq.startsWith(SAIDA) || arq.startsWith(path.join(RAIZ, 'public'))) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/guia.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir({ celular = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(celular
    ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Hábito 1 — Sonho').waitFor();
  await pagina.waitForTimeout(250);
  return { pagina, ctx, erros };
}

// ─────────────── desktop: nada muda ───────────────

test('DESKTOP: o texto do hábito continua visível de cara, sem botão de guia', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  assert.ok(await pagina.locator('[data-teste="texto-guia"]').isVisible(), 'o texto sumiu no desktop');
  assert.equal(await pagina.locator('[data-guia-movel]').count(), 0, 'apareceu o botão de guia no desktop');
  assert.deepEqual(erros, []);
  await ctx.close();
});

// ─────────────── celular: dobrado, e abre inteiro ───────────────

test('CELULAR: o texto nasce dobrado numa linha, e a primeira ação fica acima da dobra', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  assert.equal(await pagina.locator('[data-guia-movel="fechado"]').count(), 1, 'o guia não nasceu fechado');
  assert.equal(await pagina.locator('[data-teste="texto-guia"]').count(), 0, 'o texto está renderizado mesmo fechado');
  const acao = await pagina.locator('[data-teste="primeira-acao"]').boundingBox();
  assert.ok(acao && acao.y + acao.height < 780, `a primeira ação caiu pra fora da primeira dobra: y=${acao?.y}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-fechado.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: um toque abre o texto INTEIRO — nada foi cortado', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.getByRole('button', { name: /como montar o seu quadro/i }).tap();
  await pagina.locator('[data-guia-movel="aberto"]').waitFor();
  const texto = await pagina.locator('[data-teste="texto-guia"]').innerText();
  assert.match(texto, /três prazos/);
  assert.match(texto, /Sonho detalhado vira meta/);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-aberto.png'), fullPage: true });
  await ctx.close();
});

// ─────────────── a faixa: frase ao lado das marcas ───────────────

test('CELULAR: a frase da faculdade fica AO LADO das marcas, não embaixo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  const marca = await pagina.getByAltText('Top College').boundingBox();
  const frase = await pagina.getByText('A primeira faculdade de empreendedorismo do planeta').boundingBox();
  assert.ok(marca && frase, 'não achei a marca ou a frase');
  assert.ok(frase.x > marca.x + marca.width, `a frase não está à direita da marca: frase.x=${frase.x} marca.dir=${marca.x + marca.width}`);
  assert.ok(frase.y < marca.y + marca.height, `a frase caiu pra baixo da marca: frase.y=${frase.y} marca.baixo=${marca.y + marca.height}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-faixa.png'), clip: { x: 0, y: 0, width: 390, height: 260 } });
  await ctx.close();
});

test('DESKTOP: a faixa continua em uma linha, como estava', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const frase = await pagina.getByText(/A primeira faculdade de empreendedorismo do planeta/).first().boundingBox();
  assert.ok(frase && frase.height < 30, `a frase quebrou em mais de uma linha no desktop: altura=${frase?.height}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'desktop-faixa.png'), clip: { x: 0, y: 0, width: 1440, height: 160 } });
  await ctx.close();
});

// ─────────────── o cartão LOJA & VENDAS e o modal, vestidos de Top College ───────────────

test('CELULAR: o cartão de navegação veste a Top College — sem a caixa verde', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  const gatilho = pagina.locator('[data-vestuario="top-college"]');
  assert.equal(await gatilho.count(), 1, 'o cartão não está no vestuário Top College');
  const classes = await gatilho.getAttribute('class');
  assert.ok(!/nz-verde|rounded-xl|shadow-\[/.test(classes), `sobrou caixa/verde no cartão: ${classes}`);
  const fonte = await gatilho.evaluate((n) => getComputedStyle(n).fontFamily);
  assert.match(fonte, /Sora/, `a fonte do cartão não é a da faculdade: ${fonte}`);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-cartao.png'), clip: { x: 0, y: 0, width: 390, height: 110 } });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: o modal abre assinado pelas duas marcas, no preto da faculdade', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  await pagina.locator('[data-vestuario="top-college"]').tap();
  await pagina.getByPlaceholder('BUSCAR SEÇÃO...').waitFor();
  const marcas = pagina.locator('.fixed.inset-0 img[alt="Top College"], .fixed.inset-0 img[alt="X-eos"]');
  assert.equal(await marcas.count(), 2, 'as duas marcas não assinam o modal');
  assert.equal(await pagina.getByText('Navegar no Painel').count(), 0, 'o título genérico continua no modal da faculdade');
  await pagina.waitForTimeout(200);
  await pagina.screenshot({ path: path.join(FOTOS, 'celular-modal.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});

// ─────────────── a faixa Jornada × Lista, o placar e o relógio de teste ───────────────

const estadoFaixa = async (pagina) => JSON.parse(await pagina.locator('[data-teste="estado-faixa"]').textContent());

// 🎴 DIR-183 — DOIS estados, igual aos 8 Hábitos. Dono: "quando eu clicar em
// Jornada vai sumir os outros, sumir a moeda, sumir TUDO e aparecer só o card
// ... e eu posso passar lateralmente com a seta ou clicando nos quadrados."
test('VISÕES: dentro de uma visão os outros 4 quadrados SOMEM; o ‹ › passa de lado e dá a volta', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  // começa na Jornada (uma visão aberta): a grade dos 5 não pode estar na tela
  assert.equal(await pagina.$('[data-teste="portas-das-visoes"]'), null, 'os 5 quadrados ficaram junto com a visão aberta');
  assert.match(await pagina.$eval('[data-teste="barra-da-visao"]', (n) => n.innerText), /Jornada/);
  assert.equal(await pagina.$eval('[data-teste="visao-contador"]', (n) => n.textContent.trim()), '01 / 05');

  await pagina.locator('[data-teste="visao-proxima"]').tap();
  assert.equal((await estadoFaixa(pagina)).visao, 'lista');
  assert.equal(await pagina.$eval('[data-teste="visao-contador"]', (n) => n.textContent.trim()), '02 / 05');

  // 🔁 dá a volta: da primeira pra trás cai na última
  await pagina.locator('[data-teste="visao-anterior"]').tap();
  await pagina.locator('[data-teste="visao-anterior"]').tap();
  assert.equal((await estadoFaixa(pagina)).visao, 'demandas', 'o ‹ › não deu a volta');
  assert.equal(await pagina.$eval('[data-teste="visao-contador"]', (n) => n.textContent.trim()), '05 / 05');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('VISÕES: voltar mostra a CAPA com os 5 quadrados — e clicar num quadrado abre só ele', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  await pagina.locator('[data-teste="voltar-as-visoes"]').tap();
  // na capa: os 5 quadrados, e NENHUMA visão aberta
  assert.equal(await pagina.$('[data-teste="barra-da-visao"]'), null, 'a barra da visão ficou na capa');
  const nomes = await pagina.$$eval('[data-teste="portas-das-visoes"] button', (bs) => bs.map((b) => b.getAttribute('data-teste')));
  assert.deepEqual(nomes, ['porta-visao-jornada', 'porta-visao-lista', 'porta-visao-quadro', 'porta-visao-mapa', 'porta-visao-demandas']);
  // o que espera nas Demandas aparece na capa — é a única tela que mostra as cinco
  assert.equal(await pagina.$eval('[data-teste="porta-demandas-contador"]', (n) => n.textContent.trim()), '3');
  if (process.env.FOTO_BANCA) await pagina.screenshot({ path: path.join(FOTOS, 'capa-das-visoes.png') });

  await pagina.locator('[data-teste="porta-visao-quadro"]').tap();
  assert.equal((await estadoFaixa(pagina)).visao, 'quadro');
  assert.equal(await pagina.$('[data-teste="portas-das-visoes"]'), null, 'os quadrados não sumiram ao abrir a visão');
  assert.deepEqual(erros, []);
  await ctx.close();
});

// 🧹 DIR-180 — "Eu no Game" saiu da faixa (ele é o placar, não uma visão):
// a prova dele agora vive na banca do placar, em placar-do-dia.spec.mjs.

test('RELÓGIO DE TESTE (fora da fileira, DIR-180): fica discreto — só abre o campo quando alguém toca, e sair volta ao normal', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  assert.equal(await pagina.locator('input[type="time"]').count(), 0, 'o campo de hora nasceu aberto, gritando');
  await pagina.locator('[data-teste="modo-teste-pastilha"]').tap();
  await pagina.locator('[data-teste="modo-teste-aberto"]').waitFor();
  await pagina.locator('input[type="time"]').fill('09:30');
  await pagina.getByRole('button', { name: 'aplicar' }).tap();
  await pagina.locator('[data-teste="modo-teste-ligado"]').waitFor();
  assert.equal((await estadoFaixa(pagina)).hora, '09:30');
  await pagina.locator('[data-teste="pe-do-placar"]').screenshot({ path: path.join(FOTOS, 'relogio-teste-ligado.png') });
  await pagina.getByRole('button', { name: /sair/ }).tap();
  await pagina.locator('[data-teste="modo-teste-pastilha"]').waitFor();
  assert.equal((await estadoFaixa(pagina)).hora, '');
  await ctx.close();
});

// 🧹 DIR-180 — o que o dono reclamou no print NÃO era a altura: era que no
// celular só o botão ATIVO mostrava a palavra, e os outros quatro ficavam
// ícone pelado ("ninguém adivinha que ⛓ é Mapa"). A prova mudou pra isso:
// UMA fileira só (todos os azulejos no mesmo topo) e TODO nome inteiro,
// medido no navegador de verdade — scrollWidth > clientWidth é texto cortado.
test('CAPA: os cinco quadrados com o nome INTEIRO no celular; fotos nos dois tamanhos', { skip: semNavegador }, async () => {
  for (const celular of [true, false]) {
    const { pagina, ctx } = await abrir({ celular });
    // click, não tap: este teste roda também no desktop, que não tem toque
    await pagina.locator('[data-teste="voltar-as-visoes"]').click();
    const faixa = pagina.locator('[data-teste="portas-das-visoes"]');
    const medida = await faixa.evaluate((el) => [...el.querySelectorAll('button')].map((b) => {
      const nome = b.querySelectorAll('span')[1];
      return { texto: nome.textContent, corta: nome.scrollHeight > nome.clientHeight + 1 };
    }));
    assert.equal(medida.length, 5, 'a capa precisa ter as cinco visões');
    assert.deepEqual(medida.map((m) => m.texto), ['Jornada', 'Lista', 'Quadro', 'Mapa', 'Demandas']);
    const cortados = medida.filter((m) => m.corta).map((m) => m.texto);
    assert.deepEqual(cortados, [], `nome cortado no ${celular ? 'celular' : 'desktop'}: ${cortados}`);
    await faixa.screenshot({ path: path.join(FOTOS, `capa-visoes-${celular ? 'celular' : 'desktop'}.png`) });
    await ctx.close();
  }
});

// ── 🧭 DIR-182 — a fileira gruda embaixo da barra do app ──
// Dono: "que a barra da Jornada, Lista, Quadro e tal fique FIXA no local mais
// estratégico pra guiar a organização." Antes ela rolava junto e sumia: quem
// descia pra ver a lista do dia perdia o mapa de onde estava.
test('BARRA DA VISÃO: rolar a página NÃO leva a barra embora — ela gruda embaixo da barra do app', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ celular: true });
  const topo = () => pagina.$eval('[data-teste="barra-da-visao"]', (n) => Math.round(n.getBoundingClientRect().top));
  const barra = await pagina.$eval('[data-teste="barra-do-app-falsa"]', (n) => Math.round(n.getBoundingClientRect().bottom));

  const antes = await topo();
  await pagina.evaluate(() => window.scrollTo(0, 900));
  await pagina.waitForTimeout(250);
  const depois = await topo();

  assert.ok(await pagina.evaluate(() => window.scrollY) > 500, 'a banca não rolou — a prova não valeria nada');
  assert.ok(depois >= barra - 2, `a fileira subiu por baixo da barra do app (topo=${depois}, barra acaba em ${barra})`);
  assert.ok(depois <= barra + 12, `a fileira não encostou na barra (topo=${depois}, barra acaba em ${barra})`);
  // 🩹 ela COMEÇA abaixo da dobra e SOBE até encostar — subir é o certo. O que
  // não pode é ela continuar subindo e sumir: sem grudar, 900px de rolagem a
  // levariam pra ~-425px (foi o que a banca mediu antes do conserto).
  assert.ok(depois > 0, `a fileira rolou junto e foi embora: ${antes} → ${depois}`);
  assert.ok(antes - depois < 900, 'a fileira acompanhou a rolagem inteira — não grudou');

  // e continua clicável depois de grudada — sticky que não recebe toque é enfeite
  await pagina.locator('[data-teste="visao-proxima"]').tap();
  assert.equal((await estadoFaixa(pagina)).visao, 'lista');
  assert.deepEqual(erros, []);
  await ctx.close();
});

// 🩹 grudada, a fileira tem conteúdo passando POR BAIXO dela: translúcida vira
//    sopa de texto. O fundo tem que ser sólido de verdade.
test('BARRA DA VISÃO: grudada, o fundo é sólido — nada de texto aparecendo por baixo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  const alfa = await pagina.$eval('[data-teste="barra-da-visao"]', (n) => {
    const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
    const partes = m[1].split(',').map((x) => parseFloat(x));
    return partes.length === 4 ? partes[3] : 1;
  });
  assert.ok(alfa >= 0.9, `o fundo da fileira grudada está transparente demais (alfa=${alfa})`);
  await ctx.close();
});
