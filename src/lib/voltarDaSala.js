// ⬅️ O "VOLTAR" DA SALA DO LEILÃO — pra onde ir quando não há de onde voltar.
//
// 🔴 POR QUE ISTO EXISTE (23/09/2026)
// Dono: "quando eu clico no link compartilhado eu caio direto na sala — e
// está certo — só que o botão de voltar não funciona." O botão fazia
// `window.history.back()`. Quem chega PELO LINK (WhatsApp, story, anúncio) abre
// a sala numa aba nova, sem histórico: não há pra onde voltar, e o clique morre
// em silêncio. É exatamente o caminho da campanha.
//
// Regra: com histórico DO PRÓPRIO SITE, volta como sempre. Sem isso, vai pra
// PÁGINA DO LEILÃO (ficha, fotos, descrição) — é o "um passo atrás" natural da
// sala, e é o que quem chegou pelo link ainda não viu.
//
// (Sem import de '@/utils': o node --test não resolve o alias. A regra de URL
// da casa é `'/' + nome` — createPageUrl em src/utils/index.ts — inlinada aqui.)
const pagina = (nome) => '/' + String(nome).replace(/ /g, '-');

/**
 * @param {object} p
 * @param {number} p.tamanhoDoHistorico  window.history.length
 * @param {string} p.referrer            document.referrer ('' quando abriu direto)
 * @param {string} p.origem              window.location.origin
 * @param {string} p.auctionId
 */
export function destinoDoVoltar({ tamanhoDoHistorico = 0, referrer = '', origem = '', auctionId = '' } = {}) {
  // histórico de verdade = mais de uma entrada E a anterior é do próprio site.
  // Aba aberta pelo WhatsApp tem length 1 (ou 2 com o about:blank) e referrer
  // vazio — voltar por ele fecharia a aba ou cairia fora do site.
  const veioDoSite = !!referrer && !!origem && String(referrer).startsWith(String(origem));
  if (Number(tamanhoDoHistorico) > 1 && veioDoSite) return { acao: 'historico', url: null };
  const id = String(auctionId || '').trim();
  const url = id ? `${pagina('AuctionDetails')}?id=${encodeURIComponent(id)}` : pagina('Home');
  return { acao: 'ir', url };
}
