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
  assert.match(TELA, /<FundoJanelaDoMar luz=\{LUZ_DO_PASSO\[passo\] \?\? 0\} foto=\{fotoDeFundo\}/);
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
  const trecho = FUNDO.slice(i, i + 260);
  for (const classe of ['jm-mare', 'jm-mare-perto', 'jm-respira', 'jm-caminho']) {
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

// ─── 2ª volta do fundo (22/09): o que tirou a cara de máquina ────────────

test('🔴 o mar não pode voltar a ser listra de televisão', () => {
  // `repeating-linear-gradient` espalhado pelo mar inteiro lia como scanline.
  // Ele só sobrevive DENTRO da máscara apertada das faíscas, em volta do
  // reflexo do sol — se aparecer com outra máscara, a listra voltou.
  const pedacos = FUNDO.split('repeating-linear-gradient').slice(1);
  assert.equal(pedacos.length, 1, 'tem mais de um repeating-linear-gradient no fundo — o mar listrado voltou');
  assert.match(pedacos[0].slice(0, 400), /maskImage: `radial-gradient\(ellipse 11% 40% at \$\{SOL_X\}% 0%/,
    'a listra ficou sem a máscara apertada das faíscas — isso é scanline, não reflexo');
});

test('a ondulação, a nuvem e o grão nascem de ruído fractal', () => {
  // é o ruído que tira a cara de plástico do degradê. Se os filtros sumirem,
  // a tela volta a ser matematicamente lisa — que é o que o dono reclamou.
  for (const filtro of ['jmNuvens', 'jmNuvens2', 'jmAgua', 'jmAgua2', 'jmGrao']) {
    assert.ok(FUNDO.includes(`id="${filtro}"`), `sumiu o filtro ${filtro}`);
    assert.ok(FUNDO.includes(`url(#${filtro})`), `o filtro ${filtro} existe mas ninguém usa`);
  }
  assert.match(FUNDO, /feTurbulence type="fractalNoise"/);
});

test('o sol fica COLADO no horizonte — não boia no céu', () => {
  // com 7 pontos de subida ele descolava da faixa quente e o reflexo ficava
  // com um vão no meio. Meia hora de amanhecer sobe pouco.
  const { solY } = cenaDaLuz(1);
  assert.ok(HORIZONTE - solY <= 3, `o sol subiu ${(HORIZONTE - solY).toFixed(1)} pontos acima do horizonte — descolou`);
  // 🔄 22/09, 2ª rodada — A RÉGUA MUDOU DE LADO, DEPOIS DE OLHAR A FOTO.
  // Este teste exigia o CENTRO do disco abaixo da linha ("mordido"). No
  // celular do dono isso deixava o sol afogado: o que aparecia era quase só
  // o reflexo, uma gota de luz em vez de um sol, e ele relatou não ver sol
  // nenhum. Mordido pela água é o disco EM CIMA da linha com a base cortada
  // por ela — o centro tem que estar acima, e perto.
  assert.ok(cenaDaLuz(0).solY < HORIZONTE, 'o sol afundou de novo — na abertura o disco tem que estar VISÍVEL acima da linha');
  assert.ok(HORIZONTE - cenaDaLuz(0).solY <= 2.5, 'o sol descolou da água já na abertura');
});

test('🔴 nem a vinheta nem o véu podem desenhar um arco no céu', () => {
  // dois stops só (transparente → escuro) fazem a borda do degradê aparecer
  // como um arco atravessando a tela. Escurecer tem que ser lento.
  for (const marca of ['at 50% 30%', 'at 50% 52%']) {
    const i = FUNDO.indexOf(marca);
    assert.ok(i > 0, `sumiu o degradê ${marca}`);
    const trecho = FUNDO.slice(i, FUNDO.indexOf(')', FUNDO.indexOf('100%', i)));
    assert.ok((trecho.match(/rgba\(/g) || []).length >= 4, `o degradê ${marca} voltou a ter poucos stops — o arco volta`);
  }
});

test('a foto do fundo é opcional e não tapa a lâmina', () => {
  // a plumbing da foto existe pra trocar a vista desenhada por uma imagem sem
  // mexer em janela, peitoril nem véu. Ela entra DENTRO do fundo, que é
  // `pointer-events-none`, e nunca por cima do conteúdo do ritual.
  assert.match(FUNDO, /export default function FundoJanelaDoMar\(\{ luz = 0, foto = null[^)]*\}\)/);
  assert.match(FUNDO, /data-teste="foto-da-janela"/);
  assert.ok(FUNDO.indexOf('data-teste="foto-da-janela"') < FUNDO.indexOf('boxShadow: `0 0 0 100vmax'),
    'a foto ficou DEPOIS da janela — ela tem que entrar como vista, com a moldura por cima');
  assert.match(TELA, /fotoDeFundo = null/, 'o ritual precisa aceitar a foto com valor padrão nulo');
});

test('o selo do ritual carrega a própria placa escura', () => {
  // medido: em cima da bruma clara do horizonte, no celular, o âmbar dava
  // 4,43:1 — abaixo do mínimo de 4,5:1 da WCAG. A placa resolve em qualquer luz.
  const i = TELA.indexOf('data-teste="selo-antecipacao"');
  assert.ok(i > 0, 'sumiu o selo ANTECIPAÇÃO É PODER');
  const trecho = TELA.slice(i, i + 420);
  assert.match(trecho, /backgroundColor: 'rgba\(6,18,32,\.78\)'/, 'o selo perdeu a placa e volta a sumir na bruma');
  assert.match(trecho, /text-\[#FFC46B\]/);
});

test('o subtítulo tem folga de contraste em cima da faixa quente', () => {
  // #F2E3D2 dava 4,76:1 — passava por 0,26. #FFF1DF dá 5,4:1.
  assert.ok(!TELA.includes('text-[#F2E3D2]'), 'voltou o subtítulo antigo, que raspava no mínimo da WCAG');
  assert.match(TELA, /text-\[#FFF1DF\] text-\[15px\]/);
});

// ─── 3ª volta: o sol e o horizonte no CELULAR (22/09) ────────────────────

test('🔴 o horizonte não pode cair em cima do conteúdo da lâmina', () => {
  // medido num iPhone 393×852: o selo ocupa 42,6%–46,0% da tela. Com o
  // horizonte em 42% a linha da água nascia DENTRO da placa escura do selo,
  // e o sol — que nasce colado nela — ficava 100% coberto. O dono não estava
  // vendo "pouco" o sol: não estava vendo nada. Isso é colisão de layout, e
  // só apareceu medindo a tela.
  assert.ok(HORIZONTE < 40, `o horizonte voltou pra faixa do conteúdo (${HORIZONTE}%)`);
  assert.ok(HORIZONTE > 12, `o horizonte subiu demais (${HORIZONTE}%) — sobra céu de menos pro sol nascer`);
});

test('🔴 as paradas da cena são FRAÇÕES do horizonte, nunca pontos fixos', () => {
  // este é o defeito que nenhuma leitura do código denuncia, só a foto:
  // as paradas eram números fixos calculados pra um horizonte em 42%. Movendo
  // o horizonte elas ficaram FORA DE ORDEM, o CSS grudou cada parada atrasada
  // na anterior, e todas as cores do mar foram esmagadas num ponto só —
  // uma tarja laranja com corte seco atravessando a lâmina.
  const i = FUNDO.indexOf('linear-gradient(180deg,\n            rgba(5,14,26,');
  assert.ok(i > 0, 'sumiu o degradê do céu');
  const ceu = FUNDO.slice(i, FUNDO.indexOf('`,', i));
  // 0% e 100% são as duas ÂNCORAS da cena — o topo do céu e o pé da tela.
  // Elas são fixas por definição; qualquer outra parada em número solto é a
  // volta do defeito.
  const fixos = (ceu.match(/#[0-9A-Fa-f]{6} \d+(\.\d+)?%/g) || [])
    .filter((p) => !/ (0|100)%$/.test(p));
  assert.equal(fixos.length, 0, `voltaram paradas fixas no degradê: ${fixos.join(', ')}`);
  assert.ok(ceu.includes('HORIZONTE *'), 'o céu precisa se medir como fração do horizonte');
  assert.ok(ceu.includes('MAR *'), 'o mar precisa se medir como fração do que sobra de tela');
  assert.match(FUNDO, /const MAR = 100 - HORIZONTE;/);
});

test('o sol tem tamanho de sol em qualquer tela', () => {
  // `vmin` num celular alto é a LARGURA: 8,6vmin num aparelho de 393px dava
  // 34px, um caroço. O piso do clamp é o que garante sol no celular.
  const i = FUNDO.indexOf("width: 'clamp(");
  assert.ok(i > 0, 'o disco do sol voltou a ser medido só em vmin');
  assert.match(FUNDO.slice(i, i + 120), /clamp\((\d+)px, [\d.]+vmin, \d+px\)/);
  const piso = Number(FUNDO.slice(i, i + 120).match(/clamp\((\d+)px/)[1]);
  assert.ok(piso >= 50, `o piso do sol caiu pra ${piso}px — no celular ele some`);
});

test('o disco do sol é OPACO, mesmo na hora azul', () => {
  // ele era multiplicado pela força da luz e saía a 61% na abertura:
  // translúcido sobre um céu já clareando, ou seja, invisível. Quem varia
  // com a luz é o brilho EM VOLTA; o disco, quando aparece, aparece.
  const i = FUNDO.indexOf('rgba(255,251,236,');
  assert.ok(i > 0, 'sumiu o miolo sólido do disco');
  assert.match(FUNDO.slice(i, i + 60), /rgba\(255,251,236,1\)/, 'o miolo do sol voltou a ser translúcido');
});

test('existe uma LINHA do horizonte, não só bruma borrada', () => {
  // bruma dá distância, mas não desenha linha — e sem linha o olho não sabe
  // onde acaba o céu e começa a água
  assert.match(FUNDO, /height: '1px',\s*\n\s*background: `rgba\(255,236,200,/);
});

test('na abertura o ícone perde a bolha — senão viram dois sóis', () => {
  // com o sol de verdade nascendo a 24% da largura, a bolha do ícone virava
  // uma segunda esfera clara do mesmo tamanho ao lado dele
  assert.match(TELA, /function Halo\(\{ children, nu = false \}\)/);
  assert.match(TELA, /<Halo nu><Sunrise/);
  // e nas OUTRAS lâminas ela continua: lá o fundo não é o assunto
  assert.match(TELA, /<Halo><HeartHandshake/);
});
