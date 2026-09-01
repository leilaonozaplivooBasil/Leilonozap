// linhaDoTempoCliente — a cronologia do cliente (DIR-36): cadastro, depósito
// real, compras, arremates, esteira e follow-up futuro, na ordem certa.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { linhaDoTempoCliente } from '../src/lib/linhaDoTempoCliente.js';

const CLIENTE = {
  user_id: 'u1', email: 'cli@x.com', registered_at: '2026-08-01T10:00:00Z',
  follow_up_date: '2026-09-05', next_steps: 'fechar aporte',
  purchases: [{ product_title: 'Air Fryer', amount: 250, status: 'paid', date: '2026-08-10T10:00:00Z' }],
  auctions_list: [{ title: 'Leilão TV', amount: 900, date: '2026-08-12T10:00:00Z' }],
};

describe('linhaDoTempoCliente', () => {
  test('costura tudo em ordem: passados desc, futuros asc', () => {
    const { passados, futuros } = linhaDoTempoCliente({
      cliente: CLIENTE,
      sales: [
        { kind: 'wallet_deposit', status: 'paid', mp_payment_id: 'x', created_date: '2026-08-05T10:00:00Z', buyer_id: 'u1', total_amount: 300 },
        { kind: 'wallet_deposit', status: 'paid', mp_payment_id: 'x', created_date: '2026-08-05T10:00:00Z', buyer_id: 'OUTRO', total_amount: 999 }, // de outro: fora
      ],
      oportunidades: [{
        cliente_user_id: 'u1', estagio: 'fechado_50', valor_previsto: 5000,
        created_date: '2026-08-15T10:00:00Z', reuniao_em: '2026-09-03T14:00:00Z',
        historico: [
          { em: '2026-08-15T10:00:00Z', por: 'Luiz', para: 'reuniao_agendada' },
          { em: '2026-08-20T10:00:00Z', por: 'Luiz', de: 'reuniao_agendada', para: 'fechado_50' },
        ],
      }],
    });
    assert.deepEqual(passados.map((e) => e.tipo), ['oportunidade', 'oportunidade', 'arremate', 'compra', 'deposito', 'cadastro']);
    assert.equal(passados[0].titulo, 'Esteira: 📅 Reunião agendada → 💰 Fechado 50%');
    assert.equal(passados[1].detalhe, '📅 Reunião agendada'); // estágio de nascimento
    assert.equal(passados[4].valor, 300); // só o depósito DELE
    assert.deepEqual(futuros.map((e) => e.tipo), ['reuniao', 'followup']); // asc: 03/09 antes de 05/09
  });

  test('oportunidade casada por e-mail quando não há user_id; sem cliente → vazio', () => {
    const { passados } = linhaDoTempoCliente({
      cliente: { email: 'CLI@x.com', purchases: [], auctions_list: [] },
      oportunidades: [{ cliente_email: 'cli@X.com', estagio: 'reuniao_agendada', created_date: '2026-08-15', historico: [] }],
    });
    assert.equal(passados.filter((e) => e.tipo === 'oportunidade').length, 1);
    assert.deepEqual(linhaDoTempoCliente({}), { futuros: [], passados: [] });
  });
});
