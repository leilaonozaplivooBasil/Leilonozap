/**
 * 🛡️ CONFIG SIDEBAR ADMIN — Leilão NoZap
 * Define categorias, itens e roles permitidas para a AdminSidebar.
 * 
 * REGRAS:
 * - Cada item lista quais roles podem vê-lo
 * - Categorias só aparecem se tiverem ao menos 1 item visível para o role atual
 * - O role é resolvido com mesma lógica do Layout.jsx (currentUser.role)
 */

import {
  LayoutDashboard, Wallet, Receipt, DollarSign, Package, ShoppingCart,
  Store, Users, UserPlus, Network, Settings, UserCog, Stethoscope,
  Key, Briefcase, Megaphone, Image, Palette, Hammer, Activity,
  Crown, Sparkles, Truck, FileText, BarChart3, Bot, Zap, Handshake,
  Eye, FolderOpen, Tag, ScrollText
} from 'lucide-react';

// 🎨 Cor accent por role (badge + item ativo)
export const ROLE_ACCENT = {
  super_admin: 'fuchsia',
  admin: 'violet',
  licensee: 'amber',
  investidor: 'violet',
  leiloeiro: 'blue',
  lojista: 'cyan',
  loja: 'cyan',
  seller: 'emerald',
  arrematante: 'green',
  user: 'emerald',
};

// 🏷️ Label da role (badge sidebar topo)
export const ROLE_LABEL = {
  super_admin: 'SUPER ADMIN',
  admin: 'ADMIN',
  licensee: 'LICENCIADO',
  investidor: 'INVESTIDOR',
  leiloeiro: 'LEILOEIRO',
  lojista: 'LOJISTA',
  loja: 'LOJISTA',
  seller: 'VENDEDOR',
  arrematante: 'ARREMATANTE',
  user: 'USUÁRIO',
};

/**
 * Estrutura: array de categorias.
 * Cada categoria: { title, items: [{ label, page, icon, roles }] }
 * - "roles" array: lista de roles que veem o item. Use ['*'] para todos.
 * - Adicional: itens com flag isSeller=true só aparecem para vendedores
 */
export const ADMIN_NAV = [
  {
    title: 'PAINEL',
    items: [
      { label: 'Início', page: 'Portal', icon: LayoutDashboard, roles: ['*'] },
      { label: 'Painel do Vendedor', page: 'SellerPanel', icon: BarChart3, roles: ['seller', 'admin', 'super_admin'], sellerOnly: true },
      { label: 'Painel do Lojista', page: 'LojistaDashboard', icon: Store, roles: ['lojista', 'loja', 'admin', 'super_admin'] },
      { label: 'Carteira Investidor', page: 'CarteiraInvestidor', icon: Wallet, roles: ['investidor', 'admin', 'super_admin'] },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      { label: 'Minha Carteira', page: 'AddFunds', icon: Wallet, roles: ['*'] },
      { label: 'Meus Arremates', page: 'MyWinnings', icon: Crown, roles: ['*'] },
      { label: 'Histórico Wallet', page: 'WalletHistory', icon: ScrollText, roles: ['*'] },
      { label: 'Dashboard Financeiro', page: 'Financial', icon: DollarSign, roles: ['admin', 'super_admin'] },
      { label: 'Transações', page: 'TransactionHistory', icon: Receipt, roles: ['admin', 'super_admin'] },
      { label: 'PDV', page: 'PDV', icon: ShoppingCart, roles: ['admin', 'super_admin'] },
      { label: 'Auditoria Comissões', page: 'CommissionPilot', icon: BarChart3, roles: ['admin', 'super_admin'] },
      { label: 'Ativar Planos Parceiros', page: 'PartnerPlanActivation', icon: Sparkles, roles: ['admin', 'super_admin'] },
      { label: 'Config. Pagamentos', page: 'PaymentSettings', icon: Settings, roles: ['admin', 'super_admin'] },
    ],
  },
  {
    title: 'OPERAÇÃO',
    items: [
      { label: 'Controle de Leilões', page: 'AuctionControl', icon: Hammer, roles: ['admin', 'super_admin', 'leiloeiro'] },
      { label: 'Sistema de Arremate', page: 'SistemaDeArremate', icon: Activity, roles: ['admin', 'super_admin'] },
      { label: 'Live Shop', page: 'LiveShopControlNoZap', icon: Zap, roles: ['admin', 'super_admin'] },
      { label: 'Criar Leilão de Luxo', page: 'CreateLuxuryAuction', icon: Crown, roles: ['admin', 'super_admin'] },
      { label: 'Gestão de Produtos', page: 'ProductManagement', icon: Package, roles: ['admin', 'super_admin'] },
      { label: 'Estoque de Lotes', page: 'EstoqueLotes', icon: FolderOpen, roles: ['admin', 'super_admin'] },
      { label: 'Gestão de Lotes', page: 'GestaoLotes', icon: Briefcase, roles: ['admin', 'super_admin', 'leiloeiro'] },
      { label: 'Loja Virtual (Gerenciar)', page: 'CatalogManagement', icon: Store, roles: ['admin', 'super_admin'] },
      { label: 'Pedidos da Loja', page: 'CatalogOrdersAdmin', icon: Truck, roles: ['admin', 'super_admin'] },
      { label: 'Meus Pedidos', page: 'MyCatalogOrders', icon: Truck, roles: ['*'] },
      { label: 'Banners', page: 'BannerManagement', icon: Image, roles: ['admin', 'super_admin'] },
      { label: 'Material Promocional', page: 'PromoCreator', icon: Palette, roles: ['admin', 'super_admin'] },
    ],
  },
  {
    title: 'REDE & PARCEIROS',
    items: [
      { label: 'CRM', page: 'CRM', icon: Users, roles: ['admin', 'super_admin'] },
      { label: 'CRM Investidores', page: 'CRMInvestidores', icon: Briefcase, roles: ['admin', 'super_admin', 'leiloeiro'] },
      { label: 'Painel de Controle', page: 'NetworkOverview', icon: Network, roles: ['admin', 'super_admin'] },
      { label: 'Parceiros Ativos', page: 'ActivePartners', icon: Handshake, roles: ['admin', 'super_admin'] },
      { label: 'Influenciadores', page: 'InfluencersDashboard', icon: Megaphone, roles: ['admin', 'super_admin'] },
      { label: 'Registrar Lojista', page: 'StoreRegistration', icon: UserPlus, roles: ['admin', 'super_admin'] },
      { label: 'Registrar Licenciado', page: 'RegisterLicensee', icon: UserPlus, roles: ['admin', 'super_admin'] },
    ],
  },
  {
    title: 'FERRAMENTAS IA',
    items: [
      { label: 'Arquiteto IA', page: 'ArquitetoIA', icon: Bot, roles: ['admin', 'super_admin'] },
      { label: 'PrecificaVivo', page: 'PrecificaVivoPainel', icon: Tag, roles: ['admin', 'super_admin'] },
    ],
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { label: 'Meu Perfil', page: 'Profile', icon: UserCog, roles: ['*'] },
      { label: 'Gerenciar Senhas', page: 'AdminUsers', icon: Key, roles: ['admin', 'super_admin'] },
      { label: 'Acessos VIP', page: 'LuxuryAccessManager', icon: Crown, roles: ['admin', 'super_admin'] },
      { label: 'Diagnóstico', page: 'SystemDiagnostics', icon: Stethoscope, roles: ['admin', 'super_admin'] },
      { label: 'Habilitar Painéis', page: 'SuperAdminPanels', icon: Eye, roles: ['super_admin'] },
    ],
  },
];

/**
 * Lista de páginas (currentPageName) que recebem o AdminLayout (sidebar).
 * Páginas FORA dessa lista mantêm o menu de topo público padrão.
 */
export const ADMIN_PAGES = new Set([
  'SellerPanel', 'LojistaDashboard', 'CarteiraInvestidor',
  'AddFunds', 'MyWinnings', 'WalletHistory', 'MyCatalogOrders',
  'Profile',
  // Admin
  'Financial', 'TransactionHistory', 'PDV', 'CommissionPilot',
  'PartnerPlanActivation', 'PaymentSettings',
  'AuctionControl', 'SistemaDeArremate', 'LiveShopControlNoZap',
  'CreateLuxuryAuction', 'ProductManagement', 'EstoqueLotes',
  'GestaoLotes', 'CatalogManagement', 'CatalogOrdersAdmin',
  'BannerManagement', 'PromoCreator',
  'CRM', 'CRMInvestidores', 'NetworkOverview', 'ActivePartners',
  'InfluencersDashboard', 'StoreRegistration', 'RegisterLicensee',
  'ArquitetoIA', 'PrecificaVivoPainel',
  'AdminUsers', 'LuxuryAccessManager', 'SystemDiagnostics',
  'SuperAdminPanels',
]);

/**
 * Filtra categorias/itens visíveis para um role específico.
 * - Vendedor (is_seller=true) tem sellerOnly itens
 * - Categorias vazias são removidas
 */
export function getNavForUser(currentUser) {
  if (!currentUser) return [];
  const role = currentUser.role || 'user';
  const isSeller = currentUser.is_seller === true;

  const canSee = (item) => {
    // Filtro de sellerOnly: só vendedores ou admins veem
    if (item.sellerOnly && !isSeller && role !== 'admin' && role !== 'super_admin') {
      return false;
    }
    if (item.roles.includes('*')) return true;
    return item.roles.includes(role);
  };

  return ADMIN_NAV
    .map(cat => ({ ...cat, items: cat.items.filter(canSee) }))
    .filter(cat => cat.items.length > 0);
}