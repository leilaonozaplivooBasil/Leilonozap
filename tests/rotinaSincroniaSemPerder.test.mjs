// 🐛 "A PESSOA ESTÁ PERDENDO DINHEIRO" — DIR-164.1 (20/09/2026).
//
// Dono, olhando a rotina da Sophia: "quando eu edito lá em cima,
// automaticamente tem que editar ali embaixo... sincronizar uma com a
// outra... lá em cima tá escrito já repete todo dia, mas ali embaixo não tá
// salvando... a pessoa escolhe repetir essas tarefas todos os dias, o
// sistema não gera automático pra ele... tem que deixar isso muito bem
// organizado, porque está tendo falha e a pessoa está perdendo dinheiro."
//
// Duas causas achadas, as duas nesta rodada:
//
// 1. `estaNaRotina` comparava só TÍTULO. Duas tarefas com o mesmo nome em
//    horários diferentes (ex.: "Almoço" 12:00 já na rotina, "ALMOÇO" 13:30
//    digitada de novo depois que ela mudou o horário) mostravam "já repete
//    todo dia" pras DUAS — a segunda nunca esteve salva em lugar nenhum, e
//    o selo mentia pra ela confiar e nunca clicar pra repetir de verdade.
//
// 2. Toda escrita na rotina parte do array INTEIRO já em memória
//    (`incluirNaRotina(rotina, ...)`) e grava ele de volta — não é um PATCH
//    por item. Clicar em "repetir todo dia" numa tarefa e, antes da
//    gravação voltar do banco, clicar em outra (ou em "A minha rotina"),
//    faz a segunda gravação partir do `rotina` ANTIGO — sem a primeira
//    adição — e a segunda grava por cima, apagando a primeira. Cada clique
//    isolado mostra o toast de sucesso, mas juntos um apaga o outro.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('estaNaRotina casa hora E título — mesmo nome em horário diferente não é "já repete"', () => {
  assert.match(CRM, /const estaNaRotina = \(hora, titulo\) => rotina\.some\(\(i\) => i\.titulo\.trim\(\)\.toLowerCase\(\) === String\(titulo \|\| ''\)\.trim\(\)\.toLowerCase\(\) && \(i\.hora \|\| ''\) === \(hora \|\| ''\)\);/);
  // os 5 chamadores precisam ter migrado — nenhum "estaNaRotina(" com um só argumento sobrando
  // (a definição não entra aqui: "estaNaRotina = (hora, titulo)" não casa com "estaNaRotina(")
  const chamadas = [...CRM.matchAll(/estaNaRotina\(([^)]*)\)/g)].map((m) => m[1]);
  assert.equal(chamadas.length, 5, `esperava 5 chamadas, achou ${chamadas.length}`);
  for (const args of chamadas) {
    assert.ok(args.includes(','), `chamada "estaNaRotina(${args})" ainda passa só um argumento — hora sumiu`);
  }
});

test('todo botão que grava a rotina (incluindo o array inteiro) trava enquanto uma gravação já está em voo', () => {
  // por-tarefa "repetir todo dia"
  const iniRepetir = CRM.indexOf('data-teste="repetir-todo-dia"');
  const blocoRepetir = CRM.slice(CRM.lastIndexOf('<button', iniRepetir), iniRepetir + 200);
  assert.match(blocoRepetir, /disabled=\{salvando\}/, 'o botão "repetir todo dia" por tarefa precisa travar durante salvando');

  // editor da tarefa de hoje — "editar-salvar" (pode gravar a rotina via repetirEdicao)
  const iniEditarSalvar = CRM.indexOf('data-teste="editar-salvar"');
  assert.ok(iniEditarSalvar > 0, 'premissa: data-teste="editar-salvar" existe');
  const blocoEditarSalvar = CRM.slice(CRM.lastIndexOf('<Button', iniEditarSalvar), iniEditarSalvar + 50);
  assert.match(blocoEditarSalvar, /disabled=\{salvando\}/, 'o botão "salvar" da edição de hoje precisa travar durante salvando');

  // "A minha rotina": salvar, editar, excluir, incluir
  for (const rotulo of ['rotina-salvar', 'rotina-editar', 'rotina-excluir', 'rotina-incluir']) {
    const ini = CRM.indexOf(`data-teste="${rotulo}"`);
    assert.ok(ini > 0, `premissa: data-teste="${rotulo}" existe`);
    const bloco = CRM.slice(Math.max(0, ini - 250), ini + 50);
    assert.match(bloco, /disabled=\{[^}]*salvando/, `"${rotulo}" precisa travar durante salvando`);
  }
});

test('a caixa "nova tarefa do dia" (EntradaComDestinos) recebe o mesmo trava — faltava o fio', () => {
  // EntradaComDestinos já sabia desabilitar (`pronto = escrevendo && !salvando`)
  // — só faltava o CrmMetodo passar a prop `salvando` na chamada.
  assert.match(CRM, /<EntradaComDestinos[^>]*salvando=\{salvando\}[^>]*\/>/s);
});
