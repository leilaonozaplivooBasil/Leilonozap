// Cartão recusado por "risco" (cc_rejected_high_risk): 22 das 30 últimas recusas.
//
// Consultando a API do Mercado Pago, o que tinha chegado lá do nosso lado era:
//     "payer": { "first_name": "João", "last_name": "Vitor Paim" }
// Só o nome. O antifraude do MP avalia o comprador com o que recebe — e recebendo
// quase nada, recusa. Não era o cartão de ninguém.
//
// A tela do carrinho já coletava telefone e endereço; os dois paravam antes do MP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const cartao = ler('../api/functions/createMPCatalogCardCheckout.js');
const carrinho = ler('../src/pages/Cart.jsx');

test('a tela manda o telefone que ela mesma exige', () => {
  assert.match(
    carrinho,
    /createMPCatalogCardCheckout'[\s\S]{0,600}?phone: formData\.phone\.replace/,
    'o telefone voltou a ficar de fora da chamada do cartão'
  );
});

test('a preferência leva telefone do pagador no formato do MP', () => {
  // area_code + number — nomes conferidos no SDK oficial (PreferenceRequest.payer.phone).
  assert.match(cartao, /area_code: telDigitos\.slice\(0, 2\)/);
  assert.match(cartao, /number: telDigitos\.slice\(2\)/);
  assert.match(cartao, /telDigitos\.length > 11 && telDigitos\.startsWith\('55'\)/, 'o DDI 55 voltou a virar DDD');
  assert.match(cartao, /\.\.\.\(payerPhone \? \{ phone: payerPhone \} : \{\}\)/);
});

test('a preferência leva endereço do pagador', () => {
  assert.match(cartao, /zip_code: cepEnt, street_name: rua \|\| 'Não informado', street_number: numero \|\| 'S\/N'/);
  assert.match(cartao, /\.\.\.\(payerAddress \? \{ address: payerAddress \} : \{\}\)/);
});

test('a preferência leva o destino da entrega', () => {
  assert.match(cartao, /receiver_address:/);
  // Sem `mode` o MP pode achar que deve calcular frete (Mercado Envios). Nós já
  // cobramos o frete como item — ele só recebe o endereço.
  assert.match(cartao, /mode: 'not_specified'/);
});

test('retirada não declara entrega', () => {
  assert.match(cartao, /const ehEntrega = String\(body\?\.delivery_type \|\| ''\) === 'delivery'/);
  assert.match(cartao, /const shipments = ehEntrega && payerAddress/);
});

test('telefone e endereço têm de onde vir mesmo com a tela em cache antigo', () => {
  // O SELECT de app_users que já existia (o do cargo de rede) agora traz também
  // telefone e endereço do cadastro.
  // Sem amarrar a ordem das colunas: o que importa é que cada uma esteja no SELECT.
  const selectAppUsers = cartao.match(/app_users\?select=([^&`]+)/)?.[1] || '';
  for (const coluna of ['career_levels', 'phone', 'address_street', 'address_zip_code', 'created_date']) {
    assert.ok(selectAppUsers.split(',').includes(coluna), `faltou ${coluna} no SELECT de app_users`);
  }
  assert.match(cartao, /soDigitos\(buyer\.phone \|\| cadastro\?\.phone\)/);
});

test('a preferência diz há quanto tempo a pessoa é cliente', () => {
  // Campo próprio do MP para antifraude: separa cliente de sempre de conta criada
  // agora para dar golpe.
  assert.match(cartao, /registration_date: new Date\(cadastro\.created_date\)\.toISOString\(\)/);
});

test('se o MP recusar a preferência nova, a compra não morre', () => {
  // Rede de segurança: pior caso é o comportamento de antes desta correção,
  // nunca um checkout a menos.
  assert.match(cartao, /const semEnriquecer = \{ \.\.\.prefBody \};/);
  assert.match(cartao, /delete semEnriquecer\.shipments;/);
  assert.match(cartao, /r = await criarPreferencia\(semEnriquecer\);/);
});

// Réplica da regra, para provar o efeito e não só o texto do arquivo.
function telefoneMP(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? { area_code: d.slice(0, 2), number: d.slice(2) } : null;
}

test('o efeito: celular brasileiro vira DDD + número', () => {
  assert.deepEqual(telefoneMP('(11) 91234-5678'), { area_code: '11', number: '912345678' });
  assert.deepEqual(telefoneMP('4832221111'), { area_code: '48', number: '32221111' });
});

test('quem digita o país junto não vira DDD 55', () => {
  assert.deepEqual(telefoneMP('+55 (11) 91234-5678'), { area_code: '11', number: '912345678' });
});

test('telefone torto não vai torto — simplesmente não vai', () => {
  assert.equal(telefoneMP('1234'), null);
  assert.equal(telefoneMP('11912345678999'), null);
  assert.equal(telefoneMP(''), null);
  assert.equal(telefoneMP(null), null);
});
