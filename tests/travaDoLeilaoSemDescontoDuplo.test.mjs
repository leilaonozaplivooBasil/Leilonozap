/**
 * 🔧 A TRAVA DO LEILÃO NÃO DESCONTA A MESMA QUANTIA DUAS VEZES — 17/09/2026.
 *
 * A trava da #379 decidia pelo `winner_id`: "é a líder ⇒ o dinheiro está em
 * saldo_reservado, não conta". A suposição cai dos dois lados na base real —
 * `winner_id` nulo em leilão com lance (61 dos 63 ativos), e `winner_id`
 * preenchido com saldo_reservado zerado.
 *
 * A regra que passa a valer não pergunta quem lidera:
 *
 *     comprometido = (maior lance vivo por leilão, somado) − saldo_reservado
 *
 * Estes testes travam as DUAS pontas — o SQL e o JS — porque elas alimentam
 * telas diferentes e, discordando, a carteira mostra um número e o checkout
 * recusa por outro.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => readFileSync(path.join(RAIZ, p), 'utf8');
const semComentariosSQL = (txt) => String(txt ?? '').replace(/^\s*--.*$/gm, '');

const ARQ = readdirSync(path.join(RAIZ, 'supabase/migrations'))
  .find((f) => f.includes('trava_do_leilao_sem_desconto_duplo'));

test('a migração existe com nome de dígitos puros (senão o CLI pula em silêncio)', () => {
  assert.ok(ARQ, 'migração da trava não encontrada');
  assert.match(ARQ, /^\d+_[a-z0-9_]+\.sql$/);
});

const SQL = semComentariosSQL(leia(`supabase/migrations/${ARQ}`));
const JS = semComentarios(leia('api/_lib/compromissoLeilao.js'));

// ───────────────────── o SQL (comprar_com_saldo) ─────────────────────

test('🔴 SQL: o comprometido desconta o saldo_reservado', () => {
  // greatest(0, soma − reservado): sem o desconto, a mesma quantia sai duas vezes
  assert.match(
    SQL,
    /v_comprometido\s*:=\s*round\(\s*greatest\(\s*0\s*,\s*coalesce\(v_comprometido,\s*0\)\s*-\s*v_reservado\s*\)/,
  );
});

test('🔴 SQL: saldo_reservado é lido na MESMA trava de linha das outras carteiras', () => {
  // ler fora do `for update` reabriria a janela entre conferir e debitar
  const trava = SQL.match(/select[^;]*into\s+v_deposito[^;]*for update;/is);
  assert.ok(trava, 'bloco `for update` do comprador não encontrado');
  assert.match(trava[0], /saldo_reservado/);
  assert.match(trava[0], /v_reservado/);
});

test('🔴 SQL: a soma dos lances NÃO filtra mais por winner_id', () => {
  const soma = SQL.match(/select\s+coalesce\(sum\(maior\),\s*0\)\s*into\s+v_comprometido\s+from\s*\([\s\S]*?\)\s*t;/i);
  assert.ok(soma, 'subconsulta do comprometido não encontrada');
  assert.doesNotMatch(
    soma[0],
    /winner_id/,
    'voltou a decidir por winner_id — é exatamente o defeito que esta migração corrige',
  );
  // e continua contando só leilão vivo, e só o MAIOR lance por leilão
  assert.match(soma[0], /a\.status\s*=\s*'active'/);
  assert.match(soma[0], /max\(coalesce\(m\.bid_amount,0\)\s*\+\s*coalesce\(m\.frete_amount,0\)\)/);
  assert.match(soma[0], /group by m\.auction_id/);
});

test('o resto do dinheiro da #379 fica de pé: depósito primeiro, comissão no resto', () => {
  assert.match(SQL, /v_do_deposito\s*:=\s*round\(least\(v_livre_deposito,\s*v_total\)/);
  assert.match(SQL, /v_da_comissao\s*:=\s*round\(v_total\s*-\s*v_do_deposito/);
});

// ───────────────────── o JS (compromissoLeilao) ─────────────────────

test('🔴 JS: conta todo leilão vivo, sem perguntar quem lidera', () => {
  assert.match(JS, /if\s*\(a\.status === 'active'\)\s*vivos\[a\.id\]\s*=\s*true;/);
  assert.doesNotMatch(
    JS,
    /a\.winner_id\s*!==\s*uid/,
    'voltou a decidir por winner_id — mesmo defeito do SQL, do lado da carteira',
  );
});

test('🔴 JS: desconta o saldo_reservado antes de devolver', () => {
  assert.match(JS, /saldo_reservado/);
  assert.match(JS, /Math\.max\(0,\s*emLances\s*-\s*reservado\)/);
});

test('🔴 JS: o desconto nunca deixa o comprometido negativo', () => {
  // negativo viraria saldo_livre_loja MAIOR que o saldo_disponivel — dinheiro do nada
  assert.match(JS, /Math\.max\(0,/);
});

test('JS e SQL concordam: os dois somam o MAIOR lance por leilão', () => {
  assert.match(JS, /total > porLeilao\[l\.auction_id\]/);
  assert.match(SQL, /max\(coalesce\(m\.bid_amount,0\)/);
});
