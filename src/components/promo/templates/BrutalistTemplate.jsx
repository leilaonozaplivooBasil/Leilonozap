import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function BrutalistTemplate({ displayTitle, displayImage, displayBadge, displayCta, displayBrand, displayBrandSub, price, marketPrice, discount, accent, template, logoUrl }) {
  // Brutalist: Preto com bordas grossas coloridas, tipografia pesada, blocos rígidos, anti-design
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Fundo preto total */}
      <div style={{ position: "absolute", inset: 0, background: "#000" }} />
      {/* Borda externa grossa */}
      <div style={{ position: "absolute", inset: 0, border: `5px solid ${accent}`, borderRadius: 20, pointerEvents: "none", zIndex: 15 }} />
      {/* Borda interna */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, bottom: 10, border: `2px solid ${accent}40`, borderRadius: 14, pointerEvents: "none", zIndex: 15 }} />
      {/* Bloco de cor no fundo */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "15%", background: accent, zIndex: 1 }} />

      {/* Badge gigante */}
      <div style={{ position: "absolute", top: 20, left: 20, right: 20, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ background: accent, padding: "10px 18px" }}>
          <span style={{ color: "#000", fontSize: 16, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
        {discount > 0 && (
          <div style={{ background: "white", padding: "8px 14px", border: `3px solid ${accent}` }}>
            <span style={{ color: "#000", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
          </div>
        )}
      </div>

      {/* Produto com moldura bruta */}
      <div style={{ position: "absolute", top: "14%", left: "8%", right: "8%", height: "40%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura bruta - bordas grossas assimétricas */}
        <div style={{ position: "absolute", inset: 0, border: `3px solid ${accent}`, pointerEvents: "none" }} />
        {/* Cruz interna decorativa */}
        <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: "100%", background: `${accent}15`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 1, background: `${accent}15`, pointerEvents: "none" }} />
        {/* Rótulo de moldura */}
        <div style={{ position: "absolute", top: -1, left: 12, background: "#000", padding: "0 6px", zIndex: 3 }}>
          <span style={{ color: accent, fontSize: 7, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>PRODUTO</span>
        </div>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "65%", maxHeight: "90%", objectFit: "contain", filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.9)) grayscale(0.1) contrast(1.1)", position: "relative", zIndex: 2 }} />
        ) : (
          <div style={{ width: 130, height: 130, background: "#111", border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, zIndex: 2 }}>📦</div>
        )}
      </div>

      {/* Bloco de preço */}
      <div style={{ position: "absolute", bottom: "15%", left: 0, right: 0, padding: "0 24px", zIndex: 10 }}>
        <p style={{ color: "white", fontSize: 18, fontWeight: 900, lineHeight: 1.1, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16, textDecoration: "line-through", fontWeight: 700 }}>R${marketPrice.toFixed(0)}</span>}
          <span style={{ color: accent, fontSize: 14, fontWeight: 900 }}>R$</span>
          <span style={{ color: "white", fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
      </div>

      {/* Footer no bloco colorido */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "15%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", zIndex: 10 }}>
        <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" crossOrigin="anonymous" style={{ height: 28, width: "auto", objectFit: "contain", filter: "brightness(0)" }} />
        <div style={{ background: "#000", padding: "8px 20px" }}>
          <span style={{ color: accent, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayCta}</span>
        </div>
      </div>
    </div>
  );
}