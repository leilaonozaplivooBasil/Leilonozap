/**
 * 🕥 A ORGANIZAÇÃO DIÁRIA — 10h30 às 12h30.
 *
 * Pedido do dono (áudio de 19/09/2026, 10h33): "isso tem que gerar um
 * relatório bem fluido para o Emanuel, eu, ver todas as demandas do dia… de
 * acordo com as tarefas sendo feitas, isso vai contabilizando."
 *
 * O risco aqui é o relatório MENTIR: dizer que alguém organizou quando não
 * organizou, ou mostrar 100% num dia vazio. É por esse número que o dono e o
 * Emanuel vão cobrar gente.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  JANELA, estadoDaJanela, resumoDaPessoa, resumoDoTime, paraCSV,
} from '../src/lib/organizacaoDoDia.js';

const HOJE = '2026-09-19';
const dem = (over = {}) => ({
  id: 'd1', pessoa_id: 'u1', status: 'recebida',
  created_at: '2026-09-19T14:00:00Z', updated_at: '2026-09-19T14:00:00Z', ...over,
});
const tar = (over = {}) => ({ id: 't1', user_id: 'u1', data: HOJE, feito: false, ...over });

describe('estadoDaJanela', () => {
  test('a janela combinada é 10h30 às 12h30', () => {
    assert.equal(JANELA.inicio, '10:30');
    assert.equal(JANELA.fim, '12:30');
  });

  test('antes, durante e depois', () => {
    assert.equal(estadoDaJanela('09:00'), 'antes');
    assert.equal(estadoDaJanela('10:29'), 'antes');
    assert.equal(estadoDaJanela('10:30'), 'agora');
    assert.equal(estadoDaJanela('11:45'), 'agora');
    assert.equal(estadoDaJanela('12:30'), 'agora');
    assert.equal(estadoDaJanela('12:31'), 'depois');
    assert.equal(estadoDaJanela('23:59'), 'depois');
  });

  test('🔴 hora ilegível NÃO abre a janela', () => {
    // anunciar "organização acontecendo agora" com o relógio quebrado faria
    // o escritório parar por engano. 'depois' erra para o lado seguro.
    for (const ruim of [null, undefined, '', 'meio-dia', '25:00', '10:99']) {
      assert.equal(estadoDaJanela(ruim), 'depois', `abriu com ${String(ruim)}`);
    }
  });
});

describe('resumoDaPessoa — quem parou para organizar', () => {
  test('🔴 "organizou" é ter MEXIDO na caixa hoje, não ter tarefa', () => {
    // quem só cumpriu tarefa antiga não organizou nada.
    const so_tarefa = resumoDaPessoa({
      pessoaId: 'u1', demandas: [dem()], tarefas: [tar({ feito: true })], hojeISO: HOJE,
    });
    assert.equal(so_tarefa.organizou, false);

    const tratou = resumoDaPessoa({
      pessoaId: 'u1',
      demandas: [dem({ status: 'agendada', updated_at: '2026-09-19T15:00:00Z' })],
      tarefas: [], hojeISO: HOJE,
    });
    assert.equal(tratou.organizou, true, 'esvaziou a caixa e não contou');
  });

  test('descartar também é organizar', () => {
    const r = resumoDaPessoa({
      pessoaId: 'u1',
      demandas: [dem({ status: 'devolvida', updated_at: '2026-09-19T15:00:00Z' })],
      tarefas: [], hojeISO: HOJE,
    });
    assert.equal(r.tratadasHoje, 1);
    assert.equal(r.organizou, true);
  });

  test('🔴 tratada em OUTRO dia não conta como organização de hoje', () => {
    // senão quem organizou ontem apareceria organizado para sempre.
    const r = resumoDaPessoa({
      pessoaId: 'u1',
      demandas: [dem({ status: 'agendada', updated_at: '2026-09-18T15:00:00Z' })],
      tarefas: [], hojeISO: HOJE,
    });
    assert.equal(r.tratadasHoje, 0);
    assert.equal(r.organizou, false);
  });

  test('🔴 dia vazio é 0%, nunca 100%', () => {
    // "100% de zero tarefa" faria um dia sem nada parecer um dia perfeito.
    const r = resumoDaPessoa({ pessoaId: 'u1', demandas: [], tarefas: [], hojeISO: HOJE });
    assert.equal(r.tarefas, 0);
    assert.equal(r.percentual, 0);
  });

  test('conta só as tarefas DE HOJE', () => {
    const r = resumoDaPessoa({
      pessoaId: 'u1', demandas: [],
      tarefas: [tar({ feito: true }), tar({ id: 't2', data: '2026-09-18', feito: true })],
      hojeISO: HOJE,
    });
    assert.equal(r.tarefas, 1);
    assert.equal(r.percentual, 100);
  });

  test('não mistura gente: só o que é da pessoa', () => {
    const r = resumoDaPessoa({
      pessoaId: 'u1',
      demandas: [dem(), dem({ id: 'd2', pessoa_id: 'u2' })],
      tarefas: [tar(), tar({ id: 't2', user_id: 'u2' })],
      hojeISO: HOJE,
    });
    assert.equal(r.esperando, 1);
    assert.equal(r.tarefas, 1);
  });

  test('aguenta listas nulas e buracos', () => {
    const r = resumoDaPessoa({ pessoaId: 'u1', demandas: null, tarefas: [null, undefined], hojeISO: HOJE });
    assert.equal(r.tarefas, 0);
    assert.equal(r.esperando, 0);
  });
});

describe('resumoDoTime', () => {
  const pessoas = [{ id: 'u1', nome: 'Ana' }, { id: 'u2', nome: 'Bruno' }, { id: 'u3', nome: 'Carla' }];
  const demandas = [
    dem({ id: 'a', pessoa_id: 'u1', status: 'agendada', updated_at: '2026-09-19T15:00:00Z' }),
    dem({ id: 'b', pessoa_id: 'u2' }),
    dem({ id: 'c', pessoa_id: 'u2' }),
  ];
  const tarefas = [tar({ user_id: 'u1', feito: true }), tar({ id: 't2', user_id: 'u2' })];

  test('🔴 quem NÃO organizou aparece primeiro', () => {
    // é quem o dono precisa ver; enterrar no fim da lista derrota o relatório.
    const { linhas } = resumoDoTime({ pessoas, demandas, tarefas, hojeISO: HOJE });
    assert.equal(linhas[0].organizou, false);
    assert.equal(linhas[linhas.length - 1].nome, 'Ana', 'quem organizou devia ir para o fim');
  });

  test('entre os que não organizaram, mais pendências primeiro', () => {
    const { linhas } = resumoDoTime({ pessoas, demandas, tarefas, hojeISO: HOJE });
    assert.equal(linhas[0].nome, 'Bruno', 'Bruno tem 2 esperando, Carla nenhuma');
  });

  test('o total soma o time inteiro', () => {
    const { total } = resumoDoTime({ pessoas, demandas, tarefas, hojeISO: HOJE });
    assert.equal(total.pessoas, 3);
    assert.equal(total.organizaram, 1);
    assert.equal(total.esperando, 2);
    assert.equal(total.tarefas, 2);
    assert.equal(total.feitas, 1);
    assert.equal(total.percentual, 50);
  });

  test('ninguém some do relatório, nem quem não fez nada', () => {
    // Carla não tem demanda nem tarefa — e precisa aparecer, justamente por isso.
    const { linhas } = resumoDoTime({ pessoas, demandas, tarefas, hojeISO: HOJE });
    assert.equal(linhas.length, 3);
    assert.ok(linhas.some((l) => l.nome === 'Carla'));
  });

  test('time vazio não quebra e não inventa porcentagem', () => {
    const r = resumoDoTime({ pessoas: [], demandas: [], tarefas: [], hojeISO: HOJE });
    assert.deepEqual(r.linhas, []);
    assert.equal(r.total.percentual, 0);
  });

  test('pessoa sem id é ignorada em vez de virar linha fantasma', () => {
    const r = resumoDoTime({ pessoas: [{ nome: 'sem id' }, { id: 'u1', nome: 'Ana' }], demandas, tarefas, hojeISO: HOJE });
    assert.equal(r.linhas.length, 1);
  });
});

describe('paraCSV — "pode ser exportado"', () => {
  const resumo = resumoDoTime({
    pessoas: [{ id: 'u1', nome: 'Ana' }],
    demandas: [dem({ pessoa_id: 'u1' })], tarefas: [tar({ feito: true })], hojeISO: HOJE,
  });

  test('tem cabeçalho, a pessoa e o TOTAL', () => {
    const csv = paraCSV(resumo, HOJE);
    const linhas = csv.split('\n');
    assert.match(linhas[0], /2026-09-19/);
    assert.match(linhas[1], /Pessoa;Organizou/);
    assert.match(csv, /Ana;/);
    assert.match(csv, /TOTAL;/);
  });

  test('🔴 separa por ponto e vírgula, não vírgula', () => {
    // o Excel em português abre ; direto; e nome com vírgula ("Silva, João")
    // quebraria a coluna se o separador fosse vírgula.
    assert.ok(paraCSV(resumo, HOJE).includes('Pessoa;Organizou'));
  });

  test('não quebra com resumo vazio', () => {
    assert.equal(typeof paraCSV(null, HOJE), 'string');
    assert.equal(typeof paraCSV({}, HOJE), 'string');
  });
});

// ── 🧩 A ABA NA PÁGINA ────────────────────────────────────────────────────
// A conta acima não vale nada se a tela não estiver pendurada em lugar
// nenhum. Estas provas leem o código da página — é o único jeito de garantir,
// sem navegador, que a aba existe e que ela renderiza a peça certa.
describe('a aba na Mentalidade', () => {
  const PAGINA = readFileSync(
    new URL('../src/components/licensing/CentralVendas/MentalidadePagina.jsx', import.meta.url), 'utf8',
  );

  test('🔴 a aba "Organização do dia" está na lista de abas', () => {
    assert.match(PAGINA, /id:\s*'organizacao'/);
    assert.match(PAGINA, /rotulo:\s*'Organização do dia'/);
  });

  test('🔴 a aba renderiza a OrganizacaoDoDia, e ela está importada', () => {
    assert.match(PAGINA, /import OrganizacaoDoDia from '@\/components\/licensing\/CentralVendas\/OrganizacaoDoDia'/);
    assert.match(PAGINA, /aba === 'organizacao' && <OrganizacaoDoDia/);
  });

  test('🔴 cada aba tem o seu render — nenhuma cai no "senão" da outra', () => {
    // com três abas, o ternário de duas mandaria a Organização para o
    // ramo da X-Performance (ou apagaria a tela). Uma condição por aba.
    for (const id of ['encontro', 'organizacao', 'performance']) {
      assert.match(PAGINA, new RegExp(`aba === '${id}' &&`), `a aba ${id} não tem render próprio`);
    }
  });

  test('🔴 aba inicial desconhecida não apaga a tela', () => {
    // três condições e nenhum "senão": um abaInicial inválido renderizaria
    // NADA. A página tem que cair no padrão.
    assert.match(PAGINA, /ABAS\.some\(\(a\) => a\.id === abaInicial\) \? abaInicial : padrao/);
  });
});
