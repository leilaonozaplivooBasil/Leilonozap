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
  const linhasAntes = await pagina.locator('[data-teste="mapa-linhas"] line').count();

  await pagina.locator('[data-teste="mapa-filho"]').first().click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="mapa-no"]').length === 2, null, { timeout: 5000 });

  const linhasDepois = await pagina.locator('[data-teste="mapa-linhas"] line').count();
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
