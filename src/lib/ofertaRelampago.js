/**
 * ofertaRelampago — quando a vitrine pode dizer "de R$ X".
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (02/09/2026)
 * O dono, duas vezes. Primeiro: "os produtos das Ofertas Relâmpago estão
 * completamente fora de nexo". Depois da primeira tentativa de conserto, de
 * novo: "ainda há valores 'REAIS' errados".
 *
 * A PRIMEIRA TENTATIVA ESTAVA ERRADA, e vale registrar por quê. Ela cortava por
 * razão entre preços — teto de 90% de desconto. Uma razão responde "a diferença
 * entre os dois números é grande?". A pergunta de verdade é outra:
 *
 *     R$ 90,99 é um preço crível para uma cola de PVC?
 *
 * Nenhuma conta entre dois números responde isso. Por isso a cola passou: 89% é
 * "aceitável" pela régua da razão e é absurdo pela régua da realidade.
 *
 * ─────────────── o que o banco provou ───────────────
 *
 * 1. `market_value` NÃO É PREÇO DE NINGUÉM — É CONTA DE MÁQUINA.
 *    Dos 262 valores ativos, 44 tinham MAIS DE DUAS CASAS DECIMAIS:
 *      Máscara PFF2 ......... "de R$ 68,645"
 *      Luminária Arandela ... "de R$ 26,465"
 *    Nenhuma loja cobrou R$ 68,645. Três casas decimais é a assinatura de MÉDIA
 *    DE BUSCA, não de preço observado. É a prova objetiva de que o campo é saída
 *    de cálculo, e é a única checagem de formato que sobrevive aqui.
 *
 * 2. 261 DOS 262 VIERAM DO MESMO LUGAR: o pipeline automático de lote
 *    (`gerarProdutosDoLote` <- `searchMarket` <- comparador de preços). O único
 *    de fora foi cadastrado à mão. A MESMA fonte que trouxe foto de lavajato
 *    para uma torneira trouxe esses preços (ver src/lib/imagemExterna.js).
 *
 * 3. NÃO HAVIA ÂNCORA PARA CONFERIR. `cost_price` é o custo do LOTE rateado, não
 *    o da peça (gerarProdutosDoLote.js:169) — uma roldana e uma sapatilha
 *    "custam" os mesmos R$ 22,67. Não havia com o que cruzar.
 *
 * ─────────────── a regra que ficou ───────────────
 *
 * Preço de referência só vai para a tela quando UMA PESSOA DIGITOU. Os valores
 * de máquina foram zerados (supabase/migrations/20260902_market_value_limpeza.sql,
 * com backup), e `validarPrecoLoja` passa a valer no caminho de gravação — então
 * o que sobrar no campo é, por construção, humano.
 *
 * Aqui ficam as duas travas que o código ainda deve, porque dado limpo hoje não
 * garante dado limpo amanhã:
 *   • FORMATO — no máximo duas casas decimais. Média de busca cai aqui.
 *   • O CARROSSEL NÃO ORDENA MAIS POR DESCONTO. Essa era a raiz do estrago:
 *     "maior desconto primeiro" é, na prática, "maior erro de dado primeiro", e
 *     as linhas podres ganhavam a disputa toda vez e ocupavam a home inteira.
 *     Por isso 8 linhas ruins em 270 produtos PARECIAM a loja toda quebrada.
 */

/**
 * Teto de segurança — a última linha, não a regra.
 *
 * A regra é o formato + o dado limpo. Este teto existe só porque uma média de
 * busca pode, por sorte, cair em duas casas decimais. 90% é folgado de
 * propósito: o banner do site promete "até 85%", e arremate chega perto disso.
 */
export const DESCONTO_MAXIMO_CONFIAVEL = 90;

/**
 * Isto se parece com dinheiro que alguém cobrou?
 *
 * Preço tem, no máximo, duas casas decimais — é o que cabe numa nota. R$ 68,645
 * não é preço: é média. Esta função é o que separa as duas coisas.
 */
export function pareceDinheiro(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return false;
  // tolerância de ponto flutuante: 10.44 * 100 dá 1043.9999999999998
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

/**
 * O desconto de um produto, e se dá para anunciá-lo.
 *
 * @returns {{pct: number, confiavel: boolean, motivo: string}}
 *   pct       — inteiro, já limitado para nunca chegar a 100
 *   confiavel — false quando o preço de referência não se sustenta
 */
export function descontoDaOferta(produto) {
  const de = Number(produto?.market_value || 0);
  const por = Number(produto?.price_catalog || 0);

  if (!(por > 0)) return { pct: 0, confiavel: false, motivo: 'sem_preco' };
  if (!(de > 0)) return { pct: 0, confiavel: false, motivo: 'sem_valor_de_mercado' };

  // Média de busca, não preço. Esta é a trava que a razão entre preços não dava.
  if (!pareceDinheiro(de)) {
    return { pct: 0, confiavel: false, motivo: 'nao_parece_preco' };
  }
  if (de <= por) return { pct: 0, confiavel: false, motivo: 'sem_desconto' };

  const bruto = (1 - por / de) * 100;
  if (bruto >= DESCONTO_MAXIMO_CONFIAVEL) {
    // O produto continua à venda — só não é anunciado com desconto, que é
    // justamente o que não dá para provar.
    return { pct: 0, confiavel: false, motivo: 'desconto_implausivel' };
  }
  // `floor`, não `round`: 89,7% jamais pode virar 90% e furar o próprio teto.
  // E é assim que nascia o "-100% de desconto" — que quer dizer DE GRAÇA.
  return { pct: Math.floor(bruto), confiavel: true, motivo: 'ok' };
}

/** Só o número, para quem só quer exibir. 0 = não anuncia desconto. */
export const descontoExibivel = (produto) => {
  const d = descontoDaOferta(produto);
  return d.confiavel ? d.pct : 0;
};

/**
 * O "de R$ X" riscado — ou 0, e aí a tela não desenha nada.
 *
 * Mesma régua do selo de %: os dois aparecem juntos ou não aparecem. Preço
 * riscado sem desconto que o sustente é preço de referência falso, e isso tem
 * nome no Código de Defesa do Consumidor (art. 37: publicidade enganosa).
 */
export const precoDeReferencia = (produto) => (
  descontoDaOferta(produto).confiavel ? Number(produto.market_value) : 0
);

/**
 * Quem entra no carrossel: tem foto e tem estoque.
 *
 * ⚠️ NÃO ORDENA POR DESCONTO — nunca mais. Ordenar por maior desconto é ordenar
 * por maior erro de dado, e foi o que pôs "de R$ 15.283,26" num rastreador de
 * R$ 21,90 na home. Quem tem oferta que se sustenta vem primeiro; o resto
 * completa. Dentro de cada grupo vale a ORDEM EM QUE O PRODUTO CHEGOU — o
 * Catalog carrega em "-created_date", então é o mais recente primeiro.
 */
export function ofertasDoCarrossel(produtos, limite = 12) {
  const elegiveis = (Array.isArray(produtos) ? produtos : [])
    .filter((p) => p?.image_urls?.length && Number(p?.quantity) > 0);

  const comOferta = elegiveis.filter((p) => descontoExibivel(p) > 0);
  const demais = elegiveis.filter((p) => descontoExibivel(p) === 0);
  return [...comOferta, ...demais].slice(0, limite);
}
