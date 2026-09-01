// agendaEsteira — agenda do dia e reuniões por responsável (DIR-38): reunião
// nasce da oportunidade; fechada/perdida não ocupa agenda.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { agendaEsteira, reunioesPorResponsavel } from '../src/lib/agendaEsteira.js';
import { fechadoProvado } from '../src/lib/esteiraCaptacao.js';

const REF = new Date('2026-09-01T12:00:00Z');

describe('agendaEsteira', () => {
  test('hoje, atrasadas, semana e recontatos — só de oportunidade ATIVA', () => {
    const a = agendaEsteira([
      { estagio: 'reuniao_agendada', reuniao_em: '2026-09-01T15:00:00Z', cliente_nome: 'Hoje 1' },
      { estagio: 'fechado_99', reuniao_em: '2026-09-01T18:00:00Z', cliente_nome: 'Hoje 2' },
      { estagio: 'interesse_nova_reuniao', reuniao_em: '2026-08-28T10:00:00Z' },  // atrasada
      { estagio: 'reuniao_agendada', reuniao_em: '2026-09-04T10:00:00Z' },        // na semana
      { estagio: 'reuniao_agendada', reuniao_em: '2026-09-20T10:00:00Z' },        // longe: fora
      { estagio: 'fechado_100', reuniao_em: '2026-09-01T09:00:00Z' },             // fechada: fora
      { estagio: 'interesse_futuro', recontato_em: '2026-08-30' },                // recontato vencido
    ], REF);
    assert.equal(a.reunioesHoje.length, 2);
    assert.equal(a.reunioesAtrasadas.length, 1);
    assert.equal(a.reunioesSemana, 1);
    assert.equal(a.recontatosHoje, 1);
  });
});

describe('reunioesPorResponsavel', () => {
  test('hoje × marcadas por pessoa, ordenado por quem tem mais reunião hoje', () => {
    const r = reunioesPorResponsavel([
      { estagio: 'reuniao_agendada', reuniao_em: '2026-09-01T15:00:00Z', responsavel_nome: 'Luciano' },
      { estagio: 'fechado_99', reuniao_em: '2026-09-01T18:00:00Z', responsavel_nome: 'Luciano' },
      { estagio: 'reuniao_agendada', reuniao_em: '2026-09-05T10:00:00Z', responsavel_nome: 'Diana' },
      { estagio: 'sem_interesse', reuniao_em: '2026-09-01T10:00:00Z', responsavel_nome: 'Diana' }, // perdida: fora
    ], REF);
    assert.deepEqual(r.map((x) => [x.nome, x.hoje, x.marcadas]), [['Luciano', 2, 2], ['Diana', 0, 1]]);
  });
});

describe('fechadoProvado (DIR-38)', () => {
  test('separa 100% com venda real (na conta) de 100% só declarado', () => {
    const venda = { kind: 'partner_plan', status: 'paid', mp_payment_id: 'x', created_date: '2026-08-20', buyer_email: 'tem@x.com', total_amount: 50000 };
    const p = fechadoProvado([
      { estagio: 'fechado_100', valor_previsto: 50000, cliente_email: 'tem@x.com' },
      { estagio: 'fechado_100', valor_previsto: 200000, cliente_email: 'naotem@x.com' },
      { estagio: 'fechado_50', valor_previsto: 99999 }, // não fechada: fora
    ], [venda]);
    assert.equal(p.naConta, 50000);
    assert.equal(p.declarado, 200000);
  });
});
