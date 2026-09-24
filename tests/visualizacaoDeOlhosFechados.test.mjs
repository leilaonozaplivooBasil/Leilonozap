// 🧘 A VISUALIZAÇÃO É DE OLHOS FECHADOS (24/09/2026).
//
// O caso: Emannuel, 24/09, 04:37. O bloco "acordei" foi APROVADO (selfie
// acordado, olhos abertos). Três minutos depois a IA REPROVOU o frame da
// visualização: "homem deitado na cama, olhos fechados, no escuro … a prova
// precisa mostrar você JÁ fora da cama". Ela puxou o critério do despertar
// (do título "Acordar — …" e do CRUZAMENTO "treino × deitado na cama") pra
// um bloco em que ficar quieto de olhos fechados É a tarefa. Quatro
// tentativas, ritual fechou parcial, o dono aprovou na mão.
//
// O que se prova: a régua do ritual diz, com todas as letras, que olhos
// fechados / deitado / escuro em casa não reprova nem vira dúvida, que o
// despertar já foi julgado à parte, e que só ambiente e pessoa decidem.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fn = readFileSync(new URL('../api/functions/xgameValidarPrint.js', import.meta.url), 'utf8');
const regraRitual = fn.slice(fn.indexOf('  ritual: `'), fn.indexOf('`,\n};', fn.indexOf('  ritual: `')));

test('🔴 a régua do ritual manda NÃO aplicar "acordar × deitado/olhos fechados" ao frame da visualização', () => {
  assert.match(regraRitual, /OLHOS FECHADOS, DEITADO OU SENTADO NA CAMA, NO ESCURO — EM CASA — É A PRÓPRIA VISUALIZAÇÃO/);
  assert.match(regraRitual, /NÃO é a prova do despertar/);
  assert.match(regraRitual, /já foi julgado à parte/);
  assert.match(regraRitual, /NÃO aplique a este frame o cruzamento/);
  assert.match(regraRitual, /"fora da cama" NÃO é exigência deste bloco/);
  assert.match(regraRitual, /nunca "reprovada" por estar deitado/);
});

test('o que continua decidindo é só o ambiente (carro, academia, escritório) e a pessoa', () => {
  assert.match(regraRitual, /O que decide aqui é só o AMBIENTE \(casa × carro\/academia\/escritório\) e a PESSOA/);
  assert.match(regraRitual, /interior de um carro/);
  assert.match(regraRitual, /ACADEMIA/);
  assert.match(regraRitual, /ESCRITÓRIO/);
  assert.match(regraRitual, /CLARAMENTE não é a pessoa da tarefa/);
});

test('a regra nova fica DEPOIS da de "duvida por falta de contexto" e ANTES da de pessoa errada — na ordem em que a IA lê', () => {
  const duvida = regraRitual.indexOf('não puna a falta de contexto visual');
  const olhos = regraRitual.indexOf('OLHOS FECHADOS, DEITADO');
  const pessoa = regraRitual.indexOf('CLARAMENTE não é a pessoa da tarefa');
  assert.ok(duvida > -1 && olhos > duvida && pessoa > olhos, `ordem: duvida=${duvida} olhos=${olhos} pessoa=${pessoa}`);
});

test('a tela continua mandando o frame da visualização com tipo "ritual" (é essa régua que ele cai)', () => {
  const crm = readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
  assert.match(crm, /tipo: bloco === 'acordei' \? 'instagram' : 'ritual'/);
});
