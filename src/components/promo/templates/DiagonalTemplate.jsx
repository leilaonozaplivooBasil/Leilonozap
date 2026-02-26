import React from "react";

export default function DiagonalTemplate({ displayTitle, displayImage, displayBadge, displayCta, displayBrand, displayBrandSub, price, marketPrice, discount, accent, template, renderProductImage }) {
  // Diagonal Bold: Faixa diagonal colorida gigante dividindo o card, produto na metade superior, info na inferior
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Fundo base escuro */}
      <div style={{ position: "absolute", inset: 0, background: "#0a0a0a" }} />
      {/* Faixa diagonal colorida gigante */}
      <div style={{ position: "absolute", top: "-20%", left: "-30%", width: "130%", height: "70%", background: template.sealGradient, transform: "rotate(-8deg)", transformOrigin: "center", opacity: 0.9 }} />
      {/* Segunda faixa mais fina */}
      <div style={{ position: "absolute", top: "35%", left: "-20%", width: "140%", height: 8, background: accent, transform: "rotate(-8deg)", opacity: 0.6 }} />
      {/* Barra superior de acento */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: template.sealGradient, zIndex: 15 }} />
      {/* Barra inferior */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: template.sealGradient, zIndex: 15 }} />

      {/* Badge no topo */}
      <div style={{ position: "absolute", top: 18, left: 18, zIndex: 10 }}>
        <div style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: "8px 16px", borderRadius: 6, borderLeft: `4px solid ${accent}` }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      </div>

      {/* Selo de desconto - triângulo canto */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: 0, right: 0, zIndex: 10 }}>
          <div style={{ width: 0, height: 0, borderTop: `90px solid ${accent}`, borderLeft: "90px solid transparent" }} />
          <div style={{ position: "absolute", top: 18, right: 8, transform: "rotate(45deg)" }}>
            <span style={{ color: "white", fontSize: 18, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
          </div>
        </div>
      )}

      {/* Produto centralizado na faixa colorida */}
      <div style={{ position: "absolute", top: "5%", left: 0, right: 0, height: "48%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, padding: "0 32px" }}>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "65%", maxHeight: "95%", objectFit: "contain", filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.6))" }} />
        ) : (
          <div style={{ width: 130, height: 130, borderRadius: 16, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
        )}
      </div>

      {/* Info na parte escura */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "42%", padding: "20px 24px 18px", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", fontSize: 17, fontWeight: 800, lineHeight: 1.2, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            {discount > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: 600 }}>R$</span>
            <span style={{ color: "white", fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
            <span style={{ color: accent, fontSize: 24, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
          </div>
          {price > 50 && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>ou 12x de R$ {(price / 12).toFixed(2)} sem juros</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{displayBrand}</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>{displayBrandSub}</p>
          </div>
          <div style={{ background: template.sealGradient, padding: "9px 22px", borderRadius: 8 }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}