// 💸 PAGAMENTO MANUAL DE COMISSÃO — a regra do modal (24/09/2026).
//
// Pedido da Beatriz, autorizado pelo dono: "que ela consiga pagar esse povo,
// marcar como pago e dar baixa nesse valor do saldo de comissão da pessoa."
//
// O que esta suíte prova: a forma dos dados antes de mandar pro servidor
// (quem decide se o saldo AINDA bate na hora H é o servidor, atômico — ver
// api/functions/payCommissionManually.js), e a tradução da resposta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { podeConfirmarPagamento, mensagemDoMotivo, lerRespostaDoPagamento, historicoOrdenado, MOTIVOS } from '../src/lib/pagamentoManualDeComissao.js';

test('valor precisa ser maior que zero', () => {
  for (const v of [0, '', '0', -5, 'abc', undefined]) {
    const r = podeConfirmarPagamento({ valor: v, saldo: 100, pixKeyUsada: '11999999999' });
    assert.equal(r.ok, false, `valor ${v}`);
    assert.equal(r.motivo, MOTIVOS.VALOR, `valor ${v}`);
  }
});

test('não deixa passar do saldo — mas o saldo INTEIRO pode ser pago (igual, não só menor)', () => {
  const passou = podeConfirmarPagamento({ valor: 100.01, saldo: 100, pixKeyUsada: 'x' });
  assert.equal(passou.ok, false); assert.equal(passou.motivo, MOTIVOS.SALDO);
  const exato = podeConfirmarPagamento({ valor: 100, saldo: 100, pixKeyUsada: 'x' });
  assert.equal(exato.ok, true); assert.equal(exato.valor, 100);
});

test('🔴 sem chave PIX (ou outro dado) não confirma — diferente do saque, aqui ninguém confere isso depois', () => {
  for (const chave of [undefined, null, '', '   ']) {
    const r = podeConfirmarPagamento({ valor: 50, saldo: 100, pixKeyUsada: chave });
    assert.equal(r.ok, false, `chave "${chave}"`); assert.equal(r.motivo, MOTIVOS.CHAVE);
  }
});

test('vírgula brasileira: "49,90" com saldo 49.9 passa', () => {
  const r = podeConfirmarPagamento({ valor: '49,90', saldo: 49.9, pixKeyUsada: 'x' });
  assert.deepEqual(r, { ok: true, motivo: null, valor: 49.9 });
});

test('a mensagem de cada motivo cita o saldo quando é o saldo que travou', () => {
  assert.match(mensagemDoMotivo(MOTIVOS.VALOR), /maior que zero/);
  assert.match(mensagemDoMotivo(MOTIVOS.SALDO, 178.39), /178\.39/);
  assert.match(mensagemDoMotivo(MOTIVOS.CHAVE), /chave PIX/);
  assert.equal(mensagemDoMotivo('outra_coisa'), '');
});

test('resposta de sucesso — devolve a mensagem e o saldo que ficou', () => {
  const r = lerRespostaDoPagamento({ success: true, message: 'Pagamento registrado.', saldo_depois: 50 });
  assert.equal(r.ok, true); assert.equal(r.mensagem, 'Pagamento registrado.'); assert.equal(r.saldoDepois, 50);
});

test('🔴 corrida (raced): o saldo mudou entre abrir o modal e confirmar — mensagem específica, não "erro genérico"', () => {
  const r = lerRespostaDoPagamento({ success: false, raced: true, error: 'O saldo mudou durante o pagamento.' });
  assert.equal(r.ok, false);
  assert.match(r.mensagem, /mudou no meio do pagamento/);
});

test('resposta de erro comum devolve o erro do servidor', () => {
  assert.equal(lerRespostaDoPagamento({ success: false, error: 'Saldo insuficiente. Disponível: R$ 10.00' }).mensagem, 'Saldo insuficiente. Disponível: R$ 10.00');
  assert.match(lerRespostaDoPagamento({ success: false }).mensagem, /Não foi possível/);
});

test('sem resposta nenhuma não explode', () => {
  for (const x of [undefined, null, 'erro', 42]) assert.equal(lerRespostaDoPagamento(x).ok, false);
});

test('histórico: mais recente primeiro', () => {
  const h = historicoOrdenado([
    { id: 'a', created_at: '2026-09-20T10:00:00Z' },
    { id: 'b', created_at: '2026-09-24T10:00:00Z' },
    { id: 'c', created_at: '2026-09-22T10:00:00Z' },
  ]);
  assert.deepEqual(h.map((p) => p.id), ['b', 'c', 'a']);
});
