// 🏛️ DIR-73 — as agendas da casa dentro do agendador (06/09/2026).
//
// O que estes testes protegem, em ordem de importância:
//   1. a permissão: agenda de diretoria não vaza pra quem não é diretoria —
//      nem no catálogo que se escolhe, nem na agenda do dia que se lê;
//   2. o destino da gravação: a agenda vira linha de `reunioes_empresa`, com
//      recorrência resolvida (ou dia da semana, ou data — nunca os dois);
//   3. o catálogo ditado pelo dono, inteiro, sem sumir item no meio de um
//      refactor.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENDAS_EMPRESA, FAMILIAS_AGENDA, agendaPorId, agendasVisiveis,
  podeVerAgenda, linhaDaAgenda,
} from '../src/lib/agendaEmpresa.js';
import { reunioesEmpresaDoDia } from '../src/lib/metodo.js';

describe('o catálogo das agendas da casa', () => {
  test('as OITO que o dono ditou estão todas lá, com o nome que ele usou', () => {
    // esta lista é a ordem dele, palavra por palavra. Se alguém renomear
    // "Treinamento X-eos" pra "Treinamento Xeos" num refactor, quebra aqui.
    const ditadas = [
      'Mentalidade do Executivo', 'Onboarding', 'Mentalidade do Diretor',
      'Mentalidade do CEO', 'Eventos Top College', 'Treinamento X-eos',
      'Reunião com Marketing', 'Reunião com Financeiro',
    ];
    const nomes = AGENDAS_EMPRESA.filter((a) => a.origem === 'dono').map((a) => a.nome);
    assert.deepEqual(nomes, ditadas);
  });

  test('toda agenda diz quem a inventou — ordem do dono ou proposta minha', () => {
    // sem isso o dono não consegue cortar as minhas sem lembrar quais eram
    assert.ok(AGENDAS_EMPRESA.every((a) => a.origem === 'dono' || a.origem === 'proposta'));
    assert.ok(AGENDAS_EMPRESA.some((a) => a.origem === 'proposta'));
  });

  test('toda agenda traz a cadência pronta: dia, hora e duração válidos', () => {
    for (const a of AGENDAS_EMPRESA) {
      assert.ok(a.dia_semana >= 0 && a.dia_semana <= 6, `${a.nome}: dia_semana fora da semana`);
      assert.match(a.hora, /^\d{2}:\d{2}$/, `${a.nome}: hora malformada`);
      assert.ok(a.duracao_min > 0, `${a.nome}: duração sem valor`);
      assert.ok(FAMILIAS_AGENDA.some((f) => f.id === a.familia), `${a.nome}: família desconhecida`);
    }
  });

  test('id é único — id repetido faria uma agenda esconder a outra', () => {
    assert.equal(new Set(AGENDAS_EMPRESA.map((a) => a.id)).size, AGENDAS_EMPRESA.length);
  });

  test('agendaPorId acha a certa e não inventa nada', () => {
    assert.equal(agendaPorId('mentalidade-ceo').nome, 'Mentalidade do CEO');
    assert.equal(agendaPorId('nao-existe'), null);
    assert.equal(agendaPorId(undefined), null);
  });
});

describe('🔒 quem enxerga o quê', () => {
  test('agenda de diretoria some do catálogo de quem não é diretoria', () => {
    const nomes = (v) => agendasVisiveis({ visaoTotal: v }).flatMap((g) => g.itens).map((a) => a.nome);
    const deTodos = nomes(false);
    const deTudo = nomes(true);
    assert.ok(!deTodos.includes('Mentalidade do Diretor'));
    assert.ok(!deTodos.includes('Reunião com Financeiro'));
    assert.ok(deTudo.includes('Mentalidade do Diretor'));
    // e o que é de todo mundo continua aparecendo pros dois
    assert.ok(deTodos.includes('Mentalidade do Executivo'));
    assert.ok(deTodos.includes('Onboarding'));
  });

  test('agenda sem `publico` declarado é de todo mundo — o silêncio não tranca', () => {
    assert.equal(podeVerAgenda({ nome: 'X' }, { visaoTotal: false }), true);
    assert.equal(podeVerAgenda({ publico: 'diretoria' }, { visaoTotal: false }), false);
    assert.equal(podeVerAgenda({ publico: 'diretoria' }, { visaoTotal: true }), true);
  });

  test('o catálogo vem agrupado por família, sem grupo vazio na tela', () => {
    const grupos = agendasVisiveis({ visaoTotal: false });
    assert.ok(grupos.length > 0);
    assert.ok(grupos.every((g) => g.itens.length > 0));
  });

  // 🔒 o vazamento que interessa: não basta esconder na hora de ESCOLHER,
  // tem que sumir da agenda de quem abre o dia
  test('reunião de diretoria não aparece na agenda do dia de quem não é diretoria', () => {
    const lista = [
      { id: 'a', titulo: 'Mentalidade do Diretor', dia_semana: 1, hora: '19:30', publico: 'diretoria' },
      { id: 'b', titulo: 'Onboarding', dia_semana: 1, hora: '19:00', publico: 'todos' },
    ];
    const segunda = '2026-09-07';
    assert.deepEqual(reunioesEmpresaDoDia(lista, segunda, { visaoTotal: false }).map((r) => r.id), ['b']);
    assert.deepEqual(reunioesEmpresaDoDia(lista, segunda, { visaoTotal: true }).map((r) => r.id), ['b', 'a']);
  });

  test('quem já chamava sem a régua continua vendo o que via (DIR-52 intacta)', () => {
    const lista = [{ id: 'a', titulo: 'Reunião', dia_semana: 1, hora: '09:00' }];
    assert.equal(reunioesEmpresaDoDia(lista, '2026-09-07').length, 1);
  });
});

describe('a agenda escolhida vira linha de reunioes_empresa', () => {
  const agenda = agendaPorId('mentalidade-diretor');

  test('semanal grava o dia da semana e NÃO grava data', () => {
    const l = linhaDaAgenda(agenda, { recorrencia: 'semana', dia_semana: 1, data: '2026-09-07', hora: '19:30', duracao_min: 90 });
    assert.equal(l.dia_semana, 1);
    // guardar os dois deixaria o banco escolher depois qual vale
    assert.equal(l.data, null);
    assert.equal(l.titulo, 'Mentalidade do Diretor');
    assert.equal(l.agenda_id, 'mentalidade-diretor');
    assert.equal(l.publico, 'diretoria');
    assert.equal(l.ativo, true);
  });

  test('data única grava a data e NÃO grava o dia da semana', () => {
    const l = linhaDaAgenda(agenda, { recorrencia: 'data', dia_semana: 1, data: '2026-09-10', hora: '20:00', duracao_min: 60 });
    assert.equal(l.data, '2026-09-10');
    assert.equal(l.dia_semana, null);
  });

  test('o que a pessoa não mexeu cai na cadência do catálogo', () => {
    const l = linhaDaAgenda(agenda, {});
    assert.equal(l.hora, agenda.hora);
    assert.equal(l.duracao_min, agenda.duracao_min);
    assert.equal(l.dia_semana, agenda.dia_semana);
    assert.equal(l.detalhes, agenda.descricao);
  });

  test('detalhe escrito na mão vence a descrição de catálogo; só espaço, não', () => {
    assert.equal(linhaDaAgenda(agenda, { detalhes: 'levar os números' }).detalhes, 'levar os números');
    assert.equal(linhaDaAgenda(agenda, { detalhes: '   ' }).detalhes, agenda.descricao);
  });

  test('a linha carrega o autor, e sem agenda não inventa linha nenhuma', () => {
    const l = linhaDaAgenda(agenda, { criadoPorId: 'u1', criadoPorNome: 'Luiz' });
    assert.equal(l.criado_por_id, 'u1');
    assert.equal(l.criado_por_nome, 'Luiz');
    assert.equal(linhaDaAgenda(null, {}), null);
  });

  test('a linha só tem campos que a tabela reunioes_empresa conhece', () => {
    // se alguém acrescentar uma chave aqui sem migração, o insert quebra no ar
    const colunas = ['titulo', 'agenda_id', 'dia_semana', 'data', 'hora', 'duracao_min',
      'publico', 'detalhes', 'ativo', 'criado_por_id', 'criado_por_nome'];
    assert.deepEqual(Object.keys(linhaDaAgenda(agenda, {})).sort(), [...colunas].sort());
  });
});
