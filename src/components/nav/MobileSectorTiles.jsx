import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart as CartIcon } from "lucide-react";
import { SECTORS } from "@/lib/sectors";
import SectorLink from "@/components/nav/SectorLink";

// 📱 Paridade mobile ↔ desktop: os MESMOS setores do cabeçalho (Comprar, Leilões,
// Lucre) + Rank Premiado + Carrinho, no mesmo visual do desktop (tile 3D verde da
// paleta + label minúsculo em caixa alta). Antes o mobile só tinha três links de
// texto grande e faltavam Lucre e Carrinho.
// Paleta oficial (idêntica ao NavDesktop).
const P = { forest: "#4d724b", sage: "#99c198", beige: "#dabb98", navy: "#21222b", gray: "#9da7b5" };

const TILE = {
  background: `linear-gradient(150deg, ${P.sage} 0%, ${P.forest} 62%, #3c5a3a 100%)`,
  border: "1px solid rgba(255,255,255,0.28)",
  boxShadow: "0 5px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.25)",
};

// Nome bem pequeno, 1 linha, sem quebra — o que o mobile pedia.
function Rotulo({ children, cor = P.gray }) {
  return (
    <span
      className="font-slab text-[9px] font-bold uppercase tracking-[0.10em] leading-none whitespace-nowrap"
      style={{ color: cor }}
    >
      {children}
    </span>
  );
}

export default function MobileSectorTiles({ onNavigate, cartCount = 0 }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {SECTORS.map((s) => (
        <SectorLink
          key={s.key}
          target={s.external ? { external: s.external } : s.href}
          onClick={onNavigate}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl py-2 active:scale-95 transition-transform"
        >
          <span className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl" style={TILE}>
            <s.icon className="h-[19px] w-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
            {s.live && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2" aria-hidden>
                <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
          </span>
          <Rotulo>{s.title}</Rotulo>
        </SectorLink>
      ))}

      {/* 🏆 Rank Premiado — mesmo troféu 3D e bege do desktop */}
      <Link
        to="/rankpremiado"
        onClick={onNavigate}
        className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl py-2 active:scale-95 transition-transform"
        aria-label="Rank Premiado Leilão NoZap"
      >
        <span className="flex h-[38px] w-[38px] items-center justify-center">
          <img
            src="/icons/trophy-3d.png"
            alt=""
            className="h-7 w-7 shrink-0 drop-shadow-[0_2px_6px_rgba(218,187,152,0.5)]"
            aria-hidden="true"
          />
        </span>
        <Rotulo cor={P.beige}>Rank</Rotulo>
      </Link>

      {/* 🛒 Carrinho — mesmo contador do desktop */}
      <Link
        to={createPageUrl("Cart")}
        onClick={onNavigate}
        className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl py-2 active:scale-95 transition-transform"
        aria-label={`Carrinho${cartCount > 0 ? ` (${cartCount})` : ""}`}
      >
        <span className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl" style={TILE}>
          <CartIcon className="h-[18px] w-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
          {cartCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-extrabold leading-none"
              style={{ background: `linear-gradient(150deg, #ecd3ae, ${P.beige})`, color: P.navy, border: "2px solid #131418" }}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </span>
        <Rotulo>Carrinho</Rotulo>
      </Link>
    </div>
  );
}