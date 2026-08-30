// visibilidadePorPapel — MATRIZ ÚNICA de visão por papel (DIR-32, 30/08/2026).
// Regra de governança aprovada pelo dono (praxe de mercado):
//   • Custo, margem, caixa e imposto ficam em DUAS chaves: super_admin e
//     Admin Financeiro (need-to-know + segregação de funções).
//   • Diretoria (Executiva/Operacional) enxerga VENDA × META — faturamento,
//     ticket, conversão, funil, captação — mas nunca a mecânica do dinheiro
//     (é impossível cobrar meta de quem não a enxerga; é anômalo diretor ver
//     margem e custo de compra).
//   • Sócio Executivo enxerga só a PRÓPRIA estrutura (modelo gerente de
//     carteira/franquia).
//   • Fundador/Conselheiro: relatório agregado (rodada futura) — até lá,
//     rede própria como todo mundo.
// Toda tela que decide "quem vê o quê" lê DAQUI — nada de check duro
// ['admin','super_admin'] espalhado (mesma filosofia do dinheiroReal.js).
import { normalizeLevels } from './careerLevels.js';

/** KPIs do Dashboard da Diretoria que são MECÂNICA DO DINHEIRO (só quem
 *  pode ver dinheiro da empresa enxerga). */
export const KPIS_SO_DINHEIRO = ['custo_aquisicao', 'roi_operacional'];

/**
 * Calcula os poderes de visão de um usuário a partir do role (Permissão de
 * Trabalho) e dos cargos institucionais (career_levels).
 */
export function visibilidadeDoUsuario(u) {
  const role = u?.role || 'user';
  const cargos = normalizeLevels(u?.career_levels);
  const superAdmin = role === 'super_admin';
  const adminGeral = role === 'admin';
  const adminFinanceiro = role === 'admin_financeiro';
  const dirExecutiva = cargos.includes('diretoria_executiva') || cargos.includes('ceo');
  const dirOperacional = cargos.includes('diretoria_operacao');
  const socioExecutivo = cargos.includes('executivo_conta');

  // Visão TOTAL da plataforma (bypass do escopo de rede) — dono, admins e a
  // diretoria (que é cobrada pelas metas do negócio inteiro).
  const visaoTotal = superAdmin || adminGeral || adminFinanceiro || dirExecutiva || dirOperacional;
  // Dinheiro da EMPRESA (custo, margem, estoque em R$, ROI, Financeiro):
  // duas chaves + o admin geral de hoje (tirar Financeiro do 'admin' é
  // decisão expressa do dono, registrada como pendência na DIR-32).
  const verDinheiroEmpresa = superAdmin || adminGeral || adminFinanceiro;
  // Gestão de vendedores/cadastros administrativos: administrativo, não financeiro.
  const gerirVendedores = superAdmin || adminGeral;

  const papelLabel = superAdmin ? 'Super Admin'
    : adminFinanceiro ? 'Admin Financeiro'
    : adminGeral ? 'Administrador'
    : dirExecutiva ? 'Diretoria Executiva'
    : dirOperacional ? 'Diretor Operacional'
    : socioExecutivo ? 'Sócio Executivo'
    : role === 'licensee' ? 'Licenciado'
    : 'Usuário';

  return {
    superAdmin, adminGeral, adminFinanceiro,
    dirExecutiva, dirOperacional, socioExecutivo,
    visaoTotal, verDinheiroEmpresa, gerirVendedores, papelLabel,
  };
}

/** Filtra os KPIs do Dashboard da Diretoria pelo poder de ver dinheiro. */
export function filtrarKpisPorVisao(kpis, vis) {
  if (!Array.isArray(kpis)) return kpis;
  if (vis?.verDinheiroEmpresa) return kpis;
  return kpis.filter((k) => !KPIS_SO_DINHEIRO.includes(k.id));
}
