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
  janelaVotacaoAberta, naJanelaIdeal, horaDeMin, tokenDoCiclo, pesosDoPerfil, moedaModelo,
  validacaoAutomatica, tipoDeValidacao, validarComprovacao, faltaDoResumo, textoDoContador, motivoDoBotaoTravado,
  RESUMO_MIN, RESUMO_MIN_FDS, estudoFdsEmDia, estudoEmDia, TRAVA_SEM_ESTUDO_CICLO, travarTopoPorEstudo, EXECUTIVO_IDEAL, EIXOS_EXECUTIVO_IDEAL, proporcoesExecutivoIdeal, formacaoExecutivoIdeal,
  META_VENDAS_CICLO, TICKET_MEDIO_VENDA, PESO_REUNIAO_EQUIVALENTE, TETO_REUNIAO_NA_META, vendasEquivalentesAltoValor, TOKEN_MAX,
  LIGAS, FAIXAS_TOKEN, ligaDoToken, ligaComPortoesDoCiclo, PISO_CARATER_LIGA, PISO_CARATER_PLATINA,
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

test('podeSerVotado: super_admin é OPT-IN (desligado por padrão); todo mundo mais é OPT-OUT (ligado por padrão)', () => {
  assert.equal(podeSerVotado({ role: 'super_admin', aceita_ser_votado: false }), false);
  assert.equal(podeSerVotado({ role: 'super_admin', aceita_ser_votado: true }), true);
  assert.equal(podeSerVotado({ role: 'super_admin' }), false, 'sem o campo, o default é NÃO votável pro super_admin');
  assert.equal(podeSerVotado({ role: 'admin' }), true, 'sem o campo, admin comum continua votável — o comportamento de sempre não muda pra quem nunca foi desligado');
  assert.equal(podeSerVotado({ role: 'user' }), true);
  assert.equal(podeSerVotado({}), true, 'sem role nenhum, não é super_admin — continua votável');
});

// 🗳️ 09/09/2026 — dono: "tem pessoas que já participaram da mentoria e não
// vão receber voto... eles podem votar, mas não recebem voto." O admin
// desliga `aceita_ser_votado` na mão, pessoa por pessoa — diferente do
// super_admin, aqui é o admin quem decide, e o padrão é o oposto (votável
// até alguém desligar, não o contrário).
test('podeSerVotado: o admin pode DESLIGAR um participante comum da lista votável, pessoa por pessoa', () => {
  assert.equal(podeSerVotado({ role: 'diretor', aceita_ser_votado: false }), false, 'o dono desligou esta pessoa — não recebe voto, mesmo sendo diretor ativo');
  assert.equal(podeSerVotado({ role: 'diretor', aceita_ser_votado: true }), true, 'explicitamente ligado — votável, igual ao padrão');
  assert.equal(podeSerVotado({ role: 'executivo', aceita_ser_votado: undefined }), true, 'ninguém mexeu no campo — continua votável, o padrão de sempre');
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
  assert.equal(semVotarPerdoado.token_dia > 0, true, 'o dia não zerou');

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
  assert.equal(comVoto.componentes.mvm, 5.34, 'peso do MVM (perfil estratégico, DIR-115) é 6,67, 80% disso é 5,336 ≈ 5,34');
});

// 🟢 09/09/2026 — DIR-110, dono: "quatro vendas é muito pouco pra um
// executivo de venda... vamos botar vinte e seis vendas." + "a reunião
// pode ser o princípio da venda... mas peso maior é venda" (teto) + "se
// ele fechou uma licença de vinte mil, já preencheu" (valor alto).
test('META_VENDAS_CICLO: subiu pra 26 — quatro vendas era pouco demais pra um executivo de vendas', () => {
  assert.equal(META_VENDAS_CICLO, 26);
});

test('tokenDoCiclo: reunião conta como princípio da venda, mas tem teto — não dá pra só agendar reunião e nunca vender', () => {
  const semReuniao = tokenDoCiclo({ diasCiclo: [], hojeResumo: { vendas_feitas: 2, reunioes_feitas: 0 }, mvmVotacao: null, perfil: 'estrategico' });
  const comPoucasReunioes = tokenDoCiclo({ diasCiclo: [], hojeResumo: { vendas_feitas: 2, reunioes_feitas: 4 }, mvmVotacao: null, perfil: 'estrategico' });
  assert.equal(semReuniao.vendasFeitas, 2);
  assert.equal(comPoucasReunioes.vendasDiretas, 2, 'venda direta não muda');
  assert.equal(comPoucasReunioes.reuniaoEquivalente, 4 * PESO_REUNIAO_EQUIVALENTE, '4 reuniões × 0,25 = 1 venda equivalente, ainda dentro do teto');
  assert.equal(comPoucasReunioes.vendasFeitas, 2 + 4 * PESO_REUNIAO_EQUIVALENTE);

  // um exagero de reuniões — o teto tem que segurar
  const teto = META_VENDAS_CICLO * TETO_REUNIAO_NA_META;
  const comMuitasReunioes = tokenDoCiclo({ diasCiclo: [], hojeResumo: { vendas_feitas: 0, reunioes_feitas: 1000 }, mvmVotacao: null, perfil: 'estrategico' });
  assert.equal(comMuitasReunioes.reuniaoEquivalente, teto, `mesmo com 1000 reuniões, o teto (${teto}) segura — reunião não substitui vender`);
});

test('vendasEquivalentesAltoValor: parceiro de compra/vendedor/adesão convertidos pelo ticket médio — venda grande já preenche a meta', () => {
  const vendas = [
    { kind: 'loja', total_amount: 197 }, // não é alto valor — ignorada aqui
    { kind: 'partner_plan', total_amount: 20000 },
    { kind: 'seller_adhesion', total_amount: 5000 },
    { kind: 'adesao', total_amount: 5000 },
  ];
  const equivalentes = vendasEquivalentesAltoValor(vendas);
  assert.equal(equivalentes, (20000 + 5000 + 5000) / TICKET_MEDIO_VENDA);
  assert.ok(equivalentes > META_VENDAS_CICLO, 'uma licença de 20 mil sozinha já satura a meta do ciclo inteiro');
});

test('vendasEquivalentesAltoValor: sem venda de alto valor, devolve zero — não inventa conta em cima de venda de mercadoria comum', () => {
  assert.equal(vendasEquivalentesAltoValor([{ kind: 'loja', total_amount: 500 }, { kind: 'produto', total_amount: 300 }]), 0);
  assert.equal(vendasEquivalentesAltoValor([]), 0);
});

// 🏆 DIR-115 (09/09/2026) — REPESAGEM, dono: "recrutamos caráter e treinamos
// habilidade... a produção ela chega aos quarenta e cinco por cento com o
// realtime." O MvM deixa de ser a maior fatia sozinha (era 45%) porque virou
// PORTÃO (ver ligaComPortoesDoCiclo) — "30% + veto é mais forte que 45% sem
// veto". Produção+Real Time juntos voltam a somar 45% (30+15), Vendas sobe
// pra 15% contínuo (a meta cheia é portão da Platina, não peso), Bônus/
// Estudo fecha em 10%.
test('pesosDoPerfil: repesagem DIR-115 — MvM 30%, Produção 30%, Real Time 15%, Vendas 15%, Bônus 10%', () => {
  const p = pesosDoPerfil('estrategico');
  assert.equal(p.mvm, 6.67, 'MvM caiu de 45% pra 30% — o resto do caráter agora mora no portão, não no peso');
  assert.equal(p.producao, 6.67, 'produção sobe pra 30% — o maior peso ao lado do MvM');
  assert.equal(p.realtime, 3.33, 'real time (15%) multiplica o valor da produção, mas pesa menos que ela sozinho');
  assert.equal(p.bonus, 2.22, 'bônus/estudo (10%) é o menor peso — mas nunca zero: dono não abriu mão do estudo');
  assert.equal(p.ptVenda, 3.33, 'vendas (15%) contínuo — o "100% da meta" é portão da Platina, não este peso');
  assert.ok(p.producao + p.realtime > p.mvm, 'produção+real time (45%) supera o MvM (30%) sozinho — bate com "a produção chega aos 45% com o realtime"');
  const total = p.mvm + p.producao + p.realtime + p.bonus + p.ptVenda;
  assert.ok(Math.abs(total - 22.22) < 0.01, `soma dos pesos tem que bater com o teto (22,22), deu ${total}`);
});

test('pesosDoPerfil: perfil comercial NÃO faz parte da repesagem DIR-115 — mantém os próprios pesos', () => {
  const p = pesosDoPerfil('comercial');
  assert.equal(p.mvm, MVM_MAX, 'comercial continua com o MvM no peso cheio — decisão de outra conversa, intocada aqui');
  assert.equal(p.ptVenda, 2.5, 'comercial continua dominado pelas vendas — a trava de venda dele já é isso');
  assert.ok(p.producao < p.bonus, 'mesmo no comercial, real time reduzido não pode pesar mais que o estudo');
});

// 🪙 09/09/2026 — dono: "a moeda tem que estar ali, pra ele se inspirar
// nela cheia... junto com a dele que está sendo preenchida." moedaModelo
// é a mesma fonte usada em toda tela que desenha a moeda-referência (Guia,
// Compromisso, Visão Executiva) — nunca duplicada à mão em cada arquivo,
// pra nunca dessincronizar de pesosDoPerfil quando os pesos mudarem de novo.
test('moedaModelo: os 5 pesos no valor MÁXIMO, na MESMA fonte que pesosDoPerfil — nunca duplicado à mão', () => {
  const m = moedaModelo('estrategico');
  const p = pesosDoPerfil('estrategico');
  assert.deepEqual(m, { mvm: p.mvm, producao: p.producao, realtime: p.realtime, bonus: p.bonus, vendas: p.ptVenda });
  const total = Object.values(m).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(total - TOKEN_MAX) < 0.01, `a moeda-modelo tem que fechar o teto exato (${TOKEN_MAX}), deu ${total}`);
});

test('moedaModelo: sem perfil informado, usa o padrão \'estrategico\' — a moeda-referência que todo mundo vê', () => {
  assert.deepEqual(moedaModelo(), moedaModelo('estrategico'));
});

// 🐛 09/09/2026 — achado na auditoria pré-publicação: essa suíte nunca
// conferiu a SOMA pro perfil comercial (só a ordem dos pesos) — por isso
// não pegou que ela dava 14,72 em vez de 22,22, travando qualquer
// executivo comercial abaixo de Ouro (17,78) pra sempre, mesmo fechando
// 100% em tudo. Trava explícita pros dois perfis, pra nunca mais destoar —
// e continua valendo depois da repesagem DIR-115, que mexeu só no
// 'estrategico'.
test('pesosDoPerfil: a soma bate com TOKEN_MAX pros dois perfis — comercial não pode ficar travado abaixo de Ouro/Platina', () => {
  for (const perfil of ['estrategico', 'operacional', 'comercial']) {
    const p = pesosDoPerfil(perfil);
    const total = p.mvm + p.producao + p.realtime + p.bonus + p.ptVenda;
    assert.ok(Math.abs(total - TOKEN_MAX) < 0.01, `perfil '${perfil}': soma dos pesos (${total}) tem que bater com TOKEN_MAX (${TOKEN_MAX})`);
  }
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

// 🐛 09/09/2026 — achado na auditoria pré-publicação: no mesmo dia em que
// `perdeuPorNaoVotar` já zera tudo (depois das 21h30, sem votar em todo
// mundo), um atraso de pronto com poucos avisos acumulados fazia
// `em_aviso_pronto` ficar `true` AO MESMO TEMPO — a tela mostrava os dois
// banners juntos: o vermelho "DIA ZERADO" e, embaixo, o âmbar "você só
// perdeu pontos, MvM/Token/X-Pay continuam de pé", que é falso nesse caso
// específico (os dois JÁ zeraram, pela régua do não-voto).
test('resumoDoDia: zerado por não votar SUPRIME o aviso graduado do pronto — os dois banners não podem aparecer juntos', () => {
  const agora = new Date('2026-09-08T22:00:00'); // depois das 21h30 — votação fechada
  const vencida = [
    ...TAREFAS,
    { id: 'x1', titulo: 'Pegar as pautas', hora: '10:00', feito: false, origem: 'xperf', prazo_em: '2026-09-08T18:00:00' },
  ];
  const r = resumoDoDia({ tarefas: vencida, agoraMin: 22 * 60, hoje: agora, votouEmTodos: false, participante: { avisos_pronto: 1 } });
  assert.equal(r.perdeu_por_nao_votar, true, 'o não-voto já zerou o dia');
  assert.equal(r.perdeu_por_atraso_pronto, false, 'só 1 aviso — o atraso sozinho não zeraria');
  assert.equal(r.em_aviso_pronto, false, 'mas o dia JÁ zerou por outro motivo — não é "só perdeu pontos"');
  assert.equal(r.token_dia, 0);
  assert.equal(r.pontos, 0);
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
// quero um resumo bem detalhado... pra ser Diamante [Platina, DIR-115]." O
// estudo de fim de semana é um tipo de comprovação À PARTE (mínimo bem
// maior) que trava o TOPO, não o Ouro — igual à trava de estudo de semana,
// só que um degrau acima.
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

test('estudoFdsEmDia: menos de 60% dos fins de semana feitos → false, trava o topo (Platina)', () => {
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

test('tokenDoCiclo: o ciclo perfeito passa do teto do topo (Platina) — é isso que a trava de fim de semana precisa segurar', () => {
  const r = tokenDoCiclo({ diasCiclo: [], hojeResumo: DIA_PERFEITO, mvmVotacao: 10, vendasReais: META_VENDAS_CICLO, perfil: 'estrategico' });
  assert.ok(r.total > TRAVA_SEM_ESTUDO_CICLO, `o ciclo perfeito (${r.total}) tem que passar de ${TRAVA_SEM_ESTUDO_CICLO} pra trava fazer sentido`);
  assert.ok(Math.abs(r.total - TOKEN_MAX) < 0.01, 'a soma dos pesos da repesagem DIR-115 continua fechando o teto exato, só a distribuição interna mudou');
});

test('TRAVA_SEM_ESTUDO_CICLO aplicada por fora (padrão dos call-sites): sem o estudo de fim de semana, Ouro continua alcançável mas não vira o topo', () => {
  const r = tokenDoCiclo({ diasCiclo: [], hojeResumo: DIA_PERFEITO, mvmVotacao: 10, vendasReais: META_VENDAS_CICLO, perfil: 'estrategico' });
  const totalComTrava = estudoFdsEmDia([]) ? r.total : Math.min(r.total, TRAVA_SEM_ESTUDO_CICLO);
  const semEstudoFds = Math.min(r.total, TRAVA_SEM_ESTUDO_CICLO); // simula estudoFdsEmDia(...) === false
  assert.ok(semEstudoFds <= TRAVA_SEM_ESTUDO_CICLO);
  assert.ok(semEstudoFds >= 17.78, 'a trava é só do topo — Ouro continua alcançável');
  assert.equal(totalComTrava, r.total, 'sem fim de semana ainda vivido no ciclo, estudoFdsEmDia não trava nada');
});

// 🎓 09/09/2026 — DIR-113: o dono revisou o próprio pedido anterior — "o que
// ditava o diamante [Platina, DIR-115] é só um estudo em casa, mas ela tem
// que chegar ao ouro... até mesmo se ela não estudar em casa."
// `travarTopoPorEstudo` (renomeada de `travarDiamantePorEstudo`) é a função
// ÚNICA que os lugares que calculam liga de ciclo (X-Game, Compromisso
// pessoal + ranking, Painel Corporativo) usam — antes, cada lugar
// reaplicava a trava manualmente, e um deles (XGame.jsx/CrmMetodo.jsx
// pessoal) usava por engano TRAVA_SEM_ESTUDO (17,77, a trava do TOKEN DO
// DIA) pra capar o total do CICLO, bloqueando Ouro sem motivo.
test('travarTopoPorEstudo: com os dois estudos em dia, o total passa reto — topo (Platina) alcançável', () => {
  assert.equal(travarTopoPorEstudo(21.5, { estudoSemanaOk: true, estudoFdsOk: true }), 21.5);
});

test('travarTopoPorEstudo: falta a leitura de semana → capa no teto do topo, nunca abaixo de Ouro', () => {
  const capado = travarTopoPorEstudo(21.5, { estudoSemanaOk: false, estudoFdsOk: true });
  assert.equal(capado, TRAVA_SEM_ESTUDO_CICLO);
  assert.ok(capado >= 17.78, 'Ouro continua alcançável mesmo sem a leitura de semana em dia');
});

test('travarTopoPorEstudo: falta o estudo de fim de semana → mesma trava do topo', () => {
  assert.equal(travarTopoPorEstudo(21.5, { estudoSemanaOk: true, estudoFdsOk: false }), TRAVA_SEM_ESTUDO_CICLO);
});

test('travarTopoPorEstudo: faltando os dois, trava igual (não empilha)', () => {
  assert.equal(travarTopoPorEstudo(21.5, { estudoSemanaOk: false, estudoFdsOk: false }), TRAVA_SEM_ESTUDO_CICLO);
});

test('travarTopoPorEstudo: total abaixo do teto do topo nunca é afetado, com ou sem estudo', () => {
  assert.equal(travarTopoPorEstudo(15, { estudoSemanaOk: false, estudoFdsOk: false }), 15);
});

// 🏆 DIR-115 (09/09/2026) — as 4 faixas viram degraus de ~20-30% cada,
// fechando o "deserto" antigo (prata em 30%, ouro só em 80% — 50 pontos
// sem nenhuma linha no meio). Platina começa EXATAMENTE onde o Ouro antigo
// começava (17,78) — o topo não ficou mais fácil, só ganhou dois degraus
// novos no meio e perdeu o nome de multinível.
test('FAIXAS_TOKEN/LIGAS: 4 faixas — bronze/prata/ouro/platina, Platina começa em 17,78 (o Ouro antigo), sem "deserto" no meio', () => {
  assert.deepEqual(FAIXAS_TOKEN.map((f) => f.id), ['platina', 'ouro', 'prata', 'bronze']);
  assert.deepEqual(LIGAS.map((l) => l.id), ['platina', 'ouro', 'prata', 'bronze']);
  assert.equal(LIGAS.find((l) => l.id === 'platina').min, 17.78);
  assert.equal(LIGAS.find((l) => l.id === 'ouro').min, 12.22);
  assert.equal(LIGAS.find((l) => l.id === 'prata').min, 6.66);
  assert.equal(LIGAS.find((l) => l.id === 'bronze').min, 0);
  // 🐛 a régua que importa não é "faixas idênticas", é "nenhum buraco
  // gigante": o antigo tinha 50 pontos (30%→80%) sem nenhuma linha no
  // meio. Cada degrau novo agora fica entre 20% e 30% do teto — bem
  // distante do buraco antigo, mesmo sem serem idênticos entre si.
  const tetos = [0, 6.66, 12.22, 17.78, TOKEN_MAX];
  for (let i = 1; i < tetos.length; i += 1) {
    const tamanho = tetos[i] - tetos[i - 1];
    const pct = tamanho / TOKEN_MAX;
    assert.ok(pct >= 0.19 && pct <= 0.31, `degrau ${tetos[i - 1]}→${tetos[i]} é ${Math.round(pct * 100)}% do teto — bem longe do buraco de 50% que existia antes`);
  }
});

// 🎖️ DIR-115 (09/09/2026) — OS PORTÕES: dono, "recrutamos caráter e
// treinamos habilidade" — caráter não é nota que compensa com produção ou
// venda, é PRÉ-REQUISITO. Dois portões, nunca sobre o TOTAL exibido, só
// sobre a LIGA que aquele total pode valer.
test('ligaComPortoesDoCiclo: MvM abaixo do piso de caráter (7) trava TUDO em Bronze, mesmo com token de Platina', () => {
  const liga = ligaComPortoesDoCiclo(22, { mvmVotacao: 6.9, vendasFeitas: 26 });
  assert.equal(liga.id, 'bronze', 'sem o mínimo de caráter, nem Prata nem Ouro perdoam — direto pro Bronze');
});

test('ligaComPortoesDoCiclo: MvM exatamente no piso de caráter (7) NÃO trava em Bronze — o piso é "abaixo de", não "até"', () => {
  const liga = ligaComPortoesDoCiclo(10, { mvmVotacao: PISO_CARATER_LIGA, vendasFeitas: 0 });
  assert.notEqual(liga.id, 'bronze', 'MvM = 7 exatamente já passa do piso — a trava é só pra quem fica ABAIXO de 7');
});

test('ligaComPortoesDoCiclo: MvM entre 7 e 8 barra só a Platina — Ouro continua de pé', () => {
  const liga = ligaComPortoesDoCiclo(20, { mvmVotacao: 7.5, vendasFeitas: 26 });
  assert.equal(liga.id, 'ouro', 'token de Platina, mas MvM abaixo de 8 — teto vira Ouro, não Bronze');
});

test('ligaComPortoesDoCiclo: MvM exatamente 8 (o alvo do Executivo Ideal) já abre a Platina, se as vendas também baterem', () => {
  const liga = ligaComPortoesDoCiclo(20, { mvmVotacao: PISO_CARATER_PLATINA, vendasFeitas: META_VENDAS_CICLO });
  assert.equal(liga.id, 'platina', 'MvM = 8 exatamente já passa do piso da Platina — a trava é só pra quem fica ABAIXO de 8');
});

test('ligaComPortoesDoCiclo: sem bater 100% da meta de vendas, a Platina não abre — mesmo com MvM alto', () => {
  const liga = ligaComPortoesDoCiclo(20, { mvmVotacao: 10, vendasFeitas: META_VENDAS_CICLO - 1 });
  assert.equal(liga.id, 'ouro', 'faltou 1 venda pra meta cheia — "métodologia garante venda", sorte/quase não abre o topo');
});

test('ligaComPortoesDoCiclo: os dois portões abertos (caráter ≥ 8 e meta cheia de vendas) — Platina de verdade', () => {
  const liga = ligaComPortoesDoCiclo(20, { mvmVotacao: 9, vendasFeitas: META_VENDAS_CICLO });
  assert.equal(liga.id, 'platina');
});

test('ligaComPortoesDoCiclo: os portões nunca mexem no TOTAL — só na liga que ele pode valer', () => {
  const semPortao = ligaComPortoesDoCiclo(20, { mvmVotacao: 10, vendasFeitas: META_VENDAS_CICLO });
  const comPortaoFechado = ligaComPortoesDoCiclo(20, { mvmVotacao: 5, vendasFeitas: 0 });
  assert.equal(semPortao.id, 'platina');
  assert.equal(comPortaoFechado.id, 'bronze');
  // o "20" passado pros dois é o MESMO número — só a liga retornada muda,
  // provando que a função nunca mexe no total, só decide a liga por cima.
});

test('ligaComPortoesDoCiclo: sem mvmVotacao (ninguém votou ainda) não trava em Bronze por engano — só o portão de vendas da Platina se aplica', () => {
  const semVoto = ligaComPortoesDoCiclo(20, { mvmVotacao: null, vendasFeitas: META_VENDAS_CICLO });
  assert.equal(semVoto.id, 'platina', 'mvmVotacao null não é "abaixo do piso" — é "não sei ainda", não pune');
});

test('ligaComPortoesDoCiclo: token abaixo de Platina não sofre o portão de vendas/caráter da Platina (só ela é vetada)', () => {
  const liga = ligaComPortoesDoCiclo(10, { mvmVotacao: 3, vendasFeitas: 0 });
  // MvM 3 é abaixo do piso de LIGA (7) — trava geral em Bronze, então este
  // caso confirma o piso de CARÁTER GERAL, não o de Platina especificamente.
  assert.equal(liga.id, 'bronze');
});
