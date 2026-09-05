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
export function resumoDoDia({ tarefas = [], agoraMin, diasCiclo = [], hoje = new Date() }) {
  const inicio = inicioCiclo(hoje);
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
  };
}

/** Data em ISO local (YYYY-MM-DD), sem sofrer com fuso do toISOString. */
export function dataISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
