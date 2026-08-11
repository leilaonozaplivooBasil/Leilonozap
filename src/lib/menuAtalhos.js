// 🎯 ATALHOS — FONTE ÚNICA da grade de azulejos do menu (desktop E mobile).
//
// Antes, cada menu montava a própria lista: o mobile tinha uma grade, o desktop
// outra, e os painéis apareciam DE NOVO numa seção "Também acessar como…" —
// três caminhos para o mesmo lugar. Agora existe uma lista só, aqui.
//
// Regra de ouro desta lista: só entra o que a pessoa quer no PRIMEIRO toque.
// Os demais painéis (Lojista, Vendedor, Investidor, Leiloeiro…) ficam na
// Visão Geral, para não repetir.
//
// ⚠️ Nada de permissão é criado aqui: os painéis vêm de resolveUserPanels,
// que continua sendo a única autoridade sobre o que cada cargo libera.

import { ShoppingCart, Gavel, Heart, User as UserIcon } from "lucide-react";
import { SECTORS } from "@/lib/sectors";
import { resolveUserPanels } from "@/lib/panelResolver";

// Painéis promovidos a azulejo (os outros ficam na Visão Geral).
// A chave é a mesma do PANEL_METADATA — o rótulo é curto para caber em 1 linha.
const PAINEIS_EM_ATALHO = {
  // 🚀 PAINEL DE ALAVANCAGEM — nome neutro de propósito: este azulejo é a porta
  // ÚNICA de toda a rede (influenciador, vendedor, licenciado, parceiro, ponto de
  // retirada, loja física, distribuidor e cargos de topo). Chamar de "Licenciado"
  // dava a impressão de ser só de um cargo. A liberação continua vindo de
  // resolveUserPanels (painel 'licenciado'), que já cobre todos esses cargos.
  // 🚫 08/08/2026: "Alavancagem" saiu da grade de atalhos — o painel da pessoa
  // agora é o cartão grande no topo do menu (com o nome do cargo dela).
  // O painel continua liberado normalmente e aparece na Visão Geral.
  arrematante: { rotulo: "Arremates", icon: Gavel },
};

/**
 * Monta a lista de atalhos.
 * @param {Object}  opts.user      AppUser logado (ou null para visitante)
 * @param {number}  opts.cartCount itens no carrinho (badge)
 * @param {boolean} opts.hideRank  esconde o azulejo "Rank" (usado na própria página do Rank Premiado)
 * @returns {Array} [{ key, rotulo, icon?, img?, target, badge?, tom?, live? }]
 */
export function getAtalhos({ user, cartCount = 0, hideRank = false } = {}) {
  const logado = !!(user && user.email);

  // 1) Setores do cabeçalho — Comprar · Leilões · Lucre
  const atalhos = SECTORS.map((s) => ({
    key: s.key,
    rotulo: s.title,
    icon: s.icon,
    target: s.external ? { external: s.external } : s.href,
    live: !!s.live,
  }));

  // 2) Rank Premiado (troféu 3D oficial) e Carrinho
  if (!hideRank) {
    atalhos.push({ key: "rank", rotulo: "Rank", img: "/icons/trophy-3d.png", target: { to: "/rankpremiado" }, tom: "beige" });
  }
  atalhos.push({ key: "carrinho", rotulo: "Carrinho", icon: ShoppingCart, target: { page: "Cart" }, badge: cartCount });

  if (!logado) return atalhos;

  // 3) Painéis liberados que merecem azulejo
  const liberados = resolveUserPanels(user) || [];
  Object.entries(PAINEIS_EM_ATALHO).forEach(([chave, meta]) => {
    const painel = liberados.find((p) => p.key === chave);
    if (painel) {
      atalhos.push({ key: chave, rotulo: meta.rotulo, icon: meta.icon, target: { to: painel.route } });
    }
  });

  // 4) Favoritos — sai da lista de texto "Minha Conta" e vira azulejo, no mesmo
  // padrão dos outros. Mesmo destino de sempre (Leilões filtrando favoritos).
  atalhos.push({ key: "favoritos", rotulo: "Favoritos", icon: Heart, target: { to: "/Home?favorites=1" } });

  // 5) Meu Perfil
  atalhos.push({ key: "perfil", rotulo: "Meu Perfil", icon: UserIcon, target: { page: "Profile" } });

  return atalhos;
}

/**
 * Painéis que NÃO viraram azulejo — vão para a Visão Geral, sem repetir.
 */
export function getPaineisRestantes(user) {
  if (!user || !user.email) return [];
  return (resolveUserPanels(user) || []).filter((p) => !PAINEIS_EM_ATALHO[p.key]);
}