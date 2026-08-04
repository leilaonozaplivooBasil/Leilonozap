// 💳 PARCELAMENTO — fonte única de verdade da parcela exibida na Loja Virtual.
//
// REGRA DE NEGÓCIO (Gabriel, 04/08/2026): o CLIENTE ABSORVE TUDO.
// A loja não absorve taxa nenhuma — nem juros de parcelamento, nem taxa de venda.
//
// Como o valor final se forma:
//   1. TAXA_VENDA_PCT (5,31%) → taxa que o Mercado Pago cobra do vendedor na venda
//      parcelada. É acrescentada ao valor cobrado (ver api/functions/createMPCatalogCardCheckout.js).
//   2. JUROS_MP (por nº de parcelas) → juros que o próprio Mercado Pago aplica na
//      parcela do cliente, em cima do valor cobrado. Já era repassado.
//
// Logo: total = preço × (1 + TAXA_VENDA) × (1 + JUROS_n)  ← é isso que o cliente paga.
//
// ⚠️ A tabela JUROS_MP foi lida da API oficial do Mercado Pago com o token de produção
// em 04/08/2026 (bandeira Visa) e confere com o painel do MP. Para reconferir e
// atualizar estes números, rode a função `consultarTaxasMP` (somente leitura, admin).
// A taxa % é FIXA por número de parcelas — não varia com o valor do produto.

export const TAXA_VENDA_PCT = 5.31;

const JUROS_MP = {
  1: 0, 2: 9.64, 3: 11.23, 4: 11.36, 5: 14.31, 6: 14.32,
  7: 16.72, 8: 16.73, 9: 19.69, 10: 20.65, 11: 20.66, 12: 22.11,
};

// O Mercado Pago não parcela em valores que gerem parcela abaixo de ~R$ 5,00.
// Por isso produto barato NÃO tem 12x — prometer 12x nele é propaganda falsa.
const PARCELA_MINIMA = 5;
// 💳 Máximo de parcelas do app em UM ÚNICO lugar (vitrine + checkout de cartão).
// Para mudar o limite depois, basta alterar este número.
export const MAX_PARCELAS = 12;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Calcula o melhor parcelamento REAL para um valor.
 * @param {number} valor preço do produto (sem frete)
 * @returns {{parcelas:number, parcela:number, total:number, taxaTotalPct:number}}
 */
export function melhorParcelamento(valor) {
  const base = (Number(valor) || 0) * (1 + TAXA_VENDA_PCT / 100);
  if (base <= 0) return { parcelas: 1, parcela: 0, total: 0, taxaTotalPct: 0 };

  for (let n = MAX_PARCELAS; n >= 2; n--) {
    const total = base * (1 + JUROS_MP[n] / 100);
    const parcela = total / n;
    if (parcela >= PARCELA_MINIMA) {
      return {
        parcelas: n,
        parcela: round2(parcela),
        total: round2(total),
        taxaTotalPct: round2((total / (Number(valor) || 1) - 1) * 100),
      };
    }
  }

  // Valor baixo demais para parcelar: só à vista (já com a taxa repassada).
  return { parcelas: 1, parcela: round2(base), total: round2(base), taxaTotalPct: TAXA_VENDA_PCT };
}

/** Texto pronto para a vitrine. Ex.: "12x de R$ 10,72" ou "à vista no cartão". */
export function textoParcelamento(valor) {
  const p = melhorParcelamento(valor);
  const money = 'R$ ' + p.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.parcelas <= 1 ? `${money} à vista no cartão` : `${p.parcelas}x de ${money}`;
}