// dashboardDiretoria — os 12 NÚMEROS DO DASHBOARD DIÁRIO DA DIRETORIA
// (DIR-23, 30/08/2026). Fonte: RESUMO EXECUTIVO INTEGRADO do dono, Seção 37,
// com a regra de governança do próprio documento: separar DADO REALIZADO de
// PREMISSA e PROJEÇÃO. Aqui isso vira a etiqueta `tipo` de cada número:
//   • 'dado'        → calculado de venda/cadastro REAL do sistema
//   • 'aproximacao' → calculado de dado real, mas com fórmula-proxy declarada
//                     (ex.: "usuário ativo" medido por atividade financeira,
//                     porque não existe rastro de login no sistema)
//   • 'sem_fonte'   → o sistema ainda não mede — aparece como pendência
//                     explícita, NUNCA como número inventado.
// Venda usa sempre o critério oficial de dinheiro real (src/lib/dinheiroReal.js).
import { isVendaReal } from './dinheiroReal.js';
import { calcularMetaCentral, META_ONLINE_MES, META_FISICA_MES, META_VENDAS_MES } from './metaCentral.js';
import { buildCostMap, custoDaVenda, unidadesEmEstoque } from './custoProduto.js';

export const JANELA_ATIVIDADE_DIAS = 30;

// Os 12 números, na ordem da Seção 37 (metas literais do documento).
export const KPIS_DIRETORIA = [
  { id: 'usuarios_ativos', label: 'Usuários ativos', meta: 250000, unidade: 'num' },
  { id: 'novos_usuarios_dia', label: 'Novos usuários/dia', meta: 1000, unidade: 'num' },
  { id: 'visitantes_ranking', label: 'Visitantes Ranking/dia', meta: 1200, unidade: 'num' },
  { id: 'cadastros_ranking', label: 'Cadastros Ranking/dia', meta: 340, unidade: 'num' },
  { id: 'k_factor', label: 'K-Factor (indicações)', meta: 2, unidade: 'x' },
  { id: 'conversao_digital', label: 'Conversão digital', meta: 6.4, unidade: 'pct' },
  { id: 'ticket_medio', label: 'Ticket médio por comprador (mês)', meta: 252, unidade: 'brl' },
  { id: 'venda_online', label: 'Venda online (mês)', meta: META_ONLINE_MES, unidade: 'brl' },
  { id: 'venda_fisica', label: 'Venda física (mês)', meta: META_FISICA_MES, unidade: 'brl' },
  { id: 'faturamento_total', label: 'Faturamento total (mês)', meta: META_VENDAS_MES, unidade: 'brl' },
  { id: 'custo_aquisicao', label: 'Custo de aquisição (listas)', meta: 22.8, unidade: 'pct', metaEhTeto: true },
  { id: 'roi_operacional', label: 'ROI operacional', meta: 113.68, unidade: 'pct' },
];

const diasAtras = (ref, dias) => new Date(ref.getTime() - dias * 24 * 60 * 60 * 1000);

/**
 * Calcula os 12 números com o que o sistema mede HOJE.
 * @param sales catalog_sales da plataforma (painel só de visão total)
 * @param users AppUser da plataforma
 * @param products produtos do galpão inteiro (custo de aquisição e ROI)
 * @param ref   Date de referência ("hoje" — parâmetro pra ser testável)
 */
export function calcularDashboardDiretoria({ sales = [], users = [], products = [], ref = new Date() } = {}) {
  const vendasReais = sales.filter(isVendaReal);
  const corte30d = diasAtras(ref, JANELA_ATIVIDADE_DIAS);
  const corte7d = diasAtras(ref, 7);

  // 1) Usuários ativos — com rastro de LOGIN quando a coluna last_login já
  // existe e está preenchida (DIR-29: carimbada no servidor a cada login):
  // ativo = logou OU movimentou dinheiro real em 30 dias. Enquanto ninguém
  // tem last_login (migração ainda não aplicada), cai na aproximação
  // anterior: só atividade financeira.
  const compradores30d = new Set(
    vendasReais.filter((s) => new Date(s.created_date) >= corte30d).map((s) => s.buyer_id).filter(Boolean)
  );
  const temRastroLogin = users.some((u) => u.last_login);
  const logaram30d = users.filter((u) => u.last_login && new Date(u.last_login) >= corte30d);
  const ativos30d = temRastroLogin
    ? new Set([...compradores30d, ...logaram30d.map((u) => u.id)]).size
    : compradores30d.size;

  // 2) Novos usuários/dia — média dos últimos 7 dias de cadastro (dado real).
  const novos7d = users.filter((u) => u.created_date && new Date(u.created_date) >= corte7d).length;
  const novosPorDia = novos7d / 7;

  // 5) K-Factor aproximado — dos usuários novos (30d), quantos vieram por
  // indicação, dividido pelos indicadores distintos que os trouxeram:
  // "cada pessoa que indica traz em média K novos". Meta do documento: ≥ 2.
  const novos30d = users.filter((u) => u.created_date && new Date(u.created_date) >= corte30d);
  const indicados30d = novos30d.filter((u) => u.referred_by_id);
  const indicadores = new Set(indicados30d.map((u) => u.referred_by_id)).size;
  const kFactor = indicadores ? indicados30d.length / indicadores : 0;

  // 6) Conversão digital — MESMA fórmula do Painel de Alavancagem/CRM
  // (compradores reais únicos ÷ base total), pra nunca divergir entre telas.
  const compradoresUnicos = new Set(vendasReais.map((s) => s.buyer_id).filter(Boolean)).size;
  const conversao = users.length ? (compradoresUnicos / users.length) * 100 : 0;

  // 7) Ticket médio do mês — POR COMPRADOR, não por pedido (DIR-26,
  // conferência do dono em 30/08): a meta de R$ 252 do Resumo Executivo é
  // gasto por comprador/mês (é assim que o documento constrói os R$ 4M:
  // compradores × R$ 252). Dividir pelo nº de pedidos subestimava o KPI.
  // Só mercadoria real (Loja + Leilão) — depósito NÃO entra (vira compra
  // quando é gasto; somar os dois contaria o mesmo real duas vezes).
  const vendasMercadoriaMes = vendasReais.filter(
    (s) => ['loja', 'produto', 'arremate'].includes(s.kind)
      && new Date(s.created_date).getUTCFullYear() === ref.getUTCFullYear()
      && new Date(s.created_date).getUTCMonth() === ref.getUTCMonth()
  );
  const somaMes = vendasMercadoriaMes.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const compradoresMes = new Set(vendasMercadoriaMes.map((s) => s.buyer_id).filter(Boolean)).size;
  const ticketMedio = compradoresMes ? somaMes / compradoresMes : 0;

  // 8/9/10) Metas centrais — mesma função do painel R$ 5M (fonte única).
  const metaCentral = calcularMetaCentral(sales, ref);

  // 11) Custo de aquisição (DIR-29) — Σ custo dos lotes ÷ Σ potencial de
  // venda da vitrine (preço de varejo × todas as unidades do lote, galpão
  // inteiro). APROXIMAÇÃO declarada: a referência ~22,8% do documento é
  // sobre o valor de MERCADO, e nossa vitrine vende ~20% abaixo dele — o %
  // real sobre o mercado é ainda MENOR que o mostrado aqui.
  const custoLotes = products.reduce((s, p) => s + (Number(p.cost_price) || 0), 0);
  const potencialVitrine = products.reduce((s, p) => {
    const unidades = unidadesEmEstoque(p) + (Number(p.quantity_sold) || 0);
    return s + (Number(p.selling_price_retail) || 0) * unidades;
  }, 0);
  const custoAquisicao = potencialVitrine > 0 ? (custoLotes / potencialVitrine) * 100 : null;

  // 12) ROI operacional (DIR-29) — sobre o que foi VENDIDO de verdade no
  // mês: (receita real de mercadoria − custo das unidades vendidas) ÷ custo.
  // Só entra venda com produto vinculado (product_id/items_json — mesma
  // ligação do Painel de Lucro Diário); a cobertura vai na fonte.
  const costMap = buildCostMap(products);
  const vendasComCusto = vendasMercadoriaMes.filter((s) => custoDaVenda(s, costMap) > 0);
  const custoVendido = vendasComCusto.reduce((s, v) => s + custoDaVenda(v, costMap), 0);
  const receitaComCusto = vendasComCusto.reduce((s, v) => s + (Number(v.total_amount) || 0), 0);
  const roiOperacional = custoVendido > 0 ? ((receitaComCusto - custoVendido) / custoVendido) * 100 : null;

  const valores = {
    usuarios_ativos: temRastroLogin
      ? { realizado: ativos30d, tipo: 'dado', fonte: `Pessoas que logaram OU movimentaram dinheiro real nos últimos ${JANELA_ATIVIDADE_DIAS} dias (rastro de login ativo desde a DIR-29).` }
      : { realizado: ativos30d, tipo: 'aproximacao', fonte: `Compradores/depositantes únicos com movimento real nos últimos ${JANELA_ATIVIDADE_DIAS} dias. Quando a migração de last_login for aplicada, a conta oficial passa a ser login OU movimento em 30 dias.` },
    novos_usuarios_dia: { realizado: novosPorDia, tipo: 'dado', fonte: 'Média diária de cadastros dos últimos 7 dias (AppUser.created_date).' },
    visitantes_ranking: { realizado: null, tipo: 'sem_fonte', fonte: 'Precisa de analytics de visita na página do Ranking Premiado — o sistema ainda não mede.' },
    cadastros_ranking: { realizado: null, tipo: 'sem_fonte', fonte: 'Precisa de marcação de origem "Ranking" no cadastro — o sistema ainda não mede.' },
    k_factor: { realizado: kFactor, tipo: 'aproximacao', fonte: 'Novos usuários indicados (30d) ÷ indicadores distintos que os trouxeram (árvore referred_by_id).' },
    conversao_digital: { realizado: conversao, tipo: 'dado', fonte: 'Compradores reais únicos ÷ base total de usuários — mesma fórmula do Painel de Alavancagem.' },
    ticket_medio: { realizado: ticketMedio, tipo: 'dado', fonte: 'Vendas reais de mercadoria do mês (Loja + Leilão) ÷ compradores únicos do mês — a meta de R$ 252 do Resumo Executivo é por comprador. Não confundir com o "Ticket médio / comprador" do Espelho, que copia o Painel de Alavancagem (soma depósitos e é desde 01/08, não do mês).' },
    venda_online: { realizado: metaCentral.online, tipo: 'dado', fonte: 'Compras brutas da Loja Virtual + arremates de leilão do mês, critério oficial de dinheiro real.' },
    venda_fisica: { realizado: metaCentral.fisica, tipo: 'dado', fonte: 'Vendas de balcão do mês registradas no PDV (source=\'pdv\'), critério oficial de dinheiro real.' },
    faturamento_total: { realizado: metaCentral.total, tipo: 'dado', fonte: 'Online (site + leilão) + física (balcão/PDV) do mês — os dois trilhos com dado real.' },
    custo_aquisicao: custoAquisicao === null
      ? { realizado: null, tipo: 'sem_fonte', fonte: 'Sem produto com preço de vitrine cadastrado ainda.' }
      : { realizado: custoAquisicao, tipo: 'aproximacao', fonte: 'Custo total dos lotes ÷ potencial de venda da vitrine (galpão inteiro). A referência de ~22,8% do documento é sobre o valor de MERCADO — como a vitrine vende ~20% abaixo dele, o % real sobre o mercado é ainda menor que este.' },
    roi_operacional: roiOperacional === null
      ? { realizado: null, tipo: 'sem_fonte', fonte: 'Nenhuma venda do mês com produto vinculado (custo conhecido) ainda.' }
      : { realizado: roiOperacional, tipo: 'aproximacao', fonte: `(Receita − custo) ÷ custo das vendas reais do mês COM produto vinculado — mesma ligação venda→custo do Painel de Lucro Diário. Cobertura: ${vendasComCusto.length} de ${vendasMercadoriaMes.length} vendas do mês têm custo conhecido.` },
  };

  return KPIS_DIRETORIA.map((kpi) => ({ ...kpi, ...valores[kpi.id] }));
}
