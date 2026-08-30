// escadaLicencas — a ESCADA OFICIAL DE LICENÇAS (DIR-23, 30/08/2026).
// Fonte: apresentação oficial do dono (LeilaoNoZap — Apresentação Oficial 3):
// cada degrau com investimento, comissão e quem cadastra quem. O Influenciador
// é grátis (5%) e por isso NÃO entra na meta de captação — os demais degraus
// se cruzam com as vendas reais de adesão (mesma classificação por cargo da
// captação, src/lib/captacaoParceiros.js) para mostrar N vendidos × preço de
// tabela AO LADO do valor realmente captado: divergência entre os dois é
// sinal de desconto ou inconsistência, e aparece — nunca some em silêncio.
import { isVendaReal } from './dinheiroReal.js';
import { bucketDaVenda } from './captacaoParceiros.js';

// Ordem OFICIAL da apresentação (de baixo pra cima na hierarquia).
// Números do documento — nunca alterar sem decisão do dono.
export const ESCADA_LICENCAS = [
  { id: 'influenciador', label: 'Influenciador', investimento: 0, comissao: 5, cadastra: '—', cadastradoPor: 'Vendedor ou Licenciado' },
  { id: 'vendedor', label: 'Vendedor', investimento: 1497, comissao: 10, cadastra: 'Influenciadores', cadastradoPor: 'Licenciado' },
  { id: 'licenciado', label: 'Licenciado', investimento: 5000, comissao: 13, cadastra: 'Influenciadores e Vendedores', cadastradoPor: 'Parceiro ou superior' },
  { id: 'parceiro', label: 'Parceiro', investimento: 20000, comissao: 15, cadastra: 'até Licenciado', cadastradoPor: 'Ponto de Retirada ou superior' },
  { id: 'ponto_retirada', label: 'Ponto de Retirada', investimento: 50000, comissao: 16, cadastra: 'até Parceiro', cadastradoPor: 'Loja Física ou superior' },
  { id: 'loja_fisica', label: 'Loja Física', investimento: 350000, comissao: 19, cadastra: 'toda a hierarquia abaixo', cadastradoPor: 'Distribuidor' },
  { id: 'distribuidor', label: 'Distribuidor', investimento: 4000000, comissao: 20, cadastra: 'toda a hierarquia', cadastradoPor: 'nível máximo regional' },
];

const norm = (v) => String(v || '').toLowerCase();

/**
 * Degrau FINO da escada pra uma venda de adesão — mais granular que o balde
 * da captação (que junta Parceiro e Distribuidor por ordem oficial do dono).
 * Retorna o id do degrau, 'outras' (adesão de cargo não reconhecido) ou
 * null (não é venda de licença — aporte de parceiro, mercadoria etc.).
 */
export function nivelDaVenda(s) {
  if (s.kind === 'seller_adhesion') return 'vendedor';
  if (s.kind !== 'adesao') return null;
  const texto = norm(`${s.adesao_level} ${s.product_title}`);
  // MESMA precedência de bucketDaVenda (captação): degrau fino e balde
  // precisam concordar venda a venda — só o par Distribuidor/Parceiro é
  // separado aqui (na captação os dois dividem um balde, por ordem do dono).
  if (texto.includes('vendedor')) return 'vendedor';
  if (texto.includes('licenciado')) return 'licenciado';
  if (texto.includes('loja')) return 'loja_fisica';
  if (texto.includes('ponto')) return 'ponto_retirada';
  if (texto.includes('distribuidor')) return 'distribuidor';
  if (texto.includes('parceiro')) return 'parceiro';
  if (texto.includes('influenciador')) return 'influenciador';
  return 'outras';
}

/**
 * Cruzamento escada oficial × vendas reais: por degrau, N vendidos, valor
 * captado de verdade e valor de tabela (N × investimento oficial).
 * @param sales linhas de catalog_sales (mesmo escopo do painel)
 */
export function resumoEscada(sales = []) {
  const porNivel = Object.fromEntries(ESCADA_LICENCAS.map((n) => [n.id, { vendidos: 0, captadoReal: 0 }]));
  const outras = { vendidos: 0, captadoReal: 0 };
  for (const s of sales) {
    const nivel = nivelDaVenda(s);
    if (!nivel || !isVendaReal(s)) continue;
    const alvo = nivel === 'outras' ? outras : porNivel[nivel];
    alvo.vendidos += 1;
    alvo.captadoReal += Number(s.total_amount) || 0;
  }
  const niveis = ESCADA_LICENCAS.map((n) => {
    const r = porNivel[n.id];
    const valorTabela = r.vendidos * n.investimento;
    return {
      ...n,
      vendidos: r.vendidos,
      captadoReal: r.captadoReal,
      valorTabela,
      divergencia: r.captadoReal - valorTabela,
    };
  });
  return { niveis, outras };
}

// Sanidade: a classificação fina precisa concordar com o balde da captação
// (mesmas vendas, granularidade diferente). Mapeamento degrau → balde:
export const NIVEL_PARA_BUCKET = {
  influenciador: 'outras_adesoes', // adesão grátis não deveria existir com valor; se existir, não some
  vendedor: 'vendedor',
  licenciado: 'licenciado',
  parceiro: 'parceiro_distribuidor',
  ponto_retirada: 'ponto_retirada',
  loja_fisica: 'loja_fisica',
  distribuidor: 'parceiro_distribuidor',
};

/** Confere, venda a venda, que degrau fino e balde da captação concordam. */
export function nivelConcordaComBucket(s) {
  const nivel = nivelDaVenda(s);
  if (nivel === null) return true; // não é licença — captação decide sozinha
  const bucket = bucketDaVenda(s);
  if (nivel === 'outras') return bucket === 'outras_adesoes';
  return NIVEL_PARA_BUCKET[nivel] === bucket;
}
