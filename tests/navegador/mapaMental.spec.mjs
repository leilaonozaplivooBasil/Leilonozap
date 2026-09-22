/**
 * 🗺️ O MAPA MENTAL NUM CHROMIUM DE VERDADE.
 *
 * A árvore (ciclo, órfão, virar demanda) tem 19 provas no Node, em JS puro.
 * Isto aqui mede só o que a REGRA não alcança:
 *
 *   • o mapa nasce com a raiz na primeira vez — senão a tela abre vazia e sem
 *     nenhuma pista de por onde começar;
 *   • pendurar um item cria o nó E a linha que liga ao pai;
 *   • arrastar MOVE o card de verdade (o defeito clássico: ouvinte no próprio
 *     nó, o card gruda no cursor ao soltar fora — aconteceu no carrossel da
 *     home em 19/09);
 *   • escrever no nó guarda o texto.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-mapa-mental');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'mapa-mental.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/mapa-mental.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 } });
  const pagina = await ctx.newPage();
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="mapa-no"]', { timeout: 20000 });
  return { ctx, pagina };
}

const nos = (p) => p.locator('[data-teste="mapa-no"]');

test('🔴 na primeira vez o mapa nasce com a raiz — e não vazio', { skip: semNavegador }, async () => {
  // Tela vazia não dá nenhuma pista de por onde começar a esvaziar a cabeça.
  const { ctx, pagina } = await abrir();
  assert.equal(await nos(pagina).count(), 1, 'o mapa abriu sem nó nenhum');
  await ctx.close();
});

test('🔴 pendurar um item cria o nó E a linha que liga ao pai', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  // Conta só as linhas DOS CONECTORES. A primeira versão desta prova usava
  // `svg line` solto e contava as linhas dos ÍCONES junto — o "+" é feito de
  // dois <line>. Acusou 3 onde havia 1 conector.
  const linhasAntes = await pagina.locator('[data-teste="mapa-linhas"] path').count();

  await pagina.locator('[data-teste="mapa-filho"]').first().click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="mapa-no"]').length === 2, null, { timeout: 5000 });

  const linhasDepois = await pagina.locator('[data-teste="mapa-linhas"] path').count();
  assert.equal(linhasDepois, linhasAntes + 1, 'o nó nasceu solto, sem linha ligando ao pai');
  await ctx.close();
});

test('🔴 arrastar MOVE o card de verdade', { skip: semNavegador }, async () => {
  // O defeito clássico: ouvinte de movimento no próprio nó em vez da janela.
  // Soltar fora do card deixa ele grudado no cursor — aconteceu no carrossel
  // da home em 19/09 e só a tela pega.
  const { ctx, pagina } = await abrir();
  const no = nos(pagina).first();
  const antes = await no.boundingBox();

  await pagina.mouse.move(antes.x + 30, antes.y + 10);
  await pagina.mouse.down();
  await pagina.mouse.move(antes.x + 230, antes.y + 130, { steps: 12 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(200);

  const depois = await no.boundingBox();
  const andou = Math.hypot(depois.x - antes.x, depois.y - antes.y);
  assert.ok(andou > 120, `o card mal se moveu (${andou.toFixed(0)}px)`);
  await ctx.close();
});

test('🔴 soltar o arrasto FORA da tela não deixa o card grudado no cursor', { skip: semNavegador }, async () => {
  // O controle do teste acima: mover é fácil; PARAR de mover é o que quebra.
  const { ctx, pagina } = await abrir();
  const no = nos(pagina).first();
  const inicio = await no.boundingBox();

  await pagina.mouse.move(inicio.x + 30, inicio.y + 10);
  await pagina.mouse.down();
  await pagina.mouse.move(inicio.x + 150, inicio.y + 60, { steps: 6 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(150);

  const parado = await no.boundingBox();
  // Agora mexe o mouse SEM botão: o card não pode acompanhar.
  await pagina.mouse.move(parado.x + 300, parado.y + 200, { steps: 10 });
  await pagina.waitForTimeout(200);
  const depois = await no.boundingBox();

  const deslizou = Math.hypot(depois.x - parado.x, depois.y - parado.y);
  assert.ok(deslizou < 4, `o card continuou seguindo o cursor depois de soltar (${deslizou.toFixed(0)}px)`);
  await ctx.close();
});

test('escrever no nó guarda o texto', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await nos(pagina).first().locator('button').first().click();
  const campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor({ timeout: 5000 });
  await campo.fill('Fechar o leilão do PS5');
  await campo.press('Enter');
  await pagina.waitForTimeout(300);

  await nos(pagina).first().getByText('Fechar o leilão do PS5').waitFor({ timeout: 5000 });
  await ctx.close();
});

test('🔴 a raiz não tem botão de apagar — apagá-la levaria o mapa inteiro', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  assert.equal(
    await nos(pagina).first().locator('[data-teste="mapa-apagar"]').count(), 0,
    'a raiz ganhou botão de apagar',
  );
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// ✈ O RETORNO DO BOTÃO — 21/09/2026
//
// Até hoje o ✈ gravava e não dizia nada. Botão que não responde é botão que a
// pessoa clica três vezes achando que não pegou — e cada clique era uma linha
// na fila do Painel Corporativo. A trava contra duplicata mora no servidor; o
// que estas duas provas medem é a única parte que só a tela responde: que o
// resultado APARECE, nos dois casos.

/** Abre a banca já dizendo o que a rota `minhasDemandas` vai responder. */
async function abrirComResposta(resposta) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 } });
  const pagina = await ctx.newPage();
  await pagina.addInitScript((r) => {
    window.addEventListener('DOMContentLoaded', () => {
      if (window.__plataformaFalsa) window.__plataformaFalsa.respostas.minhasDemandas = () => r;
    });
  }, resposta);
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="mapa-no"]', { timeout: 20000 });
  return { ctx, pagina };
}

/** Escreve num nó e aperta o ✈ dele — mesmo caminho da prova de escrever.
 *  Desde 22/09 o ✈ abre os destinos; `destino` diz qual escolher. */
async function mandar(pagina, texto, destino = 'demandas') {
  const no = nos(pagina).first();
  await no.locator('button').first().click();
  const campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor({ timeout: 5000 });
  await campo.fill(texto);
  await campo.press('Enter');
  await no.getByText(texto).waitFor({ timeout: 5000 });
  await no.locator('[data-teste="mapa-demanda"]').first().click();
  await pagina.locator('[data-teste="mapa-destinos"]').waitFor({ timeout: 5000 });
  await pagina.locator(`[data-teste="mapa-destinos"] [data-destino="${destino}"]`).click();
}

/** O que a tela mandou para a rota `minhasDemandas`, na última chamada. */
const ultimoEnvio = (pagina) => pagina.evaluate(() => {
  const cs = window.__plataformaFalsa.chamadas.filter((c) => c.nome === 'minhasDemandas');
  return cs.length ? cs[cs.length - 1].corpo : null;
});

test('🔴 o ✈ diz que mandou — botão mudo vira clique repetido', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComResposta({ success: true, jaExistia: false });
  await mandar(pagina, 'ligar pro fornecedor');

  await pagina.waitForSelector('[data-teste="mapa-recado"]', { timeout: 5000 });
  assert.match(await pagina.locator('[data-teste="mapa-recado"]').innerText(), /mandado/i);
  assert.equal(await pagina.locator('[data-teste="mapa-erro"]').count(), 0, 'acusou erro num envio que deu certo');
  await ctx.close();
});

test('🔴 clicar de novo diz "já estava lá" — e NÃO acusa falha', { skip: semNavegador }, async () => {
  // O servidor responde 200 com `jaExistia`. Se a tela tratasse isso como
  // erro, o dono acharia que o primeiro clique não tinha pego — e procuraria
  // no Painel uma demanda que já está lá.
  const { ctx, pagina } = await abrirComResposta({ success: true, jaExistia: true });
  await mandar(pagina, 'ligar pro fornecedor');

  await pagina.waitForSelector('[data-teste="mapa-recado"]', { timeout: 5000 });
  assert.match(await pagina.locator('[data-teste="mapa-recado"]').innerText(), /já estava/i);
  assert.equal(await pagina.locator('[data-teste="mapa-erro"]').count(), 0, 'tratou "já existe" como falha');
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// ✈ O DESTINO DIRETO — 22/09/2026
//
// A outra metade do áudio de 19/09 (10h32): "quando eu esvazio a mente no mapa
// mental, eu jogo para o meu quadro, para a minha lista e para a minha
// jornada." O ✈ parava nas demandas, e o dono tinha que ir até a aba Demandas
// terminar o serviço. Quem cria a tarefa e o cartão é o servidor; o que estas
// provas medem é a única parte que só a tela responde — que o destino
// ESCOLHIDO é o destino ENVIADO, e que o dono vê o que aconteceu.

test('🔴 o ✈ abre os destinos em vez de decidir sozinho', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComResposta({ success: true, jaExistia: false });
  const no = nos(pagina).first();
  await no.locator('[data-teste="mapa-demanda"]').first().click();
  const destinos = pagina.locator('[data-teste="mapa-destinos"] button');
  assert.equal(await destinos.count(), 4, 'esperava os 4 destinos');
  assert.match(await destinos.first().innerText(), /demandas/i, '"só nas demandas" tem que vir primeiro');
  // nada foi enviado só por abrir a lista
  assert.equal(await ultimoEnvio(pagina), null, 'mandou para a rota só de abrir o seletor');
  await ctx.close();
});

test('🔴 o destino escolhido é o destino ENVIADO', { skip: semNavegador }, async () => {
  // se a tela mandasse sempre 'demandas', a escolha seria enfeite e o
  // pensamento continuaria parando no meio do caminho.
  for (const destino of ['dia', 'quadro', 'ambos']) {
    const { ctx, pagina } = await abrirComResposta({ success: true, jaExistia: false, destino });
    await mandar(pagina, 'fechar o caixa', destino);
    const corpo = await ultimoEnvio(pagina);
    assert.equal(corpo?.destino, destino, `o destino ${destino} não chegou na rota`);
    assert.equal(corpo?.titulo, 'fechar o caixa');
    await ctx.close();
  }
});

test('🔴 o recado diz o que aconteceu, destino a destino', { skip: semNavegador }, async () => {
  const esperado = { dia: /jornada/i, quadro: /quadro/i, ambos: /tarefa.*cart/i };
  for (const [destino, regex] of Object.entries(esperado)) {
    const { ctx, pagina } = await abrirComResposta({ success: true, jaExistia: false, destino });
    await mandar(pagina, 'fechar o caixa', destino);
    await pagina.waitForSelector('[data-teste="mapa-recado"]', { timeout: 5000 });
    assert.match(await pagina.locator('[data-teste="mapa-recado"]').innerText(), regex, `recado errado para ${destino}`);
    await ctx.close();
  }
});

test('🔴 demanda repetida MANDADA pro quadro não diz só "já estava lá"', { skip: semNavegador }, async () => {
  // o servidor manda a repetida pro destino escolhido. Se a tela insistisse em
  // "já estava na fila", o dono acharia que o clique não pegou e iria procurar
  // no quadro um cartão que ACABOU de ser criado.
  const { ctx, pagina } = await abrirComResposta({ success: true, jaExistia: true, destino: 'quadro', cardId: 'c1' });
  await mandar(pagina, 'ligar pro fornecedor', 'quadro');
  await pagina.waitForSelector('[data-teste="mapa-recado"]', { timeout: 5000 });
  assert.match(await pagina.locator('[data-teste="mapa-recado"]').innerText(), /quadro/i);
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// 🌱 "ABRIR NO MAPA" — 22/09/2026
//
// A frase que faltava do áudio de 19/09 (10h32): "dali eu transformo em ou
// mapa mental, PARA ABRIR o mapa mental, ou no quadro". A régua do
// `semearNoMapa` tem 7 provas no Node; isto mede o que só a tela responde —
// que a demanda CHEGA no mapa depois que ele carregou, aparece destacada, e
// que voltar à aba não planta o mesmo nó duas vezes.

/** Abre a banca com uma semente já escolhida — como se viesse da aba Demandas. */
async function abrirComSemente(texto) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 } });
  const pagina = await ctx.newPage();
  await pagina.addInitScript((t) => { window.__semente = t; }, texto);
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-teste="mapa-no"]', { timeout: 20000 });
  return { ctx, pagina };
}

test('🔴 a demanda vira nó do mapa, pendurada na raiz', { skip: semNavegador }, async () => {
  // semear antes do mapa carregar penduraria o nó numa raiz que ainda não
  // chegou — ele nasceria órfão, e órfão some quando alguém apaga um ramo.
  const { ctx, pagina } = await abrirComSemente('ligar pro fornecedor');
  await pagina.locator('[data-teste="mapa-no"]', { hasText: 'ligar pro fornecedor' }).waitFor({ timeout: 8000 });
  assert.equal(await nos(pagina).count(), 2, 'esperava a raiz mais o nó semeado');
  // a linha pai→filho é a prova de que ele está pendurado, não solto
  assert.equal(await pagina.locator('[data-teste="mapa-linhas"] path').count(), 1);
  await ctx.close();
});

test('🔴 o nó semeado chega DESTACADO — senão o dono não acha', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComSemente('fechar o caixa');
  const destacado = pagina.locator('[data-teste="mapa-no"][data-destacado="sim"]');
  await destacado.waitFor({ timeout: 8000 });
  assert.match(await destacado.innerText(), /fechar o caixa/);
  assert.equal(await destacado.count(), 1, 'destacou mais de um nó');
  await ctx.close();
});

test('🔴 semear NÃO planta o mesmo nó duas vezes', { skip: semNavegador }, async () => {
  // o botão continua na caixa de demandas: voltar à aba e clicar de novo é
  // gesto esperado. Duplicar encheria o mapa de cópias do mesmo pensamento.
  const { ctx, pagina } = await abrirComSemente('comprar etiqueta');
  await pagina.locator('[data-teste="mapa-no"]', { hasText: 'comprar etiqueta' }).waitFor({ timeout: 8000 });
  const antes = await nos(pagina).count();
  assert.equal(antes, 2, 'a primeira semeadura não plantou nada');

  // 🔴 SEM recarregar: a banca não guarda mapa nenhum, então um reload traria
  // a raiz limpa e a contagem daria igual sozinha — a prova passaria sem
  // medir coisa alguma. Aqui a mesma semente volta na tela que já tem o nó.
  await pagina.evaluate(() => window.__semear('comprar etiqueta'));
  await pagina.waitForTimeout(400);
  assert.equal(await nos(pagina).count(), antes, 'plantou uma segunda cópia');

  // e variando acento e caixa, que é o mesmo pensamento
  await pagina.evaluate(() => window.__semear('COMPRAR ETIQUETA'));
  await pagina.waitForTimeout(400);
  assert.equal(await nos(pagina).count(), antes, 'caixa diferente virou nó novo');
  await ctx.close();
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 "BUGADO E MAL FEITO" — a arrumação de 22/09/2026
//
// O dono reclamou; eu fui MEDIR no navegador em vez de supor. Tudo aqui
// embaixo prova um defeito que eu vi com número, e não um que eu imaginei.
// Por isso são provas de navegador e não de régua: os três piores eram de
// geometria da tela, invisíveis para o Node.
// ═══════════════════════════════════════════════════════════════════════════

/** O último mapa que a tela mandou salvar — a verdade sobre quem é pai de quem.
 *
 * 🔴 22/09 — as duas provas de arrasto olhavam a POSIÇÃO do card, e por isso
 * passavam verdes com o religar desligado: o card encaixava no lugar certo sem
 * ter trocado de pai. Posição é enfeite; `pai` é o dado. Descoberto na rodada
 * de mutação, não na suíte verde. */
const mapaSalvo = (pagina) => pagina.evaluate(() => {
  const c = window.__plataformaFalsa.chamadas.filter((x) => x.nome === 'meuMapaMental').pop();
  return c?.corpo?.nos || [];
});
const paiDe = (mapa, texto) => {
  const no = mapa.find((n) => n.texto === texto);
  const pai = no && mapa.find((n) => n.id === no.pai);
  return pai ? pai.texto : null;
};

/** Cria um filho do card indicado, escreve e sai da edição. */
async function pendurar(pagina, alvo, texto) {
  await alvo.locator('[data-teste="mapa-filho"]').click();
  const campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor({ timeout: 5000 });
  await campo.fill(texto);
  await pagina.locator('[data-teste="mapa-tela"]').click({ position: { x: 4, y: 4 } });
  await pagina.waitForTimeout(150);
}

test('🔴 as linhas continuam desenhadas quando o mapa passa da tela', { skip: semNavegador }, async () => {
  // MEDIDO ANTES DO CONSERTO: corrente de 5 níveis = 1352px de conteúdo num
  // desenho de 1051px, uma linha inteira fora e invisível. Os cards rolavam
  // para dentro da vista SEM LIGAÇÃO — parecia dado perdido, era erro de
  // desenho. O desenho agora tem o tamanho do mapa, não o da janela.
  const { ctx, pagina } = await abrir();
  for (let i = 0; i < 5; i += 1) await pendurar(pagina, nos(pagina).last(), `nivel ${i + 1}`);

  const m = await pagina.evaluate(() => {
    const svg = document.querySelector('[data-teste="mapa-linhas"]');
    const janela = document.querySelector('[data-teste="mapa-tela"]');
    const largura = Number(svg.getAttribute('width'));
    const fora = [...svg.querySelectorAll('path')].filter((p) => {
      const b = p.getBBox();
      return b.x + b.width > largura + 1 || b.y + b.height > Number(svg.getAttribute('height')) + 1;
    }).length;
    return { linhas: svg.querySelectorAll('path').length, largura, janela: janela.clientWidth, fora };
  });
  assert.equal(m.linhas, 5, 'faltou linha');
  assert.ok(m.largura > m.janela, 'o desenho voltou a ter o tamanho da janela');
  assert.equal(m.fora, 0, 'tem linha fora da área desenhada — ela some na tela');
  await ctx.close();
});

test('🔴 anotação longa aparece inteira — o card cresce', { skip: semNavegador }, async () => {
  // MEDIDO ANTES: 488px de texto espremidos em 150px visíveis, o resto sumia.
  // O mapa existe pra despejar frase, não palavra solta.
  const { ctx, pagina } = await abrir();
  await pendurar(pagina, nos(pagina).first(), 'comprar etiqueta térmica para a impressora nova do galpão e conferir o estoque');
  const m = await pagina.evaluate(() => {
    const n = [...document.querySelectorAll('[data-teste="mapa-no"]')].find((x) => x.innerText.includes('comprar'));
    const b = n.querySelector('button');
    return { altura: Math.round(n.getBoundingClientRect().height), cortado: b.scrollWidth > b.clientWidth + 1, escondido: b.scrollHeight - b.clientHeight };
  });
  assert.equal(m.cortado, false, 'o texto voltou a ser cortado na horizontal');
  assert.equal(m.escondido, 0, 'sobrou texto escondido dentro do card');
  assert.ok(m.altura > 60, `o card não cresceu com o texto (${m.altura}px)`);
  await ctx.close();
});

test('🔴 a linha bate no MEIO do card, mesmo num card alto', { skip: semNavegador }, async () => {
  // MEDIDO ANTES: 5px acima do meio em toda linha, porque a conta supunha 44
  // de altura num card de 52.
  const { ctx, pagina } = await abrir();
  await pendurar(pagina, nos(pagina).first(), 'comprar etiqueta térmica para a impressora nova do galpão');
  const erro = await pagina.evaluate(() => {
    const d = document.querySelector('[data-teste="mapa-linhas"] path').getAttribute('d');
    const y1 = Number(d.split(' ')[2]);
    const camada = document.querySelector('[data-teste="mapa-conteudo"]').getBoundingClientRect();
    const pai = document.querySelectorAll('[data-teste="mapa-no"]')[0].getBoundingClientRect();
    return Math.round(pai.top - camada.top + pai.height / 2 - y1);
  });
  assert.ok(Math.abs(erro) <= 1, `a linha está ${erro}px fora do meio do card`);
  await ctx.close();
});

test('🔴 arrastar um item PARA CIMA de outro repende — e mostra onde vai cair', { skip: semNavegador }, async () => {
  // `moverNo` e `podeVirarFilho` existiam, com prova, e a tela NUNCA chamava:
  // arrastar só mudava a posição e a linha continuava apontando pro pai
  // antigo. Reorganizar o pensamento é metade do que um mapa mental faz.
  const { ctx, pagina } = await abrir();
  await pendurar(pagina, nos(pagina).first(), 'galho A');
  await pendurar(pagina, nos(pagina).first(), 'galho B');

  const b = await nos(pagina).nth(2).boundingBox();
  const a = await nos(pagina).nth(1).boundingBox();
  await pagina.mouse.move(b.x + 80, b.y + 12);
  await pagina.mouse.down();
  await pagina.mouse.move(a.x + 80, a.y + 20, { steps: 14 });
  await pagina.waitForTimeout(150);
  const realce = await pagina.locator('[data-teste="mapa-no"][data-alvo="sim"]').innerText();
  assert.match(realce, /galho A/, 'não mostrou em qual card o item vai cair');
  await pagina.mouse.up();
  await pagina.waitForTimeout(500);

  // o que vale é o PAI gravado, não onde o card parou na tela
  const mapa = await mapaSalvo(pagina);
  assert.equal(paiDe(mapa, 'galho B'), 'galho A', 'o item não trocou de pai — só mudou de lugar');
  assert.equal(paiDe(mapa, 'galho A'), 'Minha semana', 'o outro galho mudou de pai sem motivo');
  assert.ok(mapa.find((n) => n.texto === 'galho B'), 'o item perdeu o texto ao ser rependurado');
  await ctx.close();
});

test('🔴 arrastar NÃO abre o item para edição', { skip: semNavegador }, async () => {
  // defeito antigo: soltar o card disparava um clique no texto e ele abria
  // para edição sozinho, toda vez que alguém arrastava.
  const { ctx, pagina } = await abrir();
  await pendurar(pagina, nos(pagina).first(), 'galho A');
  const c = await nos(pagina).nth(1).boundingBox();
  await pagina.mouse.move(c.x + 80, c.y + 12);
  await pagina.mouse.down();
  await pagina.mouse.move(c.x + 200, c.y + 140, { steps: 12 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(300);
  assert.equal(await pagina.locator('[data-teste="mapa-input"]').count(), 0, 'abriu a edição sozinho depois do arrasto');
  await ctx.close();
});

test('🔴 o item não vira filho da própria galhada', { skip: semNavegador }, async () => {
  // a volta fechada faz quem percorrer a árvore rodar para sempre: trava a aba.
  const { ctx, pagina } = await abrir();
  await pendurar(pagina, nos(pagina).first(), 'pai');
  await pendurar(pagina, nos(pagina).nth(1), 'filho');
  const pai = await nos(pagina).nth(1).boundingBox();
  const filho = await nos(pagina).nth(2).boundingBox();
  await pagina.mouse.move(pai.x + 80, pai.y + 12);
  await pagina.mouse.down();
  await pagina.mouse.move(filho.x + 80, filho.y + 20, { steps: 14 });
  await pagina.waitForTimeout(150);
  assert.equal(await pagina.locator('[data-teste="mapa-no"][data-alvo="sim"]').count(), 0,
    'ofereceu o próprio filho como novo pai');
  await pagina.mouse.up();
  await pagina.waitForTimeout(500);

  // e, acima de tudo, o parentesco não pode ter virado uma volta fechada
  const mapa = await mapaSalvo(pagina);
  assert.equal(paiDe(mapa, 'pai'), 'Minha semana', 'o pai virou filho do próprio filho — isso é a volta que trava a aba');
  assert.equal(paiDe(mapa, 'filho'), 'pai', 'o filho perdeu o pai no caminho');
  await ctx.close();
});

test('🔴 Enter põe o próximo item, Tab pendura embaixo', { skip: semNavegador }, async () => {
  // o "tum, tum, tum" do áudio. Com a mão no mouse, card a card, não acontece.
  const { ctx, pagina } = await abrir();
  await nos(pagina).first().locator('[data-teste="mapa-filho"]').click();
  let campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor(); await campo.fill('um'); await pagina.keyboard.press('Enter');
  await pagina.waitForTimeout(200);
  campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor(); await campo.fill('dois'); await pagina.keyboard.press('Tab');
  await pagina.waitForTimeout(200);
  campo = pagina.locator('[data-teste="mapa-input"]');
  await campo.waitFor(); await campo.fill('tres');
  await pagina.locator('[data-teste="mapa-tela"]').click({ position: { x: 4, y: 4 } });
  await pagina.waitForTimeout(250);

  const fim = await pagina.evaluate(() => [...document.querySelectorAll('[data-teste="mapa-no"]')]
    .map((n) => ({ t: n.innerText.split('\n')[0], x: parseInt(n.style.left, 10) })));
  const um = fim.find((n) => n.t === 'um');
  const dois = fim.find((n) => n.t === 'dois');
  const tres = fim.find((n) => n.t === 'tres');
  assert.ok(um && dois && tres, `o texto se perdeu no encadeamento: ${JSON.stringify(fim)}`);
  assert.equal(dois.x, um.x, 'o Enter desceu um nível — devia criar IRMÃO');
  assert.ok(tres.x > dois.x, 'o Tab não pendurou embaixo');
  await ctx.close();
});

test('🔴 item criado e deixado em branco some, em vez de virar card fantasma', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  const antes = await nos(pagina).count();
  await nos(pagina).first().locator('[data-teste="mapa-filho"]').click();
  await pagina.locator('[data-teste="mapa-input"]').waitFor();
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(300);
  assert.equal(await nos(pagina).count(), antes, 'sobrou um card "escrever…" para sempre');
  await ctx.close();
});

test('🧹 arrumar põe tudo numa árvore sem card por cima de card', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  await pendurar(pagina, nos(pagina).first(), 'um');
  await pendurar(pagina, nos(pagina).first(), 'dois');
  await pendurar(pagina, nos(pagina).nth(1), 'um.a');
  // embaralha: joga todo mundo pro mesmo canto
  const alvos = await nos(pagina).count();
  for (let i = 1; i < alvos; i += 1) {
    const c = await nos(pagina).nth(i).boundingBox();
    await pagina.mouse.move(c.x + 80, c.y + 12);
    await pagina.mouse.down();
    await pagina.mouse.move(c.x + 5, c.y + 5, { steps: 6 });
    await pagina.mouse.up();
    await pagina.waitForTimeout(120);
  }
  await pagina.locator('[data-teste="mapa-arrumar"]').click();
  await pagina.waitForTimeout(500);
  const cobre = await pagina.evaluate(() => {
    const ns = [...document.querySelectorAll('[data-teste="mapa-no"]')];
    let n = 0;
    for (let i = 0; i < ns.length; i += 1) {
      for (let j = i + 1; j < ns.length; j += 1) {
        const a = ns[i].getBoundingClientRect(); const b = ns[j].getBoundingClientRect();
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) n += 1;
      }
    }
    return n;
  });
  assert.equal(cobre, 0, 'ficou card por cima de card depois de arrumar');
  await ctx.close();
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 LIGAR UM NO OUTRO + 🖐️ ARRASTO SUAVE (22/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
// Ávilla: "só não é suave e nao interliga, é preciso opção de ligar um no
// outro no mapa mental."

/**
 * Monta raiz + dois filhos (a árvore mínima pra provar ligação entre irmãos).
 *
 * ⚠️ NÃO usa Escape pra fechar a edição: num nó RECÉM-CRIADO, Escape apaga o nó
 * (é a regra de não deixar card "escrever…" para sempre). Digitar e apertar
 * Escape apagaria o que acabou de ser escrito. O jeito de gravar é sair do
 * campo — o `onBlur` é que confirma o texto.
 */
async function abrirComTresNos() {
  const { ctx, pagina } = await abrir();
  for (const texto of ['Estoque atrasado', 'Reclamação do cliente']) {
    await pagina.locator('[data-teste="mapa-filho"]').first().click();
    await pagina.waitForSelector('[data-teste="mapa-input"]', { timeout: 5000 });
    await pagina.keyboard.type(texto);
    await pagina.locator('[data-teste="mapa-input"]').evaluate((el) => el.blur());
    await pagina.waitForTimeout(250);
  }
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="mapa-no"]').length === 3, null, { timeout: 8000 });
  return { ctx, pagina };
}

const livres = (p) => p.locator('[data-teste="mapa-ligacao-livre"]');
const recado = (p) => p.locator('[data-teste="mapa-recado"]').textContent();

test('🔴 🔗 dois cliques ligam dois itens de galhos diferentes', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComTresNos();
  try {
    assert.equal(await livres(pagina).count(), 0, 'nasceu com ligação livre do nada');

    const botoes = pagina.locator('[data-teste="mapa-ligar"]');
    await botoes.nth(1).click();
    assert.match(await recado(pagina), /clique no .* do outro item/i,
      'o primeiro clique não explicou o que fazer — a pessoa fica sem saber que começou');

    await botoes.nth(2).click();
    await pagina.waitForTimeout(300);

    assert.equal(await livres(pagina).count(), 1, 'a linha da ligação não apareceu');
    assert.match(await recado(pagina), /Ligados/);
  } finally { await ctx.close(); }
});

test('🔴 🔗 o mesmo gesto DESLIGA — ida e volta no mesmo botão', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComTresNos();
  try {
    const botoes = pagina.locator('[data-teste="mapa-ligar"]');
    await botoes.nth(1).click();
    await botoes.nth(2).click();
    await pagina.waitForTimeout(300);
    assert.equal(await livres(pagina).count(), 1);

    await botoes.nth(1).click();
    await botoes.nth(2).click();
    await pagina.waitForTimeout(300);
    assert.equal(await livres(pagina).count(), 0, 'não desfez: desfazer exigiria um terceiro botão');
    assert.match(await recado(pagina), /desfeita/i);
  } finally { await ctx.close(); }
});

test('🔗 ligar pai com filho é RECUSADO com motivo — e não em silêncio', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComTresNos();
  try {
    const botoes = pagina.locator('[data-teste="mapa-ligar"]');
    await botoes.nth(0).click();  // a raiz
    await botoes.nth(1).click();  // um filho dela
    await pagina.waitForTimeout(300);

    assert.equal(await livres(pagina).count(), 0, 'desenhou uma segunda linha em cima da linha da árvore');
    assert.match(await recado(pagina), /árvore/i,
      'recusou calado — a pessoa clica de novo achando que o botão não pegou');
  } finally { await ctx.close(); }
});

test('🔗 clicar duas vezes no MESMO item desiste, sem ligar nada', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrirComTresNos();
  try {
    const botoes = pagina.locator('[data-teste="mapa-ligar"]');
    await botoes.nth(1).click();
    await botoes.nth(1).click();
    await pagina.waitForTimeout(250);
    assert.equal(await livres(pagina).count(), 0);
    // 🔬 a rodada de mutação mostrou que tirar o ramo de "desistir" NÃO mudava
    // o estado: o clique no mesmo nó caía em `podeLigar`, que também recusa e
    // também limpa o modo. O que muda é o RECADO — e isso não é detalhe: sem o
    // ramo, desistir acusa "um item não se liga nele mesmo", como se a pessoa
    // tivesse feito besteira. Desistir não é erro, e a tela não pode dizer que é.
    const aoDesistir = await pagina.locator('[data-teste="mapa-recado"]').count()
      ? await recado(pagina) : '';
    assert.doesNotMatch(aoDesistir, /não se liga nele mesmo/i,
      'desistir foi tratado como erro — o ramo de desistência sumiu');
    // e o próximo par ainda funciona: desistir não pode deixar o modo preso
    await botoes.nth(1).click();
    await botoes.nth(2).click();
    await pagina.waitForTimeout(300);
    assert.equal(await livres(pagina).count(), 1, 'o modo ficou preso depois de desistir');
  } finally { await ctx.close(); }
});

test('🔴 🖐️ o arrasto acompanha o dedo até o fim — sem voltar ao soltar', { skip: semNavegador }, async () => {
  // O arrasto passou a aplicar a posição uma vez por quadro (rAF) em vez de a
  // cada evento. O risco introduzido é PERDER o último trecho: se o quadro
  // pendente for descartado no `pointerup`, o card para onde estava no
  // penúltimo quadro e "volta" alguns pixels. Isto mede exatamente isso.
  const { ctx, pagina } = await abrir();
  try {
    const no = nos(pagina).first();
    const antes = await no.boundingBox();
    await pagina.mouse.move(antes.x + 30, antes.y + 10);
    await pagina.mouse.down();
    await pagina.mouse.move(antes.x + 230, antes.y + 110, { steps: 20 });
    await pagina.waitForTimeout(120); // deixa o rAF alcançar: daqui em diante nada está pendente

    // 🔬 AQUI ESTÁ O PULO DO GATO, e ele veio da rodada de mutação: com
    // `mouse.move(..., {steps})` o Playwright espaça os eventos o bastante pro
    // quadro sempre alcançar — então descartar o último quadro no `pointerup`
    // NÃO quebrava esta prova, e ela dizia medir algo que não media.
    // Agora o último movimento e o soltar são disparados no MESMO tique de
    // JavaScript: nenhum quadro de animação pode rodar entre os dois, então
    // existe garantidamente um quadro pendente na hora de largar. Se ele for
    // descartado, o card para no penúltimo — que é o defeito.
    const alvo = { x: antes.x + 330, y: antes.y + 210 };
    await pagina.evaluate(({ x, y }) => {
      const comum = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y };
      window.dispatchEvent(new PointerEvent('pointermove', comum));
      window.dispatchEvent(new PointerEvent('pointerup', comum));
    }, alvo);
    await pagina.waitForTimeout(300);

    const depois = await no.boundingBox();
    assert.ok(Math.hypot(depois.x - antes.x, depois.y - antes.y) > 250,
      `o card não acompanhou o movimento inteiro (${Math.round(Math.hypot(depois.x - antes.x, depois.y - antes.y))}px)`);
    // o card tem que estar onde o dedo largou, não onde estava um quadro antes
    assert.ok(Math.abs((depois.x + 30) - alvo.x) < 14 && Math.abs((depois.y + 10) - alvo.y) < 14,
      `o card VOLTOU ao soltar — parou em (${Math.round(depois.x + 30)}, ${Math.round(depois.y + 10)}) e o dedo largou em (${alvo.x}, ${alvo.y}); o último quadro do arrasto se perdeu`);
  } finally { await ctx.close(); }
});
