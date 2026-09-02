// "É necessária a função de arrastar para o lado ou setas para conseguir ver as
//  demais ofertas." — 02/09/2026.
//
// O rolo antigo era `@keyframes` + `translateX(-50%)` dentro de um
// `overflow-hidden`. TRANSFORM NÃO É ROLAGEM: não há o que arrastar, e seta
// nenhuma tem onde agir. Virou rolagem de verdade (`overflow-x-auto`).
//
// A lista é desenhada DUAS vezes, então o desenho se repete a cada METADE da
// largura — e voltar exatamente uma metade é invisível. É esse truque que faz a
// faixa parecer não ter fim, e é a única parte que erra CALADA: meia metade a
// mais ou a menos e o cliente vê a faixa pular.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avancoAutomatico, posicaoAntesDaSeta, periodoDaFaixa } from '../src/lib/carrosselInfinito.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// 12 ofertas desenhadas duas vezes: 24 cards de 162px = 3888px numa tela de 900.
const FAIXA = { scrollWidth: 3888, clientWidth: 900 };
const MEIA = 1944;
const V = 34;        // px/s
const QUADRO = 1000 / 60;

// ─────────────── o rolo sozinho ───────────────

test('a fração de pixel é acumulada — senão a faixa TRAVA em quem arredonda', () => {
  // 34 px/s a 60fps dá ~0,57px por quadro. Se o resto fosse jogado fora, todo
  // quadro andaria zero e a faixa ficaria parada para sempre.
  let est = { scrollLeft: 0, resto: 0 };
  for (let i = 0; i < 60; i++) {
    est = avancoAutomatico({ ...FAIXA, ...est, dt: QUADRO, velocidade: V });
  }
  assert.ok(est.scrollLeft >= 33 && est.scrollLeft <= 35, `andou ${est.scrollLeft}px em 1s (esperado ~34)`);
  assert.equal(Number.isInteger(est.scrollLeft), true, 'scrollLeft tem de sair inteiro');
});

test('a volta acontece em exatamente um período — é isso que a torna invisível', () => {
  const antes = { scrollLeft: MEIA - 1, resto: 0.99 };
  const depois = avancoAutomatico({ ...FAIXA, ...antes, dt: QUADRO, velocidade: V });
  assert.ok(depois.scrollLeft < MEIA, `não deu a volta: ${depois.scrollLeft}`);
  // o que está na tela depois tem de ser o MESMO de antes, a menos do período
  const equivalente = (depois.scrollLeft + MEIA) % MEIA;
  assert.equal(Math.round(equivalente), Math.round((antes.scrollLeft + 1) % MEIA));
});

test('nunca ultrapassa o fim da faixa, quantas voltas der', () => {
  let est = { scrollLeft: 0, resto: 0 };
  for (let i = 0; i < 60 * 300; i++) {  // 5 minutos de rolo
    est = avancoAutomatico({ ...FAIXA, ...est, dt: QUADRO, velocidade: V });
    assert.ok(est.scrollLeft >= 0 && est.scrollLeft < FAIXA.scrollWidth,
      `saiu da faixa: ${est.scrollLeft}`);
  }
});

test('aba em segundo plano não dá salto na volta', () => {
  // Sem teto, um dt de 30s daria 1.020px de uma vez e a faixa saltaria na cara.
  const est = avancoAutomatico({ ...FAIXA, scrollLeft: 0, resto: 0, dt: 30000, velocidade: V });
  assert.ok(est.scrollLeft <= 4, `andou ${est.scrollLeft}px de uma vez (teto é 100ms)`);
});

test('faixa que cabe inteira na tela não rola', () => {
  const est = avancoAutomatico({ scrollWidth: 800, clientWidth: 900, scrollLeft: 0, resto: 0, dt: QUADRO, velocidade: V });
  assert.equal(est.scrollLeft, 0);
});

test('lixo não move a faixa nem explode', () => {
  for (const v of [{}, { scrollLeft: NaN }, { scrollWidth: null }, { dt: -5 }, { velocidade: undefined }]) {
    assert.doesNotThrow(() => avancoAutomatico({ ...FAIXA, scrollLeft: 0, resto: 0, dt: QUADRO, velocidade: V, ...v }));
  }
  assert.equal(periodoDaFaixa(0), 0);
  assert.equal(periodoDaFaixa(NaN), 0);
  assert.equal(periodoDaFaixa(-10), 0);
});

// ─────────────── as setas ───────────────

test('a seta NÃO morre na ponta da faixa', () => {
  // Era este o risco: o cliente clica na seta no fim e nada acontece.
  const naPonta = FAIXA.scrollWidth - FAIXA.clientWidth;   // 2988
  const pulou = posicaoAntesDaSeta({ ...FAIXA, scrollLeft: naPonta, dir: 1 });
  assert.equal(pulou, naPonta - MEIA);
  assert.ok(pulou + FAIXA.clientWidth < FAIXA.scrollWidth - 4, 'ainda está colado no fim');
  // e o pulo é de um período inteiro, então não aparece
  assert.equal((naPonta - pulou), MEIA);
});

test('a seta da esquerda funciona no começo da faixa', () => {
  const pulou = posicaoAntesDaSeta({ ...FAIXA, scrollLeft: 0, dir: -1 });
  assert.equal(pulou, MEIA);
  assert.ok(pulou > 0, 'não deu para voltar: a seta da esquerda estaria morta');
});

test('no meio da faixa a seta não pula nada', () => {
  for (const dir of [1, -1]) {
    assert.equal(posicaoAntesDaSeta({ ...FAIXA, scrollLeft: 1000, dir }), 1000);
  }
});

test('faixa que não dá volta não pula', () => {
  assert.equal(posicaoAntesDaSeta({ scrollWidth: 800, clientWidth: 900, scrollLeft: 0, dir: 1 }), 0);
  assert.doesNotThrow(() => posicaoAntesDaSeta({}));
});

// ─────────────── a tela usa mesmo rolagem, e não transform ───────────────

const tela = ler('../src/components/loja/OfertasRelampago.jsx');

test('a faixa é rolagem de verdade, não animação de transform', () => {
  assert.match(tela, /overflow-x-auto/, 'a faixa voltou a não rolar');
  // procura o CÓDIGO do marquee antigo, não a prosa que explica por que ele saiu:
  // `translateX` e `@keyframes` aparecem no comentário do topo do arquivo.
  assert.ok(!/ofr-marquee/.test(tela), 'voltou o marquee de transform: não dá para arrastar');
  assert.ok(!/animation:\s*ofrMarquee/.test(tela), 'voltou a animação CSS no lugar da rolagem');
  assert.match(tela, /from '@\/lib\/carrosselInfinito'/, 'a conta da volta saiu do lugar testado');
});

test('as duas setas existem e são anunciadas para leitor de tela', () => {
  assert.match(tela, /aria-label="Ver ofertas anteriores"/);
  assert.match(tela, /aria-label="Ver mais ofertas"/);
});

test('arrastar com o mouse não abre o produto sem querer', () => {
  // Sem isto, soltar o mouse em cima de um card depois de arrastar abre o produto.
  assert.match(tela, /onClickCapture=/, 'o clique depois do arrasto não é barrado');
  assert.match(tela, /arrastou\.current = true/);
});

test('o arrasto é só do mouse — no toque quem rola é o navegador', () => {
  // Sequestrar o toque troca a inércia nativa do celular por algo pior.
  assert.match(tela, /e\.pointerType !== 'mouse'/, 'o arrasto passou a mexer no toque');
});

test('o rolo sozinho para quando a pessoa mexe', () => {
  assert.match(tela, /onTouchStart=\{adiar\}/);
  assert.match(tela, /onWheel=\{adiar\}/);
  assert.match(tela, /onMouseEnter=/);
  assert.match(tela, /RETOMAR_APOS_MS/);
});

test('quem pediu menos animação não recebe rolo automático', () => {
  assert.match(tela, /prefers-reduced-motion: reduce/);
});
