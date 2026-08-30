// quemContatarHoje — fila de ação do CRM (DIR-24 Fase 4): motivos, dedupe
// por pessoa (motivo mais urgente vence), ordenação por prioridade+valor,
// e link de WhatsApp com DDI.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { quemContatarHoje, mensagemWhatsApp, linkWhatsApp } from '../src/lib/quemContatarHoje.js';

const REF = new Date('2026-08-30T12:00:00Z');
const cliente = (extra) => ({
  id: 'u_c1', user_id: 'c1', full_name: 'Maria Silva', email: 'maria@x.com',
  phone: '(21) 99999-0001', purchase_count: 0, total_spent: 0, purchases: [], ...extra,
});

describe('quemContatarHoje', () => {
  test('pedido gerado e não pago (pós-marco) entra com valor e motivo', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente()],
      sales: [{ id: 's1', kind: 'loja', buyer_id: 'c1', total_amount: 150, status: 'pending_payment', created_date: '2026-08-29', product_title: 'Bicicleta' }],
      ref: REF,
    });
    assert.equal(fila.length, 1);
    assert.equal(fila[0].motivo, 'pedido_nao_pago');
    assert.equal(fila[0].valor, 150);
    assert.equal(fila[0].label, 'Pedido gerado e não pago');
  });

  test('pedido pendente PRÉ-marco não entra (é teste, sem valor financeiro)', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente()],
      sales: [{ id: 's1', kind: 'loja', buyer_id: 'c1', total_amount: 150, status: 'pending_payment', created_date: '2026-07-20' }],
      ref: REF,
    });
    assert.equal(fila.length, 0);
  });

  test('arremate aguardando pagamento tem motivo próprio', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente()],
      sales: [{ id: 'a1', kind: 'arremate', buyer_id: 'c1', total_amount: 80, status: 'pending_payment', created_date: '2026-08-28', product_title: 'Fone' }],
      ref: REF,
    });
    assert.equal(fila[0].motivo, 'arremate_nao_pago');
  });

  test('depositou dinheiro real e não comprou → saldo parado na fila', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente()],
      sales: [{ id: 'd1', kind: 'wallet_deposit', buyer_id: 'c1', total_amount: 200, status: 'paid', mp_payment_id: 'x', created_date: '2026-08-10' }],
      ref: REF,
    });
    assert.equal(fila[0].motivo, 'deposito_sem_compra');
    assert.equal(fila[0].valor, 200);
  });

  test('quem depositou MAS já comprou não entra como saldo parado', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente({ purchase_count: 1 })],
      sales: [{ id: 'd1', kind: 'wallet_deposit', buyer_id: 'c1', total_amount: 200, status: 'paid', mp_payment_id: 'x', created_date: '2026-08-10' }],
      ref: REF,
    });
    assert.equal(fila.length, 0);
  });

  test('cliente que já comprou e sumiu 30+ dias entra pra reativação', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente({ purchase_count: 2, total_spent: 300, last_contact: '2026-07-01' })],
      ref: REF,
    });
    assert.equal(fila[0].motivo, 'sumido_30d');
  });

  test('follow-up vencido é a prioridade máxima (palavra dada ao cliente)', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente({ follow_up_date: '2026-08-29', next_steps: 'mandar foto do lote' })],
      sales: [{ id: 's1', kind: 'loja', buyer_id: 'c1', total_amount: 999, status: 'pending_payment', created_date: '2026-08-29' }],
      ref: REF,
    });
    assert.equal(fila.length, 1); // mesma pessoa: um item só
    assert.equal(fila[0].motivo, 'follow_up');
    assert.equal(fila[0].detalhe, 'mandar foto do lote');
  });

  test('follow-up marcado pro futuro NÃO entra hoje', () => {
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente({ follow_up_date: '2026-09-15' })],
      ref: REF,
    });
    assert.equal(fila.length, 0);
  });

  test('ordena por prioridade do motivo e, dentro dele, por valor', () => {
    const c2 = cliente({ id: 'u_c2', user_id: 'c2', full_name: 'João', email: 'joao@x.com' });
    const fila = quemContatarHoje({
      unifiedCustomers: [cliente(), c2],
      sales: [
        { id: 's1', kind: 'loja', buyer_id: 'c1', total_amount: 50, status: 'pending_payment', created_date: '2026-08-29' },
        { id: 's2', kind: 'loja', buyer_id: 'c2', total_amount: 500, status: 'pending_payment', created_date: '2026-08-29' },
      ],
      ref: REF,
    });
    assert.equal(fila[0].cliente.user_id, 'c2'); // mais dinheiro parado primeiro
  });
});

describe('WhatsApp', () => {
  const item = { motivo: 'pedido_nao_pago', detalhe: 'Bicicleta', cliente: cliente() };
  test('link com DDI 55 e mensagem codificada', () => {
    const url = linkWhatsApp(item);
    assert.ok(url.startsWith('https://wa.me/5521999990001?text='));
    assert.ok(decodeURIComponent(url).includes('Bicicleta'));
  });
  test('sem telefone → sem link (não quebra)', () => {
    assert.equal(linkWhatsApp({ ...item, cliente: cliente({ phone: '' }) }), null);
  });
  test('mensagem usa o primeiro nome', () => {
    assert.ok(mensagemWhatsApp(item).includes('Maria'));
  });
});
