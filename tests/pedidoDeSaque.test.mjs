// 💸 O saque do Painel do Vendedor — os quatro defeitos que deixavam "ninguém
// conseguir sacar", cada um preso por um teste. Ver o cabeçalho de
// src/lib/pedidoDeSaque.js.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { podePedirSaque, lerRespostaDoSaque, saldoDoPainel, saqueParaHistorico, MOTIVOS } from '../src/lib/pedidoDeSaque.js';

describe('podePedirSaque — não manda pedido que vai voltar', () => {
  test('sem KYC aprovado, trava por identidade ANTES de olhar valor', () => {
    const r = podePedirSaque({ kycStatus: 'nao_iniciado', saldo: 100, valor: 50 });
    assert.equal(r.ok, false); assert.equal(r.motivo, MOTIVOS.KYC);
    assert.equal(podePedirSaque({ kycStatus: 'em_analise', saldo: 100, valor: 50 }).motivo, MOTIVOS.KYC);
    assert.equal(podePedirSaque({ saldo: 100, valor: 50 }).motivo, MOTIVOS.KYC);
  });
  test('valor zero, vazio ou negativo', () => {
    for (const v of [0, '', '0', -5, 'abc', undefined]) {
      assert.equal(podePedirSaque({ kycStatus: 'aprovado', saldo: 100, valor: v }).motivo, MOTIVOS.VALOR, `valor ${v}`);
    }
  });
  test('mais que o saldo', () => {
    assert.equal(podePedirSaque({ kycStatus: 'aprovado', saldo: 100, valor: 100.01 }).motivo, MOTIVOS.SALDO);
  });
  test('vírgula brasileira e centavos: "49,90" com saldo 49.9 passa', () => {
    const r = podePedirSaque({ kycStatus: 'aprovado', saldo: 49.9, valor: '49,90' });
    assert.deepEqual(r, { ok: true, motivo: null, valor: 49.9 });
  });
  test('o saldo inteiro pode ser sacado (igual, não só menor)', () => {
    assert.equal(podePedirSaque({ kycStatus: 'aprovado', saldo: 321.71, valor: 321.71 }).ok, true);
  });
});

describe('lerRespostaDoSaque — o defeito nº 2: response.data que não existe', () => {
  test('🔴 o JSON direto de sucesso é SUCESSO (antes virava erro)', () => {
    const r = lerRespostaDoSaque({ success: true, withdrawal_id: 'x', message: 'Pedido enviado.' });
    assert.equal(r.ok, true); assert.equal(r.mensagem, 'Pedido enviado.');
  });
  test('o formato antigo { data: {...} } também é lido', () => {
    assert.equal(lerRespostaDoSaque({ data: { success: true } }).ok, true);
    assert.equal(lerRespostaDoSaque({ data: { success: false, error: 'x' } }).mensagem, 'x');
  });
  test('🔴 rota inexistente vira mensagem clara, não "Erro ao solicitar saque"', () => {
    const r = lerRespostaDoSaque({ ok: false, error: 'not_implemented', status: 404 });
    assert.equal(r.ok, false); assert.match(r.mensagem, /indisponível/);
  });
  test('need_kyc chega como precisaKyc, pra tela mandar validar', () => {
    const r = lerRespostaDoSaque({ success: false, error: 'Valide sua identidade', need_kyc: true });
    assert.equal(r.ok, false); assert.equal(r.precisaKyc, true); assert.equal(r.mensagem, 'Valide sua identidade');
  });
  test('sem resposta nenhuma não explode', () => {
    for (const x of [undefined, null, 'erro', 42]) assert.equal(lerRespostaDoSaque(x).ok, false);
  });
  test('erro sem need_kyc NÃO manda pro KYC', () => {
    assert.equal(lerRespostaDoSaque({ success: false, error: 'Saldo insuficiente' }).precisaKyc, false);
  });
});

describe('saldoDoPainel — o painel lê da rota que existe', () => {
  test('sacável = commission_balance; pendentes somam só status pending', () => {
    const s = saldoDoPainel({ commission_balance: '321.71', kyc_status: 'aprovado', cpf: '123',
      withdrawals: [{ valor: 100, status: 'pending' }, { valor: 50, status: 'paid' }, { valor: '25.5', status: 'pending' }] });
    assert.equal(s.saldoSacavel, 321.71); assert.equal(s.emAnalise, 125.5);
    assert.equal(s.kycStatus, 'aprovado'); assert.equal(s.cpf, '123'); assert.equal(s.saques.length, 3);
  });
  test('carteira vazia/nula não explode e nasce sem KYC', () => {
    const s = saldoDoPainel(null);
    assert.equal(s.saldoSacavel, 0); assert.equal(s.emAnalise, 0); assert.equal(s.kycStatus, 'nao_iniciado');
    assert.deepEqual(s.saques, []);
  });
});

describe('saqueParaHistorico — a rota fala valor/requested_at, o histórico lê amount/created_date', () => {
  test('🔴 traduz os nomes; sem isto o histórico sai em branco', () => {
    const h = saqueParaHistorico({ valor: '150.5', status: 'pending', requested_at: '2026-09-20T10:00:00Z', reject_reason: null }, 3);
    assert.equal(h.amount, 150.5); assert.equal(h.created_date, '2026-09-20T10:00:00Z');
    assert.equal(h.status, 'pending'); assert.equal(h.pix_key_type, 'CPF');
    assert.equal(h.id, '2026-09-20T10:00:00Z-3');
  });
  test('o painel entrega os saques já traduzidos', () => {
    const s = saldoDoPainel({ withdrawals: [{ valor: 10, status: 'paid', requested_at: 'x' }] });
    assert.equal(s.saques[0].amount, 10); assert.equal(s.saques[0].created_date, 'x');
  });
});
