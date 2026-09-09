// 🌑 09/09/2026 — dono, revendo o "Como Funciona" hábito por hábito a partir
// do Sonho: "no quarto hábito ficou perfeito, né? Só está muito transparente
// ainda, confundindo um pouco... deixar mais escuro, sem perder a jogada de
// eu continuar vendo o fundo... vamos deixar isso extremamente perfeito,
// ponto a ponto, e SÓ entrega quando tiver cem por cento de certeza que está
// tudo funcionando em todas as abas do como funciona."
//
// Este arquivo cobre as duas pontas dessa cobrança: (1) o fundo do tour e do
// modal lançador escureceram de verdade, mas continuam abaixo de opaco
// (nunca perdem a "jogada" de deixar o fundo visível); (2) o Hábito 6
// (Acompanhamento — via Esteira de Captação) tem seu PRÓPRIO tour, com botão
// "Como funciona" independente do lançador global — ele não tinha prova
// nenhuma até agora, e é uma das "abas do como funciona" que o dono está
// revisando.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const TOUR = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/TourGuiado.jsx', import.meta.url), 'utf8');
const MODAL = fs.readFileSync(new URL('../src/components/licensing/ComoFuncionaModal.jsx', import.meta.url), 'utf8');
const ESTEIRA = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx', import.meta.url), 'utf8');

test('TourGuiado: o fundo escureceu de verdade (>= 0.93) mas continua abaixo de opaco', () => {
  const alphas = [...TOUR.matchAll(/rgba\(6,10,20,([\d.]+)\)|bg-\[#060a14\]\/(\d+)/g)]
    .map((m) => (m[1] ? Number(m[1]) : Number(m[2]) / 100));
  assert.ok(alphas.length >= 2, 'tem que existir o fundo do spotlight E o do fallback sem alvo');
  for (const a of alphas) {
    assert.ok(a >= 0.93, `alpha ${a} está transparente demais — o dono reportou "ainda confundindo" no 0.88 anterior`);
    assert.ok(a < 1, `alpha ${a} não pode chegar em opaco — "sem perder a jogada de eu continuar vendo o fundo"`);
  }
});

test('ComoFuncionaModal: o fundo escureceu junto (>= 0.75), mesma revisão de transparência', () => {
  assert.match(MODAL, /bg-black\/(7[5-9]|[89]\d)\b/, 'o backdrop do lançador precisa ter escurecido de /60 pra pelo menos /75, coerente com o tour que ele abre');
});

test('Hábito 6 (Acompanhamento/Esteira): tem tour próprio, com todos os alvos de verdade na tela', () => {
  assert.match(ESTEIRA, /<TourGuiado ativo=\{tourAberto\} passos=\{PASSOS_TOUR_ESTEIRA\}/);
  assert.match(ESTEIRA, /data-teste="esteira-como-funciona"/, 'o botão "Como funciona" próprio da Esteira precisa continuar existindo — é a aba independente do lançador global');
  const alvos = [...ESTEIRA.matchAll(/alvo:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(alvos.length >= 4, 'tour curto demais pra ensinar a esteira inteira (fila, card, forecast)');
  for (const alvo of alvos) {
    assert.match(ESTEIRA, new RegExp(`data-teste="${alvo}"`), `o alvo "${alvo}" do tour da Esteira não tem elemento correspondente na própria tela`);
  }
});
