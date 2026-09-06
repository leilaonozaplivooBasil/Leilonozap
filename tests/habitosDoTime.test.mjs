// 📊 OS 8 HÁBITOS DO TIME (dono, 06/09/2026): "quantos fizeram quadro dos sonhos,
// quantos contatos, quem não acordou, quem vendeu — do 1º ao 8º, expondo com
// detalhe, sem sujeira". Cada Hábito lê o dado real; a saída é sempre a mesma:
// número do time, quem fez (com o detalhe) e quem não fez.
import test from 'node:test';
import assert from 'node:assert/strict';
import { habitosDoTime, habitoDaTarefa, periodoDe } from '../src/lib/habitosDoTime.js';

const TIME = [
  { id: 'e', nome: 'Emanuel Silva', funcaoCurta: 'COO' },
  { id: 'c', nome: 'Carla Souza', funcaoCurta: 'Embaixador' },
  { id: 'j', nome: 'Jean Aranha', funcaoCurta: 'CMO' },
];
const HOJE = '2026-09-07';

test('o período: hoje, a semana (segunda a domingo) e o mês', () => {
  assert.deepEqual(periodoDe('hoje', HOJE), { tipo: 'hoje', de: HOJE, ate: HOJE, rotulo: 'hoje' });
  assert.deepEqual([periodoDe('semana', '2026-09-09').de, periodoDe('semana', '2026-09-09').ate], ['2026-09-07', '2026-09-13']);
  assert.deepEqual([periodoDe('mes', HOJE).de, periodoDe('mes', HOJE).ate], ['2026-09-01', '2026-09-30']);
});

test('a tarefa da rotina sabe a que Hábito serve, pelo campo ou pelo título', () => {
  assert.equal(habitoDaTarefa({ habito: 6, titulo: 'qualquer' }), 6);
  assert.equal(habitoDaTarefa({ titulo: 'Acordar — gratidão e foco no sonho' }), 1);
  assert.equal(habitoDaTarefa({ titulo: 'Story ANTES da atividade física' }), 2);
  assert.equal(habitoDaTarefa({ titulo: 'Qualificar 10 pessoas da lista de networking' }), 3);
  assert.equal(habitoDaTarefa({ titulo: 'Fazer 20 contatos com F.O.R.M.' }), 4);
  assert.equal(habitoDaTarefa({ titulo: 'Reunião 1 (45-60 min)' }), 5);
  assert.equal(habitoDaTarefa({ titulo: 'Contratos + follow-ups' }), 6);
  assert.equal(habitoDaTarefa({ titulo: 'Organização do dia' }), 7);
  assert.equal(habitoDaTarefa({ titulo: 'Treinamento diário com o time' }), 8);
});

test('os 8 Hábitos de hoje: quem fez (com o detalhe), quem não fez (com o motivo), o número do time e o resumo', () => {
  const r = habitosDoTime({
    time: TIME, hojeISO: HOJE, periodo: periodoDe('hoje', HOJE),
    tarefas: [
      // Emanuel: acordou, planejou, fez contatos e uma reunião, treinou
      { user_id: 'e', data: HOJE, hora: '05:00', titulo: 'Acordar — gratidão e foco no sonho', feito: true },
      { user_id: 'e', data: HOJE, hora: '05:15', titulo: 'Story ANTES da atividade física', feito: true },
      { user_id: 'e', data: HOJE, hora: '09:30', titulo: 'Fazer 20 contatos com F.O.R.M.', feito: true },
      { user_id: 'e', data: HOJE, hora: '13:00', titulo: 'Reunião 1 (45-60 min)', feito: true },
      { user_id: 'e', data: HOJE, hora: '17:00', titulo: 'Treinamento diário com o time', feito: true },
      { user_id: 'e', data: HOJE, hora: '18:00', titulo: 'Fechar os números do dia', feito: false },
      // Carla: só uma demanda distribuída (não planejou), nada feito
      { user_id: 'c', data: HOJE, hora: '10:00', titulo: 'Enviar o relatório', feito: false, origem: 'xperf' },
      // ontem não conta em "hoje"
      { user_id: 'j', data: '2026-09-06', hora: '05:00', titulo: 'Acordar — gratidão e foco no sonho', feito: true },
    ],
    perfis: [{ user_id: 'e', sonhos: [{ t: 'casa' }, { t: 'carro' }] }, { user_id: 'j', sonhos: [] }],
    clientes: [
      { id: 'c1', created_by_id: 'e', qualificacao_network: { confianca: 5, financeiro: 4, apetite: 3 }, contatos_metodo: [{ resultado: 'agendado', em: `${HOJE}T10:00:00Z`, registrado_por_id: 'e' }, { resultado: 'nao_atendeu', em: `${HOJE}T11:00:00Z`, registrado_por_id: 'e' }, { resultado: 'feito', em: '2026-09-01T10:00:00Z', registrado_por_id: 'e' }] },
      { id: 'c2', created_by_id: 'e', qualificacao_network: null, contatos_metodo: [{ resultado: 'feito', em: `${HOJE}T12:00:00Z`, registrado_por_id: 'c' }] },
      { id: 'c3', created_by_id: 'j' },
    ],
    vendas: [
      { seller_id: 'c', status: 'paid', created_date: `${HOJE}T15:00:00Z`, total_amount: 1200 },
      { seller_id: 'e', status: 'paid', created_date: '2026-09-05T15:00:00Z', total_amount: 999 },
    ],
    oportunidades: [
      { responsavel_id: 'e', estagio: 'fechado_100', valor_previsto: 50000, fechado_em: `${HOJE}T16:00:00Z`, reuniao_em: `${HOJE}T14:00:00Z` },
    ],
    entregaveis: [{ dono_id: 'j', habito: 8, coluna: 'entregue', validado_em: `${HOJE}T18:00:00Z` }],
  });
  assert.equal(r.habitos.length, 8);
  const h = (n) => r.habitos.find((x) => x.n === n);
  const nomes = (lista) => lista.map((x) => x.nome.split(' ')[0]);
  // 1 Sonho: só o Emanuel tem quadro (2 sonhos) e fez a gratidão; o Jean tem quadro vazio
  assert.deepEqual([nomes(h(1).fizeram), nomes(h(1).naoFizeram), h(1).totalRotulo, h(1).fizeram[0].detalhe], [['Emanuel'], ['Carla', 'Jean'], '2 sonhos', '2 sonhos no quadro · gratidão 1×']);
  assert.equal(h(1).naoFizeram.find((x) => x.nome.startsWith('Carla')).motivo, 'sem quadro dos sonhos');
  // 2 Compromisso: Emanuel acordou e fez 5 de 6; Carla só tem demanda distribuída → não gerou a rotina
  assert.deepEqual([nomes(h(2).fizeram), h(2).fizeram[0].detalhe], [['Emanuel'], 'acordou · rotina 83% (5/6)']);
  assert.equal(h(2).naoFizeram.find((x) => x.nome.startsWith('Carla')).motivo, 'não gerou a rotina');
  // 3 Lista: Emanuel qualificou 1 de 2 nomes; Jean tem lista sem qualificação; Carla sem lista
  assert.deepEqual([nomes(h(3).fizeram), h(3).fizeram[0].detalhe], [['Emanuel'], '1 qualificado de 2 na lista']);
  assert.deepEqual(h(3).naoFizeram.map((x) => [x.nome.split(' ')[0], x.motivo]), [['Carla', 'sem lista'], ['Jean', 'lista sem qualificação']]);
  // 4 Contato: Emanuel 2 hoje (1 agendado, 1 sem resposta) + tarefa; Carla 1 (registrou no cliente do Emanuel — conta pra quem registrou)
  assert.deepEqual(h(4).fizeram.map((x) => [x.nome.split(' ')[0], x.valor]), [['Emanuel', 2], ['Carla', 1]]);
  assert.match(h(4).fizeram[0].detalhe, /2 contatos · 1 agendado · 1 sem resposta · 1 tarefa de contato feita/);
  assert.equal(h(4).totalRotulo, '3 contatos');
  // 5 Apresentação: Emanuel 1 reunião da rotina + 1 de investimento
  assert.deepEqual([nomes(h(5).fizeram), h(5).fizeram[0].detalhe], [['Emanuel'], '1 apresentação · 1 reunião de investimento']);
  // 6 Fechamento: Carla vendeu hoje R$ 1.200; Emanuel fechou R$ 50 mil de captação (a venda dele foi dia 05)
  assert.deepEqual(h(6).fizeram.map((x) => [x.nome.split(' ')[0], x.valor]), [['Emanuel', 50000], ['Carla', 1200]]);
  assert.match(h(6).fizeram[1].detalhe, /1 venda · R\$ 1\.200,00/);
  assert.deepEqual(nomes(h(6).naoFizeram), ['Jean']);
  assert.equal(h(6).totalRotulo, 'R$ 51.200,00');
  // 7 Verificação: Emanuel planejou (o "fechar os números" não foi feito)
  assert.deepEqual([nomes(h(7).fizeram), h(7).fizeram[0].detalhe], [['Emanuel'], 'planejou o dia']);
  // 8 Duplicação: Emanuel treinou; Jean tem entregável de duplicação validado hoje
  assert.deepEqual(h(8).fizeram.map((x) => [x.nome.split(' ')[0], x.detalhe]), [['Emanuel', '1 treinamento'], ['Jean', '1 entregável de duplicação validado']]);
  // o resumo
  assert.deepEqual([r.resumo.pessoas, r.resumo.acordaram, r.resumo.venderam, r.resumo.contatos, r.resumo.inteiros, r.resumo.zerados], [3, 1, 2, 3, ['Emanuel Silva'], []], 'o Emanuel fechou os 8; a captação fechada conta como "fechou"');
  assert.deepEqual(r.resumo.porPessoa.map((p) => [p.nome.split(' ')[0], p.habitos]), [['Emanuel', 8], ['Carla', 2], ['Jean', 1]]);
  assert.equal(r.resumo.mediaHabitos, 3.7);
});

test('na semana, o dia conta por dia: acordou X de Y, planejou X de Y', () => {
  const r = habitosDoTime({
    time: [TIME[0]], hojeISO: '2026-09-09', periodo: periodoDe('semana', '2026-09-09'),
    tarefas: [
      { user_id: 'e', data: '2026-09-07', hora: '05:15', titulo: 'Story ANTES da atividade física', feito: true },
      { user_id: 'e', data: '2026-09-08', hora: '05:15', titulo: 'Story ANTES da atividade física', feito: false },
      { user_id: 'e', data: '2026-09-09', hora: '05:15', titulo: 'Story ANTES da atividade física', feito: true },
      { user_id: 'e', data: '2026-09-10', hora: '05:15', titulo: 'Story ANTES da atividade física', feito: false }, // amanhã não conta
    ],
  });
  assert.equal(r.habitos[1].fizeram[0].detalhe, 'acordou 2 de 3 dias · rotina 67% (2/3)');
  assert.equal(r.habitos[6].fizeram[0].detalhe, 'planejou 3 de 3 dias');
});
