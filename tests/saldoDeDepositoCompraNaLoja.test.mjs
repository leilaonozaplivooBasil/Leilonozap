/**
 * 💳 O CRÉDITO DE PARTICIPAÇÃO COMPRA NA LOJA VIRTUAL — cláusula 5 do Termo.
 *
 * Termo de Adesão vigente (2026-08-01), cláusula 5:
 *   "O saldo permanece integralmente na carteira, sem prazo de validade, e pode
 *    ser usado na Loja Virtual com o desconto garantido da plataforma."
 *
 * Era a única saída contratual do depósito (a cláusula 2 chama de "crédito de
 * consumo" e não promete saque em lugar nenhum) — e não funcionava: a função
 * `comprar_com_saldo` lia só `commission_balance`.
 *
 * O comportamento do dinheiro foi medido no Postgres de verdade, numa transação
 * com ROLLBACK (6 cenários, incluindo a recusa de quem tem dinheiro disputando
 * leilão vivo). Estes testes travam o que aquela medição provou, para que uma
 * edição futura não desfaça em silêncio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => readFileSync(path.join(RAIZ, p), 'utf8');

// SQL comenta com `--`, não com `//` — o ajudante de JS não serve aqui.
const semComentariosSQL = (txt) => String(txt ?? '').replace(/^\s*--.*$/gm, '');

const MIGRACAO = 'supabase/migrations/20260916160000_saldo_de_deposito_compra_na_loja.sql';
const SQL = semComentariosSQL(leia(MIGRACAO));
const PAGAR = semComentarios(leia('api/functions/payWithBalance.js'));
const CARRINHO = semComentarios(leia('src/pages/Cart.jsx'));

test('a migração existe com nome de dígitos puros (senão o CLI pula em silêncio)', () => {
  assert.match(path.basename(MIGRACAO), /^\d+_[a-z0-9_]+\.sql$/);
});

// ─────────────────────────── o dinheiro ───────────────────────────

test('🔴 DEPÓSITO PRIMEIRO, comissão só no que sobrar', () => {
  // o que sai do depósito é limitado pelo DEPÓSITO livre…
  assert.match(SQL, /v_do_deposito\s*:=\s*round\(least\(v_livre_deposito,\s*v_total\)/);
  // …e a comissão é o RESTO, nunca o contrário
  assert.match(SQL, /v_da_comissao\s*:=\s*round\(v_total\s*-\s*v_do_deposito/);
  // invertido seria `least(v_comissao, ...)` primeiro — não pode existir
  assert.ok(!/least\(v_comissao/.test(SQL), 'a comissão não pode ser consumida antes do depósito');
});

test('as DUAS carteiras são debitadas na mesma instrução', () => {
  const i = SQL.indexOf('update app_users');
  assert.ok(i > 0, 'não achei o UPDATE das carteiras');
  const bloco = SQL.slice(i, SQL.indexOf('where id = _buyer', i));
  assert.match(bloco, /saldo_disponivel\s*=\s*round\(coalesce\(saldo_disponivel,0\)\s*-\s*v_do_deposito/);
  assert.match(bloco, /commission_balance\s*=\s*round\(coalesce\(commission_balance,0\)\s*-\s*v_da_comissao/);
});

test('a linha do comprador é TRAVADA antes de conferir o saldo (for update)', () => {
  assert.match(SQL, /from app_users where id = _buyer for update/);
});

// ───────────────── a trava dos três estados (08/08/2026) ─────────────────

test('🔴 dinheiro disputando leilão VIVO não compra na loja', () => {
  const i = SQL.indexOf('v_comprometido from');
  assert.ok(i > 0, 'não achei o cálculo do comprometido');
  const bloco = SQL.slice(i, SQL.indexOf(') t;', i));
  assert.match(bloco, /a\.status\s*=\s*'active'/, 'só leilão vivo prende dinheiro');
  assert.match(bloco, /coalesce\(a\.winner_id,\s*''\)\s*<>\s*_buyer/, 'quem lidera já está em saldo_reservado');
  assert.match(bloco, /m\.message_type\s*=\s*'bid'/);
  // por leilão vale o MAIOR lance — somar todos cobraria lances já devolvidos
  assert.match(bloco, /max\(coalesce\(m\.bid_amount,0\)\s*\+\s*coalesce\(m\.frete_amount,0\)\)/);
  assert.match(bloco, /group by m\.auction_id/);
});

test('o comprometido é DESCONTADO do depósito antes de virar poder de compra', () => {
  assert.match(SQL, /v_livre_deposito\s*:=\s*round\(greatest\(0,\s*v_deposito\s*-\s*v_comprometido\)/);
  assert.match(SQL, /v_poder\s*:=\s*round\(v_livre_deposito\s*\+\s*v_comissao/);
  assert.match(SQL, /if v_poder < v_total then/);
});

test('o cálculo do comprometido fica DENTRO da função, não chega de fora', () => {
  // receber o número por parâmetro reabriria a janela entre conferir e debitar
  const assinatura = SQL.slice(SQL.indexOf('CREATE OR REPLACE FUNCTION'), SQL.indexOf('RETURNS json'));
  assert.ok(!/comprometid/i.test(assinatura), 'o comprometido não pode ser parâmetro da função');
});

// ─────────────────────────── o frete ───────────────────────────

test('o frete também gasta depósito primeiro, e respeita o comprometido', () => {
  const i = PAGAR.indexOf('async function reservarFrete');
  assert.ok(i > 0);
  const bloco = PAGAR.slice(i, PAGAR.indexOf('\n}', PAGAR.indexOf('return r.ok', i)));
  assert.match(bloco, /livreDeposito\s*=\s*Math\.max\(0,[\s\S]{0,80}?comprometido\)/);
  assert.match(bloco, /doDeposito\s*=\s*round2\(Math\.min\(livreDeposito,\s*valor\)\)/);
  assert.match(bloco, /daComissao\s*=\s*round2\(valor\s*-\s*doDeposito\)/);
});

test('🔴 frete recusado volta EXATAMENTE de onde saiu', () => {
  assert.match(PAGAR, /moverCarteirasCAS\(buyerId,\s*freteDoDeposito,\s*freteDaComissao\)/);
  // devolver `frete.valor` numa carteira só era o jeito antigo: criaria dinheiro
  assert.ok(!/ajustarSaldoCAS\(buyerId,\s*frete\.valor\)/.test(PAGAR));
});

test('o CAS das duas colunas trata coluna NULL (eq.0 nunca casa com NULL)', () => {
  assert.match(PAGAR, /or\(\$\{coluna\}\.eq\.0,\$\{coluna\}\.is\.null\)/);
  assert.match(PAGAR, /and=\(\$\{filtroCAS\('saldo_disponivel', dep\)\},\$\{filtroCAS\('commission_balance', com\)\}\)/);
});

// ─────────────────────────── a tela ───────────────────────────

test('o carrinho soma as duas carteiras para mostrar o botão', () => {
  assert.match(CARRINHO, /invoke\('getMyWallet'/);
  assert.match(CARRINHO, /Number\(w\.saldo_livre_loja\)[^;]*Number\(w\.commission_balance\)/s);
});

test('🔴 o carrinho NÃO lê a coluna crua do depósito', () => {
  // `saldo_disponivel` cru não desconta o dinheiro que está num lance vivo: a
  // pessoa escolheria o produto, clicaria, e só então o banco recusaria.
  assert.ok(!/fullUser\.saldo_disponivel/.test(CARRINHO));
  assert.ok(!/setSaldo\(Number\(fullUser\.saldo_disponivel\)/.test(CARRINHO));
});
