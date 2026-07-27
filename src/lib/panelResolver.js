/**
 * panelResolver.js
 * Função utilitária PURA que recebe um AppUser e retorna a lista
 * de painéis disponíveis para ele, com seus metadados.
 *
 * Regras:
 * 1. Se enabled_panels existe e tem itens → usa como fonte de verdade
 * 2. Caso contrário → deriva automaticamente dos campos legados
 *    (role, career_levels, is_seller, arrematante_context, licenciado_context)
 *
 * IMPORTANTE: NÃO importa nada de React/Lucide aqui.
 * Os metadados visuais (ícone, cor) são consumidos pelos componentes.
 */

// 📚 Metadados de todos os painéis disponíveis no sistema
export const PANEL_METADATA = {
  loja_virtual: {
    key: "loja_virtual",
    title: "Loja Virtual",
    description: "Compre produtos selecionados com pagamento PIX",
    iconName: "ShoppingBag",
    iconColor: "bg-orange-600",
    route: "/Loja-Virtual",
  },
  arrematante: {
    key: "arrematante",
    title: "Arrematante",
    description: "Dê lances em leilões diários e arremate produtos",
    iconName: "Gavel",
    iconColor: "bg-emerald-600",
    route: "/leiloes",
  },
  vendedor: {
    key: "vendedor",
    title: "Painel do Vendedor",
    description: "Gerencie suas vendas e comissões recrutadas",
    iconName: "Store",
    iconColor: "bg-purple-600",
    route: "/SellerPanel",
  },
  lojista: {
    key: "lojista",
    title: "Painel do Lojista",
    description: "Sua loja virtual própria com produtos prontos",
    iconName: "Building2",
    iconColor: "bg-fuchsia-600",
    route: "/LojistaDashboard",
  },
  licenciado: {
    key: "licenciado",
    title: "Painel do Licenciado",
    description: "Indique clientes e ganhe comissões em múltiplos níveis",
    iconName: "Briefcase",
    iconColor: "bg-blue-600",
    route: "/Licensing",
  },
  investidor: {
    key: "investidor",
    title: "Painel do Investidor",
    description: "Aplique capital em lotes selecionados",
    iconName: "TrendingUp",
    iconColor: "bg-amber-600",
    route: "/MarketplaceLotes",
  },
  // 💰 Parceiro de Compra (quem contratou plano em /Partners) — é AQUI que ele acompanha
  // o rendimento. Sem este painel, o parceiro logado não tinha nenhum link para o painel dele.
  parceiro_compra: {
    key: "parceiro_compra",
    title: "Painel do Parceiro",
    description: "Acompanhe suas compras e seu rendimento",
    iconName: "TrendingUp",
    iconColor: "bg-amber-600",
    route: "/InvestorDashboard",
  },
  leiloeiro: {
    key: "leiloeiro",
    title: "Painel do Leiloeiro",
    description: "Conduza leilões oficiais com suporte total",
    iconName: "Hammer",
    iconColor: "bg-red-600",
    route: "/ParceiroLotes",
  },
  admin: {
    key: "admin",
    title: "Painel Admin",
    description: "Acesso completo ao sistema e operações",
    iconName: "Shield",
    iconColor: "bg-slate-700",
    route: "/AuctionControl",
  },
  super_admin: {
    key: "super_admin",
    title: "Super Admin",
    description: "Painel de controle máximo do sistema",
    iconName: "Crown",
    iconColor: "bg-yellow-600",
    // 26/07: abre o Painel de Controle completo (pedido Gabriel);
    // a Gestão de Habilitações fica na sidebar em Sistema → Habilitar Painéis
    route: "/NetworkOverview",
  },
};

/**
 * Deriva os painéis a partir dos campos legados do AppUser.
 * Usado quando enabled_panels está vazio/undefined (compatibilidade).
 */
function derivePanelsFromLegacyFields(user) {
  if (!user) return [];

  const panels = new Set();
  const careerLevels = Array.isArray(user.career_levels) ? user.career_levels : [];
  const role = user.role;

  // Super Admin → acesso DEFAULT a todos os painéis (pra testar cada ambiente).
  // Pode ser sobrescrito por enabled_panels caso o super admin queira filtrar.
  if (role === "super_admin") {
    Object.keys(PANEL_METADATA).forEach((k) => panels.add(k));
    return Array.from(panels);
  }

  // Admin
  if (role === "admin") {
    panels.add("admin");
  }

  // Leiloeiro
  if (role === "leiloeiro") {
    panels.add("leiloeiro");
  }

  // Investidor
  if (role === "investidor") {
    panels.add("investidor");
  }

  // Parceiro de Compra: quem contratou/ativou um plano em /Partners (role continua 'user')
  if (user.partner_plan_activated_at || user.active_partner_plan) {
    panels.add("parceiro_compra");
  }

  // 🌳 PAINEL DE ALAVANCAGEM pela ÁRVORE OFICIAL (27/07/2026).
  // Antes, o painel só abria por cargo ANTIGO (licenciado_aplicativo,
  // licenciado_catalogo) ou por licenciado_context.enabled. Os dois sumiram no
  // saneamento desta madrugada — os cargos velhos eram resíduo da loja antiga e
  // foram apagados, e a gravação da carteira executiva sobrescreveu o contexto.
  // Resultado: 12 pessoas com cargo de verdade ficaram sem o painel, entre elas a
  // Eloá (distribuidora/fundadora/diretora) e o Gabriel (influenciador).
  //
  // A regra agora é a do plano, não a do cadastro legado: DO INFLUENCIADOR PARA
  // CIMA todo mundo participa da distribuição e enxerga a própria alavancagem.
  // Quem tem cargo de topo (governança/gestão) também, porque recebe pelo cargo.
  const REDE_COM_ALAVANCAGEM = [
    "influenciador", "vendedor", "licenciado", "parceiro",
    "ponto_retirada", "loja_fisica", "distribuidor",
  ];
  const CARGOS_DE_TOPO = [
    "ceo", "livoo_live", "embaixador", "conselheiro", "fundador",
    "diretoria_executiva", "diretoria_operacao", "executivo_conta", "trainee_diretor",
  ];
  const temAlgum = (ids) => ids.some((c) => careerLevels.includes(c));

  if (
    role === "licensee" ||
    careerLevels.includes("licenciado_aplicativo") || // legado: contas antigas ainda válidas
    careerLevels.includes("licenciado_catalogo") ||
    user.licenciado_context?.enabled === true ||
    temAlgum(REDE_COM_ALAVANCAGEM) ||
    temAlgum(CARGOS_DE_TOPO)
  ) {
    panels.add("licenciado");
  }

  // Lojista: quem tem loja própria de verdade — distribuidor, loja física e ponto
  // de retirada operam estoque. O restante da rede vende pelo link, não por loja.
  if (
    careerLevels.includes("plano_lojista") ||
    careerLevels.includes("plano_lider") ||
    careerLevels.includes("distribuidor") ||
    careerLevels.includes("loja_fisica") ||
    careerLevels.includes("ponto_retirada")
  ) {
    panels.add("lojista");
  }

  // Vendedor: painel próprio. Ele é nível de entrada da rede — o forte dele é o
  // Rank Premiado, por isso o painel existe mesmo sem is_seller marcado no cadastro.
  if (user.is_seller === true || careerLevels.includes("vendedor")) {
    panels.add("vendedor");
  }

  // Arrematante (qualquer usuário logado pode dar lances)
  if (
    role === "arrematante" ||
    user.arrematante_context?.enabled === true ||
    user.email // fallback: qualquer usuário autenticado vê leilões
  ) {
    panels.add("arrematante");
  }

  // Loja Virtual (todos os usuários autenticados podem comprar)
  if (user.email) {
    panels.add("loja_virtual");
  }

  return Array.from(panels);
}

/**
 * Resolve a lista de painéis disponíveis para um usuário.
 * @param {Object} user - O objeto AppUser
 * @returns {Array} Lista de objetos PANEL_METADATA dos painéis liberados
 */
export function resolveUserPanels(user) {
  if (!user) return [];

  // Super Admin sempre tem acesso a TODOS os painéis (ignora enabled_panels).
  // É login default de teste — pode entrar em cada ambiente como se fosse o role.
  const isSuperAdmin = user.role === "super_admin";

  // 1) Se enabled_panels foi configurado manualmente → fonte de verdade
  //    (mas super_admin sempre recebe todos, mesmo com enabled_panels vazio/parcial)
  const explicitPanels = Array.isArray(user.enabled_panels) ? user.enabled_panels : [];

  // enabled_panels SOMA, não limita (27/07/2026). Antes ele substituía a derivação:
  // quem tinha uma lista salva ficava preso a ela e o cargo era ignorado — o
  // DISTRIBUIDOR BANGU, com cargo de distribuidor, não via nem a loja nem a
  // alavancagem porque a lista antiga só tinha dois painéis. A marcação manual do
  // super admin passa a ser o que sempre foi na prática: liberação EXTRA, por cima
  // do que o cargo já garante. Ninguém perde acesso; quem tinha cargo passa a ver.
  let keys = isSuperAdmin
    ? Object.keys(PANEL_METADATA)
    : [...explicitPanels, ...derivePanelsFromLegacyFields(user)];

  // Remove duplicados e filtra apenas chaves conhecidas
  keys = Array.from(new Set(keys)).filter((k) => !!PANEL_METADATA[k]);

  // Ordem visual preferencial (do mais comum ao mais técnico)
  const order = [
    "loja_virtual",
    "arrematante",
    "vendedor",
    "lojista",
    "licenciado",
    "investidor",
    "leiloeiro",
    "admin",
    "super_admin",
  ];
  keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return keys.map((k) => PANEL_METADATA[k]);
}

/**
 * Lista todos os painéis disponíveis no sistema (para uso pelo Super Admin).
 */
export function getAllPanels() {
  return Object.values(PANEL_METADATA);
}