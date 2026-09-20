/**
 * 🏠 HOME NOVA — as regras que decidem o que a página de entrada mostra.
 *
 * O mock que o dono trouxe (18/09/2026) traz números, categorias e contatos de
 * exemplo, para serem trocados pelos nossos. Estes testes travam exatamente a
 * fronteira entre "exemplo" e "nosso":
 *
 *   1. a faixa de números NUNCA inventa contagem — sem dado, o ladrilho some;
 *   2. o mesmo leilão não aparece nos dois carrosséis;
 *   3. "da semana" é quem termina em 7 dias, quem acaba primeiro na frente;
 *   4. categoria sem nada não vira card (porta fechada na cara de quem clica);
 *   5. o aviso "leilão não oficial" está na tela — é obrigação de contrato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';
import {
  categoriasDaVitrine, recadoDaCategoria, leiloesDaSemana, maisValiosos, valorDoItem, quantosDestaques, TETO_DE_DESTAQUES,
  numerosDaCasa, precoDoLeilao, emReais, AVISO_NAO_OFICIAL,
} from '../src/lib/homeNova.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const AGORA = new Date('2026-09-18T12:00:00.000Z');
const emDias = (d) => new Date(AGORA.getTime() + d * 24 * 3600 * 1000).toISOString();

const leilao = (id, dias, extra = {}) => ({ id, status: 'active', end_time: emDias(dias), ...extra });

test('a faixa de números não inventa contagem: sem dado, o ladrilho some', () => {
  const vazio = numerosDaCasa({});
  const chaves = vazio.map((n) => n.chave);
  assert.ok(!chaves.includes('leiloes'), 'sem contagem de leilão não pode existir ladrilho de leilão');
  assert.ok(!chaves.includes('loja'));
  assert.ok(!chaves.includes('acervo'));
  // os dois que sobram são fato, não contagem
  assert.deepEqual(chaves, ['brasil', 'pagamento']);

  // e nenhum texto de número aparece — nem "0", nem "+100 mil"
  for (const n of vazio) assert.ok(!/\d/.test(n.valor), `"${n.valor}" não devia ter dígito`);
});

test('com dado do banco, a faixa mostra o número do banco — sem arredondar pra cima', () => {
  const itens = numerosDaCasa({ leiloesAtivos: 56, produtosNaLoja: 235, acervo: 2853 });
  const porChave = Object.fromEntries(itens.map((n) => [n.chave, n.valor]));
  assert.equal(porChave.leiloes, '56');
  assert.equal(porChave.loja, '235');
  assert.equal(porChave.acervo, '2.853');
});

test('contagem zerada não vira ladrilho — "0 leilões acontecendo agora" é pior que nada', () => {
  const chaves = numerosDaCasa({ leiloesAtivos: 0, produtosNaLoja: 235 }).map((n) => n.chave);
  assert.ok(!chaves.includes('leiloes'));
  assert.ok(chaves.includes('loja'));
});

test('o mesmo leilão não aparece nos dois carrosséis', () => {
  const destaque = leilao('a', 2);
  const lista = [destaque, leilao('b', 1), leilao('c', 3)];

  const semFiltro = leiloesDaSemana(lista, { agora: AGORA });
  assert.deepEqual(semFiltro.map((l) => l.id), ['b', 'a', 'c'], 'sem exclusão, o destaque entra');

  const comFiltro = leiloesDaSemana(lista, { agora: AGORA, jaEstaoEmCartaz: [destaque] });
  assert.deepEqual(comFiltro.map((l) => l.id), ['b', 'c'], 'o que já está em destaque sai da semana');
});

test('"da semana" é 7 dias: quem termina depois fica de fora, quem já terminou também', () => {
  const lista = [leilao('hoje', 0.5), leilao('no_limite', 6.9), leilao('depois', 8), leilao('vencido', -1)];
  const ids = leiloesDaSemana(lista, { agora: AGORA }).map((l) => l.id);
  assert.deepEqual(ids, ['hoje', 'no_limite']);
});

test('quem acaba primeiro aparece primeiro', () => {
  const ids = leiloesDaSemana([leilao('c', 5), leilao('a', 1), leilao('b', 3)], { agora: AGORA }).map((l) => l.id);
  assert.deepEqual(ids, ['a', 'b', 'c']);
});

test('leilão fora do ar não entra na semana nem que a data ajude', () => {
  const lista = [leilao('vendido', 2, { status: 'sold' }), leilao('ativo', 2)];
  assert.deepEqual(leiloesDaSemana(lista, { agora: AGORA }).map((l) => l.id), ['ativo']);
});

test('categoria sem leilão e sem produto não vira card', () => {
  const cards = categoriasDaVitrine([
    { id: '1', nome: 'Moda', leiloes_ativos: 9, produtos_na_loja: 23 },
    { id: '2', nome: 'Vazia', leiloes_ativos: 0, produtos_na_loja: 0 },
    { id: '3', nome: 'Só loja', leiloes_ativos: 0, produtos_na_loja: 4 },
  ]);
  assert.deepEqual(cards.map((c) => c.nome), ['Moda', 'Só loja']);
});

test('a ordem dos cards é por leilão acontecendo, depois por produto na loja', () => {
  const cards = categoriasDaVitrine([
    { id: '1', nome: 'Casa', leiloes_ativos: 11, produtos_na_loja: 51 },
    { id: '2', nome: 'Beleza', leiloes_ativos: 12, produtos_na_loja: 23 },
    { id: '3', nome: 'Muita loja', leiloes_ativos: 11, produtos_na_loja: 99 },
  ]);
  assert.deepEqual(cards.map((c) => c.nome), ['Beleza', 'Muita loja', 'Casa']);
});

test('o recado do card só diz o que existe — nunca "0 leilões"', () => {
  assert.equal(recadoDaCategoria({ nome: 'x', leiloes: 12, naLoja: 23 }), '12 leilões · 23 na loja');
  assert.equal(recadoDaCategoria({ nome: 'x', leiloes: 1, naLoja: 0 }), '1 leilão');
  assert.equal(recadoDaCategoria({ nome: 'x', leiloes: 0, naLoja: 4 }), '4 na loja');
});

test('o card mostra o lance atual; sem lance, o de abertura', () => {
  assert.equal(precoDoLeilao({ current_price: 597, starting_price: 497 }), 597);
  assert.equal(precoDoLeilao({ current_price: 0, starting_price: 497 }), 497);
  assert.equal(precoDoLeilao({}), 0);
  // Intl usa espaço fino (U+00A0) entre "R$" e o número — normalizo pra comparar.
  assert.equal(emReais(53.6).replace(/\u00a0/g, ' '), 'R$ 53,60');
});

test('o aviso "leilão não oficial" está na tela do hero, não só na biblioteca', () => {
  const hero = readFileSync(path.join(RAIZ, 'src/components/homenova/HeroDoDia.jsx'), 'utf8');
  assert.match(hero, /AVISO_NAO_OFICIAL/, 'o hero precisa renderizar a constante do aviso');
  assert.match(AVISO_NAO_OFICIAL, /não oficial/i);
});

test('o rodapé não escreve contato na mão — importa da fonte única', () => {
  const bruto = readFileSync(path.join(RAIZ, 'src/components/homenova/RodapeHomeNova.jsx'), 'utf8');
  assert.match(bruto, /from '@\/lib\/contatoOficial'/);
  assert.match(bruto, /from '@\/lib\/whatsappOficial'/);

  // 🔴 SEM OS COMENTÁRIOS. A primeira versão deste teste acusou o rodapé de ter
  // telefone escrito na mão — e o que ele encontrou foi o "(21) 99999-9999"
  // CITADO no comentário como exemplo do que não fazer. O teste estava lendo a
  // própria documentação e reprovando ela.
  const rodape = semComentarios(bruto);
  assert.ok(!/\(\d{2}\)\s?\d{4,5}-\d{4}/.test(rodape), 'telefone digitado no rodapé');
  assert.ok(!/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(rodape), 'CNPJ digitado no rodapé');
  assert.ok(!/@[a-z0-9.-]+\.(com|net|br)/i.test(rodape), 'e-mail digitado no rodapé');
});

// ── 💎 "EM DESTAQUE" SE ORDENA SOZINHO ───────────────────────────────────────

test('o "Em destaque" põe na frente o que vale mais na nossa loja', () => {
  const leiloes = [
    { id: 'relogio', status: 'active', title: 'Relógio', product_id: 'p1' },
    { id: 'ps5', status: 'active', title: 'Playstation 5', product_id: 'p2' },
    { id: 'harley', status: 'active', title: 'Harley 117', product_id: 'p3' },
  ];
  const preco = { p1: 118, p2: 6000, p3: 3300 };
  assert.deepEqual(maisValiosos(leiloes, preco).map((a) => a.id), ['ps5', 'harley', 'relogio']);
});

test('leilão sem preço conhecido vai pro fim, mas não some', () => {
  const leiloes = [
    { id: 'sem_preco', status: 'active', title: 'A', product_id: 'px' },
    { id: 'com_preco', status: 'active', title: 'B', product_id: 'p1' },
  ];
  const ordem = maisValiosos(leiloes, { p1: 100 }).map((a) => a.id);
  assert.deepEqual(ordem, ['com_preco', 'sem_preco']);
});

test('🔴 o valor NÃO sai de market_price: os dois campos estão vazios na base inteira', () => {
  // Medido em 18/09/2026: 0 de 49 leilões ativos têm market_price ou
  // manual_market_price. Se a régua lesse de lá, a ordem seria aleatória.
  const comMarketPrice = { id: 'x', status: 'active', title: 'X', product_id: 'p1', market_price: 9999, manual_market_price: 9999 };
  assert.equal(valorDoItem(comMarketPrice, {}), 0, 'market_price não pode valer nada aqui');
  assert.equal(valorDoItem(comMarketPrice, { p1: 250 }), 250, 'o valor sai do preço de loja do produto');
});

test('o carrossel mostra "na loja" só quando a loja é mais cara que o lance', () => {
  const tela = semComentarios(readFileSync(path.join(RAIZ, 'src/components/homenova/CarrosselDeLeiloes.jsx'), 'utf8'));
  assert.match(tela, /naLoja > 0 && naLoja > lance/, 'a comparação precisa exigir que a loja seja mais cara');
});

test('🔴 o "Em destaque" não pode engolir a semana inteira', () => {
  // Pego na banca (18/09/2026): com 8 fixos, o destaque levou TODOS os leilões
  // com preço e "Leilões da semana" sumiu da página.
  assert.equal(quantosDestaques(8), 4, 'com 8 disponíveis, no máximo 4 no destaque');
  assert.equal(quantosDestaques(2), 1);
  assert.equal(quantosDestaques(40), TETO_DE_DESTAQUES, 'com folga, respeita o teto');
  assert.equal(quantosDestaques(1), 0, 'com um só, ele é o hero — destaque vazio');
  assert.equal(quantosDestaques(0), 0);
});

test('com o limite, sempre sobra leilão para a semana', () => {
  const pool = Array.from({ length: 9 }, (_, i) => ({
    id: `a${i}`, status: 'active', title: `L${i}`, product_id: `p${i}`,
    end_time: new Date(AGORA.getTime() + (i + 1) * 3600 * 1000).toISOString(),
  }));
  const preco = Object.fromEntries(pool.map((a, i) => [`p${i}`, (i + 1) * 100]));
  const destaque = maisValiosos(pool, preco, quantosDestaques(pool.length));
  const semana = leiloesDaSemana(pool, { agora: AGORA, jaEstaoEmCartaz: destaque });
  assert.ok(destaque.length > 0, 'destaque vazio');
  assert.ok(semana.length > 0, 'a semana ficou sem nada — foi exatamente o defeito');
  assert.equal(destaque.length + semana.length, pool.length, 'nenhum leilão pode se perder entre os dois');
});

test('🔴 o card NÃO carimba porcentagem de desconto num leilão aberto', () => {
  // Chegou a existir um selo "-99%" (lance atual contra preço de loja). O
  // número fechava; a promessa não: num leilão em andamento o lance existe
  // para subir, então o abatimento anunciado quase certamente não sobrevive
  // ao martelo. A comparação "na loja R$ X" fica — ela afirma dois fatos, não
  // promete resultado.
  const tela = semComentarios(readFileSync(path.join(RAIZ, 'src/components/homenova/CarrosselDeLeiloes.jsx'), 'utf8'));
  assert.ok(!/1\s*-\s*lance\s*\/\s*naLoja/.test(tela), 'voltou a calcular porcentagem de desconto no card');
  assert.ok(!/-\{\s*\w+\s*\}%/.test(tela), 'voltou a renderizar selo de porcentagem');
  // e a comparação honesta continua lá
  assert.match(tela, /data-teste="preco-na-loja"/);
});

// ── A régua nova: quem tem foto vai na frente (19/09/2026) ──────────────────
//
// O dono mandou as artes de cinco categorias e só UMA estava entre as seis mais
// movimentadas. Sem esta régua, quatro artes ficariam encostadas.

test('categoria com foto passa na frente de categoria mais movimentada sem foto', () => {
  const vitrine = categoriasDaVitrine([
    { id: 'casa', nome: 'Casa & Construção', leiloes_ativos: 11, produtos_na_loja: 50, image_url: null },
    { id: 'games', nome: 'Video Games', leiloes_ativos: 1, produtos_na_loja: 1, image_url: '/categorias/games.webp' },
  ]);
  assert.deepEqual(vitrine.map((c) => c.nome), ['Video Games', 'Casa & Construção']);
});

test('entre as que têm foto, quem tem mais leilão continua vindo primeiro', () => {
  const vitrine = categoriasDaVitrine([
    { id: 'ferr', nome: 'Ferramentas', leiloes_ativos: 1, produtos_na_loja: 9, image_url: '/a.webp' },
    { id: 'ele', nome: 'Eletrônicos', leiloes_ativos: 5, produtos_na_loja: 21, image_url: '/b.webp' },
    { id: 'moda', nome: 'Moda', leiloes_ativos: 2, produtos_na_loja: 22, image_url: '/c.webp' },
  ]);
  assert.deepEqual(vitrine.map((c) => c.nome), ['Eletrônicos', 'Moda', 'Ferramentas']);
});

test('sem foto em nenhuma, a ordem é a de sempre — a vitrine não muda de cara', () => {
  const vitrine = categoriasDaVitrine([
    { id: 'b', nome: 'Beleza & Saúde', leiloes_ativos: 11, produtos_na_loja: 23 },
    { id: 'd', nome: 'Decoração', leiloes_ativos: 4, produtos_na_loja: 31 },
    { id: 'c', nome: 'Casa & Construção', leiloes_ativos: 11, produtos_na_loja: 50 },
  ]);
  assert.deepEqual(vitrine.map((c) => c.nome), ['Casa & Construção', 'Beleza & Saúde', 'Decoração']);
});

test('string vazia não é foto — não pode promover categoria nenhuma', () => {
  const vitrine = categoriasDaVitrine([
    { id: 'casa', nome: 'Casa & Construção', leiloes_ativos: 11, produtos_na_loja: 50, image_url: null },
    { id: 'vazia', nome: 'Pets', leiloes_ativos: 2, produtos_na_loja: 7, image_url: '   ' },
  ]);
  assert.deepEqual(vitrine.map((c) => c.nome), ['Casa & Construção', 'Pets']);
});

test('a vitrine nunca encolhe: com foto ou sem, entrega até o teto pedido', () => {
  const linhas = Array.from({ length: 9 }, (_, i) => ({
    id: `c${i}`, nome: `Cat ${i}`, leiloes_ativos: 9 - i, produtos_na_loja: 1,
    image_url: i === 8 ? '/so-a-ultima.webp' : null,
  }));
  const vitrine = categoriasDaVitrine(linhas, 6);
  assert.equal(vitrine.length, 6);
  assert.equal(vitrine[0].nome, 'Cat 8', 'a única com foto lidera');
});
