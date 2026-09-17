/**
 * 💳 A ESCOLHA DO CARTÃO NÃO SE PERDE ENTRE A CARTEIRA E O CHECKOUT.
 *
 * 17/09/2026, numa demonstração: a pessoa escolheu o valor, marcou Cartão,
 * apertou o botão — e o checkout carregou em PIX. A escolha ficava para trás
 * porque a gaveta navegava sem mandar o meio de pagamento e o checkout abria
 * sempre em `useState('PIX')`. Nada quebrava; só ignorava o que foi escolhido.
 *
 * O defeito passou meses invisível porque o botão do PIX, ao lado, COBRA ALI
 * MESMO (gera o QR dentro da gaveta). Quem testa PIX nunca vê o problema.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => semComentarios(readFileSync(path.join(RAIZ, p), 'utf8'));

const GAVETA = leia('src/components/wallet/WalletDrawer.jsx');
const CHECKOUT = leia('src/pages/AuctionCheckoutModern.jsx');

test('🔴 a gaveta manda o meio de pagamento junto com o valor', () => {
  const nav = GAVETA.match(/const handlePayWithCard[\s\S]*?\n  \};/);
  assert.ok(nav, 'handlePayWithCard não encontrado');
  assert.match(nav[0], /paymentType:\s*'CREDIT_CARD'/,
    'sem isto o checkout abre em PIX e a escolha do cartão é descartada');
  // e continua mandando o que já mandava
  assert.match(nav[0], /amount:\s*effectiveAmount/);
  assert.match(nav[0], /depositType:\s*'digital_wallet'/);
});

test('🔴 o checkout abre no meio que a tela anterior escolheu', () => {
  assert.match(CHECKOUT, /useState\(location\.state\?\.paymentType \|\| 'PIX'\)/);
});

test('PIX segue sendo o padrão de quem chega sem escolha feita', () => {
  // o `|| 'PIX'` é o que garante isso — tirar viraria `undefined` e nenhum
  // meio ficaria marcado ao entrar pelo link do leilão
  assert.match(CHECKOUT, /\|\| 'PIX'\)/);
});

test('🏷️ o botão do cartão para de prometer pagamento', () => {
  // ele NÃO cobra: leva ao formulário. Prometer "Pagar R$ X" e entregar um
  // formulário foi o que fez a demonstração parecer defeito.
  assert.match(GAVETA, /Continuar no Cartão/);
  assert.doesNotMatch(GAVETA, /Pagar R\$ \$\{fmtBR\(cardChargeAmount\)\} no Cartão/);
  assert.doesNotMatch(GAVETA, /'Pagar no Cartão'/);
});

test('🟢 o botão do PIX continua dizendo que cobra — porque cobra mesmo', () => {
  // ele gera o QR dentro da gaveta; ali "Gerar PIX de R$ X" é verdade
  assert.match(GAVETA, /Gerando PIX\.\.\.|Gerar PIX/);
  assert.match(GAVETA, /onClick=\{handleGeneratePix\}/);
});

test('o valor cobrado continua visível, agora fora do botão', () => {
  assert.match(GAVETA, /Total cobrado no cartão/);
  assert.match(GAVETA, /Taxa do cartão/);
  assert.match(GAVETA, /Valor que cai na carteira/);
});

test('🔒 investidor continua preso ao PIX', () => {
  // a trava é um efeito que força PIX; o meio vindo de fora não pode furá-la
  assert.match(CHECKOUT, /if \(isInvestidor && paymentType !== 'PIX'\) \{\s*setPaymentType\('PIX'\);/);
});
