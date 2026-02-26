import React from "react";

export default function SpotlightTemplate({ displayTitle, displayImage, displayBadge, displayCta, displayBrand, displayBrandSub, price, marketPrice, discount, accent, template, renderProductImage }) {
  // Spotlight: Fundo escuro com holofote radial no produto, estilo vitrine premium, produto como estrela
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Fundo escuro profundo */}
      <div style={{ position: "absolute", inset: 0, background: "#050505" }} />
      {/* Holofote radial sobre o produto */}
      <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: `radial-gradient(circle, ${accent}18 0%, ${accent}08 30%, transparent 65%)`, borderRadius: "50%", filter: "blur(20px)" }} />
      {/* Reflexo no "chão" */}
      <div style={{ position: "absolute", bottom: "38%", left: "20%", right: "20%", height: 60, background: `radial-gradient(ellipse, ${accent}10 0%, transparent 70%)`, filter: "blur(15px)" }} />
      {/* Linhas de luz laterais */}
      <div style={{ position: "absolute", top: 0, left: "8%", width: 1, height: "100%", background: `linear-gradient(180deg, transparent, ${accent}15, transparent)` }} />
      <div style={{ position: "absolute", top: 0, right: "8%", width: 1, height: "100%", background: `linear-gradient(180deg, transparent, ${accent}15, transparent)` }} />

      {/* Badge centralizado topo */}
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
        <div style={{ background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 20, padding: "6px 20px", backdropFilter: "blur(8px)" }}>
          <span style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      </div>

      {/* Selo de desconto flutuante */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: "15%", right: 20, zIndex: 10 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: template.sealGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${template.accentGlow}60`, border: "2px solid rgba(255,255,255,0.15)" }}>
            <span style={{ color: "white", fontSize: 19, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 7, fontWeight: 700 }}>OFF</span>
          </div>
        </div>
      )}

      {/* Produto grande centralizado - estrela do show */}
      <div style={{ position: "absolute", top: "8%", left: 0, right: 0, height: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, padding: "0 40px" }}>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "72%", maxHeight: "100%", objectFit: "contain", filter: `drop-shadow(0 20px 50px rgba(0,0,0,0.9)) drop-shadow(0 0 40px ${accent}15)` }} />
        ) : (
          <div style={{ width: 140, height: 140, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
        )}
      </div>

      {/* Bloco inferior com vidro */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.3) 85%, transparent 100%)", padding: "60px 24px 20px", zIndex: 10 }}>
        <p style={{ color: "white", fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, textAlign: "center", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, marginBottom: 4 }}>
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>R$</span>
          <span style={{ color: "white", fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 22, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center", marginBottom: 10 }}>12x de R$ {(price / 12).toFixed(2)}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>{displayBrand}</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 8 }}>{displayBrandSub}</p>
          </div>
          <div style={{ background: template.sealGradient, borderRadius: 20, padding: "8px 20px" }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}