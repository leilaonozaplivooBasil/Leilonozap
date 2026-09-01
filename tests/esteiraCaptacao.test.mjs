// esteiraCaptacao — esteira de captação (DIR-34): estágios oficiais do dono,
// pipeline ponderado, % de conversão do time, alertas e prova do 100%.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTAGIOS_ESTEIRA, pendenciasParaEstagio, resumoEsteira,
  conversaoPorResponsavel, alertasEsteira, dinheiroNaConta, diasNoEstagio,
} from '../src/lib/esteiraCaptacao.js';

const REF = new Date('2026-08-30T12:00:00Z');

describe('estágios oficiais', () => {
  test('os 8 estágios do dono, com as probabilidades ditadas', () => {
    assert.deepEqual(
      ESTAGIOS_ESTEIRA.map((e) => [e.id, e.prob]),
      [
        ['reuniao_agendada', 10], ['interesse_futuro', 20], ['interesse_nova_reuniao', 40],
        ['fechado_50', 50], ['fechado_70', 70], ['fechado_99', 99], ['fechado_100', 100],
        ['sem_interesse', 0],
      ]
    );
  });

  test('exigências por estágio: 50% exige valor; perda exige motivo; 99% exige valor+reunião', () => {
    assert.deepEqual(pendenciasParaEstagio({}, 'fechado_50'), ['valor_previsto']);
    assert.deepEqual(pendenciasParaEstagio({ valor_previsto: 5000 }, 'fechado_50'), []);
    assert.deepEqual(pendenciasParaEstagio({}, 'sem_interesse'), ['motivo_perda']);
    assert.deepEqual(pendenciasParaEstagio({ valor_previsto: 5000 }, 'fechado_99'), ['reuniao_em']);
    assert.deepEqual(pendenciasParaEstagio({}, 'interesse_futuro'), ['recontato_em']);
  });
});

describe('resumoEsteira', () => {
  test('pipeline ponderado = Σ valor × probabilidade dos ATIVOS; fechado à parte', () => {
    const r = resumoEsteira([
      { estagio: 'fechado_50', valor_previsto: 10000 },   // 5.000 ponderado
      { estagio: 'fechado_99', valor_previsto: 20000 },   // 19.800 ponderado
      { estagio: 'fechado_100', valor_previsto: 15000 },  // fechado, fora do ponderado
      { estagio: 'sem_interesse', valor_previsto: 99999 },// perdida, fora de tudo
    ]);
    assert.equal(r.pipelinePonderado, 10000 * 0.5 + 20000 * 0.99);
    assert.equal(r.fechado, 15000);
    assert.equal(r.ativas, 2);
    assert.equal(r.porEstagio.sem_interesse.qtd, 1);
  });
});

describe('% de conversão do time (pedido do dono)', () => {
  test('winRate = fechadas ÷ (fechadas + perdidas); conversão do funil = fechadas ÷ total', () => {
    const ops = [
      { responsavel_id: 'r1', responsavel_nome: 'Ribeiro', estagio: 'fechado_100', valor_previsto: 5000 },
      { responsavel_id: 'r1', responsavel_nome: 'Ribeiro', estagio: 'sem_interesse' },
      { responsavel_id: 'r1', responsavel_nome: 'Ribeiro', estagio: 'fechado_50', valor_previsto: 10000 },
      { responsavel_id: 'r2', responsavel_nome: 'Diana', estagio: 'reuniao_agendada' },
    ];
    const [ribeiro, diana] = conversaoPorResponsavel(ops);
    assert.equal(ribeiro.nome, 'Ribeiro');
    assert.equal(ribeiro.winRate, 50); // 1 fechada ÷ (1+1 encerradas)
    assert.equal(Math.round(ribeiro.conversaoFunil), 33); // 1 ÷ 3
    assert.equal(ribeiro.valorFechado, 5000);
    assert.equal(ribeiro.valorEmEsteira, 10000);
    assert.equal(diana.winRate, null); // nada encerrado ainda — sem taxa inventada
  });
});

describe('alertas da esteira', () => {
  test('reunião hoje/atrasada, recontato vencido e oportunidade parada', () => {
    const alertas = alertasEsteira([
      { estagio: 'reuniao_agendada', reuniao_em: '2026-08-30T15:00:00Z', estagio_desde: '2026-08-29' },
      { estagio: 'interesse_futuro', recontato_em: '2026-08-28', estagio_desde: '2026-08-29' },
      { estagio: 'fechado_70', estagio_desde: '2026-08-10', valor_previsto: 5000 }, // 20 dias parado
      { estagio: 'fechado_100', estagio_desde: '2026-08-01' }, // fechada: sem alerta
      { estagio: 'fechado_50', estagio_desde: '2026-08-28', valor_previsto: 100 }, // 2 dias: ok
    ], REF);
    assert.equal(alertas.length, 3);
    assert.equal(alertas[0].tipo, 'reuniao');
    assert.equal(alertas[1].tipo, 'recontato');
    assert.equal(alertas[2].tipo, 'parada');
    assert.equal(alertas[2].critico, true); // 20 dias ≥ 15
  });

  test('diasNoEstagio conta a partir de estagio_desde', () => {
    assert.equal(diasNoEstagio({ estagio_desde: '2026-08-20T12:00:00Z' }, REF), 10);
  });
});

describe('o 100% se prova sozinho', () => {
  const venda = { kind: 'partner_plan', status: 'paid', mp_payment_id: 'x', created_date: '2026-08-20', buyer_email: 'cli@x.com', total_amount: 5000 };
  test('com venda real do cliente → dinheiro na conta', () => {
    assert.equal(dinheiroNaConta({ cliente_email: 'CLI@x.com' }, [venda]), true);
    assert.equal(dinheiroNaConta({ cliente_user_id: 'u9' }, [{ ...venda, buyer_id: 'u9' }]), true);
  });
  test('sem venda real (pendente ou de outra pessoa) → declarado sem dinheiro', () => {
    assert.equal(dinheiroNaConta({ cliente_email: 'cli@x.com' }, [{ ...venda, status: 'pending_payment' }]), false);
    assert.equal(dinheiroNaConta({ cliente_email: 'outro@x.com' }, [venda]), false);
    assert.equal(dinheiroNaConta({ cliente_email: 'cli@x.com' }, [{ ...venda, kind: 'loja' }]), false); // mercadoria não é aporte
  });
});

describe('DIR-36 — vendaRealDoCliente (amarração venda_id)', () => {
  const venda = { id: 'v1', kind: 'partner_plan', status: 'paid', mp_payment_id: 'x', created_date: '2026-08-20', buyer_email: 'cli@x.com', total_amount: 5000 };
  test('devolve A VENDA (pra gravar venda_id), não só true/false', async () => {
    const { vendaRealDoCliente } = await import('../src/lib/esteiraCaptacao.js');
    assert.equal(vendaRealDoCliente({ cliente_email: 'CLI@x.com' }, [venda])?.id, 'v1');
    assert.equal(vendaRealDoCliente({ cliente_user_id: 'u9' }, [{ ...venda, buyer_id: 'u9' }])?.id, 'v1');
    assert.equal(vendaRealDoCliente({ cliente_email: 'outro@x.com' }, [venda]), null);
    assert.equal(vendaRealDoCliente({ cliente_email: 'cli@x.com' }, [{ ...venda, status: 'pending_payment' }]), null);
  });
});

describe('DIR-40 — aporte recebido POR FORA (Santander/Itaú)', () => {
  test('registro válido acende o dinheiro na conta; banco fora da regra não', async () => {
    const { aporteExternoValido, dinheiroNaConta } = await import('../src/lib/esteiraCaptacao.js');
    const base = { estagio: 'fechado_100', valor_previsto: 200000, cliente_email: 'x@x.com' };
    assert.equal(aporteExternoValido({ ...base, aporte_externo: { banco: 'santander', valor: 200000, data: '2026-09-01' } }), true);
    assert.equal(aporteExternoValido({ ...base, aporte_externo: { banco: 'itau', valor: 200000 } }), true);
    assert.equal(aporteExternoValido({ ...base, aporte_externo: { banco: 'bradesco', valor: 200000 } }), false); // só Santander/Itaú
    assert.equal(aporteExternoValido({ ...base, aporte_externo: { banco: 'itau', valor: 0 } }), false);
    assert.equal(dinheiroNaConta({ ...base, aporte_externo: { banco: 'itau', valor: 200000 } }, []), true); // sem venda, com aporte externo
    assert.equal(dinheiroNaConta(base, []), false);
  });

  test('fechadoProvado conta o aporte externo como "na conta"', async () => {
    const { fechadoProvado } = await import('../src/lib/esteiraCaptacao.js');
    const p = fechadoProvado([
      { estagio: 'fechado_100', valor_previsto: 200000, aporte_externo: { banco: 'santander', valor: 200000 } },
      { estagio: 'fechado_100', valor_previsto: 50000 },
    ], []);
    assert.equal(p.naConta, 200000);
    assert.equal(p.declarado, 50000);
  });
});

describe('DIR-41 — PPV e objeções do método', () => {
  const REF41 = new Date('2026-09-01T12:00:00Z');
  test('semPPV: ativa sem reunião futura nem recontato futuro = negociação morrendo', async () => {
    const { semPPV } = await import('../src/lib/esteiraCaptacao.js');
    assert.equal(semPPV({ estagio: 'fechado_50' }, REF41), true); // nada marcado
    assert.equal(semPPV({ estagio: 'fechado_50', reuniao_em: '2026-08-20T10:00:00Z' }, REF41), true); // reunião no passado
    assert.equal(semPPV({ estagio: 'reuniao_agendada', reuniao_em: '2026-09-03T10:00:00Z' }, REF41), false); // reunião futura
    assert.equal(semPPV({ estagio: 'interesse_futuro', recontato_em: '2026-09-10' }, REF41), false); // recontato futuro
    assert.equal(semPPV({ estagio: 'fechado_100' }, REF41), false); // fechada não precisa
    assert.equal(semPPV({ estagio: 'sem_interesse' }, REF41), false); // perdida não precisa
  });

  test('placarObjecoes: conta só ATIVAS, ordenado pela dor maior', async () => {
    const { placarObjecoes } = await import('../src/lib/esteiraCaptacao.js');
    const placar = placarObjecoes([
      { estagio: 'fechado_50', objecao: 'preciso_pensar' },
      { estagio: 'reuniao_agendada', objecao: 'preciso_pensar' },
      { estagio: 'fechado_70', objecao: 'tenho_medo' },
      { estagio: 'fechado_100', objecao: 'preciso_pensar' }, // fechada: fora
      { estagio: 'fechado_50' }, // sem objeção: fora
    ]);
    assert.deepEqual(placar.map((p) => [p.id, p.qtd]), [['preciso_pensar', 2], ['tenho_medo', 1]]);
    assert.equal(placar[0].label, 'Preciso pensar');
  });
});
