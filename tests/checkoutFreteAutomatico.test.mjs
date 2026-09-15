// 🚚 DIR — checkout da Loja Virtual: o frete se calcula sozinho e o botão nunca
// fica morto (15/09/2026).
//
// O RELATO (dono, com print do celular): "melhorar esse cartão aí do calcular
// frete que está muito feio... está muito próximo da borda... fazer essa análise
// em toda essa parte de checkout para não acontecer esses erros principiantes".
//
// O QUE ESTAVA ERRADO:
//   1. O único jeito de cotar o frete era um link pequeno, sublinhado, escondido
//      dentro do resumo do pedido ("Calcular frete"). Quem não achava o link
//      ficava preso.
//   2. O botão grande de pagar ficava DESABILITADO com o texto "CALCULE O FRETE
//      PARA CONTINUAR" — tocava e nada acontecia. Um botão que manda fazer algo
//      e não faz é o erro de principiante que o dono apontou.
//   3. Em tela de celular o texto em text-lg + ícone estourava a pílula (o print
//      mostra a frase colada na borda).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const cart = ler('../src/pages/Cart.jsx');

test('o frete é cotado automaticamente quando o CEP fica completo (entrega, com itens)', () => {
  assert.match(cart, /const calcularFreteRef = useRef\(calcularFrete\)/);
  assert.match(cart, /if \(deliveryMethod !== 'delivery' \|\| !cartItems\.length\) return;/);
  assert.match(cart, /if \(cep\.length !== 8\) return;\s*\n\s*const t = setTimeout\(\(\) => \{ calcularFreteRef\.current\?\.\(\); \}, 350\);/);
  assert.match(cart, /\}, \[freteAssinatura, pixData, saldoOk\]\);/, 'recalcula quando muda CEP, entrega, itens ou quantidade — e para depois do pagamento gerado');
});

test('depois do PIX gerado ou da compra com saldo o frete não é recotado', () => {
  const i = cart.indexOf('const calcularFreteRef');
  const efeito = cart.slice(i, i + 700);
  assert.match(efeito, /if \(pixData \|\| saldoOk\) return;/);
});

test('o botão grande NUNCA fica morto: com CEP calcula, sem CEP leva até o campo', () => {
  assert.match(cart, /const resolverFretePendente = \(\) => \{/);
  assert.match(cart, /if \(cep\.length === 8\) \{ calcularFrete\(\); return; \}/);
  assert.match(cart, /toast\.error\('Preencha o CEP de entrega pra calcular o frete\.'\)/);
  assert.match(cart, /cepInputRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(cart, /ref=\{cepInputRef\}/, 'o campo de CEP precisa estar ligado ao ref pra rolar até ele');
});

test('o botão chama o frete quando está pendente e o checkout quando está pronto', () => {
  assert.match(cart, /onClick=\{freteObrigatorioPendente \? resolverFretePendente : handleCheckout\}/);
  assert.ok(!/disabled=\{isProcessing \|\| freteObrigatorioPendente\}/.test(cart), 'o botão não pode mais ser desabilitado só porque o frete está pendente');
  assert.match(cart, /disabled=\{isProcessing \|\| calculandoFrete\}/);
});

test('o texto cabe na pílula no celular e diz o que o toque faz', () => {
  assert.match(cart, /text-base sm:text-lg font-bold rounded-full whitespace-normal leading-tight/);
  assert.match(cart, /px-6/);
  assert.match(cart, /'Calcular frete e continuar'/);
  assert.match(cart, /'Calculando o frete…'/);
  assert.ok(!cart.includes('CALCULE O FRETE PARA CONTINUAR'), 'a ordem gritada em caixa alta saiu');
});

test('enquanto o frete está pendente o botão não se veste de "pagar" (cinza, não verde)', () => {
  assert.match(cart, /freteObrigatorioPendente \? 'bg-gray-700 hover:bg-gray-600 border border-gray-500 shadow-black\/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600\/30'/);
});

test('o Passaporte no carrinho continua vindo do servidor e o desconto vai no pagamento', () => {
  // auditoria do caminho inteiro (caso Alexandre, 15/09): status → banner → payload → webhook
  assert.match(cart, /plataforma\.functions\.invoke\('passaporteCoupon', \{ user_id: currentUser\.id \}\)/);
  assert.match(cart, /use_passaporte: usarPassaporte,/);
  const webhook = ler('../api/functions/mpWebhook.js');
  assert.match(webhook, /const cupom = await debitarCupomDaVenda\(sale\);/);
  const lib = ler('../api/_lib/passaporteCoupon.js');
  assert.match(lib, /passaporte_coupons\?select=id,saldo_restante,primeiro_uso_em&user_id=eq\.\$\{enc\(uid\)\}&saldo_restante=gt\.0/, 'o que é gastável é SÓ saldo_restante > 0 — foi isso que o Alexandre não tinha');
});
