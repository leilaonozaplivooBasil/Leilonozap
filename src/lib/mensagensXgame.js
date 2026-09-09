// 📨 MENSAGEM PRO CEO — comunicação interna do time corporativo do X-GAME
// (09/09/2026, DIR-106). Só conta, sem tela.
//
// O PEDIDO (dono): "a mensagem pro CEO, a mensagem pra diretoria, a
// mensagem pros executivos, a gente tem que ter isso aí... eles precisam
// entender que pra falar com o CEO, precisa, não pode ser bobeira, tá?
// Tem que ser algo assim que eles queiram compartilhar, sugestão, pedido,
// agradecimento... e eles podem mandar um pro outros, uns pros outros,
// demandas." Escopo: "todo mundo que faz parte do time corporativo e que
// está no game."
//
// A barra de qualidade não é um filtro de palavras — é só um mínimo de
// esforço (não dá pra mandar "oi" pro CEO): TAMANHO_MINIMO caracteres.

export const DESTINOS = {
  ceo: 'CEO',
  diretoria: 'Diretoria',
  executivos: 'Executivos',
  pessoa: 'um colega',
};

export const TIPOS_MENSAGEM = {
  sugestao: { rotulo: 'sugestão', emoji: '💡' },
  pedido: { rotulo: 'pedido', emoji: '🙏' },
  agradecimento: { rotulo: 'agradecimento', emoji: '🙌' },
  demanda: { rotulo: 'demanda', emoji: '📌' },
};

// "não pode ser bobeira" — mínimo de esforço pra chegar no CEO.
export const TAMANHO_MINIMO_TEXTO = 20;

/** A mensagem tem o mínimo de conteúdo pra valer a pena mandar? */
export function mensagemValida({ destinoTipo, tipo, texto } = {}) {
  const t = String(texto || '').trim();
  if (!DESTINOS[destinoTipo]) return { ok: false, motivo: 'Escolha pra quem vai a mensagem.' };
  if (!TIPOS_MENSAGEM[tipo]) return { ok: false, motivo: 'Escolha o tipo da mensagem.' };
  if (t.length < TAMANHO_MINIMO_TEXTO) {
    return { ok: false, motivo: `Escreve um pouco mais (pelo menos ${TAMANHO_MINIMO_TEXTO} caracteres) — não pode ser bobeira, isso vai pro ${DESTINOS[destinoTipo]}.` };
  }
  return { ok: true, motivo: null };
}

/** Mais nova primeiro. */
export function ordenarMensagens(lista = []) {
  return (Array.isArray(lista) ? lista.slice() : [])
    .sort((a, b) => String(b?.created_at || '').localeCompare(String(a?.created_at || '')));
}

/** Quantas ainda não foram lidas. */
export function contarNaoLidas(lista = []) {
  return (Array.isArray(lista) ? lista : []).filter((m) => !m?.lida).length;
}

/**
 * As mensagens que uma PESSOA recebe: as dirigidas a ela (destino pessoa +
 * destino_id dela) e, se ela for CEO/diretoria/executivo, as do papel dela.
 * `papeis` é a lista de destino_tipo que essa pessoa representa (ex.:
 * super_admin vê 'ceo' e 'diretoria'; um executivo vê 'executivos').
 */
export function mensagensRecebidasPor(lista = [], { userId, papeis = [] } = {}) {
  return (Array.isArray(lista) ? lista : []).filter((m) => (
    (m?.destino_tipo === 'pessoa' && m?.destino_id === userId)
    || (m?.destino_tipo !== 'pessoa' && papeis.includes(m?.destino_tipo))
  ));
}

/** As mensagens que uma pessoa mandou. */
export function mensagensEnviadasPor(lista = [], userId) {
  return (Array.isArray(lista) ? lista : []).filter((m) => m?.remetente_id === userId);
}

/**
 * Que papel(éis) essa pessoa representa pra receber mensagem de destino
 * coletivo — `xgame_participantes.cargo` já traz 'ceo'/'diretor'/
 * 'executivo' (via `cargoDoNivel`, em timeCorporativo.js); aqui só traduz
 * pro rótulo de destino desta mensagem.
 */
export function papeisDoCargo(cargo) {
  if (cargo === 'ceo') return ['ceo'];
  if (cargo === 'diretor') return ['diretoria'];
  if (cargo === 'executivo') return ['executivos'];
  return [];
}
