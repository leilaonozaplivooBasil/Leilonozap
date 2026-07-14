import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart as CartIcon, ChevronDown } from "lucide-react";
import UserAvatarMenu from "@/components/nav/UserAvatarMenu";
import AoVivoAgora from "@/components/livoo/AoVivoAgora";
import { SECTORS } from "@/lib/sectors";
import SectorLink from "@/components/nav/SectorLink";

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
   
  finalMenuItems,
   
  isLoggedIn,
   
  isAdmin,
   
  isInvestidor,
   
  isLeiloeiro,
   
  isCatalogPage,
  adminMenuItems,
   
  onShareClick,
   
  navigate,
}) {
  // 🧭 Setores (fonte única em @/lib/sectors) — abrem no hover, como o cliente pediu.
  const [openSector, setOpenSector] = React.useState(null);

  const isActive = (pageName) => {
    if (pageName === "Home" && currentPageName === "Home") return true;
    if (pageName === "Catalog" && (currentPageName === "Catalog" || currentPageName === "CatalogProductDetails")) return true;
    if (pageName === "Licensing" && currentPageName === "Licensing") return true;
    return false;
  };
  const sectorActive = (s) => (s.href?.page ? isActive(s.href.page) : false) || s.items.some((i) => i.page && isActive(i.page));

  return (
    <div className="hidden md:flex md:gap-x-1 items-center">
      {/* === SETORES (hover abre o painel) === */}
      {SECTORS.map((s) => (
        <div
          key={s.key}
          className="relative"
          onMouseEnter={() => setOpenSector(s.key)}
          onMouseLeave={() => setOpenSector((cur) => (cur === s.key ? null : cur))}
        >
          <SectorLink
            target={s.external ? { external: s.external } : s.href}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 px-3 py-1.5 rounded-lg ${
              sectorActive(s) || openSector === s.key ? "text-emerald-300 bg-emerald-500/10" : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            {s.live && (
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            {s.title}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSector === s.key ? "rotate-180" : ""}`} />
          </SectorLink>

          {openSector === s.key && (
            <div
              className="absolute left-0 top-full pt-2 w-72 z-50"
              // pt-2 mantém o hover vivo na "ponte" entre o botão e o painel
            >
              <div
                className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
                style={{ background: "rgba(10,15,28,0.97)", backdropFilter: "blur(20px)" }}
              >
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-bold text-white">{s.emoji} {s.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{s.blurb}</p>
                </div>
                <div className="p-1.5">
                  {s.items.map((it) => (
                    <SectorLink
                      key={it.title}
                      target={it}
                      onClick={() => setOpenSector(null)}
                      className="block px-3 py-2.5 rounded-xl hover:bg-emerald-500/10 transition-colors group"
                    >
                      <p className="text-sm font-semibold text-gray-100 group-hover:text-emerald-300">{it.title}</p>
                      <p className="text-[11px] text-gray-500 leading-snug">{it.desc}</p>
                    </SectorLink>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* === AO VIVO AGORA · LIVOO LIVE === */}
      <div className="ml-2"><AoVivoAgora /></div>

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