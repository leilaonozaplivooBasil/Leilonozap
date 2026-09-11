// 🛒 O COMPAREAQUI DEPOIS DE 10/09/2026
//
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ESTAVA ACONTECENDO
// ═══════════════════════════════════════════════════════════════════════════
// O modal alternava entre funcionar e dizer "Comparação Indisponível". O
// diagnóstico da própria tela, no dia 10/09, mostrou:
//
//   • serpapi_lens_exato:  Google Lens hasn't returned any results
//   • serpapi_lens_visual: The operation was aborted due to timeout
//   • google_lens_exato:   You have used all of the searches for the month
//   • google_lens_similar: (idem)
//   • google_shopping:     (idem)
//
// E o painel da SerpApi (Engine Reports, 03→10/09) deu a causa:
//
//     google_lens ....... média 7,461s   ← teto por fonte era 6s
//     google_shopping ... média 11,851s  ← teto GERAL era 12s, e ela era a ÚLTIMA da fila
//
// Sete fontes em FILA sob 12s: os dois Lens comiam o orçamento e a única que
// devolve preço com regularidade nunca era chamada. Quando o Lens respondia
// rápido, sobrava tempo e funcionava. Cara-ou-coroa de um segundo.
//
// E não havia cache: 2 a 3 buscas COBRADAS por clique, num plano que chegou a
// 995 restantes com o cartão recusado.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { ehCotaEsgotada } from '../api/_lib/marketSearch.js';
import { chaveDoCache, lerCache, gravarCache, VALIDADE_DIAS } from '../api/_lib/comparaiCache.js';

const ler = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const MOTOR = ler('api/_lib/marketSearch.js');
const PRICES = ler('api/functions/comparaiPrices.js');
const PRICING = ler('api/functions/calculateProductPricing.js');
const CACHE = ler('api/_lib/comparaiCache.js');
const MIGRACAO = readFileSync(new URL('../supabase/migrations/20260910230000_comparai_cache.sql', import.meta.url), 'utf8');

// ───────────────────────────────────────────────────────────────────────────
test('CAQ-1 · os relógios ficam ACIMA do tempo real medido das APIs', () => {
  // 🔴 É o coração do bug: o teto por fonte (6s) era MENOR que a média do
  // google_lens (7,461s), então a chamada estourava por padrão — e era cobrada
  // assim mesmo, porque o pedido chegava na SerpApi. Ela registra 99% de
  // sucesso; quem desistia era a gente.
  const porFonte = Number(/const FONTE_TIMEOUT_MS = (\d+);/.exec(MOTOR)?.[1]);
  const geral = Number(/const TETO_GERAL_MS = (\d+);/.exec(MOTOR)?.[1]);
  assert.ok(Number.isFinite(porFonte) && Number.isFinite(geral), 'premissa: os dois tetos existem');
  assert.ok(porFonte > 7461, `teto por fonte (${porFonte}ms) tem que passar da média do google_lens (7461ms)`);
  assert.ok(porFonte > 11851, `teto por fonte (${porFonte}ms) tem que passar da média do google_shopping (11851ms)`);

  // 🔴 A INVARIANTE QUE IMPORTA, e que a primeira versão deste teste não tinha:
  // o teto GERAL precisa caber uma tentativa INTEIRA de uma fonte. Com geral
  // MENOR que o teto por fonte, o relógio de cima mata a chamada antes de o de
  // baixo ter chance — que é exatamente o que acontecia (12s de teto geral
  // contra uma busca de Shopping de 11,9s: "passava" por 149ms e na prática
  // nunca cabia, porque metade das chamadas é mais lenta que a média).
  assert.ok(geral >= porFonte, `teto geral (${geral}ms) é menor que uma tentativa de fonte (${porFonte}ms) — a fonte nunca completa`);
  assert.ok(geral - 11851 >= 2000, `teto geral (${geral}ms) tem só ${geral - 11851}ms de folga sobre a média do Shopping — metade das chamadas é mais lenta que a média`);
  // e tem que sobrar folga pro navegador, que desiste em 18s
  assert.ok(geral < 18000, `teto geral (${geral}ms) passou do que o navegador espera (18000ms)`);
});

test('CAQ-2 · a SerpApi Shopping é a PRINCIPAL — primeira da primeira onda', () => {
  // Ordem do dono: "utilizar o serpapi como principal fonte do compareaqui".
  // Antes ela era a penúltima de sete, atrás de uma SearchApi esgotada.
  const onda1 = MOTOR.slice(MOTOR.indexOf('const onda1 = []'), MOTOR.indexOf('const onda2 = []'));
  assert.ok(MOTOR.includes("onda1.push({ nome: 'serpapi', fn: () => fetchSerpApi(cleaned) })"), 'a SerpApi Shopping saiu da onda 1');
  const bloco1 = MOTOR.slice(MOTOR.indexOf('if (cleaned && cleaned.length >= 4) {'), MOTOR.indexOf('if (onda1.length) ondas.push(onda1)'));
  assert.ok(bloco1.indexOf("nome: 'serpapi'") < bloco1.indexOf("nome: 'zoom'"), 'a SerpApi tem que vir antes do Zoom na onda 1');
  // e a SearchApi (esgotada desde 20/08) NÃO pode estar na onda 1
  assert.ok(!/onda1\.push\([^)]*google_shopping/.test(MOTOR), 'a SearchApi esgotada voltou pra onda 1');
  assert.ok(/onda2\.push\({ nome: 'google_shopping'/.test(MOTOR), 'a SearchApi precisa continuar existindo, como reserva');
  assert.ok(onda1.length > 0);
});

test('CAQ-3 · as fontes de uma onda saem JUNTAS, não em fila', () => {
  // Em fila, o custo era a SOMA (7,5 + 7,5 + … > 12s). Em paralelo, é o da
  // mais lenta. É o que devolve orçamento pro Shopping existir.
  assert.match(MOTOR, /const respostas = await Promise\.allSettled\(abertas\.map\(\(f\) => f\.fn\(\)\)\);/);
  // allSettled e não all: uma fonte que explode não pode levar as irmãs junto
  assert.ok(!/Promise\.all\(abertas/.test(MOTOR), 'Promise.all derruba a onda inteira quando uma fonte falha');
  // e o processamento depois é SEM rede nova — senão volta a ser fila
  const proc = MOTOR.slice(MOTOR.indexOf('for (let i = 0; i < abertas.length'), MOTOR.indexOf('logar(\'achou\''));
  assert.ok(!/await f\.fn\(\)/.test(proc), 'o processamento voltou a chamar a fonte — é fila de novo');
});

test('CAQ-4 · o disjuntor conhece a frase real da cota esgotada', () => {
  assert.equal(ehCotaEsgotada('Lens exato: You have used all of the searches for the month. Please upgrade your plan on SearchApi.io.'), true);
  assert.equal(ehCotaEsgotada('SearchAPI: You have used all of the searches for the month.'), true);
  // 🔴 e NÃO pode confundir com as outras duas falhas do mesmo diagnóstico:
  // desligar a SerpApi por um timeout ou por um "não achei" seria desligar a
  // fonte principal por motivo errado.
  assert.equal(ehCotaEsgotada('The operation was aborted due to timeout'), false, 'timeout viraria desligar a fonte principal');
  assert.equal(ehCotaEsgotada("Google Lens hasn't returned any results for this query."), false, '"não achei" não é cota esgotada');
  assert.equal(ehCotaEsgotada('SerpAPI HTTP 500'), false);
  assert.equal(ehCotaEsgotada(''), false);
  assert.equal(ehCotaEsgotada(null), false);
  // e o disjuntor é consultado ANTES de gastar a chamada
  assert.match(MOTOR, /const abertas = onda\.filter\(\(f\) => \{\s*if \(fonteAberta\(f\.nome\)\) return true;/);
});

// ───────────────────────────────────────────────────────────────────────────
test('CAQ-5 · a chave do cache muda quando o que foi buscado muda', () => {
  // Sem isso, corrigir a descrição ou trocar a foto continuaria devolvendo o
  // preço da busca antiga por uma semana, e ninguém entenderia o porquê.
  const base = { entidade: 'product', id: 'p1', titulo: 'Caixa de Som', imagem: 'a.jpg' };
  const k = chaveDoCache(base);
  assert.notEqual(k, chaveDoCache({ ...base, titulo: 'Caixa de Som 550W' }), 'mudar o título não mudou a chave');
  assert.notEqual(k, chaveDoCache({ ...base, imagem: 'b.jpg' }), 'trocar a foto não mudou a chave');
  assert.notEqual(k, chaveDoCache({ ...base, id: 'p2' }), 'outro produto não pode cair na mesma chave');
  assert.notEqual(k, chaveDoCache({ ...base, entidade: 'auction' }), 'leilão e produto não podem colidir');
  assert.equal(k, chaveDoCache({ ...base }), 'a mesma busca tem que dar a mesma chave');
  assert.ok(k.startsWith('product:p1:'), k);
});

test('CAQ-6 · o cache é conforto, nunca dependência: não lança e não guarda vazio', async () => {
  // Sem env de banco (o caso deste teste), tudo devolve "não tenho" em vez de
  // explodir. Um cache que derruba a comparação some com o recurso.
  assert.equal(await lerCache('product:x:1'), null);
  assert.equal(await lerCache(''), null);
  assert.equal(await gravarCache('product:x:1', { entidade: 'product', id: 'x', payload: { found: true } }), false);
  // 🔴 e busca que NÃO achou nunca entra no cache: presa por 7 dias, deixaria
  // o item sem comparação mesmo depois de a fonte voltar.
  assert.match(CACHE, /if \(!ligado\(\) \|\| !chave \|\| !payload\?\.found\) return false;/);
  assert.ok(VALIDADE_DIAS >= 1 && VALIDADE_DIAS <= 30, `validade fora do razoável: ${VALIDADE_DIAS}`);
});

test('CAQ-7 · os DOIS consumidores do motor passam pelo cache', () => {
  // O modal do cliente e a análise de preço do importador usam o mesmo motor.
  // A do importador roda em LAÇO — um lote de 50 produtos chegava a 150 buscas.
  for (const [nome, src] of [['comparaiPrices', PRICES], ['calculateProductPricing', PRICING]]) {
    assert.match(src, /const guardado = await lerCache\(chave\);/, `${nome} não lê o cache`);
    assert.match(src, /await gravarCache\(chave, \{/, `${nome} não grava o cache`);
    assert.match(src, /let mk = guardado\?\.payload \|\| null;/, `${nome} não aproveita o que foi guardado`);
    assert.ok(src.indexOf('lerCache(chave)') < src.indexOf('searchMarket('), `${nome} busca antes de olhar o cache`);
  }
  // e o `cached` parou de mentir — era `false` escrito na mão, em dois lugares
  assert.match(PRICES, /cached: veioDoCache,/);
});

test('CAQ-8 · a tabela do cache nasce com RLS e sem porta pro navegador', () => {
  assert.match(MIGRACAO, /create table if not exists public\.comparai_cache/);
  assert.match(MIGRACAO, /alter table public\.comparai_cache enable row level security;/);
  // 🔒 zero políticas = só o service_role entra. Cache legível é cache envenenável.
  assert.ok(!/create policy/i.test(MIGRACAO), 'apareceu política — o cache deixou de ser exclusivo do servidor');
  assert.match(MIGRACAO, /expira_em\s+timestamptz not null/);
  assert.match(CACHE, /expira_em=gt\./, 'a leitura precisa filtrar o que já venceu');
});

// ───────────────────────────────────────────────────────────────────────────
test('CAQ-9 · 🔒 a importação de imagens e as fotos por imagem NÃO dependem deste motor', () => {
  // Ordem do dono, ao autorizar: "não tira a Serpa das importações de imagens
  // e análise do preço do importador — lá no estoque ela é fundamental".
  // A importação é INDEPENDENTE (nunca importou o motor); a análise de preço
  // USA o motor e por isso herda as correções em vez de quebrar.
  for (const arquivo of ['api/_lib/imagensGoogle.js', 'api/functions/buscarImagensGoogle.js', 'api/functions/buscarFotosPorImagem.js']) {
    const src = ler(arquivo);
    assert.ok(!/marketSearch/.test(src), `${arquivo} passou a depender do motor do CompareAQUI`);
  }
  // e a análise do importador continua chamando o motor (não foi desligada)
  assert.match(PRICING, /import \{ searchMarket \} from '\.\.\/_lib\/marketSearch\.js';/);
  assert.match(PRICING, /await searchMarket\(p\.description, imgUrl\)/);
});

test('CAQ-10 · a busca deixou de ser muda nos logs do servidor', () => {
  // Zero `console.log` na pilha inteira era o motivo de ninguém conseguir
  // diagnosticar isso pelo painel da Vercel — toda falha morria num array que
  // só o navegador via.
  assert.match(MOTOR, /const logar = \(\.\.\.partes\) =>/);
  for (const momento of ['onda', 'falhou', 'achou', 'nada encontrado']) {
    assert.ok(MOTOR.includes(`logar('${momento}'`), `sumiu o log de "${momento}"`);
  }
  // e logar nunca pode derrubar a busca
  assert.match(MOTOR, /try \{ console\.log\('\[comparai\]', \.\.\.partes\); \} catch/);
});
