import React from "react";
import { fmtBR } from '@/lib/money';

const LOGO_URL = "/brand/icon-3d.webp";

export default function SpotlightTemplate({ displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, renderProductImage, logoUrl }) {
  const WhatsAppBadge = () => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#25d366", flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;
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
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: template.sealGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${template.accentGlow}60`, border: "2px solid rgba(255,255,255,0.15)" }}>
            <span style={{ color: "white", fontSize: 8, fontWeight: 800, lineHeight: 1 }}>ATÉ</span>
            <span style={{ color: "white", fontSize: 19, fontWeight: 900, lineHeight: 1 }}>60%</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 6, fontWeight: 700 }}>DE DESCONTO</span>
          </div>
        </div>
      )}

      {/* Produto com moldura circular spotlight */}
      <div style={{ position: "absolute", top: "8%", left: 0, right: 0, height: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, padding: "0 40px" }}>
        {/* Anel circular concêntrico - estilo vitrine */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 220, height: 220, transform: "translate(-50%,-50%)", borderRadius: "50%", border: `1px solid ${accent}12`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 260, height: 260, transform: "translate(-50%,-50%)", borderRadius: "50%", border: `1px solid ${accent}06`, pointerEvents: "none" }} />
        {/* Base/pedestal do produto */}
        <div style={{ position: "absolute", bottom: 4, left: "25%", right: "25%", height: 2, background: `linear-gradient(90deg, transparent, ${accent}20, transparent)` }} />
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "68%", maxHeight: "95%", objectFit: "contain", filter: `drop-shadow(0 20px 50px rgba(0,0,0,0.9)) drop-shadow(0 0 40px ${accent}15)`, position: "relative", zIndex: 2 }} />
        ) : (
          <div style={{ width: 140, height: 140, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, zIndex: 2 }}>📦</div>
        )}
      </div>

      {/* Bloco inferior com vidro */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.3) 85%, transparent 100%)", padding: "60px 24px 20px", zIndex: 10 }}>
        <p style={{ color: "white", fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, textAlign: "center", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, marginBottom: 4 }}>
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "line-through" }}>R$ {fmtBR(marketPrice)}</span>}
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>R$</span>
          <span style={{ color: "white", fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 22, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center", marginBottom: 10 }}>12x de R$ {fmtBR((price / 12))}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <WhatsAppBadge />
          </div>
          <div style={{ background: template.sealGradient, borderRadius: 20, padding: "8px 20px" }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}