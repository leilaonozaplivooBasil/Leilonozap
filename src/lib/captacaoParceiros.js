// captacaoParceiros — regra da META DE CAPTAÇÃO de R$ 1.000.000 (DIR-22,
// definida pelo dono em 30/08/2026): "tudo que entrar de aporte de parceiro
// de compra (que é como se fosse investimento) e vendas de franquias" — na
// ordem oficial dele: Aportes de Parceiro de Compra, Vendas de Vendedores,
// Licenciados, Loja Física, Ponto de Retirada, Parceiro e Distribuidor.
// ("Não estamos no sistema de franchise" — é analogia, não franchising formal.)
//
// O que conta:
//   • Aporte de parceiro: venda kind='partner_plan' REAL (critério oficial de
//     dinheiro real, src/lib/dinheiroReal.js) + ativação MANUAL de plano
//     (partner_plan_purchases com activation_source='manual' — dinheiro
//     recebido fora do gateway, confirmado pelo dono na ativação). Ativação
//     automática (activation_source='lucre_conosco') NÃO soma de novo: ela
//     nasce da própria venda partner_plan, que já contou — somar as duas
//     seria contar o mesmo aporte duas vezes.
//   • Venda de "franquia": adesões pagas reais — kind='seller_adhesion'
//     (Vendedor) e kind='adesao' (upgrade de cargo), classificadas pelo cargo
//     em adesao_level/product_title ("Adesão {nome do nível}").
// Venda de produto da Loja/leilão NÃO conta — meta é de captação/expansão,
// não de mercadoria.
import { isVendaReal } from './dinheiroReal.js';

export const META_CAPTACAO = 1000000;

// Ordem OFICIAL do dono — nunca reordenar sem decisão dele.
export const BUCKETS_CAPTACAO = [
  { id: 'aporte_parceiro', label: 'Aportes Parceiro de Compra' },
  { id: 'vendedor', label: 'Vendas de Vendedores' },
  { id: 'licenciado', label: 'Licenciados' },
  { id: 'loja_fisica', label: 'Loja Física' },
  { id: 'ponto_retirada', label: 'Ponto de Retirada' },
  { id: 'parceiro_distribuidor', label: 'Parceiro e Distribuidor' },
  { id: 'outras_adesoes', label: 'Outras adesões' },
];

const norm = (v) => String(v || '').toLowerCase();

/** Em qual balde da meta esta venda cai — ou null se não é captação. */
export function bucketDaVenda(s) {
  if (s.kind === 'partner_plan') return 'aporte_parceiro';
  if (s.kind === 'seller_adhesion') return 'vendedor';
  if (s.kind !== 'adesao') return null;
  const texto = norm(`${s.adesao_level} ${s.product_title}`);
  if (texto.includes('vendedor')) return 'vendedor';
  if (texto.includes('licenciado')) return 'licenciado';
  if (texto.includes('loja')) return 'loja_fisica';
  if (texto.includes('ponto')) return 'ponto_retirada';
  if (texto.includes('distribuidor') || texto.includes('parceiro')) return 'parceiro_distribuidor';
  // adesão de cargo que não bate com nenhum nome conhecido: aparece em
  // "Outras adesões" — nunca somem em silêncio.
  return 'outras_adesoes';
}

/**
 * Soma a captação por balde, na ordem oficial.
 * @param sales linhas de catalog_sales (já no escopo de quem está vendo)
 * @param partnerPurchases linhas de partner_plan_purchases (mesmo escopo)
 */
export function calcularCaptacao(sales = [], partnerPurchases = []) {
  const porBucket = Object.fromEntries(BUCKETS_CAPTACAO.map((b) => [b.id, 0]));
  for (const s of sales) {
    const bucket = bucketDaVenda(s);
    if (!bucket || !isVendaReal(s)) continue;
    porBucket[bucket] += Number(s.total_amount) || 0;
  }
  for (const p of partnerPurchases) {
    if (p.activation_source !== 'manual') continue; // automática já contou na venda
    if (String(p.status || '') === 'canceled') continue;
    porBucket.aporte_parceiro += Number(p.plan_amount) || 0;
  }
  const total = Object.values(porBucket).reduce((s, v) => s + v, 0);
  return { porBucket, total, meta: META_CAPTACAO, faltam: Math.max(0, META_CAPTACAO - total) };
}
