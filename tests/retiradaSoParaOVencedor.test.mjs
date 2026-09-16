/**
 * 🤝 RETIRADA EM MÃOS — SÓ PARA O VENCEDOR, E SÓ DEPOIS DE GANHAR.
 *
 * Regras do dono (16/09/2026), ao pé da letra:
 *   1. "O comprador deve sempre inserir o CEP"
 *   2. "A escolha de receber em casa ou retirar em mãos deve vir só se ele for
 *       o vencedor do leilão ou arremate já"
 *   3. "Nada de frete reservado de modo algum. A regra se mantém sobre o frete
 *       reservado" — opção (B): a reserva de hoje NÃO muda; a regra vale para o
 *       desenho novo.
 *
 * Consequência das três juntas: o caminho do LANCE não muda em NADA. CEP
 * obrigatório, frete cotado, frete reservado — tudo como sempre foi. A escolha
 * acontece no momento da vitória, antes da liquidação, e quem retira tem o
 * frete reservado DEVOLVIDO em vez de cobrado.
 *
 * (A primeira tentativa, na PR #381, punha a escolha na hora do lance e pulava
 * o CEP. Estava errada nas três regras.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => semComentarios(readFileSync(path.join(RAIZ, p), 'utf8'));

const LANCE = leia('api/functions/submitAtomicBid.js');
const ARREMATE = leia('api/functions/submitAtomicBuyNow.js');
const FRETE = leia('api/_lib/freteLeilao.js');
const MARTELO = leia('api/_lib/finalizeAuctionCore.js');
const ACERTO = leia('api/functions/settleAuctionWithBalance.js');
const RAW = leia('api/_lib/rawArremate.js');
const MODAL = leia('src/components/auction/WinnerModal.jsx');
const ARREMATES = leia('src/pages/MyWinnings.jsx');

// ───────── regra 1 e 3: o caminho do lance não foi tocado ─────────

test('🔴 o LANCE não conhece retirada — CEP e frete continuam obrigatórios', () => {
  assert.ok(!/retirada/i.test(LANCE), 'o caminho do lance não pode ter nenhuma noção de retirada');
  // a trava absoluta contra frete zero continua absoluta
  assert.match(LANCE, /if \(!\(freteValor > 0\)\)/);
  assert.match(LANCE, /sem_frete: true, motivo: 'frete_zero'/);
});

test('🔴 o ARREMATE NA HORA também não conhece retirada', () => {
  assert.ok(!/body\?\.retirada/.test(ARREMATE), 'o arremate na hora não pode receber pedido de retirada');
  // continua exigindo cotação de frete, como a decisão de 21/08
  assert.match(ARREMATE, /cotarFreteDoLeilao\(/);
  assert.match(ARREMATE, /sem_cep: 'Cadastre seu CEP no perfil para arrematar/);
});

test('🔴 o motor de frete não ganhou porta de saída sem CEP', () => {
  assert.ok(!/retirada/i.test(FRETE), 'freteLeilao não pode ter ramo de retirada');
  assert.match(FRETE, /motivo: 'sem_cep'/);
});

test('🔴 o martelo continua gravando só o frete — a escolha vem depois dele', () => {
  assert.ok(!/entrega_tipo/.test(MARTELO), 'o martelo não sabe da escolha: ela ainda não aconteceu');
});

// ───────── regra 2: a escolha é do vencedor, antes da cobrança ─────────

test('🔴 a liquidação automática É SEGURADA até o vencedor escolher', () => {
  assert.match(MODAL, /const precisaEscolher = Boolean\(isWinnerNow && auction\?\.permite_retirada\)/);
  assert.match(MODAL, /if \(precisaEscolher && !entregaEscolhida\) return;/);
  // e o botão de pagar não aparece junto da escolha
  assert.match(MODAL, /!\(precisaEscolher && !entregaEscolhida\) && \(settle\.state === 'idle'/);
});

test('a escolha só existe no lote liberado, e manda o tipo ao servidor', () => {
  assert.match(MODAL, /data-teste="escolher-retirada"/);
  assert.match(MODAL, /data-teste="escolher-entrega"/);
  assert.match(MODAL, /entrega_tipo: entregaEscolhida \|\| 'entrega'/);
});

test('🔴 a tela de Arremates não liquida sozinha um lote com retirada', () => {
  // ali a liquidação roda em silêncio ao abrir a página: cobraria o frete
  // antes de o vencedor escolher
  assert.match(ARREMATES, /order_status === 'awaiting_payment' && !a\.permite_retirada/);
});

// ───────── o dinheiro ─────────

test('🔴 quem autoriza a retirada é o BANCO, não o corpo da requisição', () => {
  assert.match(ACERTO, /const pediuRetirada = String\(body\?\.entrega_tipo \|\| ''\) === 'retirada'/);
  assert.match(ACERTO, /const retirada = pediuRetirada && auction\.permite_retirada === true/);
  assert.match(ACERTO, /if \(pediuRetirada && !retirada\)/);
  assert.match(ACERTO, /auctions\?select=[^`]*permite_retirada/);
});

test('🔴 quem retira NÃO paga frete e recebe de volta o que foi reservado', () => {
  assert.match(ACERTO, /const freteCents = retirada \? 0 : freteReservadoCents/);
  assert.match(ACERTO, /const freteADevolverCents = retirada \? freteReservadoCents : 0/);
  // devolvido na MESMA escrita atômica, senão fica preso em saldo_reservado
  assert.match(ACERTO, /const devolverFrete = Math\.max\(0, Math\.min\(freteADevolverCents, curRes - tirarDaReserva\)\)/);
  assert.match(ACERTO, /novoDisp = fromCents\(curDisp - tirarDoDisponivel \+ devolverFrete\)/);
  assert.match(ACERTO, /novoRes = fromCents\(curRes - tirarDaReserva - devolverFrete\)/);
});

test('🔴 a escolha entra no MESMO flip atômico do pagamento', () => {
  assert.match(ACERTO, /order_status: 'paid', \.\.\.\(retirada \? \{ entrega_tipo: 'retirada' \} : \{\}\)/);
});

test('🔴 o pedido nasce marcado como retirada — a logística não despacha', () => {
  // não dá para deduzir de frete zero: quem retira TEM endereço (o CEP é
  // obrigatório para dar lance)
  assert.match(RAW, /const situacao = retirada\s*\?\s*'pickup'/);
  assert.match(ACERTO, /montarRawArremate\(\{[\s\S]{0,220}?,\s*retirada \}\)/);
});
