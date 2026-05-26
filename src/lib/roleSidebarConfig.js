/**
 * 🛡️ roleSidebarConfig — Configuração centralizada da sidebar lateral por role
 *
 * Define:
 *   1. PANEL_PAGES_BY_ROLE: páginas internas que ativam a sidebar para cada role
 *   2. SIDEBAR_ITEMS_BY_ROLE: itens da sidebar para cada role (exceto admin)
 *   3. getSidebarConfigForUser(): função que retorna {showSidebar, items, role, title}
 *
 * REGRAS:
 *   - admin/super_admin tem PRECEDÊNCIA absoluta sobre outros roles
 *   - Páginas públicas (Home, Catalog, Licensing, AuctionRoom, Cart, etc.) → SEM sidebar
 *   - Profile com ?from=catalog → SEM sidebar (vem do contexto da loja virtual)
 *   - Vendedor (is_seller) no Catalog → SEM sidebar (catálogo é público)
 */

// =====================================================================
// 1. PÁGINAS PÚBLICAS — SEMPRE sem sidebar (independente do role)
// =====================================================================
const PUBLIC_PAGES = new Set([
  "Home",
  "Catalog",
  "CatalogProductDetails",
  "Cart",
  "CatalogCheckout",
  "CatalogCheckout2",
  "CatalogOrderTracking",
  "MyCatalogOrders",
  "Licensing", // pode ser página pública OU painel licensee — tratado abaixo
  "AuctionRoom",
  "AuctionDetails",
  "AuctionCheckoutModern",
  "Checkout",
  "Landing",
  "Portal",
  "Register",
  "ForgotPassword",
  "ResetPassword",
  "AcessoVendedor",
  "AcessoArrematante",
  "PrivacyPolicy",
  "TermsOfUse",
  "LuxuryCollection",
  "DiretoDeFabrica",
  "PartnerPlanActivation", // ativação pública via PIX
  "PaymentFailure",
  // Portal landings
  "PortalArrematante",
  "PortalLojaVirtual",
  "PortalLicenciado",
  "PortalLojista",
  "PortalVendedor",
  "PortalInvestidor",
  "PortalLeiloeiro",
]);

// =====================================================================
// 2. PÁGINAS INTERNAS POR ROLE — ativam a sidebar quando o user tem o role
// =====================================================================
// ADMIN/SUPER_ADMIN: usa lista derivada do adminMenuItems passado por param.
// Demais roles: lista fixa.

const PANEL_PAGES_BY_ROLE = {
  lojista: new Set([
    "LojistaDashboard",
    "CatalogManagement",
    "CatalogOrdersAdmin",
    "Profile",
  ]),
  vendedor: new Set([
    "SellerPanel",
    "Profile",
  ]),
  licensee: new Set([
    "Licensing", // licensee logado em Licensing = painel dele
    "Profile",
    "AddFunds",
  ]),
  investidor: new Set([
    "CarteiraInvestidor",
    "MarketplaceLotes",
    "Profile",
  ]),
  leiloeiro: new Set([
    "ParceiroLotes",
    "CRMInvestidores",
    "GestaoLotes",
    "Profile",
  ]),
  arrematante: new Set([
    "MyWinnings",
    "AddFunds",
    "WalletHistory",
    "Profile",
  ]),
};

// =====================================================================
// 3. ITENS DA SIDEBAR POR ROLE (exceto admin — que reaproveita adminMenuItems)
// =====================================================================
const SIDEBAR_ITEMS_BY_ROLE = {
  lojista: {
    title: "Painel Lojista",
    items: [
      { title: "🏪 Dashboard", pageName: "LojistaDashboard" },
      { title: "🛍️ Minha Loja", pageName: "CatalogManagement" },
      { title: "📦 Pedidos", pageName: "CatalogOrdersAdmin" },
      { title: "👤 Meu Perfil", pageName: "Profile" },
    ],
  },
  vendedor: {
    title: "Painel Vendedor",
    items: [
      { title: "📊 Dashboard", pageName: "SellerPanel" },
      { title: "👤 Meu Perfil", pageName: "Profile" },
    ],
  },
  licensee: {
    title: "Painel Licenciado",
    items: [
      { title: "📊 Dashboard", pageName: "Licensing" },
      { title: "💰 Minha Carteira", pageName: "AddFunds" },
      { title: "👤 Meu Perfil", pageName: "Profile" },
    ],
  },
  investidor: {
    title: "Painel Investidor",
    items: [
      { title: "💼 Minha Carteira", pageName: "CarteiraInvestidor" },
      { title: "🛒 Marketplace de Lotes", pageName: "MarketplaceLotes" },
      { title: "👤 Meu Perfil", pageName: "Profile" },
    ],
  },
  leiloeiro: {
    title: "Painel Leiloeiro",
    items: [
      { title: "📋 Meus Lotes", pageName: "ParceiroLotes" },
      { title: "🔨 Gestão de Lotes", pageName: "GestaoLotes" },
      { title: "👥 CRM Investidores", pageName: "CRMInvestidores" },
      { title: "👤 Meu Perfil", pageName: "Profile" },
    ],
  },
  arrematante: {
    title: "Painel Arrematante",
    items: [
      { title: "🏆 Meus Arremates", pageName: "MyWinnings" },
      { title: "💰 Minha Carteira", pageName: "AddFunds" },
      { title: "📊 Histórico", pageName: "WalletHistory" },
      { title: "👤 Meu Perfil", pageName: "Profile" },
    ],
  },
};

// =====================================================================
// 4. HELPER: extrai todas as pageNames do adminMenuItems
// =====================================================================
function extractAdminPageNames(adminMenuItems) {
  const set = new Set();
  if (!Array.isArray(adminMenuItems)) return set;
  for (const cat of adminMenuItems) {
    if (Array.isArray(cat.items)) {
      for (const it of cat.items) {
        if (it.pageName) set.add(it.pageName);
      }
    }
  }
  return set;
}

// =====================================================================
// 5. FUNÇÃO PRINCIPAL — retorna config para Layout
// =====================================================================
export function getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems) {
  const empty = { showSidebar: false, items: [], role: null, title: null };

  if (!currentUser || !currentUser.email) return empty;

  // Lê ?from=catalog UMA vez (Profile + qualquer página que use o flag)
  let fromCatalog = false;
  try {
    const params = new URLSearchParams(window.location.search);
    fromCatalog = params.get("from") === "catalog";
  } catch {
    fromCatalog = false;
  }

  // Profile com ?from=catalog NUNCA mostra sidebar
  if (currentPageName === "Profile" && fromCatalog) return empty;

  // Páginas públicas NUNCA mostram sidebar
  // EXCEÇÃO: "Licensing" é tratado abaixo (público para visitante / painel para licensee)
  if (currentPageName !== "Licensing" && PUBLIC_PAGES.has(currentPageName)) {
    return empty;
  }

  // ────────────────────────────────────────────────────────────
  // PRECEDÊNCIA ABSOLUTA: ADMIN / SUPER_ADMIN
  // ────────────────────────────────────────────────────────────
  const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";
  if (isAdmin) {
    const adminPages = extractAdminPageNames(adminMenuItems);
    // Sidebar admin aparece em qualquer página admin OU em Profile (sem ?from=catalog)
    if (adminPages.has(currentPageName) || currentPageName === "Profile") {
      return {
        showSidebar: true,
        role: currentUser.role,
        title: currentUser.role === "super_admin" ? "Painel Super Admin" : "Painel Admin",
        // Admin usa o formato categorizado direto do adminMenuItems
        categorized: true,
        items: adminMenuItems,
      };
    }
    return empty;
  }

  // ────────────────────────────────────────────────────────────
  // OUTROS ROLES
  // ────────────────────────────────────────────────────────────
  const role = currentUser.role;

  // LICENSEE
  if (role === "licensee" && PANEL_PAGES_BY_ROLE.licensee.has(currentPageName)) {
    return {
      showSidebar: true,
      role: "licensee",
      categorized: false,
      ...SIDEBAR_ITEMS_BY_ROLE.licensee,
    };
  }

  // INVESTIDOR
  if (role === "investidor" && PANEL_PAGES_BY_ROLE.investidor.has(currentPageName)) {
    return {
      showSidebar: true,
      role: "investidor",
      categorized: false,
      ...SIDEBAR_ITEMS_BY_ROLE.investidor,
    };
  }

  // LEILOEIRO
  if (role === "leiloeiro" && PANEL_PAGES_BY_ROLE.leiloeiro.has(currentPageName)) {
    return {
      showSidebar: true,
      role: "leiloeiro",
      categorized: false,
      ...SIDEBAR_ITEMS_BY_ROLE.leiloeiro,
    };
  }

  // ARREMATANTE (explícito)
  if (role === "arrematante" && PANEL_PAGES_BY_ROLE.arrematante.has(currentPageName)) {
    return {
      showSidebar: true,
      role: "arrematante",
      categorized: false,
      ...SIDEBAR_ITEMS_BY_ROLE.arrematante,
    };
  }

  // VENDEDOR (is_seller flag — não tem role próprio)
  // Não mostra sidebar no Catalog (catálogo é público)
  if (currentUser.is_seller === true && currentPageName !== "Catalog" && PANEL_PAGES_BY_ROLE.vendedor.has(currentPageName)) {
    return {
      showSidebar: true,
      role: "vendedor",
      categorized: false,
      ...SIDEBAR_ITEMS_BY_ROLE.vendedor,
    };
  }

  // LOJISTA: detectado por career_levels contendo "licenciado_catalogo"
  // OU por role lojista (não existe no enum atual, mas reservado)
  const isLojista =
    Array.isArray(currentUser.career_levels) &&
    currentUser.career_levels.includes("licenciado_catalogo");
  if (isLojista && PANEL_PAGES_BY_ROLE.lojista.has(currentPageName)) {
    return {
      showSidebar: true,
      role: "lojista",
      categorized: false,
      ...SIDEBAR_ITEMS_BY_ROLE.lojista,
    };
  }

  return empty;
}