import { LayoutDashboard, ShoppingBag, Award, Shield, Wallet, Package, PackagePlus, Gavel, Trophy, TrendingUp, Store, Receipt, Target, Handshake, BarChart3, Users } from 'lucide-react';
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
// 🔓 REGRA OFICIAL (Gabriel, 08/08/2026): estoque próprio e PDV valem DO VENDEDOR
// PARA CIMA. O vendedor pode ter um estoque mínimo em casa e fechar pedido com o
// cliente na rua, recebendo em dinheiro. O influenciador é o ÚNICO de fora:
// ele divulga, não estoca e não tira pedido.
const CARGOS_SEM_OPERACAO = ['influenciador', 'influencer', 'usuario'];

// enabled_panels (Super Admin) continua com a palavra final quando preenchido.
export function podeVerOperacao(user) {
  if (!user) return false;
  const painels = Array.isArray(user.enabled_panels) ? user.enabled_panels : [];
  if (painels.length > 0) return painels.includes('lojista');
  const cargos = normalizeLevels(user.career_levels);
  if (!cargos.length) return false;
  return !cargos.every((c) => CARGOS_SEM_OPERACAO.includes(c));
}

export function getLicensingGroups(user) {
  const grupos = [
    {
      title: 'Conta',
      items: [
        { type: 'tab', value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
        { type: 'link', to: '/Carteira', label: 'Carteira', icon: Wallet },
        { type: 'link', to: '/MyCatalogOrders', label: 'Minhas Compras', icon: Package },
      ],
    },
  ];

  // 🧭 ORDEM POR PRIORIDADE DE USO (08/08/2026): Conta → Operação (dia a dia de
  // quem tem loja/estoque) → Vender → Leilões → Carreira → Admin.
  if (podeVerOperacao(user)) {
    grupos.push({
      title: 'Operação',
      items: [
        { type: 'link', to: '/painel', label: 'Meu Painel', icon: Store },
        { type: 'link', to: '/painel/pdv', label: 'PDV', icon: Receipt },
        { type: 'link', to: '/painel/estoque', label: 'Estoque', icon: Package },
        { type: 'link', to: '/painel/comprar-estoque', label: 'Comprar Estoque', icon: PackagePlus },
        { type: 'link', to: '/Metas', label: 'Metas', icon: Target },
      ],
    });
  }

  grupos.push(
    {
      title: 'Vender',
      items: [
        {
          type: 'tab', value: 'catalogo', label: 'Central de Vendas', icon: ShoppingBag,
          // 🛍️ Seções da Central de Vendas — permite ir direto numa seção pelo
          // menu flutuante da lateral, sem abrir a aba e escolher de novo lá dentro.
          subItens: [
            { value: 'catalogo-produtos', label: 'Sua Loja Virtual', icon: Store },
            { value: 'catalogo-home', label: 'Relatório da Loja', icon: BarChart3 },
            { value: 'catalogo-pedidos', label: 'Pedidos', icon: Package },
            { value: 'catalogo-clientes', label: 'Venda Direta', icon: Users },
            { value: 'catalogo-vendedores', label: 'Vendedores', icon: Handshake },
            { value: 'catalogo-comissoes', label: 'Comissões', icon: Wallet },
          ],
        },
      ],
    },
    {
      title: 'Leilões',
      items: [
        { type: 'link', to: '/painel-arrematante', label: 'Arrematante', icon: Gavel },
        { type: 'link', to: '/MyWinnings', label: 'Meus Arremates', icon: Trophy },
      ],
    },
    {
      title: 'Carreira',
      items: [
        { type: 'tab', value: 'plano-carreira', label: 'Carreira', icon: Award },
        { type: 'link', to: '/Evoluir', label: 'Evoluir Nível', icon: TrendingUp },
      ],
    },
    {
      title: 'Admin',
      items: [
        { type: 'tab', value: 'admin', label: 'Admin', icon: Shield },
        // 🤝 Aprovação dos pedidos de mercadoria consignada — só admin
        ...((user?.role === 'admin' || user?.role === 'super_admin')
          ? [{ type: 'link', to: '/painel/consignado', label: 'Consignado', icon: Handshake }]
          : []),
      ],
    }
  );

  return grupos;
}