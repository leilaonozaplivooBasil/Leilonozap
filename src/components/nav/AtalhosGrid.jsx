import React from "react";
import { getAtalhos } from "@/lib/menuAtalhos";
import SectorLink from "@/components/nav/SectorLink";

// Paleta oficial (idêntica ao NavDesktop) — azulejo 3D verde da marca.
export const P = { forest: "#4d724b", sage: "#99c198", beige: "#dabb98", navy: "#21222b", gray: "#9da7b5" };

export const TILE = {
  background: `linear-gradient(150deg, ${P.sage} 0%, ${P.forest} 62%, #3c5a3a 100%)`,
  border: "1px solid rgba(255,255,255,0.28)",
  boxShadow: "0 5px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.25)",
};

// Rótulo pequeno, 1 linha, sem quebra.
export function Rotulo({ children, tom }) {
  return (
    <span
      className="font-slab text-[9px] font-bold uppercase tracking-[0.10em] leading-none whitespace-nowrap"
      style={{ color: tom === "beige" ? P.beige : P.gray }}
    >
      {children}
    </span>
  );
}

/**
 * 🎯 AtalhosGrid — a MESMA grade de azulejos no menu mobile e no dropdown desktop.
 * A lista vem de @/lib/menuAtalhos (fonte única). Toque de 64px de altura,
 * grade fluida que não estoura abaixo de 320px.
 */
export default function AtalhosGrid({ user, cartCount = 0, onNavigate, colunas = 3, hideRank = false }) {
  const atalhos = getAtalhos({ user, cartCount, hideRank });

  return (
    <div className={`grid gap-2 ${colunas === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
      {atalhos.map((a) => (
        <SectorLink
          key={a.key}
          target={a.target}
          onClick={onNavigate}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl py-2 transition-transform active:scale-95"
        >
          {a.img ? (
            <span className="flex h-[38px] w-[38px] items-center justify-center">
              <img
                src={a.img}
                alt=""
                aria-hidden="true"
                className="h-7 w-7 shrink-0 drop-shadow-[0_2px_6px_rgba(218,187,152,0.5)]"
              />
            </span>
          ) : (
            <span className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl" style={TILE}>
              <a.icon className="h-[19px] w-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
              {a.live && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2" aria-hidden>
                  <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
              {a.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-extrabold leading-none"
                  style={{ background: `linear-gradient(150deg, #ecd3ae, ${P.beige})`, color: P.navy, border: "2px solid #131418" }}
                >
                  {a.badge > 99 ? "99+" : a.badge}
                </span>
              )}
            </span>
          )}
          <Rotulo tom={a.tom}>{a.rotulo}</Rotulo>
        </SectorLink>
      ))}
    </div>
  );
}