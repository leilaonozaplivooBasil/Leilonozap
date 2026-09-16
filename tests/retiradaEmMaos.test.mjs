/**
 * 🤝 RETIRADA EM MÃOS NO LEILÃO — lote a lote, autorizada pelo banco.
 *
 * Pedido do dono (16/09/2026): quem arremata — no lance ou no Arremate na Hora —
 * passa a poder retirar o produto sem pagar frete.
 *
 * 🔴 ISTO REVERTE, EM PARTE, UMA DECISÃO DO PRÓPRIO DONO DE 21/08, escrita no
 * `submitAtomicBuyNow.js`: "não podemos de maneira nenhuma aceitar lances ou
 * arrematar sem frete". A reversão é PARCIAL e de propósito: frete continua
 * obrigatório em todo leilão, exceto nos lotes com `permite_retirada`.
 *
 * O que estes testes travam é a parte que, se cair, vira furo de dinheiro:
 * quem autoriza a retirada é o BANCO, nunca o corpo da requisição.
 *
 * As quatro travas do banco foram medidas num Postgres de verdade (transação
 * com ROLLBACK): retirada em lote não liberado, valor fora da lista e desligar
 * a permissão com a retirada já escolhida — as três recusadas pelo CHECK.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => semComentarios(readFileSync(path.join(RAIZ, p), 'utf8'));
const semSQL = (t) => t.replace(/^\s*--.*$/gm, '');

const MIGRACAO = semSQL(readFileSync(path.join(RAIZ, 'supabase/migrations/20260916195945_retirada_em_maos_no_leilao.sql'), 'utf8'));
const FRETE = leia('api/_lib/freteLeilao.js');
const LANCE = leia('api/functions/submitAtomicBid.js');
const ARREMATE = leia('api/functions/submitAtomicBuyNow.js');
const MARTELO = leia('api/_lib/finalizeAuctionCore.js');
const SALA = leia('src/pages/AuctionRoom.jsx');

// ───────────────────────── o banco manda ─────────────────────────

test('🔴 quem autoriza a retirada é o BANCO, não o corpo da requisição', () => {
  const i = FRETE.indexOf('if (retirada)');
  assert.ok(i > 0, 'não achei o ramo da retirada');
  const bloco = FRETE.slice(i, i + 900);
  // a permissão vem da linha do leilão, lida do banco
  assert.match(bloco, /if \(!leilao\.permite_retirada\)/);
  assert.match(bloco, /motivo: 'retirada_nao_permitida'/);
  // e o leilão é relido quando quem chamou não trouxe a coluna
  assert.match(FRETE, /leilao\.permite_retirada === undefined/);
  assert.match(FRETE, /auctions\?select=[^`]*permite_retirada/);
});

test('o lote liberado devolve frete ZERO, sem exigir CEP', () => {
  const i = FRETE.indexOf('if (retirada)');
  const bloco = FRETE.slice(i, i + 900);
  assert.match(bloco, /valor: 0/);
  assert.match(bloco, /entregaTipo: 'retirada'/);
  // sai ANTES da exigência de CEP — senão quem retira precisaria de endereço
  assert.ok(i < FRETE.indexOf("motivo: 'sem_cep'"), 'o ramo da retirada tem que vir antes da exigência de CEP');
});

test('🔴 a migração tem as DUAS colunas e as travas', () => {
  assert.match(MIGRACAO, /auctions[\s\S]{0,60}permite_retirada boolean NOT NULL DEFAULT false/);
  assert.match(MIGRACAO, /auction_messages[\s\S]{0,80}entrega_tipo text NOT NULL DEFAULT 'entrega'/);
  // o CHECK que impede terminar em retirada num lote não liberado
  assert.match(MIGRACAO, /CHECK \(entrega_tipo = 'entrega' OR permite_retirada\)/);
  // e a lista fechada de valores
  assert.match(MIGRACAO, /CHECK \(entrega_tipo IN \('entrega', 'retirada'\)\)/);
});

test('🔴 os leilões que já estão no ar NÃO mudam: o padrão é entrega', () => {
  assert.match(MIGRACAO, /permite_retirada boolean NOT NULL DEFAULT false/);
  assert.ok(!/DEFAULT true/.test(MIGRACAO), 'nenhuma coluna pode nascer ligada');
  assert.ok(!/UPDATE public\.auctions/i.test(MIGRACAO), 'a migração não pode tocar leilão existente');
});

// ───────────────────── a trava do frete zero ─────────────────────

test('🔴 frete ZERO só passa quando a retirada foi autorizada', () => {
  // a recusa continua existindo…
  assert.match(LANCE, /sem_frete: true, motivo: 'frete_zero'/);
  // …e a ÚNICA porta é o entregaTipo definido pelo servidor, não o corpo
  assert.match(LANCE, /if \(entregaTipo !== 'retirada' && !\(freteValor > 0\)\)/);
});

test('🔴 o lance confere a retirada no servidor antes de zerar o frete', () => {
  const i = LANCE.indexOf("body?.retirada === true");
  assert.ok(i > 0, 'o lance não olha o pedido de retirada');
  const bloco = LANCE.slice(i, i + 700);
  assert.match(bloco, /cotarFreteDoLeilao\(\{[^}]*retirada: true/s);
  assert.match(bloco, /retirada_nao_permitida/);
  // só depois de OK é que o frete vira zero
  assert.ok(bloco.indexOf('freteValor = 0') > bloco.indexOf('if (!ret.ok)'),
    'o frete não pode zerar antes da conferência');
});

test('o arremate na hora passa o pedido adiante e explica a recusa', () => {
  assert.match(ARREMATE, /retirada: body\?\.retirada === true/);
  assert.match(ARREMATE, /retirada_nao_permitida: 'Este leilão não está liberado para retirada em mãos/);
});

// ───────────────────────── o martelo ─────────────────────────

test('🔴 a entrega do leilão vem do lance VENCEDOR, não do último', () => {
  assert.match(MARTELO, /const entregaVencedor = \(temColunaEntrega && topBid\?\.entrega_tipo === 'retirada'\)/);
  assert.match(MARTELO, /winnerId && temColunaEntrega \? \{ entrega_tipo: entregaVencedor \}/);
});

test('🔴 a escada de leitura desce um degrau por vez (senão o FRETE se perde)', () => {
  // pedir as duas colunas e cair direto para "nenhuma" encerraria o leilão com
  // frete zero — o defeito que o B13 consertou
  assert.match(MARTELO, /lerLances\(',frete_amount,entrega_tipo'\)/);
  assert.match(MARTELO, /lerLances\(',frete_amount'\)/);
  assert.match(MARTELO, /lerLances\(''\)/);
});

// ───────────────────────── a tela ─────────────────────────

test('a escolha só aparece no lote liberado', () => {
  assert.match(SALA, /auction\?\.permite_retirada && \(/);
  assert.match(SALA, /data-teste="quero-retirar"/);
  assert.match(SALA, /data-teste="quero-receber"/);
});

test('🔴 quem retira não passa pela trava do frete, e nasce em ENTREGA', () => {
  assert.match(SALA, /useState\(false\);\s*$/m);
  assert.match(SALA, /if \(retirarEmMaos\) return null;/);
  // o pedido viaja para os dois caminhos
  assert.match(SALA, /retirada: retirarEmMaos,/);
  const quantos = (SALA.match(/retirada: retirarEmMaos/g) || []).length;
  assert.equal(quantos, 2, 'o pedido de retirada tem que ir no lance E no arremate na hora');
});
