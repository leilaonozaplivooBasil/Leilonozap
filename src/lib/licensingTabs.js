import { LayoutDashboard, ShoppingBag, Award, Shield, Wallet, Package, Gavel, Trophy, TrendingUp, Store, Receipt, Target } from 'lucide-react';
import { normalizeLevels } from '@/lib/careerLevels';

// 🧭 PONTO 85 — FONTE ÚNICA das abas do Painel de Alavancagem.
// Antes essa lista estava DUPLICADA em LicensingSidebar.jsx (rail do desktop) e
// DashboardTabsList.jsx (abas do mobile), cada uma com suas próprias regras de
// exibição — foi exatamente isso que deixou a conta lojista (Sofia) sem
// "Central de Vendas" e sem "Admin". Agora existe um lugar só.
//
// PADRÃO OFICIAL: os 4 itens aparecem para TODO usuário logado, sem exceção.
// O que muda por cargo NÃO é a existência do item, é o CONTEÚDO do "Admin":
//   • admin / super_admin → administração completa da plataforma
//   • demais usuários     → administração DA PRÓPRIA LOJA (foto, nome e o
//                           link da loja pra compartilhar)
export const LICENSING_TABS = [
  { value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
  { value: 'catalogo', label: 'Central de Vendas', icon: ShoppingBag },
  { value: 'plano-carreira', label: 'Carreira', icon: Award },
  { value: 'admin', label: 'Admin', icon: Shield },
];

// Abas válidas para o parâmetro ?tab= da URL. Inclui 'minha-loja' por
// compatibilidade: links antigos continuam abrindo a administração da loja.
export const VALID_LICENSING_TABS = [...LICENSING_TABS.map((t) => t.value), 'minha-loja'];

// 🧭 FASE 2 DA UNIFICAÇÃO — a lateral do Painel de Alavancagem passa a ser o
// ÍNDICE ÚNICO de tudo o que o usuário tem. Nesta fase NENHUM painel foi
// absorvido: os itens novos são LINKS que abrem a rota que já existe hoje.
//
// Dois tipos de item:
//   • { type: 'tab',  value }  → troca a aba dentro do próprio painel (como hoje)
//   • { type: 'link', to }     → navega para a rota existente
//
// ⛔ FORA daqui por decisão do dono: Parceiro de Compra (captação privada,
// preto/dourado, acesso por sessão) e Live Shop (vitrine ao vivo co-branded).
const CARGOS_ESTOQUE = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

// Reaproveita a MESMA regra de cargo já usada no Layout.jsx — nenhum sistema
// novo de permissão. enabled_panels (Super Admin) tem a palavra final quando
// estiver preenchido.
export function podeVerOperacao(user) {
  if (!user) return false;
  const painels = Array.isArray(user.enabled_panels) ? user.enabled_panels : [];
  if (painels.length > 0) return painels.includes('lojista');
  return normalizeLevels(user.career_levels).some((c) => CARGOS_ESTOQUE.includes(c));
}

export function getLicensingGroups(user) {
  const grupos = [
    {
      title: 'Conta',
      items: [
        { type: 'tab', value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
        { type: 'link', to: '/Carteira', label: 'Carteira', icon: Wallet },
        { type: 'link', to: '/MyCatalogOrders', label: 'Meus Pedidos', icon: Package },
      ],
    },
    {
      title: 'Vender',
      items: [
        { type: 'tab', value: 'catalogo', label: 'Central de Vendas', icon: ShoppingBag },
      ],
    },
    {
      title: 'Leilões',
      items: [
        { type: 'link', to: '/painel-arrematante', label: 'Arrematante', icon: Gavel },
        { type: 'link', to: '/MyWinnings', label: 'Meus Arremates', icon: Trophy },
      ],
    },
  ];

  if (podeVerOperacao(user)) {
    grupos.push({
      title: 'Operação',
      items: [
        { type: 'link', to: '/painel', label: 'Meu Painel', icon: Store },
        { type: 'link', to: '/painel/pdv', label: 'PDV', icon: Receipt },
        { type: 'link', to: '/painel/estoque', label: 'Estoque', icon: Package },
        { type: 'link', to: '/Metas', label: 'Metas', icon: Target },
      ],
    });
  }

  grupos.push(
    {
      title: 'Crescer',
      items: [
        { type: 'tab', value: 'plano-carreira', label: 'Carreira', icon: Award },
        { type: 'link', to: '/Evoluir', label: 'Evoluir Nível', icon: TrendingUp },
      ],
    },
    {
      title: 'Admin',
      items: [
        { type: 'tab', value: 'admin', label: 'Admin', icon: Shield },
      ],
    }
  );

  return grupos;
}