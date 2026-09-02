/**
 * ofertaRelampago — o desconto que a vitrine pode anunciar.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (02/09/2026)
 * O dono: "os produtos das Ofertas Relâmpago estão completamente fora de nexo.
 * Valores e % de desconto completamente desalinhados."
 *
 * A home mostrava um Smart Tag de R$ 21,90 "de R$ 15.283,26" (-100%) e uma
 * torneira de R$ 50,00 "de R$ 10.108,66" (-100%).
 *
 * O DADO ESTAVA QUASE TODO CERTO. Eram 8 linhas ruins em 270 produtos com valor
 * de mercado. O que quebrava a home era a REGRA DE ESCOLHA do carrossel:
 *
 *     .sort((a, b) => b.d - a.d)   // maior desconto primeiro
 *
 * Ordenar por "maior desconto" é, na prática, ordenar por "maior erro de dado".
 * As 8 linhas podres ganhavam a disputa toda vez e ocupavam a home inteira.
 * Por isso PARECIA tudo quebrado com 97% do cadastro correto.
 *
 * Duas coisas nunca podem chegar à tela do cliente:
 *   • preço de referência falso — "de R$ 15.283,26" num rastreador de R$ 21,90
 *     não é feio, é preço de referência inventado, e isso tem nome no Código de
 *     Defesa do Consumidor;
 *   • "-100% de desconto", que literalmente quer dizer de graça, e nascia do
 *     arredondamento de 99,86%.
 */

/**
 * Teto do que a vitrine anuncia como oferta.
 *
 * 90% foi escolhido contra a promessa do próprio site — o banner diz "com até
 * 85% de desconto". O teto é generoso com o que o negócio realmente faz
 * (arremate e devolução chegam perto disso) e corta só o que é lixo de dado.
 * Em 02/09 isso separava exatamente 8 produtos absurdos dos 10 plausíveis
 * entre 67% e 90%, que continuam aparecendo.
 */
export const DESCONTO_MAXIMO_CONFIAVEL = 90;

/**
 * O desconto de um produto, e se dá para confiar nele.
 *
 * @returns {{pct: number, confiavel: boolean, motivo: string}}
 *   pct       — inteiro, já limitado para nunca chegar a 100
 *   confiavel — false quando o valor de mercado não se sustenta
 */
export function descontoDaOferta(produto) {
  const de = Number(produto?.market_value || 0);
  const por = Number(produto?.price_catalog || 0);

  if (!(por > 0)) return { pct: 0, confiavel: false, motivo: 'sem_preco' };
  if (!(de > 0)) return { pct: 0, confiavel: false, motivo: 'sem_valor_de_mercado' };
  if (de <= por) return { pct: 0, confiavel: false, motivo: 'sem_desconto' };

  const bruto = (1 - por / de) * 100;
  if (bruto >= DESCONTO_MAXIMO_CONFIAVEL) {
    // O produto continua à venda na loja — só não é anunciado como "oferta
    // relâmpago", que é justamente o que ele não é.
    return { pct: 0, confiavel: false, motivo: 'desconto_implausivel' };
  }
  // `floor`, não `round`: 89,7% jamais pode virar 90% e furar o próprio teto.
  return { pct: Math.floor(bruto), confiavel: true, motivo: 'ok' };
}

/** Só o número, para quem só quer exibir. 0 = não anuncia desconto. */
export const descontoExibivel = (produto) => {
  const d = descontoDaOferta(produto);
  return d.confiavel ? d.pct : 0;
};

/**
 * Quem entra no carrossel: tem foto, tem estoque, e tem desconto em que se
 * pode confiar. Maior desconto primeiro — agora sem o efeito colateral de
 * promover erro de dado ao topo, porque o implausível já saiu fora.
 */
export function ofertasDoCarrossel(produtos, limite = 12) {
  return (Array.isArray(produtos) ? produtos : [])
    .filter((p) => p?.image_urls?.length && Number(p?.quantity) > 0)
    .map((p) => ({ p, d: descontoDaOferta(p) }))
    .filter((x) => x.d.confiavel && x.d.pct > 0)
    .sort((a, b) => b.d.pct - a.d.pct)
    .slice(0, limite)
    .map((x) => x.p);
}
