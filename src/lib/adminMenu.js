/**
 * adminMenu — Estrutura oficial do menu do Painel de Controle (Admin / Super Admin)
 *
 * REGRA PERMANENTE (pedido Gabriel 26/07/2026):
 *   • ZERO emoji no super admin. Todo item usa ícone lucide-react.
 *   • Cada categoria e cada item carrega `icon` (componente React, não string).
 *
 * Consumido por:
 *   • Layout.jsx           → passa para AdminTopNav e getSidebarConfigForUser
 *   • AdminTopNav.jsx      → barra de comando no topo + mega-menu + busca (Cmd+K)
 *   • roleSidebarConfig.js → mapeia páginas admin para o contexto "admin"
 */
import {
  LayoutDashboard,
  Gavel,
  Crown,
  Video,
  Hammer,
  Store,
  ShoppingBag,
  Ticket,
  Image as ImageIcon,
  Palette,
  Package,
  Boxes,
  PackageSearch,
  Wallet,
  ChartLine,
  ShieldCheck,
  ArrowLeftRight,
  CreditCard,
  ClipboardCheck,
  Handshake,
  Users,
  UsersRound,
  Megaphone,
  Building2,
  UserPlus,
  KeyRound,
  Bot,
  TrendingUp,
  Settings,
  Activity,
  SlidersHorizontal,
  CircleUser,
  Trophy,
  User,
} from "lucide-react";

/**
 * Monta o menu admin completo.
 * @param {boolean} isSuperAdmin — libera itens exclusivos do super admin
 */
export function buildAdminMenu(isSuperAdmin = false) {
  return [
    {
      title: "Visão Geral",
      icon: LayoutDashboard,
      isCategory: true,
      items: [
        { title: "Painel de Controle", pageName: "NetworkOverview", icon: LayoutDashboard },
      ],
    },
    {
      title: "Operação — Leilões",
      icon: Gavel,
      isCategory: true,
      items: [
        { title: "Controle de Leilões", pageName: "AuctionControl", icon: Gavel },
        { title: "Criar Leilão de Luxo", pageName: "CreateLuxuryAuction", icon: Crown },
        { title: "Live Shop", pageName: "LiveShopControlNoZap", icon: Video },
        { title: "Sistema de Arremate", pageName: "SistemaDeArremate", icon: Hammer },
      ],
    },
    {
      title: "Operação — Loja Virtual",
      icon: Store,
      isCategory: true,
      items: [
        { title: "Gerenciar Loja Virtual", pageName: "CatalogManagement", icon: Store },
        { title: "Pedidos da Loja", pageName: "CatalogOrdersAdmin", icon: ShoppingBag },
        { title: "Cupons", pageName: "CuponsAdmin", icon: Ticket },
        { title: "Banners", pageName: "BannerManagement", icon: ImageIcon },
        { title: "Material Promocional", pageName: "PromoCreator", icon: Palette },
      ],
    },
    {
      title: "Operação — Estoque",
      icon: Package,
      isCategory: true,
      items: [
        { title: "Gestão de Produtos", pageName: "ProductManagement", icon: Boxes },
        { title: "Estoque de Lotes", pageName: "EstoqueLotes", icon: PackageSearch },
      ],
    },
    {
      title: "Financeiro",
      icon: Wallet,
      isCategory: true,
      items: [
        { title: "Dashboard Financeiro", pageName: "Financial", icon: ChartLine },
        { title: "KYC & Saques", pageName: "AdminFinanceiro", icon: ShieldCheck },
        { title: "Transações", pageName: "TransactionHistory", icon: ArrowLeftRight },
        { title: "Configurar Pagamentos", pageName: "PaymentSettings", icon: CreditCard },
        { title: "Auditoria de Comissões", pageName: "CommissionPilot", icon: ClipboardCheck },
        { title: "Ativar Planos de Parceiros", pageName: "PartnerPlanActivation", icon: Handshake },
      ],
    },
    {
      title: "Rede & Pessoas",
      icon: Users,
      isCategory: true,
      items: [
        { title: "CRM", pageName: "CRM", icon: UsersRound },
        { title: "Parceiros Ativos", pageName: "ActivePartners", icon: Handshake },
        { title: "Influenciadores", pageName: "InfluencersDashboard", icon: Megaphone },
        { title: "Registrar Lojista", pageName: "StoreRegistration", icon: Building2 },
        { title: "Registrar Licenciado", pageName: "RegisterLicensee", icon: UserPlus },
        { title: "Gerenciar Senhas", pageName: "AdminUsers", icon: KeyRound },
        { title: "Acessos VIP", pageName: "LuxuryAccessManager", icon: Crown },
      ],
    },
    {
      title: "Automação & IA",
      icon: Bot,
      isCategory: true,
      items: [
        { title: "Arquiteto IA", pageName: "ArquitetoIA", icon: Bot },
        { title: "PrecificaVivo", pageName: "PrecificaVivoPainel", icon: TrendingUp },
      ],
    },
    {
      title: "Sistema",
      icon: Settings,
      isCategory: true,
      items: [
        { title: "Diagnóstico do Sistema", pageName: "SystemDiagnostics", icon: Activity },
        ...(isSuperAdmin
          ? [{ title: "Habilitar Painéis", pageName: "SuperAdminPanels", icon: SlidersHorizontal }]
          : []),
      ],
    },
    {
      title: "Minha Conta",
      icon: CircleUser,
      isCategory: true,
      items: [
        { title: "Minha Carteira", pageName: "Carteira", icon: Wallet },
        { title: "Evoluir Nível", pageName: "Evoluir", icon: TrendingUp },
        { title: "Meus Arremates", pageName: "MyWinnings", icon: Trophy },
        { title: "Perfil", pageName: "Profile", icon: User },
      ],
    },
  ];
}

/** Lista plana de todos os itens (para busca no command palette). */
export function flattenAdminMenu(menu) {
  const out = [];
  for (const cat of menu || []) {
    for (const item of cat.items || []) {
      out.push({ ...item, category: cat.title });
    }
  }
  return out;
}
