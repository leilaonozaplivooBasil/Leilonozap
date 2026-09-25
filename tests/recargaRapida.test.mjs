// ⚡ RECARGA RÁPIDA NA SALA (25/09/2026) — as regras puras e a montagem.
//
// Dono (urgente): "ele deve sim conseguir entrar na sala do leilão, e só na
// hora de dar o lance receber o aviso. O aviso deve vir como um menu suspenso
// com os pacotes rápidos 27, 50, 100, 500, 1000, 3000 e digite o valor…
// sem sair da tela do leilão."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  PACOTES_RAPIDOS, VALOR_MINIMO, pacoteSugerido, valorDigitado, problemaDoValor, podeGerarPixAqui,
  pedidoDoPix, lerRespostaDoPix, estadoDoPagamento,
} from '../src/lib/recargaRapida.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('os pacotes são os do dono, e o sugerido é o MENOR que cobre o que falta', () => {
  assert.deepEqual([...PACOTES_RAPIDOS], [27, 50, 100, 500, 1000, 3000]);
  assert.equal(pacoteSugerido(890.13), 1000, 'o caso do print: saldo 106,87, lance 997');
  assert.equal(pacoteSugerido(27), 27); assert.equal(pacoteSugerido(27.01), 50);
  assert.equal(pacoteSugerido(5000), 3000, 'nenhum cobre: o maior');
  assert.equal(pacoteSugerido(0), null); assert.equal(pacoteSugerido(undefined), null);
});

test('"digite o valor": aceita 150, 150,50 e 1.500,00; o mínimo é R$ 5', () => {
  assert.equal(valorDigitado('150'), 150);
  assert.equal(valorDigitado('150,50'), 150.5);
  assert.equal(valorDigitado('1.500,00'), 1500);
  assert.equal(valorDigitado('R$ 27'), 27);
  assert.equal(valorDigitado(''), null); assert.equal(valorDigitado('abc'), null); assert.equal(valorDigitado('0'), null);
  assert.equal(problemaDoValor(4.99), `O mínimo é R$ ${VALOR_MINIMO},00.`);
  assert.equal(problemaDoValor(null), 'Escolha um pacote ou digite o valor.');
  assert.match(problemaDoValor(60000), /tela completa/);
  assert.equal(problemaDoValor(27), null);
});

test('💳 o pedido do PIX é o MESMO que o checkout manda num depósito de carteira', () => {
  const eu = { id: 'u1', full_name: 'Ângela Maria', email: ' angela@x.com ', cpf: '123', phone: '21' };
  assert.deepEqual(pedidoDoPix(eu, 100), {
    auction_id: null, buyer_id: 'u1', buyer_name: 'Ângela Maria', buyer_email: 'angela@x.com', buyer_cpf: '123', buyer_phone: '21',
    amount: 100, billing_type: 'PIX', description: 'Depósito na Carteira Digital - R$ 100,00', deposit_type: 'digital_wallet',
  });
  assert.equal(pedidoDoPix({ id: 'u1', email: '' }, 100), null, 'sem e-mail o servidor recusa — vai pra tela completa');
  assert.equal(podeGerarPixAqui({ id: 'u1', email: '' }), false);
  assert.equal(pedidoDoPix(eu, 3), null, 'abaixo do mínimo não sai');
});

test('ler a resposta do PIX e o status do pagamento', () => {
  assert.deepEqual(lerRespostaDoPix({ data: { success: true, payment_id: 9, pix_payload: 'COPIA', pix_qr_code: 'data:img' } }), { ok: true, paymentId: '9', copiaECola: 'COPIA', qrImagem: 'data:img', erro: null });
  assert.equal(lerRespostaDoPix({ success: false, error: 'PIX indisponível no momento' }).erro, 'PIX indisponível no momento');
  assert.match(lerRespostaDoPix({ success: false, error: 'nao_autenticado' }).erro, /sessão expirou/);
  assert.equal(lerRespostaDoPix({ success: true }).ok, false, 'sucesso sem QR nem código não serve');
  assert.equal(estadoDoPagamento({ found: true, status: 'confirmed' }), 'confirmado');
  assert.equal(estadoDoPagamento({ data: { found: true, status: 'failed' } }), 'recusado');
  assert.equal(estadoDoPagamento({ found: false }), 'aguardando');
});

test('🔴 a vitrine NÃO barra mais a entrada: o card leva direto pra sala; a sala entrega o usuário e o recarregar à gaveta', () => {
  const C = ler('../src/components/auction/AuctionCard.jsx');
  assert.doesNotMatch(C, /Deseja adicionar fundos agora/);
  assert.doesNotMatch(C, /getDigitalWalletBalance/, 'o card não consulta mais saldo antes de entrar');
  const corpo = C.slice(C.indexOf('const handleEnterAuction = (e) => {'), C.indexOf('const categoryEmojis'));
  assert.match(corpo, /navigate\(createPageUrl\("AuctionRoom"\) \+ `\?id=\$\{auction\.id\}`\);/);
  assert.doesNotMatch(corpo, /confirm\(/);
  const R = ler('../src/pages/AuctionRoom.jsx');
  assert.match(R, /currentUser=\{currentUser\}\s*onSaldoAtualizado=\{refreshWalletBalance\}/);
  const M = ler('../src/components/auction/LowBalanceModal.jsx');
  assert.match(M, /plataforma\.functions\.invoke\('createMPWalletDeposit', pedidoDoPix\(currentUser, valorFinal\)\)/);
  assert.match(M, /plataforma\.functions\.invoke\('checkPaymentStatus', \{ payment_id: pix\.paymentId \}\)/);
  assert.match(M, /contaDoLance\(\{ saldo: currentBalance, lanceMinimo: requiredAmount, frete: freteValor \}\)/, 'a conta do aviso segue a da trava (lance + frete)');
});
