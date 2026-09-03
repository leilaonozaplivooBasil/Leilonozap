// buscaFotos — LEITURA ÚNICA da resposta das rotas de busca de imagem
// (DIR-44, 03/09/2026). Extraída do processarResposta do BuscadorFotos do
// admin (PONTO 77): existem DOIS backends com formatos diferentes (a rota
// Vercel devolve { images: [] }, o runtime Deno devolvia { products:
// [{ imageUrl }] }) e o adapter às vezes aninha em .data. Esta função aceita
// todos e mantém a distinção honesta entre "não achei" e "a busca falhou".
// O BuscadorFotos segue com a cópia dele (mexer lá é rodada própria).

/**
 * @param {any} resp resposta crua de extractGoogleShoppingImages/buscarFotosPorImagem
 * @returns {{ urls: string[], queryUsada: string|null, erro: null|{tipo: 'falha_busca'|'sem_resultado', mensagem: string} }}
 */
export function lerRespostaFotos(resp) {
  const camadas = [resp, resp?.data, resp?.data?.data].filter(Boolean);
  const dados = camadas.find((c) => c.images || c.products) || {};
  const urls = [
    ...(dados.images || []),
    ...(dados.products || []).map((p) => p?.imageUrl || p?.image),
  ].filter((u, i, arr) => typeof u === 'string' && /^https?:\/\//i.test(u) && arr.indexOf(u) === i);

  const queryUsada = typeof dados.query_usada === 'string' && dados.query_usada ? dados.query_usada : null;

  if (urls.length === 0) {
    if (dados.motivo === 'falha_busca') {
      return { urls: [], queryUsada, erro: { tipo: 'falha_busca', mensagem: String(dados.error || 'erro na API') } };
    }
    return { urls: [], queryUsada, erro: { tipo: 'sem_resultado', mensagem: 'Nenhuma foto encontrada' } };
  }
  return { urls, queryUsada, erro: null };
}
