import { LayoutDashboard, ShoppingBag, Award, Shield } from 'lucide-react';

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