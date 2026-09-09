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
  janelaVotacaoAberta, naJanelaIdeal, horaDeMin, tokenDoCiclo, pesosDoPerfil,
  validacaoAutomatica, tipoDeValidacao, validarComprovacao, faltaDoResumo, textoDoContador, motivoDoBotaoTravado,
  RESUMO_MIN, RESUMO_MIN_FDS, estudoFdsEmDia, TRAVA_SEM_DIAMANTE, EXECUTIVO_IDEAL, EIXOS_EXECUTIVO_IDEAL, proporcoesExecutivoIdeal, formacaoExecutivoIdeal,
} from '../src/lib/xgame.js';

// 🎯 09/09/2026 — DIR-109: o radar (mapa do jogador) lê EIXOS_EXECUTIVO_IDEAL
// pra saber quais eixos desenhar — se ele um dia desalinhar de
// EXECUTIVO_IDEAL (a fonte real dos alvos/taxas), o radar mostraria eixo
// fantasma ou esqueceria um de verdade, em silêncio.
test('EIXOS_EXECUTIVO_IDEAL: as mesmas chaves de EXECUTIVO_IDEAL, na mesma ordem — nada desalinhado', () => {
  assert.deepEqual(EIXOS_EXECUTIVO_IDEAL.map((e) => e.k), Object.keys(EXECUTIVO_IDEAL));
  for (const e of EIXOS_EXECUTIVO_IDEAL) {
    assert.ok(e.rotuloCurto, `${e.k} precisa de um rótulo curto pro radar`);
    assert.ok(e.emoji, `${e.k} precisa de um emoji`);
  }
});

// 🎡 09/09/2026 — DIR-109.1, dono: "a roda da vida... se a roda dele rodar,
// a vida dele anda." proporcoesExecutivoIdeal vira a "roda": cada eixo
// batendo o próprio alvo é 1 (100%), capado — não estoura de um eixo fácil
// pra fingir que a roda inteira está redonda.
test('proporcoesExecutivoIdeal: cada eixo é a fração do PRÓPRIO alvo, capada em 1 — a roda não estoura', () => {
  const prop = proporcoesExecutivoIdeal({ mvm: 0.4, producao: 0.9, realtime: 1, bonus: 0, vendas: 2 });
  assert.equal(prop.mvm, 0.5, '0.4 de um alvo de 0.8 é metade do caminho');
  assert.equal(prop.producao, 1, 'bateu o alvo de 0.9 em cima — pentágono cheio nesse eixo');
  assert.equal(prop.realtime, Math.min(1, 1 / 0.9), 'passou do alvo, mas capa em 1 — a roda não fica oval');
  assert.equal(prop.bonus, 0, 'nada de bônus — eixo murcho de vez');
  assert.equal(prop.vendas, 1, 'vendas dobrou o alvo (200%), mas capa em 1 igual os outros');
});

test('formacaoExecutivoIdeal continua a média das proporções — o refactor pra proporcoesExecutivoIdeal não muda a % de formação', () => {
  const taxas = { mvm: 0.6, producao: 0.9, realtime: 0.45, bonus: 0.4, vendas: 1 };
  const f = formacaoExecutivoIdeal(taxas);
  const prop = proporcoesExecutivoIdeal(taxas);
  const mediaEsperada = Object.values(prop).reduce((s, v) => s + v, 0) / Object.keys(prop).length;
  assert.equal(f.pct, Math.round(mediaEsperada * 100));
});

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
test('resumoDoDia: perdoado=true NUNCA zera, nem por não-votar nem por atraso do pronto — o dia inteiro é perdoado, não importa o motivo', () => {
  const depoisDoFim = VOTACAO_FIM_MIN + 30;
  const semVotarPerdoado = resumoDoDia({ tarefas: TAREFAS, agoraMin: depoisDoFim, votouEmTodos: false, perdoado: true });
  assert.equal(semVotarPerdoado.perdeu_por_nao_votar, false, 'perdoado esconde até o CAMPO que registra o motivo — outras telas não podem ver isso como zerado');
  assert.equal(semVotarPerdoado.mvm_dia, MVM_MAX, 'sem o perdão zeraria — com o perdão, a nota é a de sempre (dia impecável)');
  assert.ok(!/ZEROU/.test(semVotarPerdoado.frase_mvm), 'a frase não pode dizer que zerou um dia que foi perdoado');

  const atrasoVencidoPerdoado = resumoDoDia({
    tarefas: [...TAREFAS, { id: 'x1', titulo: 'Pegar as pautas', hora: '10:00', feito: false, origem: 'xperf', prazo_em: '2026-09-08T18:00:00' }],
    agoraMin: 12 * 60, hoje: new Date('2026-09-08T20:00:00'), votouEmTodos: true, perdoado: true,
  });
  assert.equal(atrasoVencidoPerdoado.perdeu_por_atraso_pronto, false, 'perdoado também cobre o atraso da tarefa da gestão, não só o voto');
  assert.equal(atrasoVencidoPerdoado.token_dia > 0, true, 'o dia não zerou');
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

// 🗳️ 08/09/2026 — dono: "o MVM é só votação... tem gente que nem foi votada
// com MVM alto." O bug: sem voto nenhum no ciclo (mvmVotacao null), o
// Human Token oficial caía pro mvm_dia AUTOMÁTICO (real time disfarçado de
// MVM) em vez de tratar como "ainda não tem MVM nenhum".
test('tokenDoCiclo: sem voto nenhum no ciclo, o componente MVM é ZERO — não pega emprestado o mvm_dia automático', () => {
  const semVoto = tokenDoCiclo({
    diasCiclo: [],
    hojeResumo: { mvm_dia: 10, prod_total: 10, prod_feitas: 10 }, // dia impecável, mas ninguém votou ainda
    mvmVotacao: null,
    perfil: 'estrategico',
  });
  assert.equal(semVoto.taxas.mvm, 0, 'sem voto, a taxa de MVM é zero, não a nota automática do dia');
  assert.equal(semVoto.componentes.mvm, 0);
});

test('tokenDoCiclo: com voto de verdade, o MVM vem da votação — o mvm_dia automático não entra em jogo', () => {
  const comVoto = tokenDoCiclo({
    diasCiclo: [],
    hojeResumo: { mvm_dia: 2 }, // dia automático baixo — não pode contaminar o MVM votado
    mvmVotacao: 8,
    perfil: 'estrategico',
  });
  assert.equal(comVoto.taxas.mvm, 0.8, 'usa a votação (8/10), ignora o mvm_dia automático');
  assert.equal(comVoto.componentes.mvm, 8, 'peso do MVM é 10, 80% disso é 8 pontos');
});

// 🔀 09/09/2026 — dono: "o real time não pode pesar tanto... quero aumentar
// o peso de quem vende e quem estuda." Trava o resultado da repesagem: real
// time (produção) vira pequeno, o estudo (bônus) vira o grande peso depois
// do MvM, e vendas sobe um pouco pra quem não é comercial.
test('pesosDoPerfil: real time pequeno, estudo grande — a repesagem pedida pelo dono', () => {
  const p = pesosDoPerfil('estrategico');
  assert.equal(p.mvm, 10, 'MvM continua o maior peso sozinho');
  assert.equal(p.producao, 1.5, 'real time não pesa mais 50% da base — agora é só 1,5 ponto');
  assert.equal(p.bonus, 5.55, 'estudo/leitura (categoria bonus) vira o segundo maior peso');
  assert.ok(p.bonus > p.producao, 'estudo tem que pesar mais que o real time, não menos');
  assert.equal(p.realtime, 3.67, 'desempenho (X-Pay ganho/possível) não mudou nesta repesagem');
  assert.equal(p.ptVenda, 1.5, 'vendas sobe um pouco pra quem não é comercial também');
  const total = p.mvm + p.producao + p.realtime + p.bonus + p.ptVenda;
  assert.ok(Math.abs(total - 22.22) < 0.01, `soma dos pesos tem que bater com o teto (22,22), deu ${total}`);
});

test('pesosDoPerfil: perfil comercial mantém vendas como o principal, real time reduzido igual', () => {
  const p = pesosDoPerfil('comercial');
  assert.equal(p.ptVenda, 2.5, 'comercial continua dominado pelas vendas — a trava de venda dele já é isso');
  assert.ok(p.producao < p.bonus, 'mesmo no comercial, real time reduzido não pode pesar mais que o estudo');
});

// ⏰ 08/09/2026 — dono: "se o cara se atrasou [na Fila do Pronto], além de
// ele perder o dinheiro, isso tem que tirar pontos dele." Reaproveita a
// MESMA régua radical do não-votar: uma tarefa de gestão (origem 'xperf',
// com "pronto até") vencida sem o pronto zera o dia inteiro.
// 🟡 09/09/2026 — DIR-105 amoleceu a régua: "ela pode perder até três
// pontos [nos 3 primeiros atrasos], pra treinar ela. A partir do quarto
// ponto que ela não entregar, ela vai zerar a pontuação." Do 1º ao 3º
// aviso (`avisos_pronto`, dado pelo botão "avisar" do ADM) só desconta
// pontos; só o 4º aviso em diante zera o dia inteiro (a régua do DIR-102).
test('resumoDoDia: 1º-3º atraso na Fila do Pronto (poucos avisos) so desconta pontos', () => {
  const agora = new Date('2026-09-08T20:00:00');
  const vencida = [
    ...TAREFAS,
    { id: 'x1', titulo: 'Pegar as pautas', hora: '10:00', feito: false, origem: 'xperf', prazo_em: '2026-09-08T18:00:00' },
  ];
  // linha de base: MESMA lista de tarefas, mas dia histórico (votouEmTodos
  // null) não julga atraso nenhum — dá o mvm/token/pontos sem NENHUMA
  // punição de atraso, pra comparar contra o modo "aviso/treino".
  const semPenalidade = resumoDoDia({ tarefas: vencida, agoraMin: 12 * 60, hoje: agora, votouEmTodos: null });
  for (const avisos of [0, 1, 2]) {
    const r = resumoDoDia({ tarefas: vencida, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true, participante: { avisos_pronto: avisos } });
    assert.equal(r.perdeu_por_atraso_pronto, false, `com ${avisos} avisos ainda nao zera`);
    assert.equal(r.em_aviso_pronto, true, `com ${avisos} avisos esta em modo aviso/treino`);
    assert.equal(r.avisos_pronto, avisos);
    assert.equal(r.mvm_dia, semPenalidade.mvm_dia, 'MvM nao pune nos 3 primeiros avisos');
    assert.equal(r.token_dia, semPenalidade.token_dia, 'Human Token nao pune nos 3 primeiros avisos');
    assert.equal(r.xpay.perdido, semPenalidade.xpay.perdido, 'X-Pay nao pune nos 3 primeiros avisos');
    assert.equal(r.pontos, Math.max(0, semPenalidade.pontos - 3), 'perde ate 3 pontos de treino');
    assert.doesNotMatch(r.frase_mvm, /ZEROU/);
  }
});

test('resumoDoDia: 4o aviso em diante na Fila do Pronto zera o dia inteiro — mesmo radical do não-votar', () => {
  const agora = new Date('2026-09-08T20:00:00');
  const vencida = [
    ...TAREFAS,
    { id: 'x1', titulo: 'Pegar as pautas', hora: '10:00', feito: false, origem: 'xperf', prazo_em: '2026-09-08T18:00:00' },
  ];
  const r = resumoDoDia({ tarefas: vencida, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true, participante: { avisos_pronto: 3 } });
  assert.equal(r.perdeu_por_atraso_pronto, true);
  assert.equal(r.em_aviso_pronto, false, 'nao e mais so aviso — ja e o zero radical');
  assert.equal(r.perdeu_por_nao_votar, false, 'a causa é o atraso, não o voto — os dois campos não se confundem');
  assert.equal(r.mvm_dia, 0);
  assert.equal(r.token_dia, 0);
  assert.equal(r.pontos, 0);
  assert.match(r.frase_mvm, /ATRASO/);

  const maisAvisos = resumoDoDia({ tarefas: vencida, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true, participante: { avisos_pronto: 7 } });
  assert.equal(maisAvisos.perdeu_por_atraso_pronto, true, 'acima de 3 avisos continua zerando');
});

test('resumoDoDia: tarefa xperf ainda dentro do prazo, ou já com o pronto dado, não pune', () => {
  const agora = new Date('2026-09-08T12:00:00');
  const dentroDoPrazo = [...TAREFAS, { id: 'x2', titulo: 'Enviar relatório', hora: '10:00', feito: false, origem: 'xperf', prazo_em: '2026-09-08T18:00:00' }];
  const jaPronta = [...TAREFAS, { id: 'x3', titulo: 'Enviar relatório', hora: '10:00', feito: true, origem: 'xperf', prazo_em: '2026-09-08T09:00:00' }];
  assert.equal(resumoDoDia({ tarefas: dentroDoPrazo, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true }).perdeu_por_atraso_pronto, false, 'ainda não venceu');
  assert.equal(resumoDoDia({ tarefas: jaPronta, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true }).perdeu_por_atraso_pronto, false, 'já deu o pronto — feito é feito');
  assert.equal(resumoDoDia({ tarefas: dentroDoPrazo, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true }).em_aviso_pronto, false, 'sem atraso nao entra nem no modo aviso');
});

test('resumoDoDia: tarefa da ROTINA (sem origem xperf, sem prazo_em) vencida não conta como atraso da gestão', () => {
  const agora = new Date('2026-09-08T20:00:00');
  const r = resumoDoDia({ tarefas: TAREFAS, agoraMin: 12 * 60, hoje: agora, votouEmTodos: true });
  assert.equal(r.perdeu_por_atraso_pronto, false, 'a Master Task da rotina não tem prazo_em — só tarefa distribuída pela gestão pune assim');
});

test('resumoDoDia: dia histórico (votouEmTodos null) não recalcula o atraso — um dia passado já fechou nos próprios registros', () => {
  const agora = new Date('2026-09-05T20:00:00');
  const vencida = [...TAREFAS, { id: 'x4', titulo: 'Pegar as pautas', hora: '10:00', feito: false, origem: 'xperf', prazo_em: '2026-09-05T18:00:00' }];
  const r = resumoDoDia({ tarefas: vencida, agoraMin: 24 * 60, hoje: agora, votouEmTodos: null });
  assert.equal(r.perdeu_por_atraso_pronto, false);
  assert.equal(r.em_aviso_pronto, false);
});

// 📊 09/09/2026 — dono: "eu quero esse alcance" (o % de reunião também na
// Verificação do Progresso). `contagens` é o que os dois lugares que gravam
// o placar (`CrmMetodo.jsx`, `XGame.jsx`) espalham dentro de
// `xgame_diario.detalhes` via `...contagens` — travar aqui garante que o
// número certo chega até lá, sem precisar de teste em cada tela.
test('resumoDoDia: contagens.reunioes_total/feitas contam só título de reunião/apresentação/encontro/call', () => {
  const dia = [
    { id: 'r1', titulo: 'Reunião de investimento', hora: '09:00', feito: true },
    { id: 'r2', titulo: 'Apresentação de sucesso pro cliente', hora: '10:00', feito: false },
    { id: 'r3', titulo: 'Gratidão', hora: '08:00', feito: true },
  ];
  const r = resumoDoDia({ tarefas: dia, agoraMin: 11 * 60 });
  assert.equal(r.contagens.reunioes_total, 2);
  assert.equal(r.contagens.reunioes_feitas, 1);
});

// 🎓 09/09/2026 — dono: "um dia de final de semana com um estudo foda...
// quero um resumo bem detalhado... pra ser Diamante." O estudo de fim de
// semana é um tipo de comprovação À PARTE (mínimo bem maior) que trava o
// Diamante, não o Ouro — igual à trava de estudo de semana, só que um
// degrau acima.
test('validacaoAutomatica: "Estudo do Fim de Semana" vira aprendizado_fds, não o aprendizado comum', () => {
  assert.equal(validacaoAutomatica('Estudo do Fim de Semana'), 'aprendizado_fds');
  assert.equal(validacaoAutomatica('Leitura de fim de semana'), 'aprendizado_fds');
  assert.equal(validacaoAutomatica('Estudo profundo'), 'aprendizado_fds');
  assert.equal(validacaoAutomatica('Leitura do dia'), 'aprendizado', 'leitura comum de semana continua o mínimo de sempre');
});

test('tipoDeValidacao: aprendizado_fds é um tipo explícito válido (o admin pode escolher na mão)', () => {
  assert.equal(tipoDeValidacao({ validacao: 'aprendizado_fds', titulo: 'qualquer coisa' }), 'aprendizado_fds');
});

test('faltaDoResumo/textoDoContador: o mínimo do fim de semana é bem maior que o do dia a dia', () => {
  assert.equal(RESUMO_MIN_FDS, 1200);
  assert.ok(RESUMO_MIN_FDS > RESUMO_MIN * 2, 'tem que ser um salto de verdade, não um ajuste fino');
  assert.equal(faltaDoResumo('a'.repeat(400), 'aprendizado_fds'), RESUMO_MIN_FDS - 400, '400 caracteres bastam pro dia a dia, mas não pro fim de semana');
  assert.equal(faltaDoResumo('a'.repeat(RESUMO_MIN_FDS), 'aprendizado_fds'), 0);
  assert.match(textoDoContador('', 'aprendizado_fds'), new RegExp(`pelo menos ${RESUMO_MIN_FDS}`));
});

test('motivoDoBotaoTravado: aprendizado_fds também trava por foto e por tamanho do resumo', () => {
  assert.equal(motivoDoBotaoTravado({ tipo: 'aprendizado_fds', temFoto: false, texto: '' }), 'falta a foto do estudo para liberar');
  assert.match(motivoDoBotaoTravado({ tipo: 'aprendizado_fds', temFoto: true, texto: 'a'.repeat(400) }), /escreva mais/);
  assert.equal(motivoDoBotaoTravado({ tipo: 'aprendizado_fds', temFoto: true, texto: 'a'.repeat(RESUMO_MIN_FDS) }), '', 'com o tamanho certo, libera');
});

test('validarComprovacao: aprendizado_fds exige o mínimo de fim de semana, não o de semana', () => {
  const curto = validarComprovacao('aprendizado_fds', 'a'.repeat(RESUMO_MIN));
  assert.equal(curto.valido, false, '400 caracteres passaria no dia a dia, mas não é suficiente pro fim de semana');
  const completo = validarComprovacao('aprendizado_fds', 'a'.repeat(RESUMO_MIN_FDS));
  assert.equal(completo.valido, true);
});

test('estudoFdsEmDia: nenhum fim de semana ainda no ciclo — não julga (true)', () => {
  const soDiaDeSemana = [{ data: '2026-09-08', detalhes: {} }]; // terça
  assert.equal(estudoFdsEmDia(soDiaDeSemana), true);
  assert.equal(estudoFdsEmDia([]), true);
});

test('estudoFdsEmDia: 60%+ dos fins de semana já vividos com o estudo feito → true', () => {
  const dias = [
    { data: '2026-09-05', detalhes: { estudo_fds_feito: true } },  // sábado feito
    { data: '2026-09-06', detalhes: { estudo_fds_feito: false } }, // domingo não feito
    { data: '2026-09-12', detalhes: { estudo_fds_feito: true } },  // sábado seguinte feito
  ];
  assert.equal(estudoFdsEmDia(dias), true, '2 de 3 fins de semana registrados = 66%, passa dos 60%');
});

test('estudoFdsEmDia: menos de 60% dos fins de semana feitos → false, trava o Diamante', () => {
  const dias = [
    { data: '2026-09-05', detalhes: { estudo_fds_feito: false } },
    { data: '2026-09-06', detalhes: { estudo_fds_feito: false } },
    { data: '2026-09-12', detalhes: { estudo_fds_feito: true } },
  ];
  assert.equal(estudoFdsEmDia(dias), false, '1 de 3 = 33%, não passa dos 60%');
});

test('estudoFdsEmDia: o "hoje" entra na conta quando ainda não está em diasCiclo (mesmo padrão de estudoEmDia)', () => {
  const passadoFeito = [{ data: '2026-09-05', detalhes: { estudo_fds_feito: true } }]; // sábado passado, feito
  assert.equal(estudoFdsEmDia(passadoFeito, { data: '2026-09-06', feito: true }), true, 'passado feito + hoje (domingo) feito = 2/2');
  assert.equal(estudoFdsEmDia(passadoFeito, { data: '2026-09-06', feito: false }), false, 'passado feito + hoje NÃO feito = 1/2 = 50%, abaixo dos 60% — confirma que hoje entrou na conta');
  assert.equal(estudoFdsEmDia([], { data: '2026-09-08', feito: false }), true, 'hoje é terça — não é fim de semana, não entra na conta');
});

// dia perfeito em todos os componentes — sem a trava, bateria no teto (22,22).
// A trava (igual à TRAVA_SEM_ESTUDO de semana) é aplicada por FORA de
// tokenDoCiclo, no mesmo Math.min já usado em XGame.jsx/CrmMetodo.jsx —
// tokenDoCiclo continua puro, sem saber de travas de estudo.
const DIA_PERFEITO = { prod_total: 1, prod_feitas: 1, bonus_total: 1, bonus_feitas: 1, xpay_ganho: 1, xpay_possivel: 1 };

test('tokenDoCiclo: o ciclo perfeito passa do teto do Diamante — é isso que a trava de fim de semana precisa segurar', () => {
  const r = tokenDoCiclo({ diasCiclo: [], hojeResumo: DIA_PERFEITO, mvmVotacao: 10, vendasReais: 4, perfil: 'estrategico' });
  assert.ok(r.total > TRAVA_SEM_DIAMANTE, `o ciclo perfeito (${r.total}) tem que passar de ${TRAVA_SEM_DIAMANTE} pra trava fazer sentido`);
});

test('TRAVA_SEM_DIAMANTE aplicada por fora (padrão dos call-sites): sem o estudo de fim de semana, Ouro continua alcançável mas não vira Diamante', () => {
  const r = tokenDoCiclo({ diasCiclo: [], hojeResumo: DIA_PERFEITO, mvmVotacao: 10, vendasReais: 4, perfil: 'estrategico' });
  const totalComTrava = estudoFdsEmDia([]) ? r.total : Math.min(r.total, TRAVA_SEM_DIAMANTE);
  const semEstudoFds = Math.min(r.total, TRAVA_SEM_DIAMANTE); // simula estudoFdsEmDia(...) === false
  assert.ok(semEstudoFds <= TRAVA_SEM_DIAMANTE);
  assert.ok(semEstudoFds >= 17.78, 'a trava é só do Diamante — Ouro continua alcançável');
  assert.equal(totalComTrava, r.total, 'sem fim de semana ainda vivido no ciclo, estudoFdsEmDia não trava nada');
});
