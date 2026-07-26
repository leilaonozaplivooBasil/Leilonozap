import React from "react";

const LOGO_URL = "/brand/icon-3d.webp";

export default function DiagonalTemplate({ displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, renderProductImage, logoUrl }) {
  const WhatsAppBadge = () => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#25d366", flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;
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
          <div style={{ width: 0, height: 0, borderTop: `100px solid ${accent}`, borderLeft: "100px solid transparent" }} />
          <div style={{ position: "absolute", top: 14, right: 4, transform: "rotate(45deg)", textAlign: "center" }}>
            <span style={{ color: "white", fontSize: 8, fontWeight: 800, display: "block", lineHeight: 1 }}>ATÉ</span>
            <span style={{ color: "white", fontSize: 16, fontWeight: 900, lineHeight: 1 }}>60%</span>
          </div>
        </div>
      )}

      {/* Produto com moldura losango/diamante */}
      <div style={{ position: "absolute", top: "5%", left: "8%", right: "8%", height: "48%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura em forma de losango rotacionado */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "70%", height: "70%", transform: "translate(-50%,-50%) rotate(45deg)", border: `2px solid rgba(255,255,255,0.15)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "78%", height: "78%", transform: "translate(-50%,-50%) rotate(45deg)", border: `1px solid rgba(255,255,255,0.06)`, pointerEvents: "none" }} />
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "62%", maxHeight: "90%", objectFit: "contain", filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.6))", position: "relative", zIndex: 2 }} />
        ) : (
          <div style={{ width: 130, height: 130, borderRadius: 16, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, zIndex: 2 }}>📦</div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <WhatsAppBadge />
          </div>
          <div style={{ background: template.sealGradient, padding: "9px 22px", borderRadius: 8 }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}