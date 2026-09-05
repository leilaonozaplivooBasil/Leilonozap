// xgame — O MOTOR DA GAMIFICAÇÃO DO MÉTODO (05/09/2026).
// Tradução fiel das fórmulas da planilha "X-GAME — Guia Prático do Sucesso"
// (To The Top / X-EOS) pra cima do Master Task que já existe (metodo_tarefas):
//
//  • Ciclo de 22 dias úteis (na planilha: FIM = WORKDAY(INÍCIO; 22) − 1).
//  • MvM do Dia: começa em 10 e DECAI em tempo real — cada tarefa que passa
//    da hora sem ser marcada desconta 10 ÷ nº de tarefas (fórmula da
//    X-Estrelinha, célula J28).
//  • Aplicabilidade: constância no ciclo, vale no máximo 12,22 (a planilha
//    reparte 12,22 em produção/realtime/bônus; aqui, na v1, é a média do %
//    de conclusão dos dias já jogados do ciclo).
//  • Human Token do dia = MvM + Aplicabilidade, teto 22,22. Faixas da moeda:
//    bronze < 6,66 · prata < 17,78 · OURO ≥ 17,78. E a trava da planilha:
//    sem constância de estudo (a tarefa de leitura), o token trava em 17,77 —
//    um centésimo abaixo do ouro, de propósito.
//  • Cotação do dia: 1,00 no 1º dia útil do ciclo caindo 0,01 por dia até
//    0,80 no 22º (tabela MOEDAS AF/AG). "ANTECIPAÇÃO É PODER."
//  • Pontos do dia: 10 por tarefa feita (+5 se feita dentro da janela do
//    horário), multiplicado pela cotação do dia e arredondado.
//
// Tudo aqui é função pura: recebe tarefas/hora e devolve número. Nada de
// rede, nada de estado — quem grava o placar é a tela (xgame_diario).

export const TOKEN_MAX = 22.22;
export const APLICABILIDADE_MAX = 12.22;
export const MVM_MAX = 10;
export const TRAVA_SEM_ESTUDO = 17.77; // "Mediana" na planilha: nunca chega ao ouro
export const CICLO_DIAS_UTEIS = 22;

export const FAIXAS_TOKEN = [
  { id: 'ouro', label: 'OURO', min: 17.78, medalha: '🥇' },
  { id: 'prata', label: 'PRATA', min: 6.66, medalha: '🥈' },
  { id: 'bronze', label: 'BRONZE', min: 0, medalha: '🥉' },
];

// Frases de efeito herdadas da planilha (aba MOEDAS, coluna Q).
export const FRASES = {
  antecipacao: 'ANTECIPAÇÃO É PODER',
  reacao: 'REAÇÃO É FRACASSO',
  realtime: 'BUSQUE O REAL TIME',
  atraso: 'ANTES TARDE DO QUE NUNCA',
  impacto: 'ISSO IMPACTA NO SEU RESULTADO',
};

// ── Calendário do ciclo ─────────────────────────────────────────────

const ehDiaUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6;

/** Soma `n` dias úteis a partir de `d` (contando `d` se for útil como dia 1). */
export function addDiasUteis(d, n) {
  const data = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let conta = 0;
  while (conta < n) {
    if (ehDiaUtil(data)) conta += 1;
    if (conta < n) data.setDate(data.getDate() + 1);
  }
  return data;
}

/** Início do ciclo corrente: o 1º dia útil do mês (regra v1 — mensal). */
export function inicioCiclo(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  while (!ehDiaUtil(d)) d.setDate(d.getDate() + 1);
  return d;
}

/** Fim do ciclo = 22º dia útil a partir do início (igual à planilha). */
export function fimCiclo(inicio) {
  return addDiasUteis(inicio, CICLO_DIAS_UTEIS);
}

/** Nº do dia útil corrente dentro do ciclo (1 a 22; fim de semana herda o anterior). */
export function diaUtilDoCiclo(hoje, inicio) {
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let conta = 0;
  while (d <= alvo) {
    if (ehDiaUtil(d)) conta += 1;
    d.setDate(d.getDate() + 1);
  }
  return Math.min(Math.max(conta, 1), CICLO_DIAS_UTEIS);
}

/** Cotação do dia: 1,00 no dia 1 caindo 0,01/dia útil até 0,80 no dia 22+. */
export function cotacaoDoDia(diaUtil) {
  const c = 1 - 0.01 * (Math.max(1, diaUtil) - 1);
  return Math.max(0.8, Math.round(c * 100) / 100);
}

// ── Estado das tarefas em tempo real ────────────────────────────────

const minutos = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const ESTADOS = {
  FEITO: { id: 'FEITO', label: 'FEITO', cor: 'text-emerald-400' },
  AGORA: { id: 'AGORA', label: 'AGORA', cor: 'text-yellow-300' },
  ATRASADO: { id: 'ATRASADO', label: 'ATRASADO', cor: 'text-orange-400' },
  PERDIDO: { id: 'PERDIDO', label: 'PERDIDO', cor: 'text-red-400' },
  FUTURO: { id: 'FUTURO', label: '', cor: 'text-slate-500' },
};

/**
 * Estado de cada tarefa AGORA, igual à coluna H da planilha:
 * a janela de uma tarefa vai da hora dela até a hora da PRÓXIMA tarefa.
 * FEITO > AGORA (na janela) > ATRASADO (passou 1 janela) > PERDIDO (2+).
 * @param tarefas linhas de metodo_tarefas do dia, em ordem
 * @param agoraMin minutos desde 00:00 (hora local do jogador)
 */
export function estadoDasTarefas(tarefas = [], agoraMin) {
  const lista = [...tarefas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return lista.map((t, i) => {
    if (t.feito) return { ...t, estado: ESTADOS.FEITO };
    const ini = minutos(t.hora);
    if (ini === null) return { ...t, estado: ESTADOS.FUTURO };
    const proxima = lista.slice(i + 1).map((p) => minutos(p.hora)).find((v) => v !== null);
    const fim = proxima ?? ini + 90;
    if (agoraMin < ini) return { ...t, estado: ESTADOS.FUTURO };
    if (agoraMin < fim) return { ...t, estado: ESTADOS.AGORA };
    if (agoraMin < fim + 90) return { ...t, estado: ESTADOS.ATRASADO };
    return { ...t, estado: ESTADOS.PERDIDO };
  });
}

// ── MvM do Dia (fórmula da X-Estrelinha) ────────────────────────────

/**
 * Começa em 10 e desconta 10/n por tarefa cuja janela já passou sem marcar.
 * Dia encerrado (agoraMin = null/24h+) = só conta o que foi feito.
 */
export function mvmDoDia(tarefas = [], agoraMin = 24 * 60) {
  const n = tarefas.length;
  if (!n) return 0;
  const passadasNaoFeitas = tarefas.filter((t) => {
    if (t.feito) return false;
    const ini = minutos(t.hora);
    return ini !== null && agoraMin >= ini;
  }).length;
  const nota = MVM_MAX - (MVM_MAX / n) * passadasNaoFeitas;
  return Math.max(0, Math.round(nota * 100) / 100);
}

/** A frase da X-Estrelinha pra nota do dia. */
export function fraseDoMvm(nota) {
  if (nota >= 10) return 'BRILHANTE! PARABÉNS!';
  if (nota >= 7) return 'CONTINUE ASSIM';
  if (nota >= 4) return 'PODE MELHORAR';
  return 'VAI DESISTIR?';
}

// ── Aplicabilidade e Human Token ────────────────────────────────────

/**
 * Aplicabilidade do ciclo: média do % de conclusão dos dias já jogados
 * (snapshots) incluindo hoje, escalada pra 12,22.
 * @param diasCiclo linhas de xgame_diario do ciclo (sem o dia de hoje)
 * @param hojePct % de conclusão de hoje (0 a 1)
 */
export function aplicabilidadeCiclo(diasCiclo = [], hojePct = 0) {
  const pcts = diasCiclo
    .filter((d) => Number(d.tarefas_total) > 0)
    .map((d) => Number(d.tarefas_feitas) / Number(d.tarefas_total));
  pcts.push(Math.max(0, Math.min(1, hojePct)));
  const media = pcts.reduce((s, p) => s + p, 0) / pcts.length;
  return Math.round(APLICABILIDADE_MAX * media * 100) / 100;
}

/**
 * Human Token do dia = MvM + Aplicabilidade (teto 22,22).
 * `estudoEmDia=false` aplica a trava da planilha: máximo 17,77 (sem ouro).
 */
export function humanToken(mvm, aplicabilidade, estudoEmDia = true) {
  let t = Math.min(TOKEN_MAX, (Number(mvm) || 0) + (Number(aplicabilidade) || 0));
  if (!estudoEmDia) t = Math.min(t, TRAVA_SEM_ESTUDO);
  return Math.round(t * 100) / 100;
}

export function faixaToken(token) {
  return FAIXAS_TOKEN.find((f) => token >= f.min) || FAIXAS_TOKEN.at(-1);
}

/**
 * A trava de estudo: a tarefa de leitura ("Leitura do dia", "Estudo…")
 * precisa de pelo menos 60% de constância no ciclo (a regra "Boa/Mediana").
 * @param diasCiclo snapshots do ciclo com detalhes.leitura_feita (bool)
 * @param leituraHoje a leitura de hoje foi feita?
 */
export function estudoEmDia(diasCiclo = [], leituraHoje = false) {
  const registros = diasCiclo
    .map((d) => d?.detalhes?.leitura_feita)
    .filter((v) => typeof v === 'boolean');
  registros.push(!!leituraHoje);
  const feitos = registros.filter(Boolean).length;
  return feitos / registros.length >= 0.6;
}

export const ehTarefaDeEstudo = (titulo) =>
  /leitura|estudo/i.test(String(titulo || ''));

// ── 💰 X-PAY (a remuneração da planilha) ────────────────────────────
// Verba fixa ÷ 22 dias ÷ nº de tarefas da categoria × peso ÷ 3 — exatamente
// a fórmula F33 da planilha. Venda vale o valor cheio por unidade.

/** Verbas padrão (planilha: H7 produção R$1.300 · H8 bônus R$200 · H9 venda R$50). */
export const PARTICIPANTE_PADRAO = {
  cargo: 'executivo', perfil: 'estrategico',
  verba_producao: 1300, verba_bonus: 200, valor_venda: 50, multa_atraso: 200,
};

/** Categoria efetiva: a gravada, ou deduzida do título (leitura/estudo = bônus). */
export function categoriaDaTarefa(t) {
  const c = String(t?.categoria || '').toLowerCase();
  if (['producao', 'bonus', 'venda', 'mentoria', 'visao'].includes(c)) return c;
  return ehTarefaDeEstudo(t?.titulo) ? 'bonus' : 'producao';
}
const pesoDaTarefa = (t) => Math.min(6, Math.max(1, Number(t?.peso) || 3));

/**
 * Valor em R$ de cada tarefa do dia (mapa id → valor). Mentoria e Visão
 * Estratégica pagam pela verba de produção (na planilha só [BÔNUS] e [VENDA]
 * saem do bolo de produção).
 */
export function valoresDasTarefas(tarefas = [], participante = PARTICIPANTE_PADRAO) {
  const p = { ...PARTICIPANTE_PADRAO, ...(participante || {}) };
  const cats = tarefas.map((t) => categoriaDaTarefa(t));
  const nProd = cats.filter((c) => c !== 'bonus' && c !== 'venda').length;
  const nBonus = cats.filter((c) => c === 'bonus').length;
  const valores = {};
  tarefas.forEach((t, i) => {
    const cat = cats[i];
    if (cat === 'venda') valores[t.id] = Number(p.valor_venda) || 0;
    else if (cat === 'bonus') valores[t.id] = nBonus ? ((Number(p.verba_bonus) / 22) / nBonus) * (pesoDaTarefa(t) / 3) : 0;
    else valores[t.id] = nProd ? ((Number(p.verba_producao) / 22) / nProd) * (pesoDaTarefa(t) / 3) : 0;
  });
  return valores;
}

/** X-Pay do dia: ganho (feitas), em jogo (ainda dá tempo) e perdido (janela passou). */
export function xpayDoDia(tarefasComEstado = [], valores = {}) {
  let ganho = 0; let perdido = 0; let emJogo = 0;
  for (const t of tarefasComEstado) {
    const v = Number(valores[t.id]) || 0;
    if (t.feito) ganho += v;
    else if (t.estado?.id === 'PERDIDO') perdido += v;
    else emJogo += v;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  return { ganho: r2(ganho), perdido: r2(perdido), emJogo: r2(emJogo) };
}

/** Formata R$ no padrão do app. */
export const fmtReais = (n) => `R$ ${Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── 🗳️ MvM MANUAL — a votação dos pares nas 10 Virtudes ─────────────
// Planilha: cada pessoa vota 1-10 em cada colega, todo dia, das 20h às 22h,
// de casa. A média das virtudes recebidas é o "RANKING DAS VIRTUDES" e o
// componente MvM oficial do Human Token (0-10).

export const VIRTUDES = [
  'GRATIDÃO', 'RELACIONAMENTO', 'ORGANIZAÇÃO', 'PONTUALIDADE', 'PROATIVIDADE',
  'COMPROMISSO', 'AUTORRESPONSABILIDADE', 'ORATÓRIA', 'LIDERANÇA', 'ESPÍRITO DE EQUIPE',
];

export const VOTACAO_INICIO_MIN = 20 * 60; // 20:00
export const VOTACAO_FIM_MIN = 22 * 60;    // 22:00

/** A janela de votação está aberta agora? (20h–22h, regra da planilha) */
export const janelaVotacaoAberta = (agoraMin) =>
  agoraMin >= VOTACAO_INICIO_MIN && agoraMin < VOTACAO_FIM_MIN;

/**
 * Consolida os votos RECEBIDOS por uma pessoa no ciclo:
 * média geral (o MvM manual, 0-10) e o Ranking das Virtudes (média por
 * virtude, da mais forte pra mais fraca).
 * @param votos linhas de xgame_votos_mvm com {virtude, nota}
 */
export function mvmManual(votos = []) {
  const porVirtude = {};
  for (const v of votos) {
    const nome = String(v.virtude || '').toUpperCase();
    if (!porVirtude[nome]) porVirtude[nome] = { soma: 0, n: 0 };
    porVirtude[nome].soma += Number(v.nota) || 0;
    porVirtude[nome].n += 1;
  }
  const ranking = Object.entries(porVirtude)
    .map(([virtude, { soma, n }]) => ({ virtude, media: Math.round((soma / n) * 100) / 100, votos: n }))
    .sort((a, b) => b.media - a.media);
  const media = ranking.length
    ? Math.round((ranking.reduce((s, r) => s + r.media, 0) / ranking.length) * 100) / 100
    : null;
  return { media, ranking, totalVotos: votos.length };
}

// ── 🏆 HUMAN TOKEN COMPLETO — os 5 componentes da planilha ──────────
// F2 = MvM (peso 10) + Produção + Real Time + Bônus + Vendas, teto 22,22.
// Pesos por perfil (planilha A19:A21): base 12,22 (estratégico/operacional)
// ou 2,22 (comercial) repartida em 50% produção · 30% real time · 20% bônus.
// Vendas: meta 4/mês; perfil comercial multiplica por PT VENDA 2,5.

export const META_VENDAS_CICLO = 4;

export function pesosDoPerfil(perfil) {
  const base = String(perfil || '').toLowerCase() === 'comercial' ? 2.22 : 12.22;
  return {
    mvm: MVM_MAX,
    producao: base * 0.5,
    realtime: base * 0.3,
    bonus: base * 0.2,
    ptVenda: String(perfil || '').toLowerCase() === 'comercial' ? 2.5 : 1,
  };
}

/** Alvos do EXECUTIVO IDEAL (planilha F18:F21 + vendas 100%). */
export const EXECUTIVO_IDEAL = { mvm: 0.8, producao: 0.9, realtime: 0.9, bonus: 0.8, vendas: 1 };

/**
 * Consolida o ciclo (snapshots + hoje) e monta o Human Token oficial com os
 * 5 componentes. As taxas vêm das contagens por categoria gravadas nos
 * detalhes de cada dia (prod/bonus/vendas + X-Pay ganho × possível).
 */
export function tokenDoCiclo({ diasCiclo = [], hojeResumo = null, mvmVotacao = null, perfil = 'estrategico', vendasReais = null }) {
  const pesos = pesosDoPerfil(perfil);
  const dias = [...diasCiclo.map((d) => d?.detalhes || {}), ...(hojeResumo ? [hojeResumo] : [])];
  const soma = (k) => dias.reduce((s, d) => s + (Number(d?.[k]) || 0), 0);
  const prodTotal = soma('prod_total'); const prodFeitas = soma('prod_feitas');
  const bonusTotal = soma('bonus_total'); const bonusFeitas = soma('bonus_feitas');
  // Vendas AUTOMÁTICAS: quando a tela informa as vendas reais da loja da
  // pessoa no ciclo (vendasReais), são elas que pontuam — antes era manual
  // na planilha, via tarefa [VENDA]. Sem o dado, cai nas tarefas gravadas.
  const vendasFeitas = vendasReais !== null && vendasReais !== undefined
    ? Number(vendasReais) || 0
    : soma('vendas_feitas');
  const xpayGanho = soma('xpay_ganho'); const xpayPossivel = soma('xpay_possivel');
  const taxa = (a, b) => (b > 0 ? Math.min(1, a / b) : 0);
  const taxas = {
    mvm: (mvmVotacao !== null && mvmVotacao !== undefined ? mvmVotacao : (hojeResumo?.mvm_dia ?? 0)) / MVM_MAX,
    producao: taxa(prodFeitas, prodTotal),
    realtime: taxa(xpayGanho, xpayPossivel),
    bonus: taxa(bonusFeitas, bonusTotal),
    vendas: taxa(vendasFeitas, META_VENDAS_CICLO),
  };
  const comp = {
    mvm: pesos.mvm * taxas.mvm,
    producao: pesos.producao * taxas.producao,
    realtime: pesos.realtime * taxas.realtime,
    bonus: pesos.bonus * taxas.bonus,
    vendas: taxas.vendas * pesos.ptVenda,
  };
  const bruto = comp.mvm + comp.producao + comp.realtime + comp.bonus + comp.vendas;
  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    pesos,
    taxas,
    componentes: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, r2(v)])),
    total: r2(Math.min(TOKEN_MAX, bruto)),
    vendasFeitas,
  };
}

/**
 * A formação do EXECUTIVO IDEAL (90 dias): o índice geral (média das taxas
 * contra os alvos) destrava a "votação extraordinária" — 33% = 2 meses,
 * 66% = 1 mês, 88% = em breve (planilha I14 nova geração).
 */
export function formacaoExecutivoIdeal(taxas = {}) {
  const eixos = Object.keys(EXECUTIVO_IDEAL);
  const indice = eixos.reduce((s, k) => s + Math.min(1, (taxas[k] || 0) / EXECUTIVO_IDEAL[k]), 0) / eixos.length;
  const pct = Math.round(indice * 100);
  let mensagem = null;
  if (pct >= 88) mensagem = 'Parabéns! Continue assim e EM BREVE você abrirá votação extraordinária.';
  else if (pct >= 66) mensagem = 'Parabéns! Continue assim e em 1 MÊS você abrirá votação extraordinária.';
  else if (pct >= 33) mensagem = 'Parabéns! Continue assim e em 2 MESES você abrirá votação extraordinária.';
  return { pct, mensagem };
}

/**
 * Início oficial do ciclo (xgame_config.ciclo_inicio), caindo pro 1º dia
 * útil do mês quando não há configuração vigente (ou o ciclo já acabou).
 */
export function inicioCicloOficial(configISO, hoje = new Date()) {
  if (configISO) {
    const ini = new Date(`${String(configISO).slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(ini.getTime()) && hoje >= ini && hoje <= fimCiclo(ini)) {
      return new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
    }
  }
  return inicioCiclo(hoje);
}

// ── Pontos do dia ───────────────────────────────────────────────────

const PONTOS_TAREFA = 10;
const BONUS_NO_HORARIO = 5;

/**
 * Pontos do dia: 10 por tarefa feita (+5 quando `feito_no_horario` — na v1,
 * feita enquanto o estado ainda era AGORA/futuro é aproximado por `feito`
 * antes do fim da janela; sem histórico de clique, tarefa feita conta o
 * bônus se o dia ainda não passou da janela dela). Multiplica pela cotação.
 */
export function pontosDoDia(tarefasComEstado = [], cotacao = 1) {
  let pts = 0;
  for (const t of tarefasComEstado) {
    if (!t.feito) continue;
    pts += PONTOS_TAREFA;
    if (t.estado?.id === 'FEITO' && t.no_horario !== false) pts += BONUS_NO_HORARIO;
  }
  return Math.round(pts * (Number(cotacao) || 1));
}

/** Resumo completo do dia — o que a tela grava em xgame_diario. */
export function resumoDoDia({ tarefas = [], agoraMin, diasCiclo = [], hoje = new Date(), participante = null, cicloConfigISO = null }) {
  const inicio = inicioCicloOficial(cicloConfigISO, hoje);
  const diaUtil = diaUtilDoCiclo(hoje, inicio);
  const cotacao = cotacaoDoDia(diaUtil);
  const comEstado = estadoDasTarefas(tarefas, agoraMin);
  const feitas = comEstado.filter((t) => t.feito).length;
  const total = comEstado.length;
  const mvm = mvmDoDia(tarefas, agoraMin);
  const leituraHoje = comEstado.some((t) => ehTarefaDeEstudo(t.titulo) && t.feito);
  const aplic = aplicabilidadeCiclo(diasCiclo, total ? feitas / total : 0);
  const estudoOk = estudoEmDia(diasCiclo, leituraHoje);
  const token = humanToken(mvm, aplic, estudoOk);
  const valores = valoresDasTarefas(tarefas, participante || PARTICIPANTE_PADRAO);
  const xpay = xpayDoDia(comEstado, valores);
  // Contagens por categoria do dia — é isso que o snapshot grava nos
  // `detalhes` pro tokenDoCiclo somar o ciclo inteiro (F4).
  const cats = comEstado.map((t) => categoriaDaTarefa(t));
  const ehProd = (c) => c !== 'bonus' && c !== 'venda';
  const contagens = {
    prod_total: cats.filter(ehProd).length,
    prod_feitas: comEstado.filter((t, i) => ehProd(cats[i]) && t.feito).length,
    bonus_total: cats.filter((c) => c === 'bonus').length,
    bonus_feitas: comEstado.filter((t, i) => cats[i] === 'bonus' && t.feito).length,
    vendas_feitas: comEstado.filter((t, i) => cats[i] === 'venda' && t.feito).length,
    xpay_ganho: xpay.ganho,
    xpay_possivel: Math.round((xpay.ganho + xpay.perdido + xpay.emJogo) * 100) / 100,
  };
  return {
    ciclo_inicio: inicio,
    dia_util: diaUtil,
    cotacao,
    tarefas: comEstado,
    tarefas_total: total,
    tarefas_feitas: feitas,
    mvm_dia: mvm,
    aplicabilidade: aplic,
    token_dia: token,
    faixa: faixaToken(token),
    estudo_em_dia: estudoOk,
    leitura_feita: leituraHoje,
    pontos: pontosDoDia(comEstado, cotacao),
    frase_mvm: fraseDoMvm(mvm),
    valores,
    xpay,
    contagens,
  };
}

/** Data em ISO local (YYYY-MM-DD), sem sofrer com fuso do toISOString. */
export function dataISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
