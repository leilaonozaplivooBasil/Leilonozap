import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function MagazineTemplate({ displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, logoUrl }) {
  const WhatsAppBadge = () => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#25d366", flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span style={{ color: "#1f2937", fontSize: 12, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;
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

      {/* Produto com moldura editorial tipo revista */}
      <div style={{ position: "absolute", top: "14%", left: "10%", right: "10%", height: "44%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, background: "#f0f0f0", borderRadius: 2 }}>
        {/* Moldura fina editorial com sombra interna */}
        <div style={{ position: "absolute", inset: 6, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 1, pointerEvents: "none" }} />
        {/* Cantoneiras de foto */}
        <div style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
        <div style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />
        <div style={{ position: "absolute", bottom: 2, left: 2, width: 16, height: 16, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "72%", maxHeight: "85%", objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.12))", position: "relative", zIndex: 2 }} />
        ) : (
          <div style={{ width: 120, height: 120, background: "#e5e5e5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, zIndex: 2 }}>📦</div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <WhatsAppBadge />
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