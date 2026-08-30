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

export const JANELA_ATIVIDADE_DIAS = 30;

// Os 12 números, na ordem da Seção 37 (metas literais do documento).
export const KPIS_DIRETORIA = [
  { id: 'usuarios_ativos', label: 'Usuários ativos', meta: 250000, unidade: 'num' },
  { id: 'novos_usuarios_dia', label: 'Novos usuários/dia', meta: 1000, unidade: 'num' },
  { id: 'visitantes_ranking', label: 'Visitantes Ranking/dia', meta: 1200, unidade: 'num' },
  { id: 'cadastros_ranking', label: 'Cadastros Ranking/dia', meta: 340, unidade: 'num' },
  { id: 'k_factor', label: 'K-Factor (indicações)', meta: 2, unidade: 'x' },
  { id: 'conversao_digital', label: 'Conversão digital', meta: 6.4, unidade: 'pct' },
  { id: 'ticket_medio', label: 'Ticket médio', meta: 252, unidade: 'brl' },
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
 * @param ref   Date de referência ("hoje" — parâmetro pra ser testável)
 */
export function calcularDashboardDiretoria({ sales = [], users = [], ref = new Date() } = {}) {
  const vendasReais = sales.filter(isVendaReal);
  const corte30d = diasAtras(ref, JANELA_ATIVIDADE_DIAS);
  const corte7d = diasAtras(ref, 7);

  // 1) Usuários ativos — APROXIMAÇÃO: compradores/depositantes únicos com
  // movimento real nos últimos 30 dias. Não existe rastro de login no sistema.
  const ativos30d = new Set(
    vendasReais.filter((s) => new Date(s.created_date) >= corte30d).map((s) => s.buyer_id).filter(Boolean)
  ).size;

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

  // 7) Ticket médio do mês — vendas de mercadoria reais (Loja + Leilão).
  const vendasMercadoriaMes = vendasReais.filter(
    (s) => ['loja', 'produto', 'arremate'].includes(s.kind)
      && new Date(s.created_date).getUTCFullYear() === ref.getUTCFullYear()
      && new Date(s.created_date).getUTCMonth() === ref.getUTCMonth()
  );
  const somaMes = vendasMercadoriaMes.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const ticketMedio = vendasMercadoriaMes.length ? somaMes / vendasMercadoriaMes.length : 0;

  // 8/9/10) Metas centrais — mesma função do painel R$ 5M (fonte única).
  const metaCentral = calcularMetaCentral(sales, ref);

  const valores = {
    usuarios_ativos: { realizado: ativos30d, tipo: 'aproximacao', fonte: `Compradores/depositantes únicos com movimento real nos últimos ${JANELA_ATIVIDADE_DIAS} dias. O sistema não grava login — quando gravar, a conta oficial passa a ser login OU compra em 30 dias.` },
    novos_usuarios_dia: { realizado: novosPorDia, tipo: 'dado', fonte: 'Média diária de cadastros dos últimos 7 dias (AppUser.created_date).' },
    visitantes_ranking: { realizado: null, tipo: 'sem_fonte', fonte: 'Precisa de analytics de visita na página do Ranking Premiado — o sistema ainda não mede.' },
    cadastros_ranking: { realizado: null, tipo: 'sem_fonte', fonte: 'Precisa de marcação de origem "Ranking" no cadastro — o sistema ainda não mede.' },
    k_factor: { realizado: kFactor, tipo: 'aproximacao', fonte: 'Novos usuários indicados (30d) ÷ indicadores distintos que os trouxeram (árvore referred_by_id).' },
    conversao_digital: { realizado: conversao, tipo: 'dado', fonte: 'Compradores reais únicos ÷ base total de usuários — mesma fórmula do Painel de Alavancagem.' },
    ticket_medio: { realizado: ticketMedio, tipo: 'dado', fonte: 'Vendas reais de mercadoria do mês (Loja + Leilão): valor ÷ nº de vendas.' },
    venda_online: { realizado: metaCentral.online, tipo: 'dado', fonte: 'Compras brutas da Loja Virtual + arremates de leilão do mês, critério oficial de dinheiro real.' },
    venda_fisica: { realizado: null, tipo: 'sem_fonte', fonte: 'Não existe lançamento de venda física no sistema ainda.' },
    faturamento_total: { realizado: metaCentral.total, tipo: 'dado', fonte: 'Online + física. Hoje só o online é medido — o número é o piso real, não o total.' },
    custo_aquisicao: { realizado: null, tipo: 'sem_fonte', fonte: 'Precisa cruzar custo dos lotes comprados × valor de mercado — despesa não carregada no CRM.' },
    roi_operacional: { realizado: null, tipo: 'sem_fonte', fonte: 'Depende de receita e custo operacional do módulo Financeiro alimentados.' },
  };

  return KPIS_DIRETORIA.map((kpi) => ({ ...kpi, ...valores[kpi.id] }));
}
