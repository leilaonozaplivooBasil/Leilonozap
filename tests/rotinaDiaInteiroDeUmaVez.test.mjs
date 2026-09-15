// 🔁 "NÃO PRECISO FICAR APERTANDO UM POR UM" — DIR-151 (15/09/2026).
//
// Depois da DIR-150 (selo por tarefa), o dono testou ao vivo: marcou a
// caixa de "repetir" perto do campo de tarefa NOVA (que só vale pra tarefa
// que ela for criar) esperando que isso virasse a rotina do DIA INTEIRO de
// uma vez. Como não existia essa ação, as tarefas já feitas em cima
// continuaram mostrando "repetir todo dia" até ele clicar uma por uma.
// Ao vivo: "quando eu clicar ali embaixo repetir todo dia, todas as de cima
// precisa aparecer que foi atualizado. Eu não preciso ficar apertando um
// por um."

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('existe uma ação de "repetir o dia inteiro" — não só tarefa por tarefa', () => {
  assert.match(CRM, /const tarefasParaRepetir = tarefas\.filter\(\(t\) => !ehTarefaDeGratidao\(t\.titulo\) && !estaNaRotina\(t\.titulo\)\);/);
  assert.match(CRM, /const repetirDiaInteiro = async \(\) => \{/);
  assert.match(CRM, /data-teste="repetir-dia-inteiro"/);
});

test('repetir o dia inteiro grava a rotina numa TACADA SÓ, não uma escrita por tarefa', () => {
  const ini = CRM.indexOf('const repetirDiaInteiro = async () => {');
  const fim = CRM.indexOf('};', ini);
  const corpo = CRM.slice(ini, fim);
  assert.match(corpo, /const nova = tarefasParaRepetir\.reduce\(\(acc, t\) => incluirNaRotina\(acc, \{ hora: t\.hora, titulo: t\.titulo \}\), rotina\);/);
  // UMA chamada de gravarRotina só — nunca um loop chamando pra cada tarefa
  const chamadas = (corpo.match(/gravarRotina\(/g) || []).length;
  assert.equal(chamadas, 1, `esperava 1 chamada de gravarRotina, achou ${chamadas} — voltou a gravar uma por vez`);
});

test('o Ritual nunca entra na conta de "repetir o dia inteiro" — mesma blindagem da DIR-150', () => {
  assert.match(CRM, /const tarefasParaRepetir = tarefas\.filter\(\(t\) => !ehTarefaDeGratidao\(t\.titulo\)/);
});

test('o botão só aparece quando sobra alguma tarefa pra repetir — não fala à toa quando já está tudo igual', () => {
  assert.match(CRM, /\{visao === 'lista' && tarefasParaRepetir\.length > 0 && \(/);
});
