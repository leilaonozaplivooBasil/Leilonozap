/**
 * 🧠 A CAIXA DE ENTRADA DA MENTE — a aba Demandas do Compromisso.
 *
 * Pedido do dono (áudio de 19/09/2026, 10h32):
 *   "eu abri o compromisso, já vai aparecer ali um lugar com as demandas que
 *    eu posso transformar em tarefa"
 *   "entra numa lista COM A DATA DO DIA QUE FOI ANOTADO"
 *
 * O risco desta peça não é o desenho: é a demanda sumir do agrupamento — ou
 * aparecer no dia errado, que é a mesma coisa para quem procura por dia.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  caixaDeEntrada, porDiaDeAnotacao, diaDe, rotuloDoDia, quantasEsperando,
  RECEBIDA,
} from '../src/lib/demandas.js';

const d = (over = {}) => ({
  id: 'd1', titulo: 'ligar pro fornecedor', status: RECEBIDA,
  created_at: '2026-09-19T13:32:00Z', origem: 'mapa', ...over,
});

describe('caixaDeEntrada — só o que ainda espera destino', () => {
  test('mostra as recebidas', () => {
    assert.equal(caixaDeEntrada([d(), d({ id: 'd2' })]).length, 2);
  });

  test('esconde o que já virou tarefa ou foi devolvido', () => {
    // 'agendada' já é trabalho e vive no quadro; 'devolvida' foi recusada.
    // Deixar as duas na caixa faria a lista crescer para sempre.
    const fila = [d(), d({ id: 'd2', status: 'agendada' }), d({ id: 'd3', status: 'devolvida' })];
    assert.deepEqual(caixaDeEntrada(fila).map((x) => x.id), ['d1']);
  });

  test('linha sem título fica de fora', () => {
    const fila = [d(), d({ id: 'd2', titulo: '' }), d({ id: 'd3', titulo: '   ' }), d({ id: 'd4', titulo: null })];
    assert.deepEqual(caixaDeEntrada(fila).map((x) => x.id), ['d1']);
  });

  test('mais recente primeiro', () => {
    const fila = [
      d({ id: 'velha', created_at: '2026-09-17T10:00:00Z' }),
      d({ id: 'nova', created_at: '2026-09-19T10:00:00Z' }),
    ];
    assert.deepEqual(caixaDeEntrada(fila).map((x) => x.id), ['nova', 'velha']);
  });

  test('empate de horário desempata por título, não fica ao acaso', () => {
    // sem desempate, duas demandas do mesmo segundo trocariam de lugar a cada
    // render e a lista "piscaria" sozinha na frente do dono.
    const fila = [d({ id: 'b', titulo: 'zebra' }), d({ id: 'a', titulo: 'abacaxi' })];
    assert.deepEqual(caixaDeEntrada(fila).map((x) => x.titulo), ['abacaxi', 'zebra']);
  });

  test('aguenta lista nula e buracos', () => {
    assert.deepEqual(caixaDeEntrada(null), []);
    assert.deepEqual(caixaDeEntrada(undefined), []);
    assert.equal(caixaDeEntrada([null, undefined, d()]).length, 1);
  });
});

describe('diaDe — o fuso da casa', () => {
  test('🔴 21h de Brasília ainda é HOJE, não amanhã', () => {
    // 2026-09-19T23:30Z é 20h30 de Brasília do dia 19. Sem forçar o fuso, o
    // JS em UTC diria 19 — mas às 21h BRT (00:00Z do dia 20) diria 20, e a
    // demanda ditada na reunião da noite apareceria agrupada em "amanhã".
    assert.equal(diaDe('2026-09-20T02:30:00Z'), '2026-09-19', 'virou o dia cedo demais');
    assert.equal(diaDe('2026-09-19T23:30:00Z'), '2026-09-19');
  });

  test('depois das 03h UTC já é o dia seguinte em Brasília', () => {
    assert.equal(diaDe('2026-09-20T03:30:00Z'), '2026-09-20');
  });

  test('data ilegível devolve vazio em vez de "Invalid Date"', () => {
    for (const ruim of [null, undefined, '', 'ontem', NaN]) {
      assert.equal(diaDe(ruim), '', `quebrou com ${String(ruim)}`);
    }
  });
});

describe('porDiaDeAnotacao — a lista com a data', () => {
  const fila = [
    d({ id: 'a', created_at: '2026-09-19T13:00:00Z' }),
    d({ id: 'b', created_at: '2026-09-19T18:00:00Z' }),
    d({ id: 'c', created_at: '2026-09-17T09:00:00Z' }),
  ];

  test('agrupa por dia, do mais recente ao mais antigo', () => {
    const grupos = porDiaDeAnotacao(fila);
    assert.deepEqual(grupos.map((g) => g.dia), ['2026-09-19', '2026-09-17']);
    assert.equal(grupos[0].demandas.length, 2);
    assert.equal(grupos[1].demandas.length, 1);
  });

  test('dentro do dia, a mais recente primeiro', () => {
    assert.deepEqual(porDiaDeAnotacao(fila)[0].demandas.map((x) => x.id), ['b', 'a']);
  });

  test('nenhuma demanda some no agrupamento', () => {
    // a conta que protege contra o pior defeito desta tela: perder anotação.
    const grupos = porDiaDeAnotacao(fila);
    const total = grupos.reduce((n, g) => n + g.demandas.length, 0);
    assert.equal(total, caixaDeEntrada(fila).length);
  });

  test('caixa vazia devolve lista vazia, não um grupo fantasma', () => {
    assert.deepEqual(porDiaDeAnotacao([]), []);
    assert.deepEqual(porDiaDeAnotacao(null), []);
    assert.deepEqual(porDiaDeAnotacao([d({ status: 'agendada' })]), []);
  });
});

describe('rotuloDoDia', () => {
  const HOJE = '2026-09-19';

  test('hoje e ontem têm nome, não data', () => {
    assert.equal(rotuloDoDia('2026-09-19', HOJE), 'Hoje');
    assert.equal(rotuloDoDia('2026-09-18', HOJE), 'Ontem');
  });

  test('ontem atravessa a virada do mês', () => {
    assert.equal(rotuloDoDia('2026-08-31', '2026-09-01'), 'Ontem');
  });

  test('mais antigo vira data brasileira', () => {
    assert.equal(rotuloDoDia('2026-09-15', HOJE), '15/09/2026');
  });

  test('sem dia não inventa rótulo', () => {
    assert.equal(rotuloDoDia('', HOJE), 'Sem data');
    assert.equal(rotuloDoDia(null, HOJE), 'Sem data');
  });
});

describe('quantasEsperando — a bolinha da aba', () => {
  test('conta só as que esperam', () => {
    assert.equal(quantasEsperando([d(), d({ id: 'd2' }), d({ id: 'd3', status: 'agendada' })]), 2);
  });

  test('zero quando não há nada', () => {
    assert.equal(quantasEsperando([]), 0);
    assert.equal(quantasEsperando(null), 0);
  });
});
