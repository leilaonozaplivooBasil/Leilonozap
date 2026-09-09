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

// 💰 06/09/2026 — a conta do fixo distribuído pelo peso (caminho relativo:
// este arquivo também roda na suíte do node, que não resolve o '@/').
import { distribuirDia, MINIMO_DIA_PADRAO } from './distribuicaoFixo.js';
import { ROTINA_PADRAO } from './metodo.js';

export const TOKEN_MAX = 22.22;
export const APLICABILIDADE_MAX = 12.22;
export const MVM_MAX = 10;
export const TRAVA_SEM_ESTUDO = 17.77; // "Mediana" na planilha: nunca chega ao ouro
// 🎓 09/09/2026 — dono: sem o estudo de fim de semana (resumo bem
// detalhado), a pessoa pode ser Ouro, mas não passa disso — igual à trava
// de estudo de semana, só que travando o Diamante (LIGAS, min 20) em vez
// do Ouro (FAIXAS_TOKEN, min 17,78).
export const TRAVA_SEM_DIAMANTE = 19.99;
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

/**
 * 🎓 09/09/2026 — dono: "um dia de final de semana com um estudo foda...
 * quero um resumo bem detalhado para gerar esse bônus, tanto diariamente
 * quanto fim de semana, para ser Diamante." A trava do Diamante: entre os
 * sábados/domingos já vividos no ciclo, pelo menos 60% precisam ter o
 * estudo de fim de semana feito (mesma régua da leitura de semana, só que
 * olhando só pros dias de fim de semana). Nenhum fim de semana ainda no
 * ciclo → não julga (`true`), não é justo travar antes de a régua valer.
 * @param diasCiclo snapshots do ciclo, cada um com {data, detalhes.estudo_fds_feito}
 * @param hoje {data, feito} de hoje, quando hoje ainda não está em diasCiclo
 */
export function estudoFdsEmDia(diasCiclo = [], hoje = null) {
  const dias = hoje?.data ? [...diasCiclo, { data: hoje.data, detalhes: { estudo_fds_feito: !!hoje.feito } }] : diasCiclo;
  const fimDeSemana = dias.filter((d) => {
    const dia = new Date(`${String(d?.data || '').slice(0, 10)}T12:00:00`).getDay();
    return dia === 0 || dia === 6;
  });
  if (!fimDeSemana.length) return true;
  const feitos = fimDeSemana.filter((d) => d?.detalhes?.estudo_fds_feito).length;
  return feitos / fimDeSemana.length >= 0.6;
}

// 📊 08/09/2026 — dono: "quero o percentual de reunião do time" no painel
// vivo. Mesma régua que já classifica ícone/peso pelo título em outros
// lugares do app (XGameJornada, REGRAS_PESO) — reunião/apresentação/
// encontro é ação de negócio; aqui só nomeia pra virar métrica de equipe.
export const ehTarefaDeReuniao = (titulo) =>
  /reuni[aã]o|apresenta[cç][aã]o|encontro com|call com/i.test(String(titulo || ''));

// ── 💰 X-PAY (a remuneração) ─────────────────────────────────────────
// 06/09/2026 — A FÓRMULA MUDOU, por ordem do dono (X-Performance): o fixo do
// mês ÷ 24 dias de operação vira o valor do dia, e dentro do dia o PESO reparte o
// valor — a soma das tarefas É o valor do dia, sempre; tarefa nova tira das
// outras automaticamente; dia com menos tarefas que o mínimo paga
// proporcional. A conta mora em src/lib/distribuicaoFixo.js.
// (A F33 da planilha — verba ÷ 22 ÷ nº de tarefas × peso ÷ 3 — não somava o
// fixo: três tarefas de peso 5 pagavam 5/3 do dia. Saiu.)
// Venda continua valendo o valor cheio por unidade; bônus reparte a verba de
// bônus pela mesma régua.

/** Verbas padrão (planilha: H7 produção R$1.300 · H8 bônus R$200 · H9 venda R$50). */
export const PARTICIPANTE_PADRAO = {
  cargo: 'executivo', perfil: 'estrategico',
  verba_producao: 1300, verba_bonus: 200, valor_venda: 50, multa_atraso: 200,
  fixo_mes: null, minimo_dia: MINIMO_DIA_PADRAO, peso_referencia: null,
};


/** O fixo que a conta usa: fixo_mes quando o admin definiu; senão a verba de produção de sempre. */
export const fixoDoParticipante = (p) => {
  const fixo = Number(p?.fixo_mes);
  return Number.isFinite(fixo) && p?.fixo_mes !== null && p?.fixo_mes !== undefined && p?.fixo_mes !== '' ? fixo : (Number(p?.verba_producao) || 0);
};

/** Categoria efetiva: a gravada, ou deduzida do título (leitura/estudo = bônus). */
export function categoriaDaTarefa(t) {
  const c = String(t?.categoria || '').toLowerCase();
  if (['producao', 'bonus', 'venda', 'mentoria', 'visao'].includes(c)) return c;
  return ehTarefaDeEstudo(t?.titulo) ? 'bonus' : 'producao';
}
const pesoDaTarefa = (t) => Math.min(6, Math.max(1, Number(t?.peso) || 3));

// ── 🪄 GERADOR DE PESO AUTOMÁTICO (F6) ──────────────────────────────
// Regra do dono: GRATIDÃO muito importante (5), VENDA/negócio é o peso
// principal (6), e o compromisso com o dia inteiro é premiado pela ofensiva
// (não por uma tarefa só). A ordem das regras importa — a primeira que
// bater no título vence (ex.: "Leitura leve + descanso" é leitura, peso 4).
const _semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const REGRAS_PESO = [
  { re: /gratidao|foco no sonho/, peso: 5, porque: 'gratidão abre o dia e a mente' },
  { re: /treinament|treinar|mentoria|mentor|sala de treinament/, peso: 5, porque: 'treinamento constrói o time' },
  { re: /loja|venda|cliente|reuni|apresenta|contrato|follow|prospec/, peso: 6, porque: 'ação de negócio — o peso principal' },
  { re: /leitura|estudo|curso|licao|aula/, peso: 4, porque: 'mentalidade: estudo em dia' },
  { re: /story|post|instagram|conteudo|gravar/, peso: 4, porque: 'marketing pessoal' },
  { re: /corrida|treino|atividade fisica|academia|exercicio|caminhada/, peso: 3, porque: 'disciplina de base' },
  { re: /organizacao do negocio|planejament|fechamento do dia/, peso: 3, porque: 'gestão do próprio negócio' },
  { re: /organizacao|ambiente|caminho|chegar|deslocament/, peso: 2, porque: 'suporte da rotina' },
  { re: /almoco|descanso|pausa|cafe/, peso: 1, porque: 'necessário, mas não pontua alto' },
];

/** Peso 1-6 sugerido pelo título (regra do dono). Sem regra batendo = 3. */
export function pesoAutomatico(titulo) {
  const t = _semAcento(titulo);
  for (const r of REGRAS_PESO) if (r.re.test(t)) return r.peso;
  return 3;
}

/** Explica por que o peso automático deu o que deu (pro tooltip do admin). */
export function porqueDoPeso(titulo) {
  const t = _semAcento(titulo);
  for (const r of REGRAS_PESO) if (r.re.test(t)) return `peso ${r.peso} — ${r.porque}`;
  return 'peso 3 — padrão da planilha';
}

// 📏 O DIA COMPLETO É A ROTINA PERFEITA (correção do dono, 06/09/2026): o
// peso somado das tarefas de PRODUÇÃO da Rotina do Método (hoje 18 tarefas,
// peso 75). É a régua que o fixo do dia paga inteiro; uma tarefa avulsa num
// dia vazio vale a fatia dela nesse total, nunca um terço do dia.
export function pesoDaRotina(rotina = ROTINA_PADRAO) {
  return (Array.isArray(rotina) ? rotina : [])
    .filter((r) => r?.titulo && categoriaDaTarefa({ titulo: r.titulo }) !== 'bonus')
    .reduce((s, r) => s + pesoAutomatico(r.titulo), 0);
}
export const PESO_DIA_COMPLETO = pesoDaRotina(ROTINA_PADRAO);
/** A referência de peso da pessoa: a dela, se o admin definiu; senão a Rotina do Método. */
export const pesoReferenciaDe = (p) => (Number(p?.peso_referencia) > 0 ? Number(p.peso_referencia) : PESO_DIA_COMPLETO);

/**
 * Valor em R$ de cada tarefa do dia (mapa id → valor). Produção, Mentoria e
 * Visão Estratégica repartem o FIXO do dia pelo peso (com o mínimo diário);
 * Bônus reparte a verba de bônus do dia pelo peso; Venda vale o valor cheio.
 */
export function valoresDasTarefas(tarefas = [], participante = PARTICIPANTE_PADRAO) {
  const p = { ...PARTICIPANTE_PADRAO, ...(participante || {}) };
  const cats = tarefas.map((t) => categoriaDaTarefa(t));
  const producao = tarefas.filter((t, i) => cats[i] !== 'bonus' && cats[i] !== 'venda');
  const bonus = tarefas.filter((t, i) => cats[i] === 'bonus');
  const fixo = distribuirDia({ fixoMes: fixoDoParticipante(p), pesoReferencia: pesoReferenciaDe(p), tarefas: producao });
  const extra = distribuirDia({ fixoMes: Number(p.verba_bonus) || 0, minimoDia: 1, tarefas: bonus });
  const valores = {};
  tarefas.forEach((t, i) => {
    if (cats[i] === 'venda') valores[t.id] = Number(p.valor_venda) || 0;
    else if (cats[i] === 'bonus') valores[t.id] = extra.valores[t.id] || 0;
    else valores[t.id] = fixo.valores[t.id] || 0;
  });
  return valores;
}

/** A régua do dia inteiro (valor do dia, quantas tarefas faltam pro mínimo, o que ficou em aberto). */
export function reguaDoDia(tarefas = [], participante = PARTICIPANTE_PADRAO) {
  const p = { ...PARTICIPANTE_PADRAO, ...(participante || {}) };
  const producao = tarefas.filter((t) => { const c = categoriaDaTarefa(t); return c !== 'bonus' && c !== 'venda'; });
  const d = distribuirDia({ fixoMes: fixoDoParticipante(p), pesoReferencia: pesoReferenciaDe(p), tarefas: producao });
  return { valorDia: d.valorDia, faltam: d.faltam, pesoFalta: d.pesoFalta, pesoReferencia: d.pesoReferencia, somaPesos: d.somaPesos, emAberto: d.emAberto, minimoDia: d.minimoDia, fixo: fixoDoParticipante(p) };
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
// Planilha original: 20h às 22h. Revisado pelo dono em 08/09/2026: "a
// votação tem que ser de 17h às 20h, é a ação mais importante do dia, junto
// com as vendas" — e das 20h até 21h30 é a ÚLTIMA CHANCE, sem desconto
// nenhum (protege quem está numa reunião ou atrasou de verdade). Depois de
// 21h30 sem fechar o voto em TODOS os colegas, é radical — ver
// `resumoDoDia`. O horário final não é 23h59: "ninguém acorda tarde aqui,
// todo mundo tem que estar dormindo antes das dez, todo mundo acorda às
// cinco da manhã" — por isso 21h30, não meia-noite.

export const VIRTUDES = [
  'GRATIDÃO', 'RELACIONAMENTO', 'ORGANIZAÇÃO', 'PONTUALIDADE', 'PROATIVIDADE',
  'COMPROMISSO', 'AUTORRESPONSABILIDADE', 'ORATÓRIA', 'LIDERANÇA', 'ESPÍRITO DE EQUIPE',
];

export const VOTACAO_INICIO_MIN = 17 * 60;      // 17:00 — janela ideal começa
export const VOTACAO_IDEAL_FIM_MIN = 20 * 60;   // 20:00 — janela ideal termina, começa a última chance
export const VOTACAO_FIM_MIN = 21 * 60 + 30;    // 21:30 — última chance fecha, e é quando o radical entra

/** A janela de votação (ideal + última chance) está aberta agora? (17h–21h30). */
export const janelaVotacaoAberta = (agoraMin) =>
  agoraMin >= VOTACAO_INICIO_MIN && agoraMin < VOTACAO_FIM_MIN;

/** Ainda está na janela IDEAL (17h–20h), antes de virar "última chance"? */
export const naJanelaIdeal = (agoraMin) =>
  agoraMin >= VOTACAO_INICIO_MIN && agoraMin < VOTACAO_IDEAL_FIM_MIN;

/** Minutos desde 00:00 → "17h" ou "21h30" (sem zero à esquerda, estilo do app). */
export function horaDeMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

// 🎓 08/09/2026 — dono: "Super Admin não pode ser votado a não ser que ele
// esteja participando por dentro de uma mentoria — não é viável nem
// saudável pro negócio se expor tanto o principal, ainda mais quando as
// pessoas às vezes não têm capacidade de votar num mentor — salvo se ele
// mesmo permitir ser votado na MvM." Só o cargo super_admin é afetado; todo
// outro participante ativo continua votável exatamente como sempre foi.
/** Esta pessoa pode aparecer na lista de colegas votáveis da MvM Manual? */
export function podeSerVotado({ role, aceita_ser_votado } = {}) {
  return role !== 'super_admin' || aceita_ser_votado === true;
}

// 🧯 08/09/2026 — dono: "a falta de voto dos integrantes uns nos outros zera
// o dia — isso precisa ser explícito, é uma das coisas principais da
// gamificação." Votar em ALGUÉM não é o suficiente: precisa fechar os 10
// votos (as 10 virtudes) em CADA colega votável do dia — voto parcial não
// conta como cumprido, do mesmo jeito que `jaVoteiEm` já exige na tela.
/**
 * Vazio (ninguém pra votar) não é falta — é não ter nem como votar.
 * @param colegasIds ids de todos os colegas votáveis hoje (já sem o super_admin
 *   que não se abriu, e sem a própria pessoa)
 * @param votadosCompletosIds ids dos colegas em quem a pessoa JÁ fechou os 10 votos hoje
 */
export function votouEmTodosOsColegas(colegasIds = [], votadosCompletosIds = []) {
  if (!colegasIds.length) return true;
  const feitos = new Set(votadosCompletosIds);
  return colegasIds.every((id) => feitos.has(id));
}

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

// ── 🏆 HUMAN TOKEN COMPLETO — os 5 componentes ──────────────────────
// F2 = MvM + Produção (real time) + Desempenho + Bônus (estudo) + Vendas,
// teto 22,22.
//
// 🔀 09/09/2026 — REPESAGEM, ordem do dono: "o real time não pode pesar
// tanto... quero aumentar o peso de quem vende e quem estuda." A "Produção"
// aqui é o que a planilha chama de "REAL TIME" (tarefa comprovada na hora)
// — era 50% da base (6,11 pontos), virou peso fixo pequeno (1,5). O que
// sobrou foi quase todo pro Bônus/Estudo (a leitura/estudo já cai em
// categoria 'bonus' — ver categoriaDaTarefa) e um pouco pra Vendas.
// "Desempenho" (nome interno: realtime — eficiência do X-Pay ganho/possível)
// não mudou. Perfil comercial já é dominado pelo PT VENDA (2,5×) — a
// trava de venda pra prata/ouro fica só pra quem já tem meta de venda,
// por pedido do dono ("só pra quem já vende").
export const META_VENDAS_CICLO = 4;

export function pesosDoPerfil(perfil) {
  const comercial = String(perfil || '').toLowerCase() === 'comercial';
  return {
    mvm: MVM_MAX,
    producao: comercial ? 0.3 : 1.5,   // "real time" — não pode mais pesar 50%
    realtime: comercial ? 0.666 : 3.67, // desempenho (X-Pay ganho/possível) — intocado
    bonus: comercial ? 1.25 : 5.55,     // estudo/leitura mora aqui — o grande ganhador
    ptVenda: comercial ? 2.5 : 1.5,     // sobe um pouco pra quem não é comercial também
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
  // 🗳️ 08/09/2026 — dono: "o real time não pode contar dentro do MVM... o
  // MVM é só votação, de um a dez." Antes, sem voto nenhum recebido no
  // ciclo, caía pro mvm_dia AUTOMÁTICO (10 menos desconto por tarefa
  // atrasada — real time disfarçado de MVM), inflando gente que ninguém
  // votou. Sem voto = sem MVM (0), ponto — exatamente como o tooltip da
  // tela já dizia hoje: só a votação manual entra no Human Token oficial.
  const taxas = {
    mvm: (mvmVotacao !== null && mvmVotacao !== undefined ? mvmVotacao : 0) / MVM_MAX,
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

// 🟡 09/09/2026 — DIR-105: quantos avisos de atraso na Fila do Pronto a
// pessoa já tem antes da régua radical (zerar o dia) entrar. Do 1º ao 3º
// aviso ela só perde pontos (treino); do 4º em diante zera tudo.
export const AVISOS_ANTES_DE_ZERAR = 3;
export const PENALIDADE_AVISO_PRONTO = 3;

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
// 🔥 08/09/2026 — dono, sem meio-termo: "não vou, perde o dinheiro, perde a
// MvM, perde tudo do dia... precisa ser radical." Não fechar o voto em TODOS
// os colegas até o fim da janela (17h–21h30) não pune só a MvM — o DIA
// INTEIRO zera: MvM, Human Token, pontos, e o dinheiro (X-Pay) que seria
// ganho vira PERDIDO de verdade, não some. `votouEmTodos` é null enquanto
// não dá pra julgar (janela ainda não fechou, ou a tela que chamou não
// carregou colegas/votos ainda) — só depois das 21h30, com
// `votouEmTodos === false`, a régua radical entra. `votouEmTodos` continua
// opcional (default null) — quem chama sem saber de votação (histórico,
// testes antigos) se comporta exatamente como antes desta mudança.
export function resumoDoDia({ tarefas = [], agoraMin, diasCiclo = [], hoje = new Date(), participante = null, cicloConfigISO = null, votouEmTodos = null, perdoado = false }) {
  const inicio = inicioCicloOficial(cicloConfigISO, hoje);
  const diaUtil = diaUtilDoCiclo(hoje, inicio);
  const cotacao = cotacaoDoDia(diaUtil);
  const comEstado = estadoDasTarefas(tarefas, agoraMin);
  const feitas = comEstado.filter((t) => t.feito).length;
  const total = comEstado.length;
  const votacaoFechada = Number(agoraMin) >= VOTACAO_FIM_MIN;
  const perdeuPorNaoVotar = votacaoFechada && votouEmTodos === false;
  // 📉 08/09/2026 — dono: "se o cara se atrasou [na Fila do Pronto], além de
  // ele perder o dinheiro, isso tem que tirar pontos dele." Só conta tarefa
  // de GESTÃO (origem 'xperf', com prazo_em) que passou do prazo sem o
  // pronto; a Master Task da rotina não tem prazo_em. E só julga em tempo
  // real (`votouEmTodos !== null` é a MESMA régua que o não-votar já usa
  // pra saber se está olhando hoje ou um dia passado) — um dia histórico já
  // fechou nos próprios registros, não se recalcula.
  //
  // 🟡 09/09/2026 — DIR-105, dono amoleceu a régua: "ela pode perder até
  // três pontos [nos primeiros três atrasos], pra treinar ela. A partir do
  // quarto ponto que ela não entregar, ela vai zerar a pontuação." Os 3
  // primeiros avisos (contador `avisos_pronto`, dado manualmente pelo botão
  // "avisar" do ADM na Fila do Pronto) só descontam PENALIDADE_AVISO_PRONTO
  // pontos — MvM, Human Token e X-Pay ficam intactos. Só a partir do 4º
  // aviso a régua radical do DIR-102 volta a valer (zera o dia inteiro).
  const tarefaAtrasadaPronto = votouEmTodos !== null
    && tarefas.some((t) => t?.origem === 'xperf' && t?.prazo_em && !t?.feito && new Date(t.prazo_em) < hoje);
  const avisosPronto = Number(participante?.avisos_pronto) || 0;
  const perdeuPorAtrasoPronto = tarefaAtrasadaPronto && avisosPronto >= AVISOS_ANTES_DE_ZERAR;
  const emAvisoPronto = tarefaAtrasadaPronto && !perdeuPorAtrasoPronto;
  // 🕊️ 09/09/2026 — dono, ao vivo: "não zera ninguém hoje, a partir de
  // amanhã a regra é séria." `perdoado` é ligado por fora (xgame_config.
  // perdao_zeragem_ate) pra um dia excepcional inteiro — a régua radical
  // (incluindo a graduada dos avisos do pronto, acima) continua de pé pros
  // próximos dias, só este aqui não pune ninguém, não importa o motivo
  // (bug, lista de votação mudou no meio do dia...).
  const diaZerado = !perdoado && (perdeuPorNaoVotar || perdeuPorAtrasoPronto);
  const mvm = diaZerado ? 0 : mvmDoDia(tarefas, agoraMin);
  const leituraHoje = comEstado.some((t) => ehTarefaDeEstudo(t.titulo) && t.feito);
  // 🎓 09/09/2026 — o estudo de FIM DE SEMANA é uma tarefa à parte (tipo
  // 'aprendizado_fds', resumo bem maior) — trava o Diamante, não o Ouro.
  const estudoFdsHoje = comEstado.some((t) => tipoDeValidacao(t) === 'aprendizado_fds' && t.feito);
  const aplic = aplicabilidadeCiclo(diasCiclo, total ? feitas / total : 0);
  const estudoOk = estudoEmDia(diasCiclo, leituraHoje);
  const token = diaZerado ? 0 : humanToken(mvm, aplic, estudoOk);
  const valores = valoresDasTarefas(tarefas, participante || PARTICIPANTE_PADRAO);
  const xpay = { ...xpayDoDia(comEstado, valores), ...reguaDoDia(tarefas, participante || PARTICIPANTE_PADRAO) };
  if (diaZerado) {
    // o que seria ganho vira perdido — o dinheiro não some em silêncio,
    // fica registrado como o que a falta de voto (ou o atraso) custou de verdade.
    xpay.perdido = Math.round((xpay.ganho + xpay.perdido) * 100) / 100;
    xpay.ganho = 0;
    xpay.emJogo = 0;
  }
  const pontosBase = diaZerado ? 0 : pontosDoDia(comEstado, cotacao);
  const pontos = (!perdoado && emAvisoPronto) ? Math.max(0, pontosBase - PENALIDADE_AVISO_PRONTO) : pontosBase;
  // Contagens por categoria do dia — é isso que o snapshot grava nos
  // `detalhes` pro tokenDoCiclo somar o ciclo inteiro (F4).
  const cats = comEstado.map((t) => categoriaDaTarefa(t));
  const ehProd = (c) => c !== 'bonus' && c !== 'venda';
  // 📊 09/09/2026 — dono: "eu quero esse alcance" (o % de reunião também na
  // Verificação do Progresso). `contagens` já é gravado inteiro dentro de
  // `xgame_diario.detalhes` (CrmMetodo.jsx e XGame.jsx fazem `...contagens`
  // no upsert) — somar aqui é o único lugar que precisa mudar; a tela da
  // equipe só lê o que já está salvo, sem query nova nem coluna nova.
  const reunioesHoje = comEstado.filter((t) => ehTarefaDeReuniao(t.titulo));
  const contagens = {
    prod_total: cats.filter(ehProd).length,
    prod_feitas: comEstado.filter((t, i) => ehProd(cats[i]) && t.feito).length,
    bonus_total: cats.filter((c) => c === 'bonus').length,
    bonus_feitas: comEstado.filter((t, i) => cats[i] === 'bonus' && t.feito).length,
    vendas_feitas: comEstado.filter((t, i) => cats[i] === 'venda' && t.feito).length,
    reunioes_total: reunioesHoje.length,
    reunioes_feitas: reunioesHoje.filter((t) => t.feito).length,
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
    estudo_fds_feito: estudoFdsHoje,
    pontos,
    frase_mvm: diaZerado
      ? (perdeuPorNaoVotar ? 'ZEROU O DIA POR NÃO VOTAR' : 'ZEROU O DIA POR ATRASO NA TAREFA DA GESTÃO')
      : fraseDoMvm(mvm),
    perdeu_por_nao_votar: !perdoado && perdeuPorNaoVotar,
    perdeu_por_atraso_pronto: !perdoado && perdeuPorAtrasoPronto,
    em_aviso_pronto: !perdoado && emAvisoPronto,
    avisos_pronto: avisosPronto,
    valores,
    xpay,
    contagens,
  };
}

/** Data em ISO local (YYYY-MM-DD), sem sofrer com fuso do toISOString. */
export function dataISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Recuperação no fim de semana (dono, 08/09/2026) ─────────────────
// "Se ele perder as tarefas do dia, ele pode recompensar no fim de semana,
// comprovando que fez, pra manter o fixo — sem lesar, sem se ferrar." Livre,
// sem teto de quantidade, mas só dentro do fim de semana DO MESMO CICLO em
// que a tarefa foi perdida. O dinheiro (X-Pay) volta — a nota do dia em si
// (Real Time) continua honesta, marcando que foi tarde: "ANTECIPAÇÃO É PODER."
export function ehFimDeSemana(d = new Date()) {
  return d.getDay() === 0 || d.getDay() === 6;
}

/** A tarefa PERDIDA de `dataTarefaISO` pode ser recuperada HOJE? */
export function podeRecuperarNoFds({ estadoId, dataTarefaISO, cicloInicioISO, hoje = new Date() }) {
  if (estadoId !== 'PERDIDO' || !ehFimDeSemana(hoje) || !dataTarefaISO || !cicloInicioISO) return false;
  const inicio = new Date(`${String(cicloInicioISO).slice(0, 10)}T12:00:00`);
  const fim = fimCiclo(inicio);
  const alvo = new Date(`${String(dataTarefaISO).slice(0, 10)}T12:00:00`);
  return alvo >= inicio && alvo <= fim;
}

// ── 🔥 OFENSIVA (F7 — o streak do Duolingo) ─────────────────────────
// Dias seguidos FECHANDO o dia (≥80% do Master Task). Fim de semana sem
// registro não quebra; dia útil perdido quebra — com direito a 1 CONGELADOR
// automático por ofensiva (a falha é perdoada uma vez, sem zerar o fogo).

export const OFENSIVA_META = 0.8; // fechou o dia = fez 80%+

/**
 * @param historico linhas de xgame_diario até ONTEM (qualquer ciclo), com
 *                  {data, tarefas_total, tarefas_feitas}
 * @param hoje      Date de hoje
 * @param hojeFechou true quando o dia de hoje já bateu os 80%
 * @returns {dias, congelou} — o tamanho do fogo e se o congelador foi usado
 */
export function ofensiva(historico = [], hoje = new Date(), hojeFechou = false) {
  const por = new Map(historico.map((d) => [String(d.data).slice(0, 10), d]));
  const fechou = (d) => d && Number(d.tarefas_total) > 0
    && Number(d.tarefas_feitas) / Number(d.tarefas_total) >= OFENSIVA_META;
  let dias = hojeFechou ? 1 : 0;
  let congelou = false;
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 366; i++) {
    if (ehDiaUtil(cursor)) {
      if (fechou(por.get(dataISO(cursor)))) dias += 1;
      else if (!congelou && dias > 0) congelou = true; // 1 perdão por ofensiva
      else break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return { dias, congelou };
}

// ── 🏅 CONQUISTAS (F8 — as medalhas colecionáveis) ──────────────────
// Tudo derivado do que o placar já grava — nada de tabela nova: a conquista
// "existe" quando os dados provam que ela aconteceu.

/**
 * @param historico  linhas de xgame_diario (qualquer ciclo) com
 *                   {data, tarefas_total, tarefas_feitas, mvm_dia}
 * @param fogo       resultado de ofensiva()
 * @param vendasCiclo vendas reais da loja no ciclo
 * @param tokenCiclo  Human Token oficial do ciclo
 * @param formacaoPct % da formação do Executivo Ideal
 * @param votosDias   nº de dias em que a pessoa votou nas virtudes no ciclo
 * @param estudoOk    leitura em dia no ciclo
 * @param diaPerfeitoHoje hoje está 100%?
 */
export function conquistas({ historico = [], fogo = { dias: 0 }, vendasCiclo = 0, tokenCiclo = 0, formacaoPct = 0, votosDias = 0, estudoOk = false, diaPerfeitoHoje = false }) {
  const dias100 = historico.filter((d) => Number(d.tarefas_total) > 0
    && Number(d.tarefas_feitas) >= Number(d.tarefas_total)).length + (diaPerfeitoHoje ? 1 : 0);
  const mvm10 = historico.some((d) => Number(d.mvm_dia) >= 10);
  return [
    { id: 'fogo3', emoji: '🔥', nome: 'Primeira ofensiva', regra: '3 dias seguidos fechando o dia (80%+)', ok: fogo.dias >= 3 },
    { id: 'fogo5', emoji: '🚀', nome: 'Semana em chamas', regra: '5 dias seguidos de ofensiva', ok: fogo.dias >= 5 },
    { id: 'fogo22', emoji: '🌋', nome: 'Imparável', regra: 'um ciclo inteiro de ofensiva (22 dias úteis)', ok: fogo.dias >= 22 },
    { id: 'perfeito', emoji: '💎', nome: 'Dia perfeito', regra: '100% do Master Task em um dia', ok: dias100 >= 1 },
    { id: 'perfeito5', emoji: '👑', nome: 'Colecionador de diamantes', regra: '5 dias perfeitos', ok: dias100 >= 5 },
    { id: 'leitor', emoji: '📚', nome: 'Leitor constante', regra: 'leitura em dia no ciclo (60%+)', ok: estudoOk },
    { id: 'mvm10', emoji: '⭐', nome: 'MvM 10', regra: 'fechou um dia com MvM 10 cravado', ok: mvm10 },
    { id: 'votante', emoji: '🗳️', nome: 'Voz do grupo', regra: 'votou nas 10 Virtudes em 5 dias do ciclo', ok: votosDias >= 5 },
    { id: 'venda1', emoji: '💰', nome: 'Primeira venda', regra: '1 venda da loja no ciclo', ok: vendasCiclo >= 1 },
    { id: 'vendameta', emoji: '🏆', nome: 'Meta de vendas', regra: `${META_VENDAS_CICLO} vendas da loja no ciclo`, ok: vendasCiclo >= META_VENDAS_CICLO },
    { id: 'ouro', emoji: '🥇', nome: 'Padrão OURO', regra: 'Human Token do ciclo ≥ 17,78', ok: tokenCiclo >= 17.78 },
    { id: 'exec', emoji: '🎓', nome: 'Rumo ao Executivo Ideal', regra: 'formação ≥ 66%', ok: formacaoPct >= 66 },
  ];
}

// ── 🎯 MISSÕES DA SEMANA (F8 — a variedade que mata a monotonia) ────
// Um pool de missões computáveis; 3 entram por semana, girando pelo nº da
// semana do ano (todo mundo joga as mesmas — vira assunto no grupo).

const POOL_MISSOES = [
  { id: 'm100x3', emoji: '💎', nome: 'Feche 3 dias com 100%', alvo: 3, conta: (dias) => dias.filter((d) => d.pct >= 1).length },
  { id: 'm80x5', emoji: '🔥', nome: 'Feche 5 dias com 80%+', alvo: 5, conta: (dias) => dias.filter((d) => d.pct >= OFENSIVA_META).length },
  { id: 'mleit4', emoji: '📚', nome: 'Leitura em 4 dias', alvo: 4, conta: (dias) => dias.filter((d) => d.leitura).length },
  { id: 'mmvm3', emoji: '⭐', nome: 'MvM 8+ em 3 dias', alvo: 3, conta: (dias) => dias.filter((d) => d.mvm >= 8).length },
  { id: 'mvoto3', emoji: '🗳️', nome: 'Vote nas virtudes em 3 dias', alvo: 3, conta: (dias) => dias.filter((d) => d.votou).length },
  { id: 'mcedo2', emoji: '🌅', nome: '2 dias perfeitos seguidos', alvo: 2, conta: (dias) => {
    let melhor = 0; let seq = 0;
    for (const d of dias) { seq = d.pct >= 1 ? seq + 1 : 0; melhor = Math.max(melhor, seq); }
    return melhor;
  } },
];

const numeroDaSemana = (d) => {
  const inicioAno = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - inicioAno) / (7 * 24 * 60 * 60 * 1000));
};

/**
 * As 3 missões da semana corrente com o progresso calculado.
 * @param diasSemana resumo dos dias da semana (segunda até hoje):
 *                   [{pct: 0-1, leitura: bool, mvm: 0-10, votou: bool}]
 */
export function missoesDaSemana(diasSemana = [], hoje = new Date()) {
  const n = numeroDaSemana(hoje);
  const escolhidas = [0, 1, 2].map((i) => POOL_MISSOES[(n + i * 2) % POOL_MISSOES.length]);
  // sem repetir missão na mesma semana
  const unicas = [...new Map(escolhidas.map((m) => [m.id, m])).values()];
  while (unicas.length < 3) unicas.push(POOL_MISSOES[(n + unicas.length * 3 + 1) % POOL_MISSOES.length]);
  return [...new Map(unicas.map((m) => [m.id, m])).values()].slice(0, 3).map((m) => {
    const atual = Math.min(m.alvo, m.conta(diasSemana));
    return { ...m, atual, ok: atual >= m.alvo };
  });
}

/** Segunda-feira da semana de `d` (a semana do jogo começa na segunda). */
export function inicioDaSemana(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1));
  return x;
}

// ── 🏆 LIGAS (F9 — promoção e rebaixamento por ciclo) ───────────────
// As faixas da moeda viram LIGAS: o Human Token médio do ciclo decide onde
// você joga. Diamante é a elite acima do ouro — o território do Executivo
// Ideal. Subir de liga = fechar o ciclo acima da linha da liga de cima.

export const LIGAS = [
  { id: 'diamante', label: 'LIGA DIAMANTE', emoji: '💠', min: 20 },
  { id: 'ouro', label: 'LIGA OURO', emoji: '🥇', min: 17.78 },
  { id: 'prata', label: 'LIGA PRATA', emoji: '🥈', min: 6.66 },
  { id: 'bronze', label: 'LIGA BRONZE', emoji: '🥉', min: 0 },
];

export const ligaDoToken = (t) => LIGAS.find((l) => (Number(t) || 0) >= l.min) || LIGAS.at(-1);

/** A próxima liga acima e quanto falta pra promoção (null quando já é a elite). */
export function proximaLiga(token) {
  const atual = ligaDoToken(token);
  const i = LIGAS.findIndex((l) => l.id === atual.id);
  if (i <= 0) return null;
  const alvo = LIGAS[i - 1];
  return { liga: alvo, falta: Math.round((alvo.min - (Number(token) || 0)) * 100) / 100 };
}

// ── ✅ VALIDAÇÃO AUTOMÁTICA (F10 — comprovar sem depender de ninguém) ─
// Toda tarefa pode exigir comprovação, e o SISTEMA valida na hora:
//   'instagram'   → o link do post/story DO DIA (marketing pessoal provado);
//   'aprendizado' → escrever o principal aprendizado da leitura (a
//                   validação mais Duolingo que existe: registrou, fixou);
//   'nenhuma'     → concluir direto (almoço, deslocamento...).
// Vendas e reuniões nem precisam disso — validam sozinhas pelos dados do
// sistema (catalog_sales e os registros do CRM).

export const RESUMO_MIN = 400;
// 🎓 09/09/2026 — dono: "um dia de final de semana com um estudo foda...
// quero um resumo bem detalhado." O estudo de fim de semana ("Estudo do
// Fim de Semana" no título) exige um resumo bem mais longo que o do dia a
// dia — 3× o mínimo — porque é o mergulho fundo, não a leitura corrida.
export const RESUMO_MIN_FDS = 1200;

/** Tipo de validação AUTOMÁTICA deduzido do título (o admin pode trocar).
 *  REGRA DO DONO (05/09): TODA tarefa tem comprovação por padrão — quem não
 *  cai em Instagram nem aprendizado comprova com FOTO/print fazendo a tarefa.
 *  O admin tira a prova de uma tarefa marcando "sem prova". */
export function validacaoAutomatica(titulo) {
  const t = _semAcento(titulo);
  // acordar/gratidão comprova com o post do BOM DIA (o exemplo do dono:
  // "como eu provo que acordei 5h? posto o bom dia no Instagram")
  if (/story|post|instagram|conteudo|acordar|gratidao|bom dia/.test(t)) return 'instagram';
  // 🎓 09/09/2026 — o estudo de FIM DE SEMANA (mergulho fundo, resumo bem
  // maior) tem que bater ANTES da regra genérica de leitura/estudo — senão
  // "Estudo do Fim de Semana" cairia no 'aprendizado' comum, com o mínimo
  // pequeno de dia de semana.
  if (/(estudo|leitura).*fim de semana|fim de semana.*(estudo|leitura)|estudo profundo|estudo foda/.test(t)) return 'aprendizado_fds';
  if (/leitura|estudo|curso|licao/.test(t)) return 'aprendizado';
  return 'foto';
}

/** Tipo efetivo da tarefa: o gravado, ou o automático do título. */
export function tipoDeValidacao(t) {
  const v = String(t?.validacao || '').toLowerCase();
  if (v === 'nenhuma') return null;
  if (['instagram', 'aprendizado', 'aprendizado_fds', 'foto'].includes(v)) return v;
  return validacaoAutomatica(t?.titulo);
}

export const ROTULO_VALIDACAO = {
  instagram: '📸 o post do Instagram de hoje',
  aprendizado: '📚 foto do estudo + resumo digitado (sem colar!)',
  aprendizado_fds: `📚🔥 estudo de fim de semana — foto + resumo BEM detalhado (mín. ${RESUMO_MIN_FDS} caracteres, sem colar!)`,
  foto: '📷 foto ou print fazendo a tarefa',
};

/** Valida a entrega na hora. Devolve {valido, motivo}. */
export function validarComprovacao(tipo, entrega) {
  const texto = String(entrega || '').trim();
  if (tipo === 'instagram') {
    const ok = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|stories|tv)\/.+/i.test(texto);
    return { valido: ok, motivo: ok ? 'link do Instagram registrado ✔' : 'cole o link do post/story de HOJE (instagram.com/p/… ou /reel/…)' };
  }
  if (tipo === 'aprendizado' || tipo === 'aprendizado_fds') {
    const minimo = tipo === 'aprendizado_fds' ? RESUMO_MIN_FDS : RESUMO_MIN;
    const ok = texto.length >= minimo;
    return { valido: ok, motivo: ok ? 'aprendizado registrado ✔' : `resumo curto demais: escreva pelo menos ${minimo} caracteres COM AS SUAS PALAVRAS (faltam ${Math.max(0, minimo - texto.length)})` };
  }
  return { valido: true, motivo: '' };
}

// 📚 REGRA DO DONO (05/09): estudo comprova com FOTO + RESUMO DIGITADO.
// Mínimo de um resumo de verdade (~2 frases) e SEM copiar e colar — colar é
// bloqueado na tela, porque digitar é treino: fixa o aprendizado.
// 400 caracteres ≈ um parágrafo sólido de 5-6 linhas: desafia a elaborar e
// digitar de verdade sem virar gargalo na rotina (uma folha inteira todo dia
// travaria a jornada — o desafio sobe depois, se o time engolir fácil).
// 📳 O TOQUE QUE VIBRA (ordem do dono: "tocando, mexendo no telefone,
// sentindo, vibrando — é assim que tem que ser"). É o que faz o jogo
// responder ao dedo, igual ao Duolingo.
//
// COMO SE COMPORTA EM CADA APARELHO:
//   • Android/Chrome: vibra de verdade;
//   • iPhone: o Safari não expõe a API — a chamada simplesmente não existe
//     e nada acontece (sem erro, sem travar);
//   • navegador de computador: idem, silencioso.
// Por isso a checagem é por typeof: em ambiente sem navigator (o Node dos
// testes, por exemplo) nem a referência é avaliada.
// os padrões, em milissegundos (número = um pulso; lista = pulso/pausa/pulso)
export const VIBRA_TOQUE = 12;                        // encostou num botão
export const VIBRA_ABRIR = [10, 30, 10];              // abriu a jornada
export const VIBRA_CONCLUIU = [18, 45, 28];           // fechou uma tarefa
export const VIBRA_CONQUISTA = [22, 50, 22, 50, 60];  // baú, troféu, dia perfeito
export const VIBRA_ERRO = [40, 60, 40];               // reprovou / faltou algo

export const vibrar = (padrao = VIBRA_TOQUE) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(padrao);
    }
  } catch { /* aparelho sem motor de vibração */ }
};

const minimoDoTipo = (tipo) => (tipo === 'aprendizado_fds' ? RESUMO_MIN_FDS : RESUMO_MIN);

// 🗣️ FALAR A LÍNGUA DE QUEM LÊ (chamado do Paim, 07/09/2026). O contador
// dizia "18/400 caracteres". Todo mundo lê isso como "18 de um limite de
// 400" e conclui que já escreveu bastante — é o CONTRÁRIO: 400 é o mínimo.
// Ele escreveu 18 letras, achou que estava certo, o botão não acendeu e a
// ligação caiu no suporte. O número não estava errado; a frase estava.
// Agora o texto diz quanto FALTA, e diz o tamanho ANTES de a pessoa começar
// a escrever — não depois de ela falhar.
export function faltaDoResumo(texto, tipo = 'aprendizado') {
  return Math.max(0, minimoDoTipo(tipo) - String(texto || '').trim().length);
}

// "faltam 1 caracteres" estraga justamente o que este conserto foi fazer.
const letras = (n) => `${n} ${n === 1 ? 'caractere' : 'caracteres'}`;

export function textoDoContador(texto, tipo = 'aprendizado') {
  const minimo = minimoDoTipo(tipo);
  const escrito = String(texto || '').trim().length;
  if (escrito === 0) return `escreva pelo menos ${minimo} caracteres (umas ${tipo === 'aprendizado_fds' ? '18' : '6'} linhas)`;
  const falta = faltaDoResumo(texto, tipo);
  if (falta === 0) return '✔ resumo no tamanho';
  return falta === 1 ? 'falta 1 caractere' : `faltam ${letras(falta)}`;
}

// 🔒 BOTÃO APAGADO TEM QUE DIZER POR QUÊ. Inclusão digital: quem não tem
// intimidade com tela não deduz motivo de botão opaco — fica olhando, tenta
// de novo e liga pro suporte. Devolve '' quando o botão está liberado.
export function motivoDoBotaoTravado({ tipo, temFoto, texto }) {
  if (!temFoto) return (tipo === 'aprendizado' || tipo === 'aprendizado_fds') ? 'falta a foto do estudo para liberar' : 'falta a foto para liberar';
  if (tipo !== 'aprendizado' && tipo !== 'aprendizado_fds') return '';
  const falta = faltaDoResumo(texto, tipo);
  return falta > 0 ? `escreva mais ${letras(falta)} para liberar` : '';
}

// 🎥 VISUALIZAÇÃO GRAVADA — mínimo de verdade, sem teto apertado (dono,
// 08/09/2026): "precisa de pelo menos 01 minuto obrigatório e isso precisa
// ficar claro pra pessoa, e deixar livre até a pessoa quiser". Antes não
// tinha piso nenhum (um vídeo de 1 segundo já valia) e o teto era 2 minutos
// rígido, cortando a gravação sem avisar. Agora: 60s de piso, visível igual
// ao contador do resumo escrito (faltaDoResumo/textoDoContador, acima); o
// teto vira só uma rede de segurança técnica — 15 min, o tempo que a parte
// de gratidão + visualização dura — não é mais o alvo da gravação.
export const VISUALIZACAO_MIN_SEG = 60;
export const VISUALIZACAO_TETO_SEG = 15 * 60; // 900 — rede de segurança, não o alvo

const segundos = (n) => `${n} ${n === 1 ? 'segundo' : 'segundos'}`;

export function faltaDaVisualizacao(seg) {
  return Math.max(0, VISUALIZACAO_MIN_SEG - Number(seg || 0));
}

export function textoDoCronometroVisualizacao(seg) {
  const falta = faltaDaVisualizacao(seg);
  if (falta === 0) return `gravando sua visualização · ${seg}s`;
  return `gravando sua visualização · ${seg}s — grava mais ${segundos(falta)} pra poder concluir`;
}

// ── 👤 O PADRÃO DE NOME DO JOGO (ordem do dono, 05/09) ──────────────
// Sempre o nome do CADASTRO, sempre "Nome Sobrenome" (primeiro + último),
// sempre com inicial maiúscula — nunca apelido, nunca CAIXA ALTA, nunca o
// nome completo gigante. Um padrão só, no app inteiro.
export function nomeExibicao(p) {
  const bruto = String(p?.full_name || p?.nickname || '').trim();
  if (!bruto) return 'Sem nome';
  const tc = (w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);
  const partes = bruto.split(/\s+/).filter((w) => !/^(da|de|do|das|dos|e)$/i.test(w));
  if (!partes.length) return tc(bruto);
  const primeiro = tc(partes[0]);
  const ultimo = partes.length > 1 ? tc(partes[partes.length - 1]) : '';
  return ultimo ? `${primeiro} ${ultimo}` : primeiro;
}

/** 🌅 A tarefa de gratidão/acordar abre o RITUAL DO AMANHECER (não formulário). */
export const ehTarefaDeGratidao = (titulo) => /acordar|gratidao|bom dia/.test(_semAcento(titulo));
// janela do ritual: de 04:40 até 07:15 vale direto; fora disso vai pra análise
export const RITUAL_INICIO_MIN = 4 * 60 + 40;
export const RITUAL_FIM_MIN = 7 * 60 + 15;
export const AVISO_COLAR = '🚫 Colar é bloqueado aqui — digita com as SUAS palavras. Copiar e colar baixa o seu MvM, os pontos e o dinheiro do dia: o treino é digitar o que você entendeu.';

// ── 📸 O PRINT COMO PROVA (F10.1) ───────────────────────────────────
// O fluxo do dono: a tarefa abre o Instagram pra fazer o post NA HORA,
// a pessoa tira o print e sobe aqui. O sistema valida sozinho:
//   1. é imagem de verdade (tipo e tamanho fazem sentido);
//   2. IMPRESSÃO DIGITAL (SHA-256): o MESMO print não comprova duas vezes —
//      reutilizou o de ontem, o sistema barra na hora;
//   3. o horário do envio é carimbado pelo servidor (ninguém escolhe a hora).
// Leitura do horário DENTRO da foto e detecção de montagem = próximo nível
// (precisa de visão computacional — fica pro validador com IA).

/** SHA-256 do arquivo — a impressão digital que barra print reutilizado. */
export async function hashDoArquivo(file) {
  const buf = await file.arrayBuffer();
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Validação automática do print (antes do upload). */
export function validarPrint(file, hashesUsados = new Set(), hash = '') {
  if (!file) return { valido: false, motivo: 'anexe o print do post' };
  if (!/^image\//.test(file.type || '')) return { valido: false, motivo: 'o arquivo precisa ser uma IMAGEM — o print da tela do post' };
  if ((file.size || 0) < 15 * 1024) return { valido: false, motivo: 'esse arquivo parece vazio — envie o print real do post' };
  if ((file.size || 0) > 8 * 1024 * 1024) return { valido: false, motivo: 'imagem grande demais (máximo 8MB)' };
  if (hash && hashesUsados.has(hash)) return { valido: false, motivo: '🚫 esse print JÁ FOI USADO em outra comprovação — o post de hoje precisa de um print novo' };
  return { valido: true, motivo: 'print validado ✔' };
}

/** Link que abre o Instagram pra fazer o post na hora (app no celular, site no desktop). */
export const LINK_ABRIR_INSTAGRAM = 'https://www.instagram.com/';
