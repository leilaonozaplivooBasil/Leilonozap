// Pra que lado o painel flutuante do X-Music abre (06/09/2026).
//
// HONESTIDADE SOBRE O QUE ESTES TESTES COBREM: o dono relatou "está movendo
// pra todo lado, porém não está abrindo". A causa era o CLIQUE, não o lado —
// a captura de ponteiro redirecionava o clique pra alça e o botão de dentro
// nunca era avisado (conserto em src/hooks/useArrastavel.js).
//
// A conta VERTICAL antiga (`y < altura/2`) foi medida antes de ser trocada:
// discorda da conta por espaço em apenas 4 pixels (y 450..453 numa janela de
// 900). Não era ali o defeito, e estes testes não fingem que era.
//
// O que ESTAVA faltando de verdade é a HORIZONTAL: o painel era sempre
// ancorado à esquerda, então arrastado pra beirada direita ele vazava pra fora
// da tela. É o caso que a mutação abaixo protege.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ladoDaAbertura, ALTURA_MINIMA_PAINEL } from '../src/lib/flutuante.js';

const JANELA = { larguraJanela: 1440, alturaJanela: 900 };

describe('lado da abertura do painel flutuante', () => {
  test('sem posição salva (canto de baixo), abre pra cima e pela esquerda', () => {
    const r = ladoDaAbertura({ x: null, y: null, ...JANELA });
    assert.equal(r.praBaixo, false);
    assert.equal(r.pelaDireita, false);
  });

  test('arrastada pro topo, abre pra BAIXO', () => {
    assert.equal(ladoDaAbertura({ x: 40, y: 90, ...JANELA }).praBaixo, true);
  });

  test('arrastada pro pé, abre pra CIMA', () => {
    assert.equal(ladoDaAbertura({ x: 40, y: 820, ...JANELA }).praBaixo, false);
  });

  test('o lado escolhido é sempre o que tem mais espaço', () => {
    // varre a tela inteira e confere a propriedade, em vez de cravar um ponto
    for (let y = 0; y < JANELA.alturaJanela; y += 10) {
      const r = ladoDaAbertura({ x: 40, y, ...JANELA });
      const acima = y - 80;
      const abaixo = JANELA.alturaJanela - y - 72;
      assert.equal(r.praBaixo, abaixo > acima, `errou em y=${y}`);
    }
  });

  test('o teto nunca fica menor que a altura mínima do painel', () => {
    assert.ok(ladoDaAbertura({ x: 40, y: 4, ...JANELA }).teto >= ALTURA_MINIMA_PAINEL);
    assert.ok(ladoDaAbertura({ x: 40, y: 896, ...JANELA }).teto >= ALTURA_MINIMA_PAINEL);
  });

  // 🎯 O QUE FALTAVA: sem isto o painel de 320px abria pra direita a partir de
  // x=1300 numa tela de 1440 e 180px dele ficavam fora da tela.
  test('arrastada pra beirada direita, ancora à direita e não vaza', () => {
    assert.equal(ladoDaAbertura({ x: 1300, y: 400, ...JANELA }).pelaDireita, true);
  });

  test('com folga à direita, continua ancorado à esquerda', () => {
    assert.equal(ladoDaAbertura({ x: 100, y: 400, ...JANELA }).pelaDireita, false);
  });

  test('nenhuma posição da tela faz o painel vazar pela direita', () => {
    for (let x = 0; x < JANELA.larguraJanela; x += 20) {
      const r = ladoDaAbertura({ x, y: 400, ...JANELA });
      const largura = Math.min(320, JANELA.larguraJanela * 0.88);
      const direitaDoPainel = r.pelaDireita ? x : x + largura;
      assert.ok(direitaDoPainel <= JANELA.larguraJanela, `vazou em x=${x}`);
    }
  });

  test('em tela estreita de celular a largura do painel encolhe junto', () => {
    // 88vw de 360 = 316,8: cabe a partir da esquerda. Com 320 fixo, ancoraria
    // à direita sem precisar.
    assert.equal(ladoDaAbertura({ x: 8, y: 300, larguraJanela: 360, alturaJanela: 740 }).pelaDireita, false);
  });
});
