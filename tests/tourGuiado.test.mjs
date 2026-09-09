// 🩹 09/09/2026 — dono, ao vivo, testando o tour: "abriu tanto que não dava
// pra ver o botão de continuar." Os textos dos passos cresceram (pergunta
// socrática antes da explicação — ver CrmMetodo.jsx) e o balão da mãozinha
// não tinha limite de altura: perto do rodapé da tela, ele nascia estourando
// pra baixo do viewport, com o botão "próximo" fora da área visível e sem
// nenhum jeito de rolar até ele. Este arquivo prova que `estiloBalao` agora
// SEMPRE devolve um `top` onde o balão inteiro (do tamanho real `alturaMax`)
// cabe dentro da tela — nunca deixa sobrar rodapé pra fora.
import test from 'node:test';
import assert from 'node:assert/strict';
import { estiloBalao } from '../src/lib/tourGuiado.js';

const comJanela = (largura, altura, fn) => {
  const original = global.window;
  global.window = { innerWidth: largura, innerHeight: altura };
  try { return fn(); } finally { global.window = original; }
};

test('estiloBalao: o balão inteiro (top + alturaMax) nunca estoura o rodapé da tela', () => {
  // 🎯 o caso real reportado: alvo perto do fim de uma tela de celular, com
  // um passo de texto grande (alturaMax perto do teto de 420).
  const alvoPertoDoRodape = { top: 650, left: 20, width: 200, height: 40 };
  const r = comJanela(390, 700, () => estiloBalao(alvoPertoDoRodape, 420));
  assert.ok(r.top + 420 <= 700 - 12 + 0.001, `balão de 420px em top=${r.top} estoura os 700px da tela`);
  assert.ok(r.top >= 12, 'o balão não pode nascer colado (ou acima) do topo da tela');
});

test('estiloBalao: alvo no topo da tela — o balão desce, sem estourar embaixo', () => {
  const alvoNoTopo = { top: 20, left: 20, width: 200, height: 40 };
  const r = comJanela(390, 800, () => estiloBalao(alvoNoTopo, 300));
  assert.equal(r.top, 20 + 40 + 16); // embaixo do alvo cabe (76 + 300 < 800): usa o cálculo direto
  assert.ok(r.top + 300 <= 800 - 12);
});

test('estiloBalao: nem embaixo nem em cima do alvo sobra o suficiente — ainda assim cabe na tela', () => {
  // alvo ocupando o meio de uma tela pequena, com um balão grande
  const alvoNoMeio = { top: 250, left: 20, width: 200, height: 300 };
  const r = comJanela(390, 700, () => estiloBalao(alvoNoMeio, 420));
  assert.ok(r.top >= 12);
  assert.ok(r.top + 420 <= 700 - 12 + 0.001);
});

test('estiloBalao: `left` nunca deixa o balão sair da tela pela lateral', () => {
  const alvoNaBorda = { top: 100, left: 380, width: 40, height: 40 }; // perto da borda direita de uma tela de 390px
  const r = comJanela(390, 800, () => estiloBalao(alvoNaBorda, 300));
  assert.ok(r.left >= 12);
  assert.ok(r.left <= 390 - 12, 'balão de w-[92vw] max-w-sm não pode nascer cortado pela direita');
});

test('estiloBalao: sem retângulo (alvo ainda não encontrado) — centraliza, não quebra', () => {
  const r = comJanela(390, 800, () => estiloBalao(null, 300));
  assert.equal(r.top, '50%');
  assert.equal(r.left, '50%');
});
