import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart as CartIcon } from "lucide-react";
import UserAvatarMenu from "@/components/nav/UserAvatarMenu";

/**
 * 🛡️ NavDesktop — Cabeçalho público padrão LEILÃO NOZAP
 *
 * Estrutura:
 *   [Links públicos centrais]  [🛒 Carrinho]  [👤 Avatar / Entrar]
 *
 * Links públicos (sempre visíveis — visitante + logado):
 *   • Leilões → /Home
 *   • Loja → /Loja-Virtual
 *   • Seja Licenciado → /Licensing
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
  // (não são mais usadas, mas evita warning de prop desconhecida)
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
  // Links públicos — universais
  const PUBLIC_LINKS = [
    { title: "Leilões", pageName: "Home" },
    { title: "Loja", pageName: "Catalog" },
    { title: "Seja Licenciado", pageName: "Licensing" },
  ];

  const isActive = (pageName) => {
    if (pageName === "Home" && currentPageName === "Home") return true;
    if (pageName === "Catalog" && (currentPageName === "Catalog" || currentPageName === "CatalogProductDetails")) return true;
    if (pageName === "Licensing" && currentPageName === "Licensing") return true;
    return false;
  };

  return (
    <div className="hidden md:flex md:gap-x-2 items-center">
      {/* === LINKS PÚBLICOS CENTRAIS === */}
      {PUBLIC_LINKS.map((item) => (
        <Link
          key={item.title}
          to={createPageUrl(item.pageName)}
          className={`text-sm font-semibold transition-all duration-300 px-3 py-1.5 rounded-lg ${
            isActive(item.pageName)
              ? "text-emerald-300"
              : "text-gray-300 hover:text-white"
          }`}
          style={
            isActive(item.pageName)
              ? {
                  background: "rgba(16, 185, 129, 0.1)",
                  boxShadow: "0 0 12px rgba(16, 185, 129, 0.08)",
                }
              : {}
          }
        >
          {item.title}
        </Link>
      ))}

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