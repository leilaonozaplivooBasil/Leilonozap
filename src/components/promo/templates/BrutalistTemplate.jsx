import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function BrutalistTemplate({ displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, logoUrl }) {
  const WhatsAppBadge = () => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#25d366", flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;
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
          <div style={{ background: "white", padding: "8px 14px", border: `3px solid ${accent}`, textAlign: "center" }}>
            <span style={{ color: "#000", fontSize: 9, fontWeight: 800, display: "block", lineHeight: 1 }}>ATÉ</span>
            <span style={{ color: "#000", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>60%</span>
            <span style={{ color: "#000", fontSize: 7, fontWeight: 700, display: "block", lineHeight: 1.3 }}>DE DESCONTO</span>
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
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "15%", padding: "0 24px", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
          <WhatsAppBadge />
        </div>
        <div style={{ background: "#000", padding: "8px 20px" }}>
          <span style={{ color: accent, fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayCta}</span>
        </div>
      </div>
    </div>
  );
}