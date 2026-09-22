// 🌊 A JANELA PRO MAR — 22/09/2026.
//
// Dono, olhando o print do ritual: "quero melhorar a X-Game, deixar as cores
// com MENOS CARA DE APLICATIVO FEITO POR IA e cores mais bonitas. Se possível,
// imagens de praia no fundo, como se fosse uma janela em frente ao mar...
// preciso que esses textos fiquem mais visíveis... a música com opção de
// expandir e diminuir igual o X-Music, só que um pouco menor. Inclusive quero
// deixar o X-Music menor, acho que está ocupando muito espaço."
//
// O que este arquivo prende:
//   1. o degradê roxo→laranja (a assinatura de app gerado por IA) não volta;
//   2. o dia nasce conforme o ritual anda, e a conta disso é pura e testável;
//   3. o player da música NUNCA é desmontado ao encolher — se for, a música
//      morre no meio do ritual, que é pior do que o problema que resolvemos;
//   4. o X-Music global encolheu de verdade.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { cenaDaLuz, HORIZONTE, SOL_X } from '../src/lib/janelaDoMar.js';

const ler = (c) => semComentarios(readFileSync(new URL(`../${c}`, import.meta.url), 'utf8'));
const TELA = ler('src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
const FUNDO = ler('src/components/licensing/CentralVendas/FundoJanelaDoMar.jsx');
const XMUSIC = ler('src/components/licensing/XMusic.jsx');

// ─── o roxo não volta ────────────────────────────────────────────────────

test('🔴 o degradê roxo→laranja saiu da tela do ritual e não pode voltar', () => {
  for (const cor of ['#141432', '#5b2a5e', '#f59e5b']) {
    assert.ok(!TELA.includes(cor), `a cor ${cor} do fundo antigo voltou — é ela que dá cara de app feito por IA`);
  }
  assert.ok(!/from-\[#141432\]/.test(TELA));
});

test('o ritual pinta o fundo com a janela do mar, não com um degradê solto', () => {
  assert.match(TELA, /import FundoJanelaDoMar from '\.\/FundoJanelaDoMar'/);
  assert.match(TELA, /<FundoJanelaDoMar luz=\{LUZ_DO_PASSO\[passo\] \?\? 0\} \/>/);
});

// ─── o dia nasce ─────────────────────────────────────────────────────────

test('cenaDaLuz: o sol SOBE e a luz FORTALECE conforme o ritual anda', () => {
  const abertura = cenaDaLuz(0);
  const fim = cenaDaLuz(1);
  assert.ok(fim.solY < abertura.solY, 'o sol tem que subir — quanto menor o Y, mais alto na tela');
  assert.ok(fim.solForca > abertura.solForca, 'a luz tem que ficar mais forte no fim');
  assert.ok(fim.noite < abertura.noite, 'a noite tem que ir embora');
});

test('cenaDaLuz aguenta lixo sem pintar uma tela quebrada', () => {
  // `luz` vem de um mapa por passo; um passo desconhecido não pode virar NaN
  // na string de CSS — isso apaga o fundo inteiro e a pessoa vê preto.
  for (const entrada of [null, undefined, NaN, 'abc', -5, 99]) {
    const c = cenaDaLuz(entrada);
    assert.ok(Number.isFinite(c.solY) && Number.isFinite(c.solForca) && Number.isFinite(c.noite), `quebrou com ${entrada}`);
  }
  assert.deepEqual(cenaDaLuz(-5), cenaDaLuz(0), 'abaixo de 0 tem que grudar em 0');
  assert.deepEqual(cenaDaLuz(99), cenaDaLuz(1), 'acima de 1 tem que grudar em 1');
});

test('cada passo do ritual tem a sua luz, da hora azul ao sol alto', () => {
  const i = TELA.indexOf('const LUZ_DO_PASSO');
  assert.ok(i > 0, 'sumiu o mapa de luz por passo');
  const trecho = TELA.slice(i, i + 220);
  assert.match(trecho, /\[P\.ABERTURA\]: 0/);
  assert.match(trecho, /\[P\.FECHAMENTO\]: 1/);
});

test('o fundo é pintura pura: não recebe clique nem some com o conteúdo', () => {
  assert.match(FUNDO, /pointer-events-none absolute inset-0/);
  assert.match(FUNDO, /data-teste="fundo-janela-do-mar"/);
  assert.match(FUNDO, /aria-hidden="true"/);
});

test('a régua do nascer do sol mora em lib pura — o .jsx não consegue ser testado em node', () => {
  assert.equal(typeof HORIZONTE, 'number');
  assert.equal(typeof SOL_X, 'number');
  assert.match(FUNDO, /import \{ HORIZONTE, SOL_X, cenaDaLuz \} from '@\/lib\/janelaDoMar'/);
});

test('o mar tem sol, caminho de luz e janela — não é um degradê chapado', () => {
  assert.match(FUNDO, /radial-gradient\(ellipse[^)]*at \$\{SOL_X\}%/, 'o caminho de luz sai do sol');
  assert.ok(!/clipPath/.test(FUNDO), 'o cone de holofote (clip-path) voltou — ele mostra as retas diagonais na água');
  assert.match(FUNDO, /boxShadow: `0 0 0 100vmax/, 'sumiu a parede que forma o vão da janela');
});

test('quem pediu menos movimento não leva o mar se mexendo na cara', () => {
  assert.match(FUNDO, /@media \(prefers-reduced-motion: reduce\)/);
  const i = FUNDO.indexOf('prefers-reduced-motion');
  const trecho = FUNDO.slice(i, i + 220);
  for (const classe of ['jm-ondas', 'jm-respira', 'jm-caminho']) {
    assert.ok(trecho.includes(classe), `${classe} continua animando com movimento reduzido`);
  }
});

// ─── os textos ficam visíveis ────────────────────────────────────────────

test('o título e o contrato ganharam contraste de verdade', () => {
  assert.match(TELA, /Bom dia, \{nome \|\| 'campeão'\}/);
  assert.match(TELA, /textShadow: '0 2px 24px rgba\(4,12,22,\.75\)/, 'o título perdeu a sombra que o separa do mar');
  assert.match(TELA, /data-teste="contrato-do-ritual"/);
  const i = TELA.indexOf('data-teste="contrato-do-ritual"');
  const card = TELA.slice(i - 400, i);
  assert.match(card, /backdrop-blur-md/, 'o card do contrato voltou a ser transparente demais');
  // `bg-white/10` era o card quase invisível de antes
  assert.ok(!/rounded-2xl bg-white\/10 ring-1 ring-white\/20 p-4 text-left/.test(TELA));
});

// ─── a música ────────────────────────────────────────────────────────────

test('🔴 encolher a música ESCONDE o player, nunca o desmonta', () => {
  // desmontar o iframe mata a música no meio do ritual — o mesmo cuidado que
  // o X-Music global já tomava (o painel dele nunca sai do DOM)
  const i = TELA.indexOf('<PlayerYoutube id={musicaId}');
  assert.ok(i > 0, 'sumiu o player');
  const antes = TELA.slice(Math.max(0, i - 700), i);
  assert.match(antes, /musicaAberta \? 'mt-1\.5 space-y-1\.5' : 'absolute bottom-0 -left-\[9999px\] opacity-0 pointer-events-none'/);
  assert.ok(!/\{musicaAberta && \(\s*<div[^>]*>\s*<div[^>]*>\s*<PlayerYoutube/.test(TELA), 'o player virou render condicional — a música morre ao encolher');
});

test('a pílula da música é fina, diz o que está tocando e abre/fecha', () => {
  assert.match(TELA, /data-teste="musica-do-amanhecer"/);
  assert.match(TELA, /aria-expanded=\{musicaAberta\}/);
  assert.match(TELA, /\{nomeDaMusicaDeHoje\}/, 'a pílula fechada não diz o que está tocando');
  assert.match(TELA, /const nomeDaMusicaDeHoje = /);
});

test('a escolha de deixar a música aberta fica no aparelho', () => {
  assert.match(TELA, /const CHAVE_MUSICA_ABERTA = 'xgame_musica_aberta'/);
  assert.match(TELA, /localStorage\.getItem\(CHAVE_MUSICA_ABERTA\) === '1'/);
  assert.match(TELA, /const alternarMusicaAberta = /);
});

test('o player do ritual encolheu: era 224×128 fixo, agora acompanha a pílula', () => {
  assert.ok(!/className="w-56 h-32 block"/.test(TELA), 'o player voltou ao tamanho antigo');
  assert.match(TELA, /className="w-full h-28 block"/);
});

// ─── o X-Music global ────────────────────────────────────────────────────

test('o X-Music global encolheu — player e painel', () => {
  assert.ok(!/h-\[168px\]/.test(XMUSIC), 'o player do X-Music voltou aos 168px');
  assert.match(XMUSIC, /w-full h-\[120px\] overflow-hidden/);
  assert.ok(!/w-\[min\(88vw,20rem\)\]/.test(XMUSIC), 'o painel do X-Music voltou ao tamanho antigo');
  assert.match(XMUSIC, /w-\[min\(84vw,17rem\)\]/);
});
