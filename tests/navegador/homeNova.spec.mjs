/**
 * 🏠 A HOME NOVA, NUM CHROMIUM DE VERDADE.
 *
 * As regras já têm prova sem navegador (tests/homeNova.test.mjs). Isto aqui é
 * outra pergunta: o que a PESSOA vê na tela. Três coisas que só o navegador
 * responde, e que são exatamente as que o mock trazia como exemplo:
 *
 *   1. a faixa mostra o número do banco — e nenhum "100 mil" em lugar nenhum;
 *   2. o mesmo leilão não aparece nos dois carrosséis (o olho vê a repetição,
 *      o teste da lib só vê o array);
 *   3. o telefone do rodapé é o oficial, não o "(21) 99999-9999" de exemplo
 *      que já chegou a abrir conversa na cara de um cliente;
 *   4. o aviso "leilão não oficial" está VISÍVEL, não só presente no DOM.
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
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-home-nova');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
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
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'home-nova.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/home-nova.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

/** Abre a home montada e espera as seções que dependem do banco chegarem. */
async function abrirHome(largura = 1440) {
  await garantirNavegador();
  const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } });
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="faixa-numeros"]', { timeout: 15000 });
  await pagina.waitForSelector('[data-teste="carrossel-semana"]', { timeout: 15000 });
  return pagina;
}

test('a faixa mostra o número do banco — e nenhum número de enfeite na página', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();

  const ladrilhos = await pagina.$$eval('[data-teste="numero-da-casa"]', (ns) => ns.map((n) => n.textContent.trim()));
  assert.ok(ladrilhos.some((t) => t.startsWith('56')), `faixa sem os 56 leilões: ${ladrilhos.join(' | ')}`);
  assert.ok(ladrilhos.some((t) => t.startsWith('235')), `faixa sem os 235 produtos: ${ladrilhos.join(' | ')}`);
  assert.ok(ladrilhos.some((t) => t.startsWith('2.853')), `faixa sem o acervo: ${ladrilhos.join(' | ')}`);

  // 🔴 A PÁGINA INTEIRA, não só a faixa: o mock trazia "+100 mil usuários
  // ativos" e "+10 mil produtos leiloados". Nenhuma das duas formas pode
  // sobreviver em canto nenhum da tela.
  const textoDaPagina = await pagina.evaluate(() => document.body.innerText);
  assert.ok(!/100\s*mil/i.test(textoDaPagina), 'sobrou "100 mil" na tela');
  assert.ok(!/10\s*mil/i.test(textoDaPagina), 'sobrou "10 mil" na tela');

  await pagina.close();
});

test('o mesmo leilão não aparece nos dois carrosséis', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();

  const titulos = (seletor) => pagina.$$eval(
    `[data-teste="${seletor}"] [data-teste="cartao-de-leilao"] h3`,
    (ns) => ns.map((n) => n.textContent.trim()),
  );
  const destaque = await titulos('carrossel-destaque');
  const semana = await titulos('carrossel-semana');

  assert.ok(destaque.length > 0, 'carrossel de destaque vazio');
  assert.ok(semana.length > 0, 'carrossel da semana vazio');

  const repetidos = destaque.filter((t) => semana.includes(t));
  assert.deepEqual(repetidos, [], `apareceram nos dois carrosséis: ${repetidos.join(' | ')}`);

  await pagina.close();
});

test('o rodapé mostra o telefone oficial — nunca o (21) 99999-9999 de exemplo', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();

  const telefone = await pagina.$eval('[data-teste="rodape-whatsapp"]', (n) => n.textContent.trim());
  assert.equal(telefone, '(21) 98407-2064');

  const cnpj = await pagina.$eval('[data-teste="rodape-cnpj"]', (n) => n.textContent.trim());
  assert.match(cnpj, /51\.544\.091\/0001-67/);

  const textoDaPagina = await pagina.evaluate(() => document.body.innerText);
  assert.ok(!/99999-9999/.test(textoDaPagina), 'o número de exemplo voltou pra tela');
  assert.ok(!/00\.000\.000\/0001-00/.test(textoDaPagina), 'o CNPJ de exemplo voltou pra tela');

  await pagina.close();
});

test('o aviso "leilão não oficial" está VISÍVEL no hero, não só no DOM', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();

  const aviso = pagina.locator('[data-teste="aviso-nao-oficial"]');
  assert.equal(await aviso.count(), 1, 'o aviso sumiu do hero');
  assert.ok(await aviso.isVisible(), 'o aviso existe mas não aparece');

  // 🔴 Visível não basta: display:none o teste acima pega, mas texto branco
  // sobre fundo branco (ou tamanho zero) passaria. Mede a caixa e a cor.
  const caixa = await aviso.boundingBox();
  assert.ok(caixa && caixa.height >= 10 && caixa.width >= 80, `caixa do aviso pequena demais: ${JSON.stringify(caixa)}`);

  // ⚠️ Ler só `opacity` NÃO serve: as classes do projeto desbotam pelo ALFA da
  // cor (`text-white/20` vira rgba(255,255,255,0.2) com opacity 1). Por isso a
  // conta mistura o texto com o fundo do hero e mede o que sobra de contraste.
  const legivel = await aviso.evaluate((n) => {
    const estilo = getComputedStyle(n);
    const [r, g, b, a = 1] = estilo.color.match(/[\d.]+/g).map(Number);
    const alfa = a * Number(estilo.opacity);
    const FUNDO = 16; // o hero é quase preto (#0A1410 ≈ 16 de média)
    const misturado = ((r + g + b) / 3) * alfa + FUNDO * (1 - alfa);
    return { cor: estilo.color, alfa, misturado };
  });
  assert.ok(legivel.alfa > 0.3, `aviso quase transparente: ${legivel.cor}`);
  assert.ok(legivel.misturado > 90, `aviso sem contraste contra o hero: ${legivel.cor}`);

  await pagina.close();
});

test('no celular a home não vaza pro lado', { skip: semNavegador }, async () => {
  const pagina = await abrirHome(390);
  const vazou = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(vazou <= 1, `a página rola ${vazou}px pro lado no celular`);
  await pagina.close();
});

test('na tela, o "Em destaque" começa pelos itens âncora — e mostra o preço da loja', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();

  const titulos = await pagina.$$eval(
    '[data-teste="carrossel-destaque"] [data-teste="cartao-de-leilao"] h3',
    (ns) => ns.map((n) => n.textContent.trim()),
  );
  assert.ok(titulos.length >= 2, 'destaque com menos de dois cards');
  // Harley (R$ 3.300 na loja) e patinete (R$ 997) têm que vir antes dos
  // relógios de R$ 118 — o herói (PS5) sai da lista pra não repetir.
  assert.match(titulos[0], /Harley/i, `o primeiro devia ser a Harley, veio: ${titulos[0]}`);
  assert.match(titulos[1], /Patinete/i, `o segundo devia ser o patinete, veio: ${titulos[1]}`);

  const naLoja = await pagina.$$eval(
    '[data-teste="carrossel-destaque"] [data-teste="preco-na-loja"]',
    (ns) => ns.map((n) => n.textContent.trim()),
  );
  assert.ok(naLoja.some((t) => /3\.300,00/.test(t)), `faltou o preço de loja da Harley: ${naLoja.join(' | ')}`);

  // 🔴 e o herói não pode aparecer também no carrossel
  assert.ok(!titulos.some((t) => /Playstation/i.test(t)), 'o leilão do hero repetiu no carrossel');

  await pagina.close();
});

test('🔴 com prefers-reduced-motion, NENHUMA seção nasce invisível', { skip: semNavegador }, async () => {
  // O print de página inteira acusou o defeito: as seções animadas com
  // `initial={{ opacity: 0 }}` + `whileInView` ficam em opacidade ZERO até o
  // observer disparar. Quem pede menos movimento no sistema — ou qualquer
  // navegador em que o observer não dispare — ficava olhando bloco preto.
  await garantirNavegador();
  const pagina = await navegador.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="carrossel-semana"]', { timeout: 15000 });
  await pagina.waitForTimeout(400);

  // ⚠️ MEDIR A <section> NÃO SERVE, e a primeira versão deste teste caiu nessa:
  // o nó animado é a <motion.div> DENTRO da seção, então a opacidade da seção é
  // sempre 1 e o teste passava até com a proteção removida. A medição começa de
  // um elemento de CONTEÚDO e sobe até o body — esse caminho passa pela div
  // animada.
  const secoes = [
    ['explore-categoria', '[data-teste="card-categoria"]'],
    ['faixa-numeros', '[data-teste="numero-da-casa"]'],
    ['carrossel-destaque', '[data-teste="cartao-de-leilao"]'],
    ['carrossel-semana', '[data-teste="cartao-de-leilao"]'],
  ];
  for (const [secao, dentro] of secoes) {
    const opacidade = await pagina.$eval(`[data-teste="${secao}"] ${dentro}`, (n) => {
      let atual = n; let total = 1;
      while (atual && atual !== document.body) {
        total *= Number(getComputedStyle(atual).opacity);
        atual = atual.parentElement;
      }
      return total;
    });
    assert.ok(opacidade > 0.9, `"${secao}" nasceu com opacidade ${opacidade.toFixed(2)} — some da tela`);
  }
  await pagina.close();
});

// ── O que o dono pediu em 19/09: "mais interativo" ──────────────────────────
//
// Três interações que faltavam, e que só o navegador prova: a seta que sabe que
// chegou ao fim, o arrasto com o mouse, e o relógio que esquenta quando falta
// pouco. As duas primeiras são de comportamento; a terceira é de informação.

test('🔴 a seta "anterior" nasce desligada, e a "próximo" desliga no fim do trilho', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();
  const anterior = pagina.locator('[data-teste="carrossel-destaque"] [data-teste="seta-anterior"]');
  const proximo = pagina.locator('[data-teste="carrossel-destaque"] [data-teste="seta-proximo"]');

  assert.equal(await anterior.isDisabled(), true, 'no começo não há para onde voltar');
  assert.equal(await proximo.isDisabled(), false, 'e há para onde ir');

  // vai até o fim do trilho pelo próprio botão, como a pessoa faria
  for (let i = 0; i < 12; i += 1) {
    if (await proximo.isDisabled()) break;
    await proximo.click();
    await pagina.waitForTimeout(420);
  }

  assert.equal(await proximo.isDisabled(), true, 'no fim, o "próximo" não pode continuar aceso');
  assert.equal(await anterior.isDisabled(), false, 'e o "anterior" acende');
  await pagina.close();
});

test('🖱️ arrastar com o mouse move o trilho, e o clique parado continua chegando no card', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();
  const trilho = pagina.locator('[data-teste="carrossel-destaque"] [role="group"]');
  await trilho.scrollIntoViewIfNeeded();

  // 🔴 A BANCA MONTA A HOME SOLTA, sem <Routes>: clicar num <Link> aqui NÃO muda
  // a URL nem troca de tela. Conferir `pagina.url()` seria prova decorativa —
  // passa igual com a proteção removida (medido: a mutação não derrubou nada).
  // Então a prova conta os cliques que CHEGAM no link do card.
  await pagina.evaluate(() => {
    window.__cliquesNoCard = 0;
    document.querySelectorAll('[data-teste="cartao-de-leilao"] a').forEach((a) => {
      a.addEventListener('click', (e) => { window.__cliquesNoCard += 1; e.preventDefault(); });
    });
  });

  // A ORDEM IMPORTA: os passos com o card vêm ANTES do arrasto longo. Depois de
  // rolar, a primeira carta sai de vista e o clique naquela coordenada cai fora
  // dela — foi o que derrubou a primeira versão desta prova.

  // 1) CONTROLE: um clique parado PRECISA chegar no card. Sem isto, o passo 2
  //    passaria por não existir clique nenhum, e não por haver proteção.
  const cartao = pagina.locator('[data-teste="cartao-de-leilao"]').first();
  const c1 = await cartao.boundingBox();
  await pagina.mouse.move(c1.x + c1.width / 2, c1.y + 30);
  await pagina.mouse.down();
  await pagina.mouse.up();
  await pagina.waitForTimeout(150);
  assert.equal(
    await pagina.evaluate(() => window.__cliquesNoCard), 1,
    'clique parado tem que chegar no card — senão esta prova não sabe medir nada',
  );

  // 2) 🚫 A ASSERÇÃO "arrastar não abre o leilão" NÃO MORA AQUI, e isso é uma
  //    decisão, não um esquecimento.
  //
  //    Eu escrevi essa prova, ela ficou verde, e aí ela passou também com as
  //    DUAS proteções removidas — sinal de que media o próprio silêncio.
  //    Medido no Chromium da banca, com o DOM parado (trilho em scrollLeft 0,
  //    arrasto para o lado que não rola):
  //
  //      clique parado ......... dispara click no <img> dentro do <a>
  //      arrasto de 56px ....... NENHUM evento de clique
  //      arrasto de 6px ........ NENHUM evento de clique
  //
  //    O próprio navegador já não transforma arrasto em clique. A trava
  //    `engolirCliqueDeArrasto` continua no componente como cinto e suspensório
  //    (outros navegadores não prometem o mesmo), mas AQUI ela é inverificável:
  //    uma asserção que não pode falhar é ruído verde, e ruído verde é pior que
  //    ausência — ensina a confiar no que não foi medido.
  //
  //    O passo 1 acima, esse sim, prova algo real: foi ele que pegou o
  //    `setPointerCapture` que eu havia colocado no trilho e que redirecionava
  //    TODO clique para ele, deixando os cards não-clicáveis.

  // 3) arrasto longo: o trilho tem que andar de verdade
  const caixa = await trilho.boundingBox();
  const y = caixa.y + caixa.height / 2;
  const antes = await trilho.evaluate((el) => el.scrollLeft);
  await pagina.mouse.move(caixa.x + caixa.width - 60, y);
  await pagina.mouse.down();
  for (let x = 40; x <= 320; x += 40) await pagina.mouse.move(caixa.x + caixa.width - 60 - x, y);
  await pagina.mouse.up();
  await pagina.waitForTimeout(250);
  const depois = await trilho.evaluate((el) => el.scrollLeft);
  assert.ok(depois > antes + 40, `o trilho tinha que ter andado — foi de ${antes} para ${depois}`);

  await pagina.close();
});

test('⏳ o leilão que fecha em minutos vem marcado como crítico; o de dias, não', { skip: semNavegador }, async () => {
  const pagina = await abrirHome();
  const pilulas = pagina.locator('[data-teste="contagem-do-cartao"]');
  const total = await pilulas.count();
  assert.ok(total > 0, 'nenhuma pílula de contagem na tela');

  const faixas = [];
  for (let i = 0; i < total; i += 1) faixas.push(await pilulas.nth(i).getAttribute('data-urgencia'));

  assert.ok(faixas.includes('critico'), `o banco tem um leilão de 6 minutos e nenhuma pílula ficou crítica: ${faixas.join(', ')}`);
  assert.ok(faixas.includes('normal'), 'nenhuma pílula normal — se tudo fica crítico, nada chama atenção');

  // o crítico pulsa; o normal não
  const critica = pilulas.filter({ has: pagina.locator('xpath=.') }).first();
  const classesCritica = await pagina.locator('[data-urgencia="critico"]').first().getAttribute('class');
  const classesNormal = await pagina.locator('[data-urgencia="normal"]').first().getAttribute('class');
  assert.match(classesCritica, /animate-pulse/, 'o crítico tinha que pulsar');
  assert.doesNotMatch(classesNormal, /animate-pulse/, 'o normal não pode pulsar');
  assert.ok(critica);
  await pagina.close();
});
