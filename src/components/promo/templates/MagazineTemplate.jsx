import React from "react";

export default function MagazineTemplate({ displayTitle, displayImage, displayBadge, displayCta, displayBrand, displayBrandSub, price, marketPrice, discount, accent, template }) {
  // Magazine Editorial: Fundo branco, tipografia editorial, produto como foto de revista, linhas finas elegantes
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Fundo branco com textura de papel */}
      <div style={{ position: "absolute", inset: 0, background: "#fafafa" }} />
      {/* Linha de acento topo */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: template.sealGradient, zIndex: 15 }} />
      {/* Linhas de grid editorial */}
      <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.06)" }} />
      <div style={{ position: "absolute", right: 24, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.06)" }} />

      {/* Header editorial */}
      <div style={{ position: "absolute", top: 16, left: 32, right: 32, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: accent, fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>{displayBadge}</p>
          <div style={{ width: 40, height: 2, background: accent }} />
        </div>
        {discount > 0 && (
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#999", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>ECONOMIZE</p>
            <p style={{ color: accent, fontSize: 28, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>{discount}%</p>
          </div>
        )}
      </div>

      {/* Produto com moldura editorial */}
      <div style={{ position: "absolute", top: "14%", left: "10%", right: "10%", height: "44%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, background: "#f0f0f0", borderRadius: 4 }}>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "75%", maxHeight: "90%", objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.12))" }} />
        ) : (
          <div style={{ width: 120, height: 120, background: "#e5e5e5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
        )}
      </div>

      {/* Bloco de info editorial */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 32px 20px", zIndex: 10 }}>
        {/* Linha separadora */}
        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.1)", marginBottom: 12 }} />
        <p style={{ color: "#111", fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          {discount > 0 && <span style={{ color: "#bbb", fontSize: 14, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ color: "#666", fontSize: 14, fontWeight: 500 }}>R$</span>
            <span style={{ color: "#111", fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>{price.toFixed(2).split('.')[0]}</span>
            <span style={{ color: accent, fontSize: 20, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
          </div>
        </div>
        {price > 50 && <p style={{ color: "#999", fontSize: 10, marginBottom: 10 }}>ou 12x de R$ {(price / 12).toFixed(2)}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#333", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayBrand}</p>
            <p style={{ color: "#aaa", fontSize: 8, marginTop: 1 }}>{displayBrandSub}</p>
          </div>
          <div style={{ background: "#111", borderRadius: 4, padding: "8px 20px" }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
      {/* Linha inferior */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: template.sealGradient, zIndex: 15 }} />
    </div>
  );
}