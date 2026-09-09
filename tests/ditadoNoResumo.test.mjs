// 🎙️ DITADO NO RESUMO DE 400 CARACTERES — DIR-101 (09/09/2026).
//
// É o campo de MAIOR atrito do sistema: 400 caracteres digitados no celular é
// onde a pessoa desiste, e ele aparece em toda comprovação de estudo (122 em 7
// dias). Por isso o áudio paga mais aqui do que em qualquer outro lugar.
//
// E é também onde a regra é mais forte — por isso estes testes existem: o que
// NÃO pode ser afrouxado junto com a chegada da voz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { RESUMO_MIN } from '../src/lib/xgame.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const MODAL = semComentarios(ler('../src/components/licensing/CentralVendas/XGameComprovarModal.jsx'));
const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

test('🔒 RESUMO_MIN continua 400 — ordem do dono: "não diminua"', () => {
  // Falar é outro jeito de produzir as próprias palavras, não um desconto no
  // tamanho. Se o áudio virasse desculpa pra baixar o mínimo, o treino morria.
  assert.equal(RESUMO_MIN, 400);
  assert.match(MODAL, /texto\.trim\(\)\.length >= RESUMO_MIN/, 'a trava do botão continua no mínimo real');
});

test('🔒 colar continua bloqueado no resumo', () => {
  assert.match(MODAL, /onPaste=\{bloquearCola\}/);
  assert.match(MODAL, /onDrop=\{bloquearCola\}/);
  assert.match(MODAL, /AVISO_COLAR/);
});

test('o rótulo passa a dizer a verdade quando o microfone existe', () => {
  // Deixar "só digitando" na tela com um botão de falar ao lado é mentir pra
  // pessoa. O texto muda conforme o microfone está disponível ou não.
  assert.match(MODAL, /escreva ou fale — colar não vale/);
  assert.match(MODAL, /só digitando — colar não vale/);
  assert.match(MODAL, /ditado\.disponivel \?/);
});

test('o texto ditado cai no CAMPO, não conclui sozinho', () => {
  assert.match(MODAL, /setTexto\(\(atual\) => juntarTexto\(atual, t\)\)/);
  // o botão de concluir continua sendo o único caminho, e continua travado
  // pelo mínimo
  assert.match(MODAL, /onComprovar\(\{ file, texto, audioResumo \}\)/);
});

test('a voz do resumo vai pro cofre privado, com a origem registrada', () => {
  assert.match(METODO, /pasta: 'resumos'/);
  assert.match(METODO, /entradaResumo: 'audio'/);
  assert.match(METODO, /entrada_resumo: entradaResumo/);
  assert.match(METODO, /audio_resumo_path: audioResumoPath/);
});

test('guardar a voz vem DEPOIS do print e não bloqueia a comprovação', () => {
  // O print é a prova; ele não pode esperar o áudio. E se o cofre piscar, a
  // comprovação segue com o texto.
  const i = METODO.indexOf("path: caminhoDeProva({ pasta: 'prints'");
  const j = METODO.indexOf("pasta: 'resumos'");
  assert.ok(i > 0 && j > i, 'o áudio tem que ser guardado depois do print');
  assert.match(METODO, /\.\.\.\(vozResumo \? \{ audioResumoPath: vozResumo \} : \{\}\)/);
});

test('quem digita não vê diferença nenhuma', () => {
  // Sem áudio, nenhum campo novo entra na comprovação — o registro fica
  // exatamente como era antes desta mudança.
  assert.match(METODO, /\.\.\.\(dados\.audioResumo \? \{ entradaResumo: 'audio' \} : \{\}\)/);
  assert.match(METODO, /\.\.\.\(entradaResumo \? \{ entrada_resumo: entradaResumo \} : \{\}\)/);
});
