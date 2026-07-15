import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart as CartIcon } from "lucide-react";
import UserAvatarMenu from "@/components/nav/UserAvatarMenu";
import ShopDropdown from "@/components/nav/dropdowns/ShopDropdown";
import AuctionsDropdown from "@/components/nav/dropdowns/AuctionsDropdown";
import EarnMoneyDropdown from "@/components/nav/dropdowns/EarnMoneyDropdown";
import AoVivoAgoraButton from "@/components/nav/AoVivoAgoraButton";

/**
 * 🛡️ NavDesktop — Cabeçalho público padrão LEILÃO NOZAP
 *
 * Estrutura (FASE 4A):
 *   [🛒 Comprar ▼] [🔨 Leilões ▼] [🔴 Ao Vivo ▼] [💰 Ganhe Dinheiro ▼]
 *   [▶ AO VIVO AGORA] | [🛒 Carrinho] [👤 Avatar]
 *
 * ❌ REMOVIDO do topo (migrado para dropdown do avatar):
 *   • Painel de Controle (admin)
 *   • Minha Conta (investidor / leiloeiro)
 *   • Perfil / Compartilhar / Sair
 *   • Carrinho como texto (vira só ícone)
 */
export default function NavDesktop({
  currentPageName,
  currentUser,
  onLoginClick,
  onLogout,
  // props legadas — mantidas no signature para compatibilidade com Layout.jsx
  // eslint-disable-next-line no-unused-vars
  finalMenuItems,
  // eslint-disable-next-line no-unused-vars
  isLoggedIn,
  // eslint-disable-next-line no-unused-vars
  isAdmin,
  // eslint-disable-next-line no-unused-vars
  isInvestidor,
  // eslint-disable-next-line no-unused-vars
  isLeiloeiro,
  // eslint-disable-next-line no-unused-vars
  isCatalogPage,
  // eslint-disable-next-line no-unused-vars
  adminMenuItems,
  // eslint-disable-next-line no-unused-vars
  onShareClick,
  // eslint-disable-next-line no-unused-vars
  navigate,
}) {
  return (
    <div className="hidden md:flex md:gap-x-1 items-center">
      {/* === 3 DROPDOWNS CATEGORIZADOS === */}
      <ShopDropdown />
      <AuctionsDropdown />
      <EarnMoneyDropdown />

      {/* === BOTÃO "AO VIVO AGORA" === */}
      <div className="ml-2">
        <AoVivoAgoraButton />
      </div>

      {/* === DIVISOR SUTIL === */}
      <div className="h-6 w-px bg-white/10 mx-3" />

      {/* === ÍCONE CARRINHO === */}
      <Link
        to={createPageUrl("Cart")}
        className={`p-2 rounded-lg transition-all duration-300 ${
          currentPageName === "Cart"
            ? "text-emerald-300 bg-emerald-500/10"
            : "text-gray-300 hover:text-white hover:bg-white/5"
        }`}
        aria-label="Carrinho"
      >
        <CartIcon className="w-5 h-5" />
      </Link>

      {/* === AVATAR DO USUÁRIO / BOTÃO ENTRAR === */}
      <div className="ml-1">
        <UserAvatarMenu
          currentUser={currentUser}
          onLoginClick={onLoginClick}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}