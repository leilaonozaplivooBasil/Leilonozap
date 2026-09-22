/**
 * 🔎 QUEM VOCÊ ACABOU DE CADASTRAR TEM QUE APARECER.
 *
 * Pedido do Ávilla (22/09/2026): "os adicionados mais recentes devem ser vistos
 * primeiro, e alterados também".
 *
 * O defeito não era falta de ordenação — era a ordenação CERTA para outra
 * pergunta. A lista vinha por probabilidade de fechamento, e quem acabou de ser
 * cadastrado ainda não tem qualificação: probabilidade `null`, tratada como -1,
 * último lugar. Com 277 pessoas na base, a pessoa recém-adicionada simplesmente
 * sumia da tela — e quem cadastrou achava que não tinha salvado.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ordenarAgenda, mexidoEm, casaComTermo, ordemValida, ORDEM_PADRAO, ORDENS,
} from '../src/lib/ordemDaAgenda.js';

// 15/15 = 100%: a nota máxima da qualificação (ver probabilidadeFechamento)
const QUENTE = { confianca: 5, financeiro: 5, apetite: 5 };

const NOVO_SEM_NOTA = {
  id: 'novo', full_name: 'Zulmira Recém-Chegada',
  created_date: '2026-09-22T18:00:00Z', updated_date: '2026-09-22T18:00:00Z',
};
const VELHO_QUENTE = {
  id: 'velho', full_name: 'Abel Antigo', qualificacao_network: QUENTE,
  created_date: '2026-03-01T10:00:00Z', updated_date: '2026-03-01T10:00:00Z',
};

describe('ordem da agenda', () => {
  test('🔴 o recém-cadastrado SEM nota vem na frente do antigo com nota máxima', () => {
    const [primeiro] = ordenarAgenda([VELHO_QUENTE, NOVO_SEM_NOTA], { ordem: 'recentes' });
    assert.equal(primeiro.id, 'novo',
      'é o defeito do pedido: sem qualificação a pessoa caía pro fim e sumia da tela');
  });

  test('na ordem "quentes" o antigo com nota volta pra frente — as duas perguntas continuam existindo', () => {
    const [primeiro] = ordenarAgenda([NOVO_SEM_NOTA, VELHO_QUENTE], { ordem: 'quentes' });
    assert.equal(primeiro.id, 'velho');
  });

  test('ALTERAR alguém antigo sobe ele — "e alterados também"', () => {
    const antigoMexidoAgora = { ...VELHO_QUENTE, updated_date: '2026-09-22T19:00:00Z' };
    const [primeiro] = ordenarAgenda([NOVO_SEM_NOTA, antigoMexidoAgora], { ordem: 'recentes' });
    assert.equal(primeiro.id, 'velho',
      'a data de alteração tem que pesar mais que a de criação, senão editar um contato não o traz de volta');
  });

  test('empate de data desempata por nome, não pela sorte do render', () => {
    const a = { id: 'a', full_name: 'Bruno', updated_date: '2026-09-22T18:00:00Z' };
    const b = { id: 'b', full_name: 'Ana', updated_date: '2026-09-22T18:00:00Z' };
    const nomes = ordenarAgenda([a, b], { ordem: 'recentes' }).map((p) => p.full_name);
    assert.deepEqual(nomes, ['Ana', 'Bruno'],
      'importação de agenda cria várias pessoas no mesmo segundo; sem desempate a lista dança a cada render');
  });

  test('não mexe no array que recebeu', () => {
    const entrada = [VELHO_QUENTE, NOVO_SEM_NOTA];
    const copia = [...entrada];
    ordenarAgenda(entrada, { ordem: 'recentes' });
    assert.deepEqual(entrada, copia, 'ordenou por cima do estado de quem chamou');
  });

  test('a busca continua pegando nome, telefone e e-mail', () => {
    const gente = [
      { id: '1', full_name: 'João Paim', phone: '21999990000', email: 'joao@x.com' },
      { id: '2', full_name: 'Maria', phone: '21888880000', email: 'maria@y.com' },
    ];
    assert.equal(ordenarAgenda(gente, { termo: 'paim' }).length, 1);
    assert.equal(ordenarAgenda(gente, { termo: '88888' })[0].id, '2');
    assert.equal(ordenarAgenda(gente, { termo: 'y.com' })[0].id, '2');
    assert.equal(ordenarAgenda(gente, { termo: '  ' }).length, 2, 'só espaço não é busca');
  });

  test('busca e ordem trabalham juntas', () => {
    const gente = [
      { id: 'a', full_name: 'Paim Antigo', updated_date: '2026-01-01T00:00:00Z' },
      { id: 'b', full_name: 'Paim Novo', updated_date: '2026-09-22T00:00:00Z' },
      { id: 'c', full_name: 'Outro', updated_date: '2026-09-23T00:00:00Z' },
    ];
    const r = ordenarAgenda(gente, { termo: 'paim', ordem: 'recentes' });
    assert.deepEqual(r.map((p) => p.id), ['b', 'a'],
      'a busca filtra e a ordem vale DENTRO do filtrado');
  });

  describe('mexidoEm', () => {
    test('prefere a alteração à criação', () => {
      const p = { created_date: '2026-01-01T00:00:00Z', updated_date: '2026-09-01T00:00:00Z' };
      assert.equal(mexidoEm(p), new Date('2026-09-01T00:00:00Z').getTime());
    });

    test('cai pro created quando não há updated', () => {
      const p = { created_date: '2026-01-01T00:00:00Z' };
      assert.equal(mexidoEm(p), new Date('2026-01-01T00:00:00Z').getTime());
    });

    test('data podre não derruba a lista — vira 0 e vai pro fim', () => {
      assert.equal(mexidoEm({ updated_date: 'nao é data' }), 0);
      assert.equal(mexidoEm({}), 0);
      assert.equal(mexidoEm(null), 0);
    });

    test('data inválida no primeiro campo não impede o segundo de valer', () => {
      const p = { updated_date: 'lixo', created_date: '2026-02-02T00:00:00Z' };
      assert.equal(mexidoEm(p), new Date('2026-02-02T00:00:00Z').getTime(),
        'parar no primeiro campo presente jogaria pro fim quem só tem o campo velho bom');
    });
  });

  describe('bordas', () => {
    test('lista vazia e nula não quebram', () => {
      assert.deepEqual(ordenarAgenda([], {}), []);
      assert.deepEqual(ordenarAgenda(null, {}), []);
      assert.deepEqual(ordenarAgenda(undefined), []);
    });

    test('ordem desconhecida cai no padrão em vez de devolver lista sem ordem', () => {
      assert.equal(ordemValida('inventada'), ORDEM_PADRAO);
      assert.equal(ordemValida(undefined), ORDEM_PADRAO);
      assert.equal(ORDEM_PADRAO, 'recentes', 'o padrão é o que o pedido pediu');
      const [primeiro] = ordenarAgenda([VELHO_QUENTE, NOVO_SEM_NOTA], { ordem: 'inventada' });
      assert.equal(primeiro.id, 'novo');
    });

    test('as duas ordens estão declaradas e têm rótulo', () => {
      assert.deepEqual(ORDENS.map((o) => o.id), ['recentes', 'quentes']);
      for (const o of ORDENS) assert.ok(o.rotulo && o.dica, `ordem ${o.id} sem rótulo ou dica`);
    });

    test('casaComTermo sem termo aceita todo mundo', () => {
      assert.equal(casaComTermo({}, ''), true);
      assert.equal(casaComTermo({}, null), true);
      assert.equal(casaComTermo({ full_name: 'Ana' }, 'ana'), true);
      assert.equal(casaComTermo({ full_name: 'Ana' }, 'zzz'), false);
    });
  });
});

/**
 * 🔬 O contrato do array, escrito como teste e não como esperança.
 *
 * Na rodada de mutação, trocar `[...filtrados].sort` por `filtrados.sort` não
 * quebrou nada — e está certo que não quebre: `.filter()` já devolve array
 * novo. O teste abaixo não é sobre o spread, é sobre o CONTRATO: seja qual for
 * o caminho interno, o array que entrou tem que sair intocado. É ele que pega
 * o dia em que alguém curto-circuitar o filtro com um `if (!termo) return
 * pessoas;` e passar a ordenar o estado do componente por dentro.
 */
test('o contrato vale também no caminho SEM busca (onde o atalho apareceria)', () => {
  const entrada = [
    { id: 'a', full_name: 'Zeca', updated_date: '2026-01-01T00:00:00Z' },
    { id: 'b', full_name: 'Ana', updated_date: '2026-09-01T00:00:00Z' },
  ];
  const antes = entrada.map((p) => p.id);
  const saida = ordenarAgenda(entrada, { ordem: 'recentes' }); // sem termo: o caminho do atalho
  assert.deepEqual(saida.map((p) => p.id), ['b', 'a'], 'ordenou errado');
  assert.deepEqual(entrada.map((p) => p.id), antes,
    'a ordem do array de ENTRADA mudou — é o estado do componente sendo reordenado por dentro');
  assert.notEqual(saida, entrada, 'devolveu o MESMO array, não uma lista nova');
});
