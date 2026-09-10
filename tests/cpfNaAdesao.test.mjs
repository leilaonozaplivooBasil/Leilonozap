// 🪪 CPF NA ADESÃO DO VENDEDOR — o botão do Mercado Pago que não habilitava.
//
// O CASO REAL, 09/09/2026: um cliente tentou a adesão de R$ 1.497 duas vezes
// (17h56 e 18h34) e o botão de pagar nunca habilitou na página do Mercado
// Pago. O cadastro dele tinha `cpf` NULL — e a rota só manda
// `payer.identification` SE houver CPF. A preferência ia sem identificação do
// pagador, e cartão desse valor no Brasil exige CPF.
//
// 🔴 O QUE TORNAVA ISSO INVISÍVEL PRA GENTE: do nosso lado dava tudo certo. A
// preferência era criada, a URL vinha, a pessoa era redirecionada, a venda
// ficava `pending_payment`. O erro só existia na tela dela, no gateway, onde
// ninguém do time alcança.
//
// A tela do carrinho sempre pediu CPF. A da adesão só repassava o que
// estivesse no perfil, sem campo e sem conferência — era a assimetria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { cpfValido, formatarCpf, soDigitos } from '../src/lib/cpf.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const TELA = semComentarios(ler('../src/pages/VendedorCheckout.jsx'));
const ROTA = semComentarios(ler('../api/functions/createSellerAdhesionPayment.js'));

test('a conta do CPF: dígitos verificadores, e repetido não passa', () => {
  assert.equal(cpfValido('529.982.247-25'), true, 'CPF válido com máscara');
  assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido('52998224724'), false, 'último dígito errado');
  // 🔴 Os repetidos passam na conta dos verificadores mas não são CPF de
  // ninguém — é o que a pessoa digita pra "pular" o campo, e é justamente o
  // que faz o pagamento morrer no gateway, longe da tela.
  for (const r of ['11111111111', '00000000000', '99999999999']) {
    assert.equal(cpfValido(r), false, `${r} não pode passar`);
  }
  assert.equal(cpfValido(''), false);
  assert.equal(cpfValido(null), false);
  assert.equal(cpfValido('529982247'), false, 'curto demais');
});

test('a máscara acompanha quem digita e quem apaga', () => {
  assert.equal(formatarCpf('529'), '529');
  assert.equal(formatarCpf('529982'), '529.982');
  assert.equal(formatarCpf('52998224725'), '529.982.247-25');
  assert.equal(formatarCpf('529982247259999'), '529.982.247-25', 'não deixa passar de 11 dígitos');
  assert.equal(soDigitos('529.982.247-25'), '52998224725');
});

test('🔴 o servidor recusa cartão sem CPF — a tela sozinha não basta', () => {
  // Régua de tela é conveniência, não garantia: quem chama a rota direto passa
  // por cima dela.
  assert.match(ROTA, /if \(useCard && !cpfValido\(buyer_cpf\)\)/);
  assert.match(ROTA, /Informe um CPF válido para pagar com cartão/);
});

test('🔴 a recusa vem ANTES de criar a venda', () => {
  // Recusar depois deixaria uma `pending_payment` órfã de um checkout que
  // nunca existiu — e a peça reservada junto.
  const iTrava = ROTA.indexOf('useCard && !cpfValido');
  const iVenda = ROTA.indexOf("kind: 'seller_adhesion'");
  assert.ok(iTrava > -1 && iVenda > -1, 'sumiu a trava ou a criação da venda');
  assert.ok(iTrava < iVenda, 'a trava caiu depois da criação da venda — sobra pending_payment órfã');
});

test('a tela pede o CPF e trava o botão até ele conferir', () => {
  assert.match(TELA, /data-teste="cpf-adesao"/, 'sem campo, a pessoa não tem como informar');
  assert.match(TELA, /const cpfOk = cpfValido\(cpf\)/);
  assert.match(TELA, /disabled=\{creating \|\| !isAddressComplete \|\| !cpfOk\}/,
    'o botão precisa travar no CPF, não só no endereço');
});

test('🔴 vai pro servidor o CPF CONFERIDO, não o que estava no perfil', () => {
  // Era `buyer_cpf: user.cpf` — o perfil do cliente do caso real tinha NULL ali.
  assert.match(TELA, /buyer_cpf: soDigitos\(cpf\)/);
  assert.ok(!/buyer_cpf: user\.cpf/.test(TELA), 'voltou a mandar o campo do perfil sem conferir');
});

test('o CPF conferido fica guardado no cadastro', () => {
  // Sem isto, a pessoa digita de novo na próxima compra — e a etiqueta da
  // transportadora, que também depende do CPF, continua travando.
  assert.match(ROTA, /cpf: soDigitos\(buyer_cpf\)/);
});

test('o PIX não foi travado junto', () => {
  // O PIX está funcionando hoje (pagamento confirmado às 13h01). Travar os dois
  // por causa do cartão tiraria o único caminho que funciona.
  assert.match(ROTA, /useCard && !cpfValido/, 'a trava tem que ser SÓ do cartão');
  assert.ok(!/if \(!cpfValido\(buyer_cpf\)\) \{/.test(ROTA), 'a trava passou a valer pro PIX também');
});
