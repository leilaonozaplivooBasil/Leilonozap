// 💰 Depósito mínimo R$ 27, uma regra só, valendo no servidor (27/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEPOSITO_MINIMO, PACOTES_DE_DEPOSITO, TEXTO_DO_MINIMO, abaixoDoMinimo } from '../src/lib/depositoMinimo.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('💰 o piso é R$ 27 e os pacotes começam nele', () => {
  assert.equal(DEPOSITO_MINIMO, 27);
  assert.deepEqual([...PACOTES_DE_DEPOSITO], [27, 50, 100, 500, 1000, 3000]);
  assert.equal(TEXTO_DO_MINIMO, 'Depósito mínimo R$ 27,00');
  assert.equal(abaixoDoMinimo(22.19), true, 'lance de R$ 8 + frete: o caso do dono');
  assert.equal(abaixoDoMinimo(26.99), true);
  assert.equal(abaixoDoMinimo(27), false);
  assert.equal(abaixoDoMinimo(null), true);
});

test('🛡️ o servidor recusa depósito em carteira abaixo do piso (arremate e aporte passam)', () => {
  const S = ler('../api/functions/createMPWalletDeposit.js');
  assert.match(S, /import \{ DEPOSITO_MINIMO, abaixoDoMinimo \} from '\.\.\/\.\.\/src\/lib\/depositoMinimo\.js'/);
  assert.match(S, /if \(isWalletDeposit && !body\?\.is_investor_capital && abaixoDoMinimo\(amount\)\)/);
  assert.match(S, /error: `Depósito mínimo R\$ \$\{DEPOSITO_MINIMO\},00`/);
  // a recusa vem ANTES de qualquer chamada ao Mercado Pago
  assert.ok(S.indexOf('abaixoDoMinimo(amount)') < S.indexOf('api.mercadopago.com'), 'valida antes de cobrar');
});

test('🪟 as três telas usam o mesmo piso e os mesmos pacotes', () => {
  const W = ler('../src/components/wallet/WalletDrawer.jsx');
  assert.match(W, /const QUICK_AMOUNTS = PACOTES_DE_DEPOSITO;/);
  assert.doesNotMatch(W, /< 100\b|>= 100\b|R\$ 100,00/, 'nenhum "100" solto sobrou na gaveta');
  assert.match(W, /toast\.error\(TEXTO_DO_MINIMO\)/);
  const R = ler('../src/lib/recargaRapida.js');
  assert.match(R, /export const VALOR_MINIMO = DEPOSITO_MINIMO;/);
  assert.match(R, /export const PACOTES_RAPIDOS = PACOTES_DE_DEPOSITO;/);
  const A = ler('../src/pages/AddFunds.jsx');
  assert.match(A, /selectedAmount < DEPOSITO_MINIMO/);
  assert.doesNotMatch(A, /R\$ 5,00|mínimo R\$ 5\)/);
});
