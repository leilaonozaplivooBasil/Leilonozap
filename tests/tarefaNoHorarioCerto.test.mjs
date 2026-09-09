// 🕐 A TAREFA ENTRA NO HORÁRIO QUE A PESSOA ESCOLHEU (09/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// O CASO
// ═══════════════════════════════════════════════════════════════════════════
// Dono, com print: criou uma tarefa para as 08:00 do dia seguinte e ela entrou
// DEPOIS das 22h. No mesmo print, "07:59 Café da manhã" aparecia depois do
// "10:30 Organização do negócio", dentro da MANHÃ.
//
// A causa eram DUAS ordenações invertidas e uma gravação errada:
//   • DistribuirTarefa gravava `ordem: tarefasDoDia.length` — o fim da fila,
//     sempre, ignorando a hora escolhida;
//   • CrmMetodo ordenava por `ordem` e só desempatava por `hora`;
//   • xgame.estadoDasTarefas ordenava só por `ordem`.
//
// 🔴 E ISSO NÃO É COSMÉTICO — é o teste que mais importa aqui embaixo.
// `estadoDasTarefas` calcula a janela de cada tarefa como "da hora dela até a
// hora da PRÓXIMA DA LISTA". Fora de ordem cronológica, a janela termina antes
// de começar, e a tarefa pula AGORA e ATRASADO e cai direto em PERDIDO — sem
// que a pessoa tenha perdido coisa nenhuma. E o estado decide X-Pay e zeragem
// do dia.
//
// Medido no banco antes do conserto: 3 a 4 pessoas por dia com a lista fora de
// ordem, quatro dias seguidos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ordenarPorHora, estadoDasTarefas, ESTADOS } from '../src/lib/xgame.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/** A lista exata do print do dono: as fixas em ordem + a criada depois. */
const DO_PRINT = () => [
  { id: 'a', hora: '07:15', titulo: 'Sauna', ordem: 0 },
  { id: 'b', hora: '08:30', titulo: 'Leitura', ordem: 1 },
  { id: 'c', hora: '09:00', titulo: 'Chegada + reuniao', ordem: 2 },
  { id: 'd', hora: '09:40', titulo: 'Post do aprendizado', ordem: 3 },
  { id: 'e', hora: '10:00', titulo: 'ABRIR A LOJA', ordem: 4 },
  { id: 'f', hora: '10:30', titulo: 'Organizacao do negocio', ordem: 5 },
  { id: 'g', hora: '07:59', titulo: 'Cafe da manha', ordem: 6 }, // criada depois
];

test('🕐 a tarefa criada depois entra na HORA dela, não no fim da fila', () => {
  const horas = ordenarPorHora(DO_PRINT()).map((t) => t.hora);
  assert.deepEqual(horas, ['07:15', '07:59', '08:30', '09:00', '09:40', '10:00', '10:30']);
});

test('🔴 e a tarefa que está acontecendo AGORA deixa de ser marcada PERDIDA', () => {
  // Este é o teste que justifica o conserto. Às 10h45, a de 10:30 está na
  // janela dela. Com a lista fora de ordem, a "próxima" dela era a de 07:59 —
  // janela terminando antes de começar — e o motor devolvia PERDIDO.
  const as10h45 = 10 * 60 + 45;
  const dez30 = estadoDasTarefas(DO_PRINT(), as10h45).find((t) => t.id === 'f');
  assert.equal(
    dez30.estado.id,
    ESTADOS.AGORA.id,
    'a tarefa em curso voltou a ser dada como PERDIDA — isso tira X-Pay de quem não perdeu nada',
  );
});

test('⚠️ tarefa SEM hora vai pro fim do dia, nunca pro topo', () => {
  // `''` e `null` comparados como texto ordenam ANTES de qualquer dígito.
  // Ordenar ingenuamente por hora jogaria as tarefas sem hora pro começo do
  // dia. Sem hora, a tarefa fica fora da Jornada de propósito (destinos.js).
  //
  // ⚠️ A ORDEM DA ENTRADA IMPORTA NESTE TESTE, e por um motivo que me pegou:
  // o `sort` do V8 compara o elemento que está inserindo sempre como `a`. Se a
  // sem-hora vier ANTES da com-hora na entrada, o ramo `a.min === null` nunca
  // é exercitado — e a mutação que inverte esse ramo passa VERDE. Descoberto
  // na verificação por mutação; a entrada abaixo põe a COM hora primeiro, de
  // propósito, pra forçar a comparação no sentido que interessa.
  const lista = [
    { id: 'z', hora: '08:00', titulo: 'com hora', ordem: 9 },
    { id: 'x', hora: null, titulo: 'sem hora', ordem: 1 },
    { id: 'y', hora: '', titulo: 'hora vazia', ordem: 2 },
  ];
  assert.deepEqual(ordenarPorHora(lista).map((t) => t.id), ['z', 'x', 'y']);
  // e o sentido contrário também, pra cobrir os dois ramos do desempate:
  const invertida = [
    { id: 'x', hora: null, ordem: 1 },
    { id: 'z', hora: '08:00', ordem: 9 },
  ];
  assert.deepEqual(ordenarPorHora(invertida).map((t) => t.id), ['z', 'x']);
});

test('e a ordem relativa das sem-hora é preservada', () => {
  const lista = [
    { id: 'segunda', hora: null, ordem: 5 },
    { id: 'primeira', hora: null, ordem: 1 },
  ];
  assert.deepEqual(ordenarPorHora(lista).map((t) => t.id), ['primeira', 'segunda']);
});

test('`ordem` continua desempatando quando a hora é a mesma', () => {
  const lista = [
    { id: 'depois', hora: '09:00', ordem: 7 },
    { id: 'antes', hora: '09:00', ordem: 2 },
  ];
  assert.deepEqual(ordenarPorHora(lista).map((t) => t.id), ['antes', 'depois']);
});

test('🔴 quem grava a tarefa nova tira a ordem da HORA, não do tamanho da lista', () => {
  const src = semComentarios(ler('../src/components/licensing/CentralVendas/DistribuirTarefa.jsx'));
  assert.doesNotMatch(
    src,
    /ordem:\s*tarefasDoDia\.length/,
    'voltou a gravar a tarefa no fim da fila — foi exatamente este trecho que mandou a tarefa das 08:00 pra depois das 22h',
  );
  assert.match(src, /ordem:\s*ordemPelaHora\(/, 'sumiu o cálculo de ordem pela hora');
});

test('🔴 as duas telas que montam a lista ordenam pela hora', () => {
  const crm = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
  assert.match(crm, /setTarefas\(ordenarPorHora\(/, 'CrmMetodo voltou a ordenar por `ordem`');
  assert.doesNotMatch(
    crm,
    /setTarefas\(\(Array\.isArray\(rows\)[^)]*\)\.sort\(/,
    'voltou a ordenação antiga, que punha `ordem` na frente de `hora`',
  );

  const jornada = semComentarios(ler('../src/components/licensing/CentralVendas/XGameJornada.jsx'));
  assert.match(
    jornada,
    /ordenarPorHora\(tarefasRecebidas\)/,
    'a Jornada deixou de ordenar o que recebe — o agrupamento por período volta a repetir MANHÃ/TARDE',
  );
});

test('🔴 o motor não confia mais só na `ordem`', () => {
  const lib = semComentarios(ler('../src/lib/xgame.js'));
  assert.match(lib, /const lista = ordenarPorHora\(tarefas\)/, 'estadoDasTarefas voltou a ordenar por `ordem`');
});
