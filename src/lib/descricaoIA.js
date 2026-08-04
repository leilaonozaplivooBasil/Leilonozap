// 🛡️ PONTO 74 — GUARDA DE DESCRIÇÃO GERADA POR IA
// Motivo: quando a IA falha (ex.: gateway sem crédito), a resposta volta como
// JSON de erro ({"ok":false,"error":"IA indisponível",...}). Sem essa guarda,
// esse JSON era colocado no campo Descrição e ia PARA O BANCO, aparecendo para
// o cliente final na vitrine. Aqui a resposta é validada ANTES de virar texto.

// Marcas de erro que NUNCA podem virar descrição de produto
const MARCAS_DE_ERRO = [
  '"ok":false',
  'IA indisponível',
  'IA não conectada',
  'Free tier users',
  'not_implemented',
  'network_or_not_implemented',
  'AI_GATEWAY_API_KEY',
];

/**
 * Extrai o texto útil de uma resposta da IA.
 * Retorna string vazia quando a resposta é inválida ou é um erro.
 */
export function textoDaIA(resposta) {
  if (!resposta) return '';

  // Objeto: só aceita quando não é erro e tem texto
  if (typeof resposta === 'object') {
    if (resposta.ok === false || resposta.error) return '';
    const t = resposta.text || resposta.response || resposta.description || '';
    return typeof t === 'string' ? textoDaIA(t) : '';
  }

  if (typeof resposta !== 'string') return '';

  const texto = resposta.trim();
  if (!texto) return '';

  // JSON cru (payload de erro serializado) nunca é descrição
  if (texto.startsWith('{') || texto.startsWith('[')) return '';
  if (MARCAS_DE_ERRO.some((m) => texto.includes(m))) return '';

  return texto;
}

/** true quando a resposta da IA pode ser gravada como descrição */
export function descricaoIAValida(resposta) {
  return textoDaIA(resposta).length > 0;
}

/** Mensagem única e amigável quando a IA não está disponível */
export const MSG_IA_INDISPONIVEL =
  'IA indisponível agora — escreva a descrição manualmente.';