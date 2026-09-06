// 🗂️ O NOSSO QUADRO dentro do Compromisso (DIR-75, 06/09/2026).
//
// O que estes testes protegem, em ordem de importância:
//   1. o cartão vira tarefa do dia UMA vez — repetir infla o dia e, como o
//      X-Pay rateia o fixo pelas tarefas, dinheiro repetido dilui o de todas;
//   2. mover é livre entre colunas que existem, e só entre elas;
//   3. o resumo não lê o relógio sozinho.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLUNAS_QUADRO, ORDEM_QUADRO, podeMoverCartao, moverCartao,
  tarefaDoCartao, resumoDoQuadro,
} from '../src/lib/quadroCompromisso.js';

describe('as colunas do quadro', () => {
  test('são quatro horizontes, na ordem em que o tempo anda', () => {
    assert.deepEqual(ORDEM_QUADRO, ['hoje', 'semana', 'depois', 'feito']);
    assert.equal(COLUNAS_QUADRO.length, 4);
  });

  test('mover é LIVRE entre colunas que existem — a mesa é pessoal', () => {
    assert.equal(podeMoverCartao('feito'), true);
    assert.equal(podeMoverCartao('hoje'), true);
    assert.equal(podeMoverCartao('inventada'), false);
  });

  test('mover devolve lista nova e não altera a original', () => {
    const antes = [{ id: 'a', coluna: 'depois', titulo: 'x' }];
    const depois = moverCartao(antes, 'a', 'hoje');
    assert.equal(antes[0].coluna, 'depois', 'a lista original foi mutada');
    assert.equal(depois[0].coluna, 'hoje');
  });

  test('destino inexistente, cartão inexistente ou mesma coluna: MESMA lista', () => {
    const antes = [{ id: 'a', coluna: 'hoje', titulo: 'x' }];
    assert.equal(moverCartao(antes, 'a', 'inventada'), antes);
    assert.equal(moverCartao(antes, 'nao-existe', 'feito'), antes);
    assert.equal(moverCartao(antes, 'a', 'hoje'), antes);
  });
});

describe('🔗 o cartão vira tarefa do dia', () => {
  const cartao = { id: 'c1', titulo: 'Pegar as pautas da reunião de amanhã', detalhe: 'com o time corporativo', coluna: 'hoje' };

  test('vira uma linha de tarefa do dia certo, da pessoa certa', () => {
    const t = tarefaDoCartao(cartao, { userId: 'u1', dataISO: '2026-09-07' });
    assert.equal(t.user_id, 'u1');
    assert.equal(t.data, '2026-09-07');
    assert.equal(t.titulo, 'Pegar as pautas da reunião de amanhã');
    assert.equal(t.detalhe, 'com o time corporativo');
    assert.equal(t.feito, false);
  });

  // 🔒 A TRAVA QUE PROTEGE O DINHEIRO
  test('cartão que JÁ virou tarefa não vira de novo', () => {
    const jaVirou = { ...cartao, virou_tarefa_id: 't-99' };
    assert.equal(tarefaDoCartao(jaVirou, { userId: 'u1', dataISO: '2026-09-07' }), null);
  });

  test('sem pessoa ou sem dia não inventa tarefa nenhuma', () => {
    assert.equal(tarefaDoCartao(cartao, { dataISO: '2026-09-07' }), null);
    assert.equal(tarefaDoCartao(cartao, { userId: 'u1' }), null);
    assert.equal(tarefaDoCartao(null, { userId: 'u1', dataISO: '2026-09-07' }), null);
  });

  test('a hora é opcional — cartão sem hora vira tarefa sem hora', () => {
    assert.equal(tarefaDoCartao(cartao, { userId: 'u1', dataISO: '2026-09-07' }).hora, null);
    assert.equal(tarefaDoCartao(cartao, { userId: 'u1', dataISO: '2026-09-07', hora: '10:30' }).hora, '10:30');
  });
});

describe('o resumo da mesa', () => {
  const cartoes = [
    { id: '1', coluna: 'hoje', prazo: '2026-09-01' },        // vencido
    { id: '2', coluna: 'semana', prazo: '2026-12-01' },
    { id: '3', coluna: 'feito', prazo: '2026-09-01' },        // feito não atrasa
    { id: '4', coluna: 'depois', virou_tarefa_id: 't1' },
  ];

  test('conta por coluna, abertos, atrasados e os que viraram tarefa', () => {
    const r = resumoDoQuadro(cartoes, '2026-09-07');
    assert.equal(r.total, 4);
    assert.equal(r.abertos, 3);
    assert.equal(r.porColuna.hoje, 1);
    assert.equal(r.porColuna.feito, 1);
    assert.equal(r.atrasados, 1, 'só o aberto e vencido atrasa');
    assert.equal(r.viraramTarefa, 1);
  });

  test('sem a data de hoje não inventa atraso', () => {
    assert.equal(resumoDoQuadro(cartoes).atrasados, 0);
  });

  test('quadro vazio não quebra', () => {
    const r = resumoDoQuadro([], '2026-09-07');
    assert.equal(r.total, 0);
    assert.equal(r.porColuna.hoje, 0);
  });
});
