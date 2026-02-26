import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function ClassicTemplate({ displayTitle, displayImage, displayBadge, displayCta, displayBrand, displayBrandSub, price, marketPrice, discount, accent, template, renderProductImage }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Fundo com mesh gradient premium */}
      <div style={{ position: "absolute", inset: 0, background: template.gradient }} />
      {/* Orbe luminoso topo-direita */}
      <div style={{ position: "absolute", top: -80, right: -60, width: 300, height: 300, background: `radial-gradient(circle, ${accent}35 0%, transparent 65%)`, borderRadius: "50%", filter: "blur(50px)" }} />
      {/* Orbe luminoso base-esquerda */}
      <div style={{ position: "absolute", bottom: -40, left: -80, width: 250, height: 250, background: `radial-gradient(circle, ${accent}20 0%, transparent 65%)`, borderRadius: "50%", filter: "blur(60px)" }} />
      {/* Grid sutil */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
      {/* Faixa diagonal decorativa */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "55%", height: "100%", borderLeft: `1px solid ${accent}10`, transform: "skewX(-12deg)", transformOrigin: "top right", background: `linear-gradient(180deg, ${accent}06, transparent 50%)` }} />

      {/* Badge */}
      <div style={{ position: "absolute", top: 18, left: 18, zIndex: 10 }}>
        <div style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: `1px solid ${accent}40`, borderRadius: 12, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}` }} />
          <span style={{ color: "white", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      </div>

      {/* Selo desconto */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 72, height: 72, borderRadius: "50%", background: template.sealGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 24px ${template.accentGlow}`, border: "3px solid rgba(255,255,255,0.2)", transform: "rotate(12deg)" }}>
          <span style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 8, fontWeight: 700 }}>OFF</span>
        </div>
      )}

      {/* Produto com moldura elegante */}
      <div style={{ position: "absolute", top: "12%", left: "12%", right: "12%", bottom: "42%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura com borda fina + glow */}
        <div style={{ position: "absolute", inset: 8, borderRadius: 16, border: `1px solid ${accent}20`, boxShadow: `inset 0 0 30px ${accent}06, 0 0 20px ${accent}08`, pointerEvents: "none" }} />
        {/* Cantos decorativos */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderTop: `2px solid ${accent}50`, borderLeft: `2px solid ${accent}50`, borderRadius: "4px 0 0 0" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${accent}50`, borderRight: `2px solid ${accent}50`, borderRadius: "0 4px 0 0" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: `2px solid ${accent}50`, borderLeft: `2px solid ${accent}50`, borderRadius: "0 0 0 4px" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderBottom: `2px solid ${accent}50`, borderRight: `2px solid ${accent}50`, borderRadius: "0 0 4px 0" }} />
        {renderProductImage("72%", "90%")}
      </div>

      {/* Divider */}
      <div style={{ position: "absolute", left: 24, right: 24, bottom: "40%", height: 1, background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`, zIndex: 10 }} />

      {/* Info block */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.85) 60%, transparent 100%)", padding: "52px 24px 20px", zIndex: 10 }}>
        <p style={{ color: "white", fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>R$</span>
          <span style={{ color: "white", fontSize: 38, fontWeight: 900, lineHeight: 1, textShadow: `0 0 20px ${template.accentGlow}` }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 20, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 12 }}>ou 12x de R$ {(price / 12).toFixed(2)}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={LOGO_URL} alt="Leilão NoZap" crossOrigin="anonymous" style={{ height: 32, width: "auto", objectFit: "contain" }} />
          <div style={{ background: template.sealGradient, borderRadius: 10, padding: "8px 18px", boxShadow: `0 4px 16px ${template.accentGlow}40` }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}