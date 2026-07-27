/**
 * 🛡️ roleSidebarConfig — Sidebar lateral ADMIN-ONLY contextual por painel
 *
 * CONCEITO OFICIAL (confirmado pelo usuário):
 *   • Sidebar lateral é EXCLUSIVA de admin/super_admin
 *   • É uma ferramenta de EDIÇÃO/GESTÃO dos painéis que o admin acessa via
 *     "Acessar como…" no dropdown do avatar
 *   • Conteúdo da sidebar muda conforme a PÁGINA atual (contexto) — NÃO conforme
 *     o role do usuário (que é sempre admin)
 *   • Usuário comum (não-admin) NUNCA vê sidebar
 *
 * FLUXO:
 *   1. Admin clica "Acessar como Vendedor" no avatar → vai pra /SellerPanel
 *   2. Sidebar detecta currentPageName=SellerPanel → contexto=vendedor
 *   3. Mostra menu de edição do painel vendedor + título "Editando: Painel Vendedor"
 *
 * EXTENSIBILIDADE:
 *   Para adicionar nova página a um contexto, edite CONTEXT_BY_PAGE.
 *   Para criar novo contexto, adicione entrada em CONTEXTS.
 */

import {
  Store,
  Package,
  Star,
  ShoppingBag,
  Truck,
  Image as ImageIcon,
  Palette,
  TrendingUp,
  Receipt,
  CreditCard,
  Gavel,
  Trophy,
  Wallet,
  History,
  LayoutDashboard,
  KeyRound,
  Building2,
  ScrollText,
  Users,
  Network,
  Handshake,
  Briefcase,
  ShoppingCart,
  UsersRound,
  ClipboardList,
  Target,
} from "lucide-react";

// =====================================================================
// 1. CONTEXTOS — cada um define título + itens da sidebar
// =====================================================================
const CONTEXTS = {
  loja_virtual: {
    title: "Painel Loja Virtual",
    items: [
      { title: "Ver a loja", pageName: "Catalog", icon: Store },
      { title: "Gestão de Produtos", pageName: "CatalogManagement", icon: Package },
      { title: "Destaques", pageName: "BannerManagement", icon: Star },
      { title: "Pedidos da Loja", pageName: "CatalogOrdersAdmin", icon: ShoppingBag },
      { title: "Meus Pedidos", pageName: "MyCatalogOrders", icon: Truck },
      { title: "Banners", pageName: "BannerManagement", icon: ImageIcon },
      { title: "Material Promocional", pageName: "PromoCreator", icon: Palette },
      { title: "PrecificaVivo", pageName: "PrecificaVivoPainel", icon: TrendingUp },
      { title: "PDV", pageName: "PDV", icon: Receipt },
      { title: "Config. Pagamentos", pageName: "PaymentSettings", icon: CreditCard },
    ],
  },
  arrematante: {
    title: "Painel Arrematante",
    items: [
      { title: "Leilões ao vivo", pageName: "Home", icon: Gavel },
      { title: "Meus Arremates", pageName: "MyWinnings", icon: Trophy },
      { title: "Minha Carteira", pageName: "AddFunds", icon: Wallet },
      { title: "Histórico Wallet", pageName: "WalletHistory", icon: History },
    ],
  },
  vendedor: {
    title: "Painel Vendedor",
    items: [
      { title: "Meu Painel", pageName: "SellerPanel", icon: LayoutDashboard },
      { title: "Loja Virtual", pageName: "Catalog", icon: ShoppingCart },
      { title: "Acesso Vendedor", pageName: "AcessoVendedor", icon: KeyRound },
    ],
  },
  lojista: {
    title: "Painel Lojista",
    items: [
      { title: "Dashboard", pageName: "LojistaDashboard", icon: Building2 },
      { title: "Minha Loja", pageName: "CatalogManagement", icon: Store },
      { title: "Pedidos", pageName: "CatalogOrdersAdmin", icon: ShoppingBag },
      { title: "Banners", pageName: "BannerManagement", icon: ImageIcon },
      { title: "Material Promocional", pageName: "PromoCreator", icon: Palette },
    ],
  },
  // 🛡️ FASE 4.6 — Contexto "licenciado" REMOVIDO.
  // O painel /Licensing tem 10 abas internas próprias (Visão Geral, Loja Virtual,
  // Minhas Vendas, Vendas Equipe, Pedidos, Meus Vendedores, Clientes, Comissões,
  // Carreira, Admin). Sidebar externa duplicava navegação e confundia. A troca
  // de painel é feita pelo dropdown do avatar (UserAvatarMenu) — fonte única.
  investidor: {
    title: "Painel Investidor",
    items: [
      { title: "Minha Carteira", pageName: "CarteiraInvestidor", icon: Briefcase },
      { title: "Marketplace de Lotes", pageName: "MarketplaceLotes", icon: ShoppingCart },
      { title: "CRM Investidores", pageName: "CRMInvestidores", icon: UsersRound },
    ],
  },
  leiloeiro: {
    title: "Painel Leiloeiro",
    items: [
      { title: "Meus Lotes", pageName: "ParceiroLotes", icon: ClipboardList },
      { title: "Gestão de Lotes", pageName: "GestaoLotes", icon: Package },
      { title: "Controle de Leilões", pageName: "AuctionControl", icon: Target },
      { title: "CRM Investidores", pageName: "CRMInvestidores", icon: UsersRound },
    ],
  },
  // Contexto especial "admin": usa o adminMenuItems completo (39 itens categorizados)
};

// =====================================================================
// 2. MAPA PÁGINA → CONTEXTO
//    Define qual contexto a sidebar deve mostrar quando o admin está em X página
// =====================================================================
const CONTEXT_BY_PAGE = {
  // 🛍️ LOJA VIRTUAL: ambiente 100% do cliente. Admin acessa IGUAL cliente vê.
  // Zero sidebar admin dentro da loja. Ferramentas admin da loja continuam
  // acessíveis por rotas diretas (/CatalogManagement, /BannerManagement, /PDV etc.)
  // e pelo dropdown do avatar. NÃO mapear páginas da Loja aqui.
  //
  //   Catalog, CatalogProductDetails, Cart, CatalogCheckout, CatalogCheckout2,
  //   MyCatalogOrders  →  sem sidebar (mesmo pra admin)

  // Arrematante — Home, AuctionRoom, AuctionDetails e MyWinnings NÃO têm sidebar: são
  // vitrines/páginas do usuário e o admin as vê igual ao usuário comum (pedido Gabriel 25/07).
  AddFunds: "arrematante",
  WalletHistory: "arrematante",

  // Vendedor
  SellerPanel: "vendedor",
  AcessoVendedor: "vendedor",

  // Lojista
  LojistaDashboard: "lojista",

  // Licenciado — 🛡️ FASE 4.6: sem sidebar externa. /Licensing usa apenas suas
  // 10 abas internas. Troca de painel via dropdown do avatar (regra mestra).

  // Investidor
  CarteiraInvestidor: "investidor",
  MarketplaceLotes: "investidor",

  // Leiloeiro
  ParceiroLotes: "leiloeiro",
  GestaoLotes: "leiloeiro",
  CRMInvestidores: "leiloeiro",

  // Super Admin (gestão de habilitações)
  SuperAdminPanels: "admin",
};

// =====================================================================
// 3. FUNÇÃO PRINCIPAL — retorna config para Layout
// =====================================================================
export function getSidebarConfigForUser(currentUser, currentPageName, adminMenuItems) {
  const empty = { showSidebar: false, items: [], title: null, context: null };

  // ✅ REATIVADA 26/07/2026 (pedido Gabriel): clicar em Super Admin deve abrir o
  // Painel de Controle completo com o menu lateral MODO ADMIN.

  // ⛔ GATE ABSOLUTO: APENAS admin/super_admin vê sidebar
  if (!currentUser || !currentUser.email) return empty;
  const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";
  if (!isAdmin) return empty;

  // 🛍️ LOJA VIRTUAL: nunca mostrar sidebar admin dentro da Loja.
  // A Loja é ambiente do cliente — admin acessa igual cliente vê. Ferramentas
  // admin da loja continuam acessíveis via rotas diretas e dropdown do avatar.
  const LOJA_PAGES = new Set([
    "Catalog",
    "CatalogProductDetails",
    "Cart",
    "CatalogCheckout",
    "CatalogCheckout2",
    "MyCatalogOrders",
  ]);
  if (LOJA_PAGES.has(currentPageName)) return empty;

  // Profile com ?from=catalog também é parte do fluxo da Loja → sem sidebar
  try {
    const params = new URLSearchParams(window.location.search);
    if (currentPageName === "Profile" && params.get("from") === "catalog") {
      return empty;
    }
  } catch { /* URLSearchParams indisponível — ignora */ }

  // 1️⃣ A página atual mapeia para algum contexto específico de painel?
  const contextKey = CONTEXT_BY_PAGE[currentPageName];
  if (contextKey && CONTEXTS[contextKey]) {
    const ctx = CONTEXTS[contextKey];
    return {
      showSidebar: true,
      categorized: false,
      context: contextKey,
      title: ctx.title,
      items: ctx.items,
    };
  }

  // 2️⃣ Página é uma das 39 páginas admin? → contexto admin (menu completo categorizado)
  const adminPageNames = new Set();
  if (Array.isArray(adminMenuItems)) {
    for (const cat of adminMenuItems) {
      if (Array.isArray(cat.items)) {
        for (const it of cat.items) {
          if (it.pageName) adminPageNames.add(it.pageName);
        }
      }
    }
  }
  if (adminPageNames.has(currentPageName) || currentPageName === "Profile") {
    return {
      showSidebar: true,
      categorized: true,
      context: "admin",
      title: currentUser.role === "super_admin"
        ? "Painel de Controle (Super Admin)"
        : "Painel de Controle (Admin)",
      items: adminMenuItems,
    };
  }

  // 3️⃣ Página pública (Home, Portal, etc.) → admin não vê sidebar (UI igual ao usuário comum)
  return empty;
}