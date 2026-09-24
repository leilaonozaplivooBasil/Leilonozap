// 🚫 O FORMULÁRIO DE CONVITE DESLIGADO ATÉ SEGUNDA ORDEM (24/09/2026).
//
// Dono: "O usuário que abre o site pela primeira vez não tem que ver o
// formulário de cadastro. É uma estratégia do marketing da empresa, está
// atrapalhando a metrificação. Desative o formulário até segunda ordem."
//
// O que se prova aqui:
//   1. com o interruptor desligado, NENHUMA combinação abre o popup — nem a
//      que antes abria (visitante com ?ref=, sem dispensar, na home);
//   2. a regra antiga continua inteira debaixo do interruptor, pra que
//      religar seja uma linha e não um resgate;
//   3. o Layout obedece à regra e NÃO tem mais um caminho próprio até o popup;
//   4. o ?ref= continua sendo capturado (a comissão de quem indicou fica).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { abreFormularioDeConvite, FORMULARIO_DE_CONVITE_LIGADO } from '../src/lib/formularioDeConvite.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const VISITA_QUE_ABRIA = { carregando: false, logado: false, ref: 'TOPTECH', dispensado: false, caminho: '/' };

test('🔴 o interruptor está DESLIGADO — até segunda ordem do dono', () => {
  assert.equal(FORMULARIO_DE_CONVITE_LIGADO, false);
});

test('desligado, a visita que antes abria o popup não abre mais', () => {
  assert.equal(abreFormularioDeConvite(VISITA_QUE_ABRIA), false);
  // e o padrão (sem passar `ligado`) é o interruptor do dono
  assert.equal(abreFormularioDeConvite({ ...VISITA_QUE_ABRIA, ligado: undefined }), false);
  assert.equal(abreFormularioDeConvite(), false);
});

test('a regra antiga continua inteira debaixo do interruptor (religar é uma linha)', () => {
  const ligado = (x) => abreFormularioDeConvite({ ...VISITA_QUE_ABRIA, ligado: true, ...x });
  assert.equal(ligado({}), true, 'visitante com ?ref= na home abre');
  assert.equal(ligado({ carregando: true }), false, 'não decide enquanto a sessão carrega');
  assert.equal(ligado({ logado: true }), false, 'quem já tem conta não vê convite');
  assert.equal(ligado({ ref: '' }), false, 'sem ?ref= não há convite');
  assert.equal(ligado({ dispensado: true }), false, 'quem fechou não vê de novo na sessão');
  assert.equal(ligado({ caminho: '/Register' }), false, 'não abre em cima do cadastro');
  assert.equal(ligado({ caminho: '/cadastro-rapido' }), false);
  assert.equal(ligado({ caminho: '/AuctionRoom?id=1' }), true);
});

test('o Layout decide pela regra e não tem mais um caminho próprio até o popup', () => {
  const s = semComentarios(ler('../src/Layout.jsx'));
  assert.match(s, /import \{ abreFormularioDeConvite \} from "@\/lib\/formularioDeConvite"/);
  assert.match(s, /const abre = abreFormularioDeConvite\(\{/);
  assert.match(s, /if \(!abre\) return;\s*\(async/);
  // a abertura (setShowRefRegister(true)) só existe UMA vez, e depois da regra
  const abre = s.indexOf('setShowRefRegister(true)');
  assert.ok(abre > s.indexOf('const abre = abreFormularioDeConvite('));
  assert.equal(s.indexOf('setShowRefRegister(true)', abre + 1), -1);
  // a regra recebe o que decide: sessão carregando, logado, ref, dispensado e o caminho
  for (const campo of ['carregando: isLoading', 'logado: !!(currentUser && currentUser.email)', "dispensado: !!sessionStorage.getItem('refRegisterDismissed')", 'caminho: window.location.pathname']) {
    assert.ok(s.includes(campo), `faltou passar ${campo}`);
  }
});

test('o ?ref= continua sendo capturado — a comissão de quem indicou não se perde', () => {
  const s = semComentarios(ler('../src/Layout.jsx'));
  assert.match(s, /saveReferral\(/);
  assert.match(s, /getReferral\(\)/);
  // e o popup em si continua no código (o caminho manual da sala do leilão usa)
  assert.match(s, /<GuestRegistrationModal/);
});
