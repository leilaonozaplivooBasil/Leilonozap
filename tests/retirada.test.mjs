// 📦 30/09/2026 — retirada digital: regras do formulário, código e quem pode registrar
import test from 'node:test';
import assert from 'node:assert/strict';
import { errosDaRetirada, podeRegistrarRetirada, vendaPodeSerRetirada, ehRetirada, codigoFormatado, codigoLimpo, rotuloDoLocal, TERMO, quandoRetirou, numeroDoPedidoTela } from '../src/lib/retirada.js';
import { codigoDeRetirada, codigoConfere } from '../api/_lib/codigoDeRetirada.js';
import { numeroDoPedido } from '../api/_lib/regrasDosAvisos.js';

const ASS = 'data:image/png;base64,' + 'A'.repeat(400);
const OK = { local: 'escritorio', quem: 'comprador', codigo: '123456', assinatura: ASS, aceite: true };

test('formulário completo passa; cada falta vira uma frase clara', () => {
  assert.deepEqual(errosDaRetirada(OK), []);
  assert.match(errosDaRetirada({ ...OK, local: '' })[0], /local/);
  assert.match(errosDaRetirada({ ...OK, local: 'outro', localOutro: '' })[0], /Escreva onde/);
  assert.deepEqual(errosDaRetirada({ ...OK, local: 'outro', localOutro: 'Loja da Taquara' }), []);
  assert.match(errosDaRetirada({ ...OK, codigo: '12' })[0], /código/);
  assert.match(errosDaRetirada({ ...OK, assinatura: null })[0], /assinatura/);
  assert.match(errosDaRetirada({ ...OK, assinatura: 'data:image/png;base64,' + 'A'.repeat(400_000) })[0], /grande demais/);
  assert.match(errosDaRetirada({ ...OK, aceite: false })[0], /termo/);
});

test('terceiro: nome completo, 4 dígitos do documento, e SEMPRE com código', () => {
  const t = { ...OK, quem: 'terceiro', terceiroNome: 'Maria Souza', terceiroDoc4: '1234' };
  assert.deepEqual(errosDaRetirada(t), []);
  assert.match(errosDaRetirada({ ...t, terceiroNome: 'Maria' })[0], /Nome completo/);
  assert.match(errosDaRetirada({ ...t, terceiroDoc4: '12' })[0], /4 últimos/);
  assert.ok(errosDaRetirada({ ...t, semCodigo: true, motivoSemCodigo: 'esqueceu o celular' }).some((e) => /Terceiro só retira com o código/.test(e)));
});

test('sem código: só o próprio comprador, e com o motivo escrito', () => {
  assert.deepEqual(errosDaRetirada({ ...OK, codigo: '', semCodigo: true, motivoSemCodigo: 'conferido documento com foto' }), []);
  assert.match(errosDaRetirada({ ...OK, codigo: '', semCodigo: true, motivoSemCodigo: '' })[0], /por que/);
});

test('quem registra: admin, diretoria, loja física, ponto de retirada — cliente e vendedor não', () => {
  assert.equal(podeRegistrarRetirada({ role: 'admin' }), true);
  assert.equal(podeRegistrarRetirada({ role: 'user', primary_career_level: 'diretoria_operacao' }), true);
  assert.equal(podeRegistrarRetirada({ role: 'licensee', primary_career_level: 'ponto_retirada' }), true);
  assert.equal(podeRegistrarRetirada({ role: 'licensee', career_levels: ['loja_fisica'] }), true);
  assert.equal(podeRegistrarRetirada({ role: 'user', primary_career_level: 'usuario' }), false);
  assert.equal(podeRegistrarRetirada({ role: 'user', primary_career_level: 'vendedor' }), false);
  assert.equal(podeRegistrarRetirada({ role: 'admin', active: false }), false);
  assert.equal(podeRegistrarRetirada(null), false);
});

test('só pedido de retirada e pago pode ser retirado', () => {
  const p = { raw_base44: { delivery_type: 'pickup' }, status: 'paid' };
  assert.equal(ehRetirada(p), true);
  assert.equal(ehRetirada({ raw_base44: JSON.stringify({ delivery_type: 'pickup' }) }), true);
  assert.equal(vendaPodeSerRetirada(p), true);
  assert.equal(vendaPodeSerRetirada({ ...p, status: 'entregue' }), true, 'antigo marcado à mão ainda pode ganhar comprovante');
  assert.equal(vendaPodeSerRetirada({ ...p, status: 'pending_payment' }), false);
  assert.equal(vendaPodeSerRetirada({ ...p, status: 'cancelado' }), false);
  assert.equal(vendaPodeSerRetirada({ raw_base44: { delivery_type: 'delivery' }, status: 'paid' }), false);
});

test('código: 6 dígitos, fixo por pedido, diferente entre pedidos, só o certo confere', () => {
  const a = codigoDeRetirada('42c793470cd3ca348602b903', 'segredo');
  assert.match(a, /^\d{6}$/);
  assert.equal(codigoDeRetirada('42c793470cd3ca348602b903', 'segredo'), a);
  assert.notEqual(codigoDeRetirada('b64870d71b6a9ea3b66e052c', 'segredo'), a);
  assert.notEqual(codigoDeRetirada('42c793470cd3ca348602b903', 'outra-chave'), a, 'sem a chave do servidor não se adivinha');
  assert.equal(codigoConfere('42c793470cd3ca348602b903', `${a.slice(0, 3)} ${a.slice(3)}`, 'segredo'), true);
  assert.equal(codigoConfere('42c793470cd3ca348602b903', '000000' === a ? '111111' : '000000', 'segredo'), false);
  assert.equal(codigoConfere('42c793470cd3ca348602b903', '', 'segredo'), false);
  assert.equal(codigoFormatado('482913'), '482 913');
  assert.equal(codigoLimpo('48a2 913 77'), '482913');
});

test('textos: local, termo com o pedido, hora de Brasília, número igual ao do servidor', () => {
  assert.equal(rotuloDoLocal('ponto_bangu'), 'Ponto de Retirada Bangu');
  assert.equal(rotuloDoLocal('outro', ' Loja da Taquara '), 'Loja da Taquara');
  assert.match(TERMO.texto('LZ42C79347'), /pedido #LZ42C79347/);
  assert.equal(quandoRetirou('2026-09-30T18:42:00Z'), '30/09/2026 às 15:42');
  for (const v of [{ id: '42c793470cd3ca348602b903', kind: 'loja', tracking_code: 'LZ42C79347' }, { id: 'b64870d71b6a9ea3b66e052c', kind: 'arremate', tracking_code: 'AD966744131BR' }, { id: 'x1y2z3w4v5', kind: 'loja' }]) {
    assert.equal(numeroDoPedidoTela(v), numeroDoPedido(v));
  }
});
