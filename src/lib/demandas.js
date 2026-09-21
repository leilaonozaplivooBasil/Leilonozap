/**
 * 🧠 A CAIXA DE ENTRADA DA MENTE — e o caminho dela até virar tarefa.
 *
 * PEDIDO DO DONO (áudio de 19/09/2026):
 *   "estou numa reunião, o pessoal está falando o que tem que fazer, eu só vou
 *    esvaziando a mente… entra numa lista com a data do dia que foi anotado.
 *    E automaticamente eu já transformo isso e direciono para onde eu quero."
 *
 * A regra mora aqui, longe da tela, porque o risco desta peça não é o desenho:
 * é PERDER uma anotação, ou criar tarefa duplicada a partir da mesma demanda.
 */

/** Estados possíveis. 'aberta' é o que aparece na caixa. */
export const ABERTA = 'aberta';
export const VIROU_TAREFA = 'virou_tarefa';
export const DESCARTADA = 'descartada';

/** De onde a demanda veio. */
export const ORIGENS = ['app', 'whatsapp', 'mapa', 'encontro'];

/** Rótulo curto da origem, para a tela não inventar cada uma o seu. */
export function rotuloDaOrigem(origem) {
  switch (origem) {
    case 'whatsapp': return 'pelo Zeca';
    case 'mapa': return 'do mapa mental';
    case 'encontro': return 'do encontro';
    default: return 'digitada';
  }
}

/**
 * O que a caixa mostra: só o que ainda espera destino, mais recente primeiro.
 *
 * 🔴 Ordena por `anotada_em`, NÃO por `created_at`. São diferentes de propósito:
 * uma demanda ditada ontem à noite e sincronizada hoje foi ANOTADA ontem, e é
 * na noite de ontem que o dono vai procurar por ela.
 */
export function caixaDeEntrada(linhas) {
  return (linhas || [])
    .filter((d) => d && d.estado === ABERTA && String(d.titulo || '').trim())
    .sort((a, b) => {
      const qa = new Date(a.anotada_em ?? a.created_at ?? 0).getTime();
      const qb = new Date(b.anotada_em ?? b.created_at ?? 0).getTime();
      if (qb !== qa) return qb - qa;
      return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR');
    });
}

/**
 * Agrupa por dia da anotação — é assim que o dono pediu para ver
 * ("entra numa lista com a data do dia que foi anotado").
 *
 * @returns {Array<{dia: string, demandas: object[]}>} dias do mais recente ao mais antigo
 */
export function porDiaDeAnotacao(linhas) {
  const caixa = caixaDeEntrada(linhas);
  const mapa = new Map();
  for (const d of caixa) {
    const dia = diaDe(d.anotada_em ?? d.created_at);
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia).push(d);
  }
  return [...mapa.entries()].map(([dia, demandas]) => ({ dia, demandas }));
}

/** 'AAAA-MM-DD' no fuso da casa. '' quando não há data legível. */
export function diaDe(quando) {
  const t = new Date(quando ?? NaN).getTime();
  if (!Number.isFinite(t)) return '';
  try {
    // en-CA devolve AAAA-MM-DD, que ordena como texto.
    return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
}

/**
 * Uma demanda pode virar tarefa?
 *
 * 🔒 A trava contra DUPLICATA. Sem ela, dois cliques no botão — ou o mesmo
 * botão em duas abas abertas — criam dois cartões para a mesma anotação, e o
 * dono passa a ver trabalho que não existe.
 */
export function podeVirarTarefa(demanda) {
  if (!demanda || typeof demanda !== 'object') return { pode: false, motivo: 'sem_demanda' };
  if (!String(demanda.titulo || '').trim()) return { pode: false, motivo: 'sem_titulo' };
  if (demanda.estado === VIROU_TAREFA) return { pode: false, motivo: 'ja_virou_tarefa' };
  if (demanda.estado === DESCARTADA) return { pode: false, motivo: 'descartada' };
  if (demanda.cartao_id) return { pode: false, motivo: 'ja_tem_cartao' };
  return { pode: true, motivo: 'ok' };
}

/**
 * O cartão que nasce de uma demanda.
 *
 * O detalhe da anotação vira o PRIMEIRO item do checklist em vez de sumir: foi
 * ditado por algum motivo, e um cartão só com título perde o motivo.
 */
export function cartaoDaDemanda(demanda, { userId, listaId = null, ordem = 0 } = {}) {
  const titulo = String(demanda?.titulo || '').trim();
  if (!titulo) return null;
  const detalhe = String(demanda?.detalhe || '').trim();
  return {
    user_id: userId ?? demanda?.user_id ?? null,
    titulo,
    coluna: 'aberto',
    prazo: demanda?.prazo || null,
    lista_id: listaId,
    ordem,
    checklist: detalhe ? [{ texto: detalhe, feito: false }] : [],
    // rastro de volta: dá para saber de qual anotação este cartão nasceu
    origem_demanda_id: demanda?.id ?? null,
  };
}

/** Quantas esperam destino — o número da bolinha na aba. */
export function quantasEsperando(linhas) {
  return caixaDeEntrada(linhas).length;
}
