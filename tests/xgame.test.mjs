// xgame — o gatilho: Super Admin não votável por padrão, e não votar em
// todo mundo até a última chance (21h30) zera o DIA INTEIRO — não só a MvM.
// Dono, 08/09/2026: "Super Admin não pode ser votado a não ser que ele
// esteja participando por dentro de uma mentoria... salvo se ele permitir
// ser votado na MvM"; "a falta de voto dos integrantes uns nos outros zera
// o dia"; e depois, sem meio-termo: "não vou, perde o dinheiro, perde a
// MvM, perde tudo do dia... precisa ser radical."
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  podeSerVotado, votouEmTodosOsColegas, resumoDoDia, VOTACAO_INICIO_MIN, VOTACAO_IDEAL_FIM_MIN, VOTACAO_FIM_MIN, MVM_MAX,
  janelaVotacaoAberta, naJanelaIdeal, horaDeMin,
} from '../src/lib/xgame.js';

test('horaDeMin: minutos vira "17h" ou "21h30" (sem zero à esquerda, estilo do app)', () => {
  assert.equal(horaDeMin(VOTACAO_INICIO_MIN), '17h');
  assert.equal(horaDeMin(VOTACAO_IDEAL_FIM_MIN), '20h');
  assert.equal(horaDeMin(VOTACAO_FIM_MIN), '21h30');
});

// 🔥 08/09/2026 — dono: "das 17h às 20h é a janela ideal... mas dá a
// possibilidade depois das 20h, tá? Porque ele pode estar numa reunião e se
// atrasar." As duas janelas — ideal e última chance — precisam se
// diferenciar sem que a última chance vire punição por si só.
test('naJanelaIdeal × janelaVotacaoAberta: 17h-20h é ideal, 20h-21h30 é só última chance (ainda aberta, mas não mais ideal)', () => {
  const naIdeal = VOTACAO_INICIO_MIN + 30; // 17h30
  const naUltimaChance = VOTACAO_IDEAL_FIM_MIN + 30; // 20h30
  const fechada = VOTACAO_FIM_MIN + 1; // 21h31

  assert.equal(naJanelaIdeal(naIdeal), true);
  assert.equal(janelaVotacaoAberta(naIdeal), true);

  assert.equal(naJanelaIdeal(naUltimaChance), false, 'já passou da janela ideal');
  assert.equal(janelaVotacaoAberta(naUltimaChance), true, 'mas a janela geral (com a última chance) ainda está aberta');

  assert.equal(naJanelaIdeal(fechada), false);
  assert.equal(janelaVotacaoAberta(fechada), false, 'depois das 21h30 não tem mais chance nenhuma');
});

test('podeSerVotado: só o super_admin precisa do interruptor — todo mundo mais continua votável', () => {
  assert.equal(podeSerVotado({ role: 'super_admin', aceita_ser_votado: false }), false);
  assert.equal(podeSerVotado({ role: 'super_admin', aceita_ser_votado: true }), true);
  assert.equal(podeSerVotado({ role: 'super_admin' }), false, 'sem o campo, o default é NÃO votável pro super_admin');
  assert.equal(podeSerVotado({ role: 'admin', aceita_ser_votado: false }), true, 'admin comum não é afetado pela régua');
  assert.equal(podeSerVotado({ role: 'user', aceita_ser_votado: false }), true);
  assert.equal(podeSerVotado({}), true, 'sem role nenhum, não é super_admin — continua votável');
});

test('votouEmTodosOsColegas: precisa fechar TODOS, não só algum — e ninguém pra votar não é falta', () => {
  assert.equal(votouEmTodosOsColegas([], []), true, 'sem colegas votáveis, não há como faltar');
  assert.equal(votouEmTodosOsColegas(['a', 'b', 'c'], ['a', 'b', 'c']), true);
  assert.equal(votouEmTodosOsColegas(['a', 'b', 'c'], ['a', 'b']), false, 'faltou o c — voto parcial não conta');
  assert.equal(votouEmTodosOsColegas(['a', 'b'], []), false);
  assert.equal(votouEmTodosOsColegas(['a', 'b'], ['a', 'b', 'extra-que-nao-e-mais-colega']), true);
});

// tarefas simples: uma feita, uma não — sem isso o mvmDoDia daria 5/10 sozinho,
// o que prova que a punição por voto está de fato SOBRESCREVENDO, não somando.
const TAREFAS = [
  { id: 't1', titulo: 'Gratidão', hora: '08:00', feito: true },
  { id: 't2', titulo: 'Organização', hora: '09:00', feito: true },
];

test('resumoDoDia: janela ainda aberta (antes das 21h30) — não julga, mesmo sem ter votado ainda', () => {
  const antesDoFim = VOTACAO_FIM_MIN - 1; // 21:29
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: antesDoFim, votouEmTodos: false });
  assert.equal(r.perdeu_por_nao_votar, false, 'a janela ainda não fechou — cedo demais pra punir');
  assert.equal(r.mvm_dia, MVM_MAX, 'as duas tarefas feitas dão nota cheia, intocada');
});

test('resumoDoDia: janela fechada (21h30+) e NÃO votou em todos → MvM do Dia ZERA, mesmo com o dia impecável', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30; // 22:00
  const semVotar = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false });
  const votando = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: true });
  assert.equal(semVotar.perdeu_por_nao_votar, true);
  assert.equal(semVotar.mvm_dia, 0, 'zerou de verdade, não só avisou');
  assert.ok(semVotar.token_dia < votando.token_dia, 'o Human Token sente o zero junto — a punição precisa ser SENTIDA, não só cosmética na MvM');
  assert.match(semVotar.frase_mvm, /NÃO VOTAR/);
});

// 🔥 08/09/2026 — dono: "não vou, perde o dinheiro, perde a MvM, perde tudo
// do dia... precisa ser radical." Isto trava o escopo real da punição: não
// é só a MvM que cai — token, pontos E o X-Pay (dinheiro de verdade) zeram
// juntos, e o que seria ganho vira PERDIDO, registrado, não some em silêncio.
test('resumoDoDia: o radical é radical de verdade — token, pontos e X-Pay TAMBÉM zeram, não só a MvM', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const semVotar = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false });
  const votando = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: true });
  assert.ok(votando.token_dia > 0 && votando.pontos > 0 && votando.xpay.ganho > 0, 'confirma que quem votou tem números de verdade — senão a comparação abaixo não prova nada');
  assert.equal(semVotar.token_dia, 0, 'o Human Token do dia zera de vez, não só cai');
  assert.equal(semVotar.pontos, 0, 'os pontos do dia zeram');
  assert.equal(semVotar.xpay.ganho, 0, 'o dinheiro que seria ganho não entra');
  assert.equal(semVotar.xpay.emJogo, 0, 'nada fica "em jogo" — o dia já fechou de vez, radical');
  assert.equal(semVotar.xpay.perdido, votando.xpay.ganho + votando.xpay.perdido, 'o que seria ganho + o que já tinha perdido agora é tudo PERDIDO — a conta bate exata, o dinheiro não some, vira prejuízo registrado');
});

// 🕊️ 09/09/2026 — dono, ao vivo: "não zera ninguém hoje, a partir de amanhã
// a regra é séria." O bug de fuso zerou gente injustamente, e além disso
// duas pessoas entraram na lista de votáveis NO MEIO da janela de votação
// (19h11), deixando quem já tinha votado sem ter votado nelas a tempo —
// não é bug, é a régua funcionando, só que injusta no dia em que a lista
// mudou. `perdoado` perdoa o dia INTEIRO, não importa o motivo.
test('resumoDoDia: perdoado=true NUNCA zera por não-votar — o dia inteiro é perdoado, não importa o motivo', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const semVotarPerdoado = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false, perdoado: true });
  assert.equal(semVotarPerdoado.perdeu_por_nao_votar, false, 'perdoado esconde até o CAMPO que registra o motivo — outras telas não podem ver isso como zerado');
  assert.equal(semVotarPerdoado.mvm_dia, MVM_MAX, 'sem o perdão zeraria — com o perdão, a nota é a de sempre (dia impecável)');
  assert.ok(!/ZEROU/.test(semVotarPerdoado.frase_mvm), 'a frase não pode dizer que zerou um dia que foi perdoado');
  assert.equal(semVotarPerdoado.token_dia > 0, true, 'o dia não zerou');
});

test('resumoDoDia: perdoado=false (padrão) — comportamento de sempre, sem mudar nada pra quem não usa o perdão', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const semInformar = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false });
  const explicitoFalse = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false, perdoado: false });
  assert.equal(semInformar.mvm_dia, 0);
  assert.deepEqual(semInformar, explicitoFalse, 'omitir perdoado é idêntico a passar false — nunca perdoa por engano');
});

test('resumoDoDia: janela fechada e VOTOU em todos → nota normal, sem punição nenhuma', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: true });
  assert.equal(r.perdeu_por_nao_votar, false);
  assert.equal(r.mvm_dia, MVM_MAX);
});

test('resumoDoDia: sem informar votouEmTodos (chamador antigo, ou histórico) — comportamento de sempre, sem punir por engano', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim });
  assert.equal(r.perdeu_por_nao_votar, false, 'votouEmTodos null não é o mesmo que false — não pune quem a tela não avaliou');
  assert.equal(r.mvm_dia, MVM_MAX);
});
