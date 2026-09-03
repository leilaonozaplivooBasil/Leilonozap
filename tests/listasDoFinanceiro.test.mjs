// listasDoFinanceiro — a lista de Categoria e Centro de Custo do Financeiro.
//
// Pedido da Aline (05/09/2026): "Eu já criei alguns, sendo que não estão ficando salvos,
// estou tendo que criar a cada lançamento." O botão "+ Novo" nunca criou nada — gravava o
// texto naquele lançamento e sumia. Os casos abaixo saem do BANCO REAL de 05/09, que é
// onde o estrago está registrado: "custo fixo"/"Custo Fixo", "custo variável " com espaço,
// "Salario"/"salario" (15 lançamentos partidos em dois).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, chave, montarOpcoes, resolverGrafia } from '../src/lib/listasDoFinanceiro.js';

const COST_CENTERS = ['Leilões', 'Loja Virtual', 'Operacional'];
// exatamente o que estava gravado em financial_expenses em 05/09
const USADOS_REAIS = ['custo fixo', 'Custo Fixo', 'custo variável ', 'Distribuicao de lucro', 'investimento'];

describe('normalizar', () => {
  test('apara as pontas — o caso real do "custo variável "', () => {
    assert.equal(normalizar('custo variável '), 'custo variável');
    assert.equal(normalizar('  Aluguel Escritório  '), 'Aluguel Escritório');
  });

  test('colapsa espaço repetido no meio', () => {
    assert.equal(normalizar('Custo    Fixo'), 'Custo Fixo');
    assert.equal(normalizar('Distribuição\tde\nLucro'), 'Distribuição de Lucro');
  });

  test('lixo não vira texto nem estoura', () => {
    for (const ruim of [null, undefined, {}, [], true, () => {}]) {
      assert.equal(normalizar(ruim), '', `${String(ruim)} devia virar string vazia`);
    }
    // String(Symbol()) LANÇA — é o buraco que os testes do relogioLeilao acharam
    assert.equal(normalizar(Symbol('x')), '');
  });

  test('número vira texto, porque é o que a pessoa vê no campo', () => {
    assert.equal(normalizar(2026), '2026');
  });
});

describe('chave', () => {
  test('ignora maiúscula e acento — é o que junta as variantes', () => {
    assert.equal(chave('Custo Fixo'), chave('custo fixo'));
    assert.equal(chave('Distribuição de Lucro'), chave('Distribuicao de lucro'));
    assert.equal(chave('alimentação'), chave('Alimentacao'));
    assert.equal(chave('Cartão de Crédito'), chave('cartao de credito'));
  });

  test('não junta o que é realmente diferente', () => {
    assert.notEqual(chave('Custo Fixo'), chave('Custo Variável'));
    assert.notEqual(chave('Reembolso'), chave('Estorno'));
  });

  test('a chave nunca é o que se grava: ela é só para comparar', () => {
    // se alguém trocar resolverGrafia por chave(), este teste denuncia
    assert.equal(chave('Distribuição de Lucro'), 'distribuicao de lucro');
    assert.notEqual(resolverGrafia('Distribuição de Lucro', []), 'distribuicao de lucro');
  });
});

describe('montarOpcoes', () => {
  test('as de fábrica vêm primeiro, na ordem escrita', () => {
    const r = montarOpcoes(COST_CENTERS, USADOS_REAIS);
    assert.deepEqual(r.slice(0, 3), ['Leilões', 'Loja Virtual', 'Operacional']);
  });

  test('o que ela já usou aparece — é o pedido inteiro dela', () => {
    const r = montarOpcoes(COST_CENTERS, USADOS_REAIS);
    assert.ok(r.includes('Distribuicao de lucro'), `faltou o que ela criou: ${r}`);
    assert.ok(r.includes('investimento'));
  });

  test('"custo fixo" e "Custo Fixo" viram UMA linha só', () => {
    const r = montarOpcoes(COST_CENTERS, USADOS_REAIS);
    const quantos = r.filter(o => chave(o) === chave('custo fixo')).length;
    assert.equal(quantos, 1, `o mesmo centro apareceu ${quantos}x: ${r}`);
  });

  test('o espaço do fim não cria uma opção a mais', () => {
    const r = montarOpcoes([], ['custo variável', 'custo variável ']);
    assert.deepEqual(r, ['custo variável']);
  });

  test('a de fábrica ganha da usada quando as duas têm a mesma chave', () => {
    const r = montarOpcoes(['Loja Virtual'], ['loja virtual']);
    assert.deepEqual(r, ['Loja Virtual']);
  });

  test('os usados saem em ordem de gente, com acento no lugar certo', () => {
    const r = montarOpcoes([], ['Zebra', 'Água', 'Estorno']);
    assert.deepEqual(r, ['Água', 'Estorno', 'Zebra']);
  });

  test('junta várias listas — gastos E receitas alimentam o mesmo dropdown', () => {
    const r = montarOpcoes([], ['custo fixo'], ['Loja Virtual'], ['Leilões']);
    assert.equal(r.length, 3);
    assert.ok(r.includes('Loja Virtual') && r.includes('Leilões'));
  });

  test('vazio, nulo e lixo não viram opção', () => {
    const r = montarOpcoes(COST_CENTERS, [null, '', '   ', undefined, {}]);
    assert.deepEqual(r, COST_CENTERS);
  });

  test('não estoura quando não recebe lista nenhuma', () => {
    assert.deepEqual(montarOpcoes(), []);
    assert.deepEqual(montarOpcoes(null, null), []);
  });
});

describe('resolverGrafia', () => {
  test('o caso que motivou tudo: reaproveita a grafia que já existe', () => {
    const ops = montarOpcoes(COST_CENTERS, USADOS_REAIS);
    assert.equal(resolverGrafia('CUSTO FIXO', ops), 'custo fixo');
    assert.equal(resolverGrafia('Distribuição de Lucro', ops), 'Distribuicao de lucro');
  });

  test('valor novo de verdade passa como ela escreveu, só aparado', () => {
    const ops = montarOpcoes(COST_CENTERS, USADOS_REAIS);
    assert.equal(resolverGrafia('  Dividendos  ', ops), 'Dividendos');
    assert.equal(resolverGrafia('Reembolso', ops), 'Reembolso');
    assert.equal(resolverGrafia('Estorno', ops), 'Estorno');
  });

  test('centro de custo é opcional: vazio continua vazio, não vira lixo', () => {
    const ops = montarOpcoes(COST_CENTERS, USADOS_REAIS);
    for (const nada of ['', '   ', null, undefined]) {
      assert.equal(resolverGrafia(nada, ops), '');
    }
  });

  test('sem lista de opções, devolve o texto normalizado em vez de estourar', () => {
    assert.equal(resolverGrafia('  Custo  Fixo ', undefined), 'Custo Fixo');
    assert.equal(resolverGrafia('Estorno', null), 'Estorno');
  });

  test('duas digitações diferentes do mesmo centro convergem para a MESMA string', () => {
    // é isto que impede o relatório de rachar em duas linhas
    const ops = montarOpcoes([], ['Custo Fixo']);
    assert.equal(resolverGrafia('custo fixo', ops), resolverGrafia('CUSTO  FIXO ', ops));
  });
});
