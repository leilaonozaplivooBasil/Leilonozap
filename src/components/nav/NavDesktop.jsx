import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart as CartIcon } from "lucide-react";
import UserAvatarMenu from "@/components/nav/UserAvatarMenu";

import { SECTORS } from "@/lib/sectors";
import SectorLink from "@/components/nav/SectorLink";

/**
 * 🛡️ NavDesktop — Cabeçalho público padrão LEILÃO NOZAP
 *
 * Estrutura (pedido Gabriel 26/07 — tudo na paleta oficial da logo
 * #4d724b/#99c198/#dabb98/#21222b/#9da7b5):
 *   [logo]        [COMPRAR · LEILÕES · GANHE DINHEIRO]        [AO VIVO | 🛒 | Entrar]   [🏆 RANK PREMIADO]
 *                  ↑ centralizados no MEIO da navbar                                     ↑ afastado, no canto
 *
 * • Setores centrais: tile 3D (gradiente sálvia→verde floresta) + label UPPERCASE,
 *   com o mesmo dropdown no hover de antes.
 * • Rank Premiado: placa escura #21222b com borda/texto bege #dabb98 + troféu 3D
 *   (mantém a essência dourada do selo original, mas dentro da paleta).
 */

// Paleta oficial (logo Leilão NoZap)
const P = {
  forest: "#4d724b",
  sage: "#99c198",
  beige: "#dabb98",
  navy: "#21222b",
  gray: "#9da7b5",
};

export default function NavDesktop({
  currentPageName,
  currentUser,
  cartCount = 0,
  onLoginClick,
  onLogout,
  // props legadas — mantidas no signature para compatibilidade com Layout.jsx
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
    <div className="hidden md:flex items-center">
      {/* === SETORES CENTRAIS — centralizados no meio da navbar (absolute no header).
          items-center + tile 38px + label colado: o conjunto (~54px) fica centrado
          no h-16 do header, no MESMO eixo do carrinho/avatar/rank. === */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-5">
        {SECTORS.map((s) => {
          const active = sectorActive(s) || openSector === s.key;
          return (
            <div
              key={s.key}
              className="relative"
              onMouseEnter={() => setOpenSector(s.key)}
              onMouseLeave={() => setOpenSector((cur) => (cur === s.key ? null : cur))}
            >
              <SectorLink
                target={s.external ? { external: s.external } : s.href}
                className="flex flex-col items-center gap-[3px] group outline-none"
              >
                {/* tile 3D na paleta: gradiente sálvia → verde floresta, brilho interno */}
                <span
                  className="relative w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(150deg, ${P.sage} 0%, ${P.forest} 62%, #3c5a3a 100%)`,
                    border: active ? `1.5px solid ${P.beige}` : "1px solid rgba(255,255,255,0.28)",
                    boxShadow: active
                      ? `0 6px 16px rgba(77,114,75,0.55), 0 0 0 3px rgba(153,193,152,0.22), inset 0 1px 0 rgba(255,255,255,0.35)`
                      : "0 5px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.25)",
                  }}
                >
                  <s.icon className="w-[19px] h-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                  {s.live && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2" aria-hidden>
                      <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                </span>
                <span
                  className="font-slab text-[9.5px] font-bold uppercase tracking-[0.14em] whitespace-nowrap leading-none transition-colors"
                  style={{ color: active ? P.sage : P.gray }}
                >
                  {s.title}
                </span>
              </SectorLink>

              {openSector === s.key && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-72 z-50"
                  // pt-2 mantém o hover vivo na "ponte" entre o botão e o painel
                >
                  <div
                    className="rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      background: "rgba(33,34,43,0.97)", // navy da paleta
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(153,193,152,0.18)",
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(153,193,152,0.14)" }}>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {s.icon && <s.icon className="w-4 h-4 shrink-0" style={{ color: P.sage }} />} {s.title}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: P.gray }}>{s.blurb}</p>
                    </div>
                    <div className="p-1.5">
                      {s.items.map((it) => (
                        <SectorLink
                          key={it.title}
                          target={it}
                          onClick={() => setOpenSector(null)}
                          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors group hover:bg-[rgba(153,193,152,0.10)]"
                        >
                          {it.icon && <it.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: P.sage }} />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-100 group-hover:text-[#99c198]">{it.title}</p>
                            <p className="text-[11px] leading-snug" style={{ color: P.gray }}>{it.desc}</p>
                          </div>
                        </SectorLink>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* === CLUSTER DIREITO: carrinho · Entrar/avatar · Rank Premiado ===
          Tudo em items-center no mesmo eixo vertical dos setores centrais,
          com respiro entre carrinho, perfil e rank (pedido Gabriel 26/07). */}
      <div className="flex items-center gap-x-5">
        {/* 🛒 Carrinho — liquid glass verde da paleta, com contador vivo:
            todo produto adicionado dispara 'cartUpdated' no Layout → cartCount
            muda → badge pop + balanço do ícone (keys reiniciam as animações). */}
        <Link
          to={createPageUrl("Cart")}
          className="cart-glass relative w-10 h-10 rounded-xl grid place-items-center group"
          style={currentPageName === "Cart" ? { borderColor: P.beige } : undefined}
          aria-label={`Carrinho${cartCount > 0 ? ` (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : ''}`}
        >
          <span key={`shake-${cartCount}`} className={cartCount > 0 ? "cart-shake" : undefined}>
            <CartIcon className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
          </span>
          {cartCount > 0 && (
            <span key={`badge-${cartCount}`} className="cart-badge" aria-hidden="true">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
          <style>{`
            .cart-glass {
              background: linear-gradient(155deg, rgba(153,193,152,0.30) 0%, rgba(77,114,75,0.45) 55%, rgba(33,34,43,0.6) 100%);
              border: 1px solid rgba(153,193,152,0.45);
              backdrop-filter: blur(14px) saturate(1.3);
              -webkit-backdrop-filter: blur(14px) saturate(1.3);
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px rgba(0,0,0,0.3);
              animation: cart-breathe 3s ease-in-out infinite;
              transition: transform 0.2s ease, border-color 0.2s ease;
            }
            .cart-glass:hover {
              transform: translateY(-2px) scale(1.05);
              border-color: rgba(153,193,152,0.8);
            }
            @keyframes cart-breathe {
              0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px rgba(0,0,0,0.3), 0 0 0 rgba(153,193,152,0); }
              50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px rgba(0,0,0,0.3), 0 0 14px rgba(153,193,152,0.35); }
            }
            .cart-badge {
              position: absolute;
              top: -6px;
              right: -6px;
              min-width: 18px;
              height: 18px;
              padding: 0 4px;
              border-radius: 999px;
              display: grid;
              place-items: center;
              background: linear-gradient(150deg, #ecd3ae, ${P.beige});
              color: ${P.navy};
              font-size: 10px;
              font-weight: 800;
              line-height: 1;
              border: 2px solid #131418;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              animation: cart-badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }
            @keyframes cart-badge-pop {
              0% { transform: scale(0); }
              60% { transform: scale(1.35); }
              100% { transform: scale(1); }
            }
            .cart-shake { display: inline-flex; animation: cart-shake 0.5s ease-in-out 0.05s; }
            @keyframes cart-shake {
              0%, 100% { transform: rotate(0); }
              25% { transform: rotate(-12deg); }
              50% { transform: rotate(10deg); }
              75% { transform: rotate(-6deg); }
            }
            @media (prefers-reduced-motion: reduce) {
              .cart-glass, .cart-badge, .cart-shake { animation: none; }
            }
          `}</style>
        </Link>

        <div>
          <UserAvatarMenu
            currentUser={currentUser}
            onLoginClick={onLoginClick}
            onLogout={onLogout}
          />
        </div>

        {/* === RANK PREMIADO — afastado, no canto direito (essência dourada → bege da paleta) === */}
        <Link
          to="/rankpremiado"
          className="ml-4 flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-xl transition-all hover:scale-[1.04]"
          style={{
            background: `linear-gradient(140deg, #2c2d38 0%, ${P.navy} 55%, #191a21 100%)`,
            border: "1px solid rgba(218,187,152,0.55)",
            boxShadow: "0 0 18px rgba(218,187,152,0.16), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -4px 10px rgba(0,0,0,0.35)",
          }}
          aria-label="Rank Premiado Leilão NoZap"
        >
          <img
            src="/icons/trophy-3d.png"
            alt=""
            className="w-7 h-7 shrink-0 drop-shadow-[0_2px_6px_rgba(218,187,152,0.5)]"
            aria-hidden="true"
          />
          <span className="flex flex-col leading-none">
            <span className="font-slab text-[12.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: P.beige }}>
              Rank Premiado
            </span>
            <span className="mt-1 text-[7px] tracking-[0.42em]" style={{ color: "rgba(218,187,152,0.75)" }} aria-hidden>
              ★ ★ ★ ★ ★
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
