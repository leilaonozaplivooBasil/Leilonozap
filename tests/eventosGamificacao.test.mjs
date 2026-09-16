// 📅 "EU PRECISO ORGANIZAR A GAMIFICAÇÃO DE ACORDO COM EVENTOS DA EMPRESA"
// — DIR-161 (16/09/2026).
//
// Dono, ao vivo: "segunda-feira, nós temos mentalidade do CEO que é de 9
// até uma hora da tarde — as pessoas que eu selecionar, a rotina delas de
// 9 até 11 horas é uma rotina diferente." Decidido com o dono: a rotina do
// evento SUBSTITUI a normal na janela (não soma), e uma vez marcada a
// pessoa no evento, ele aplica sozinho toda semana (sem precisar reativar).

import test from 'node:test';
import assert from 'node:assert/strict';
import { eventoAplicavelHoje, substituirJanelaDoEvento, rotinaComEventos } from '../src/lib/eventosGamificacao.js';

const MENTALIDADE_CEO = {
  nome: 'Mentalidade do CEO',
  dia_semana: 1, // segunda
  hora_inicio: '09:00',
  hora_fim: '11:00',
  tarefas: [
    { hora: '09:00', titulo: 'Postar sala do treinamento' },
    { hora: '10:00', titulo: 'Resumo do livro' },
  ],
  participantes: ['ana'],
  ativo: true,
};

test('eventoAplicavelHoje: só vale pro dia da semana certo, pra quem está na lista de participantes, e se estiver ativo', () => {
  assert.equal(eventoAplicavelHoje(MENTALIDADE_CEO, { diaSemana: 1, dataISO: '2026-09-14', userId: 'ana' }), true, 'segunda, ana está na lista');
  assert.equal(eventoAplicavelHoje(MENTALIDADE_CEO, { diaSemana: 2, dataISO: '2026-09-15', userId: 'ana' }), false, 'terça não é o dia do evento');
  assert.equal(eventoAplicavelHoje(MENTALIDADE_CEO, { diaSemana: 1, dataISO: '2026-09-14', userId: 'bruno' }), false, 'bruno não foi selecionado pro evento');
  assert.equal(eventoAplicavelHoje({ ...MENTALIDADE_CEO, ativo: false }, { diaSemana: 1, dataISO: '2026-09-14', userId: 'ana' }), false, 'evento desligado nunca aplica, mesmo no dia certo');
  assert.equal(eventoAplicavelHoje(null, { diaSemana: 1, userId: 'ana' }), false);
});

test('eventoAplicavelHoje: evento de DATA ÚNICA (dia_semana null) só vale naquela data exata, não toda semana', () => {
  const unico = { ...MENTALIDADE_CEO, dia_semana: null, data: '2026-09-20' };
  assert.equal(eventoAplicavelHoje(unico, { dataISO: '2026-09-20', userId: 'ana' }), true);
  assert.equal(eventoAplicavelHoje(unico, { dataISO: '2026-09-27', userId: 'ana' }), false, 'não repete — foi marcado pra UMA data');
});

test('substituirJanelaDoEvento: troca só os itens DENTRO da janela [hora_inicio, hora_fim) — o resto da rotina continua igual', () => {
  const rotina = [
    { hora: '05:00', titulo: 'Ritual do Amanhecer', detalhe: '' },
    { hora: '09:00', titulo: 'Rotina normal das 9h', detalhe: '' },
    { hora: '10:30', titulo: 'Rotina normal das 10h30', detalhe: '' },
    { hora: '13:30', titulo: 'Almoço', detalhe: '' },
  ];
  const nova = substituirJanelaDoEvento(rotina, MENTALIDADE_CEO);
  const titulos = nova.map((i) => i.titulo);
  assert.ok(titulos.includes('Ritual do Amanhecer'), 'antes da janela — intocado');
  assert.ok(titulos.includes('Almoço'), 'depois da janela (13:30 >= 11:00 fim) — intocado');
  assert.ok(!titulos.includes('Rotina normal das 9h'), 'dentro da janela — SUBSTITUÍDA, não soma');
  assert.ok(!titulos.includes('Rotina normal das 10h30'), 'dentro da janela — SUBSTITUÍDA, não soma');
  assert.ok(titulos.includes('Postar sala do treinamento'), 'entra a tarefa do evento');
  assert.ok(titulos.includes('Resumo do livro'), 'entra a segunda tarefa do evento');
  assert.equal(nova.length, 4, '2 de fora da janela + 2 do evento — nada sobra nem falta');
});

test('substituirJanelaDoEvento: item da rotina SEM hora nunca é tocado — a régua não sabe onde encaixar, então preserva', () => {
  const rotina = [{ hora: '', titulo: 'Tarefa livre, sem hora marcada', detalhe: '' }];
  const nova = substituirJanelaDoEvento(rotina, MENTALIDADE_CEO);
  const titulos = nova.map((i) => i.titulo);
  assert.ok(titulos.includes('Tarefa livre, sem hora marcada'), 'item sem hora nunca é removido');
  assert.equal(nova.length, 3, 'o item livre continua + as 2 tarefas do evento entram (a janela dela não tinha nada pra substituir)');
});

test('substituirJanelaDoEvento: sem evento (null), devolve a rotina normal ordenada — não quebra quem chama sem evento nenhum', () => {
  const rotina = [{ hora: '10:00', titulo: 'B' }, { hora: '09:00', titulo: 'A' }];
  const nova = substituirJanelaDoEvento(rotina, null);
  assert.deepEqual(nova.map((i) => i.titulo), ['A', 'B']);
});

test('rotinaComEventos: é isto que o cron/gerador chama — já filtra por hoje, já aplica só quem está na lista', () => {
  const rotina = [
    { hora: '09:00', titulo: 'Rotina normal das 9h' },
    { hora: '13:30', titulo: 'Almoço' },
  ];
  const segundaAna = rotinaComEventos(rotina, [MENTALIDADE_CEO], { diaSemana: 1, dataISO: '2026-09-14', userId: 'ana' });
  assert.ok(segundaAna.some((i) => i.titulo === 'Postar sala do treinamento'), 'ana, segunda — o evento troca a rotina dela');

  const segundaBruno = rotinaComEventos(rotina, [MENTALIDADE_CEO], { diaSemana: 1, dataISO: '2026-09-14', userId: 'bruno' });
  assert.deepEqual(segundaBruno.map((i) => i.titulo), ['Rotina normal das 9h', 'Almoço'], 'bruno não está no evento — rotina normal intacta');

  const tercaAna = rotinaComEventos(rotina, [MENTALIDADE_CEO], { diaSemana: 2, dataISO: '2026-09-15', userId: 'ana' });
  assert.deepEqual(tercaAna.map((i) => i.titulo), ['Rotina normal das 9h', 'Almoço'], 'terça não é o dia do evento — nem pra ana');
});

test('rotinaComEventos: sem eventos cadastrados, a rotina sai exatamente igual — nenhuma mudança de comportamento pra quem nunca usou a feature', () => {
  const rotina = [{ hora: '09:00', titulo: 'X' }];
  assert.deepEqual(rotinaComEventos(rotina, [], { diaSemana: 1, dataISO: '2026-09-14', userId: 'ana' }).map((i) => i.titulo), ['X']);
});
