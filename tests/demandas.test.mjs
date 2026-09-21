/**
 * 🧠 A CAIXA DE ENTRADA DA MENTE.
 *
 * Pedido do dono (áudio de 19/09/2026): esvaziar a mente numa lista com a data
 * do dia em que foi anotado, e dali direcionar para o quadro.
 *
 * O risco desta peça não é o desenho. É PERDER uma anotação, ou criar duas
 * tarefas a partir da mesma — e aí o dono vê trabalho que não existe.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  caixaDeEntrada, porDiaDeAnotacao, diaDe, podeVirarTarefa, cartaoDaDemanda,
  quantasEsperando, rotuloDaOrigem, ABERTA, VIROU_TAREFA, DESCARTADA,
} from '../src/lib/demandas.js';

const d = (over = {}) => ({
  id: 'd1', user_id: 'u1', titulo: 'ligar pro fornecedor',
  estado: ABERTA, anotada_em: '2026-09-19T13:32:00Z', ...over,
});

describe('o que aparece na caixa', () => {
  test('só o que ainda espera destino', () => {
    const caixa = caixaDeEntrada([
      d({ id: 'a' }),
      d({ id: 'b', estado: VIROU_TAREFA }),
      d({ id: 'c', estado: DESCARTADA }),
    ]);
    assert.deepEqual(caixa.map((x) => x.id), ['a']);
  });

  test('🔴 demanda sem título não entra — seria uma linha em branco na lista', () => {
    for (const vazio of ['', '   ', null, undefined]) {
      assert.equal(caixaDeEntrada([d({ titulo: vazio })]).length, 0, `aceitou ${JSON.stringify(vazio)}`);
    }
  });

  test('mais recente primeiro', () => {
    const caixa = caixaDeEntrada([
      d({ id: 'velha', anotada_em: '2026-09-18T10:00:00Z' }),
      d({ id: 'nova', anotada_em: '2026-09-19T10:00:00Z' }),
    ]);
    assert.deepEqual(caixa.map((x) => x.id), ['nova', 'velha']);
  });

  test('🔴 ordena pela data da ANOTAÇÃO, não pela de criação da linha', () => {
    // Uma demanda ditada ontem à noite e sincronizada hoje foi anotada ONTEM, e
    // é na noite de ontem que o dono vai procurar por ela.
    const caixa = caixaDeEntrada([
      d({ id: 'ditada-ontem', anotada_em: '2026-09-18T22:00:00Z', created_at: '2026-09-19T09:00:00Z' }),
      d({ id: 'digitada-hoje', anotada_em: '2026-09-19T08:00:00Z', created_at: '2026-09-19T08:00:00Z' }),
    ]);
    assert.deepEqual(caixa.map((x) => x.id), ['digitada-hoje', 'ditada-ontem']);
  });

  test('sem anotada_em, cai no created_at em vez de sumir', () => {
    const caixa = caixaDeEntrada([d({ anotada_em: null, created_at: '2026-09-19T10:00:00Z' })]);
    assert.equal(caixa.length, 1, 'a demanda sumiu por falta de um campo');
  });

  test('lixo na entrada não derruba a caixa', () => {
    assert.doesNotThrow(() => caixaDeEntrada([null, undefined, {}, 'texto', 42]));
    assert.equal(caixaDeEntrada(null).length, 0);
  });
});

describe('agrupado por dia, como o dono pediu', () => {
  test('cada dia com as suas, do mais recente ao mais antigo', () => {
    const dias = porDiaDeAnotacao([
      d({ id: 'a', anotada_em: '2026-09-19T13:00:00Z' }),
      d({ id: 'b', anotada_em: '2026-09-19T18:00:00Z' }),
      d({ id: 'c', anotada_em: '2026-09-18T13:00:00Z' }),
    ]);
    assert.deepEqual(dias.map((x) => x.dia), ['2026-09-19', '2026-09-18']);
    assert.equal(dias[0].demandas.length, 2);
  });

  test('🔴 o dia é o de São Paulo, não o de Greenwich', () => {
    // 02:00 UTC de dia 20 é ainda 23:00 do dia 19 no Brasil. Errar isto joga a
    // anotação da noite para o dia seguinte, e o dono não acha.
    assert.equal(diaDe('2026-09-20T02:00:00Z'), '2026-09-19');
    assert.equal(diaDe('2026-09-20T12:00:00Z'), '2026-09-20');
  });

  test('data ilegível não quebra o agrupamento', () => {
    assert.equal(diaDe('ontem'), '');
    assert.equal(diaDe(null), '');
    assert.doesNotThrow(() => porDiaDeAnotacao([d({ anotada_em: 'ontem' })]));
  });
});

describe('🔒 a trava contra tarefa duplicada', () => {
  test('demanda aberta pode virar tarefa', () => {
    assert.equal(podeVirarTarefa(d()).pode, true);
  });

  test('🔴 a que JÁ virou tarefa não vira de novo', () => {
    // Dois cliques no botão, ou o mesmo botão em duas abas abertas, criariam
    // dois cartões para a mesma anotação.
    assert.equal(podeVirarTarefa(d({ estado: VIROU_TAREFA })).pode, false);
  });

  test('🔴 a que já tem cartão também não — mesmo que o estado não tenha sido gravado', () => {
    // Cinto e suspensório: se a gravação do estado falhar depois de o cartão
    // nascer, o `cartao_id` ainda barra a segunda tentativa.
    const v = podeVirarTarefa(d({ estado: ABERTA, cartao_id: 'c123' }));
    assert.equal(v.pode, false);
    assert.equal(v.motivo, 'ja_tem_cartao');
  });

  test('descartada não volta como tarefa', () => {
    assert.equal(podeVirarTarefa(d({ estado: DESCARTADA })).pode, false);
  });

  test('sem título ou sem demanda, não passa', () => {
    assert.equal(podeVirarTarefa(d({ titulo: '  ' })).pode, false);
    assert.equal(podeVirarTarefa(null).pode, false);
  });
});

describe('o cartão que nasce da demanda', () => {
  test('leva o título e nasce aberto', () => {
    const c = cartaoDaDemanda(d(), { userId: 'u1' });
    assert.equal(c.titulo, 'ligar pro fornecedor');
    assert.equal(c.coluna, 'aberto');
    assert.equal(c.user_id, 'u1');
  });

  test('🔴 o detalhe vira o primeiro item do checklist, em vez de sumir', () => {
    // Foi ditado por algum motivo. Cartão só com título perde o motivo.
    const c = cartaoDaDemanda(d({ detalhe: 'confirmar o prazo de 7 dias' }), { userId: 'u1' });
    assert.deepEqual(c.checklist, [{ texto: 'confirmar o prazo de 7 dias', feito: false }]);
  });

  test('sem detalhe, checklist vazio — e não um item em branco', () => {
    assert.deepEqual(cartaoDaDemanda(d(), { userId: 'u1' }).checklist, []);
    assert.deepEqual(cartaoDaDemanda(d({ detalhe: '   ' }), { userId: 'u1' }).checklist, []);
  });

  test('🔴 guarda de qual demanda nasceu — é o rastro de volta', () => {
    const c = cartaoDaDemanda(d({ id: 'dem-9' }), { userId: 'u1' });
    assert.equal(c.origem_demanda_id, 'dem-9');
  });

  test('o prazo da demanda passa para o cartão', () => {
    assert.equal(cartaoDaDemanda(d({ prazo: '2026-09-25' }), { userId: 'u1' }).prazo, '2026-09-25');
  });

  test('sem título, não nasce cartão nenhum', () => {
    assert.equal(cartaoDaDemanda(d({ titulo: '' }), { userId: 'u1' }), null);
    assert.equal(cartaoDaDemanda(null, { userId: 'u1' }), null);
  });
});

describe('detalhes da tela', () => {
  test('a bolinha conta só o que espera', () => {
    assert.equal(quantasEsperando([d(), d({ id: 'b', estado: VIROU_TAREFA }), d({ id: 'c' })]), 2);
  });

  test('cada origem tem um rótulo próprio, e nenhum fica vazio', () => {
    const vistos = new Set();
    for (const o of ['app', 'whatsapp', 'mapa', 'encontro']) {
      const r = rotuloDaOrigem(o);
      assert.ok(r && r.trim(), `origem ${o} ficou sem rótulo`);
      vistos.add(r);
    }
    assert.equal(vistos.size, 4, 'duas origens dividem o mesmo rótulo');
  });

  test('origem desconhecida não deixa a tela sem texto', () => {
    assert.ok(rotuloDaOrigem('inventada').trim());
  });
});
