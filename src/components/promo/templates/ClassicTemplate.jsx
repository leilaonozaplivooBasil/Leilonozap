import React from "react";
import { fmtBR } from '@/lib/money';

const LOGO_URL = "/brand/icon-3d.webp";

export default function ClassicTemplate({ displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, renderProductImage, logoUrl }) {
  const WhatsAppBadge = () => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#25d366", flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;
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
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 78, height: 78, borderRadius: "50%", background: template.sealGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 24px ${template.accentGlow}`, border: "3px solid rgba(255,255,255,0.2)", transform: "rotate(12deg)" }}>
          <span style={{ color: "white", fontSize: 10, fontWeight: 800, lineHeight: 1 }}>ATÉ</span>
          <span style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>60%</span>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 7, fontWeight: 700, lineHeight: 1.2 }}>DE DESCONTO</span>
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
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textDecoration: "line-through" }}>R$ {fmtBR(marketPrice)}</span>}
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>R$</span>
          <span style={{ color: "white", fontSize: 38, fontWeight: 900, lineHeight: 1, textShadow: `0 0 20px ${template.accentGlow}` }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 20, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 12 }}>ou 12x de R$ {fmtBR((price / 12))}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <WhatsAppBadge />
          </div>
          <div style={{ background: template.sealGradient, borderRadius: 10, padding: "8px 18px", boxShadow: `0 4px 16px ${template.accentGlow}40` }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}