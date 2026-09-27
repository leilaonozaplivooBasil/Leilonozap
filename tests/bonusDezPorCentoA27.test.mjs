// 💰 +10% de crédito da Loja a partir de R$ 27 (27/09/2026, áudio do dono:
// "a partir dos 27 já ganha 10%").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEPOSITO_MINIMO as PISO_DO_DEPOSITO } from '../src/lib/depositoMinimo.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('o cupom Passaporte nasce a partir do mesmo piso do depósito (R$ 27)', () => {
  const C = ler('../api/_lib/passaporteCoupon.js');
  assert.match(C, /export const DEPOSITO_MINIMO = 27;/);
  assert.equal(PISO_DO_DEPOSITO, 27);
  assert.match(C, /if \(!userId \|\| aporte < DEPOSITO_MINIMO\) return \{ created: false, reason: 'abaixo_do_minimo' \};/);
});

test('a gaveta, o admin e o termo dizem R$ 27, não R$ 100', () => {
  const W = ler('../src/components/wallet/WalletDrawer.jsx');
  assert.match(W, /Depósitos a partir de R\$ \{DEPOSITO_MINIMO\} ganham/);
  assert.doesNotMatch(W, /Depósitos de R\$ 100 ou mais/);
  const A = ler('../src/pages/CatalogOrdersAdmin.jsx');
  assert.match(A, />= DEPOSITO_MINIMO\);/);
  const T = ler('../src/components/legal/TermoAdesaoTexto.jsx');
  assert.match(T, /Depósito antecipado mínimo de R\$ 27,00/);
  assert.match(T, /Depósitos a partir de R\$ 27 geram um cupom Passaporte/);
  assert.doesNotMatch(T, /R\$ 100 ou mais/);
});
