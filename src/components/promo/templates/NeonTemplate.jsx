import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function NeonTemplate({ displayTitle, displayImage, displayBadge, displayCta, displayBrand, displayBrandSub, price, marketPrice, discount, accent, template, renderProductImage, logoUrl }) {
  // Neon Cyberpunk: Fundo escuro azulado, bordas brilhantes, tipografia com glow, estilo futurista
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #030014 0%, #0a0025 30%, #10002b 60%, #030014 100%)" }} />
      {/* Neon grid no chão */}
      <div style={{ position: "absolute", bottom: 0, left: "-10%", right: "-10%", height: "40%", background: `linear-gradient(to top, ${accent}08, transparent)`, transform: "perspective(400px) rotateX(45deg)", transformOrigin: "bottom" }} />
      {/* Glow orbs */}
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 200, height: 200, background: `radial-gradient(circle, ${accent}40 0%, transparent 60%)`, borderRadius: "50%", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 180, height: 180, background: `radial-gradient(circle, #ec4899 30 0%, transparent 60%)`, borderRadius: "50%", filter: "blur(70px)" }} />
      {/* Neon frame */}
      <div style={{ position: "absolute", inset: 10, borderRadius: 16, border: `2px solid ${accent}50`, boxShadow: `inset 0 0 30px ${accent}08, 0 0 20px ${accent}15`, pointerEvents: "none", zIndex: 3 }} />
      {/* Corner accents */}
      <div style={{ position: "absolute", top: 10, left: 10, width: 30, height: 30, borderTop: `3px solid ${accent}`, borderLeft: `3px solid ${accent}`, borderRadius: "4px 0 0 0", zIndex: 4 }} />
      <div style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderTop: `3px solid ${accent}`, borderRight: `3px solid ${accent}`, borderRadius: "0 4px 0 0", zIndex: 4 }} />
      <div style={{ position: "absolute", bottom: 10, left: 10, width: 30, height: 30, borderBottom: `3px solid ${accent}`, borderLeft: `3px solid ${accent}`, borderRadius: "0 0 0 4px", zIndex: 4 }} />
      <div style={{ position: "absolute", bottom: 10, right: 10, width: 30, height: 30, borderBottom: `3px solid ${accent}`, borderRight: `3px solid ${accent}`, borderRadius: "0 0 4px 0", zIndex: 4 }} />

      {/* Badge glitch style */}
      <div style={{ position: "absolute", top: 22, left: 22, zIndex: 10 }}>
        <div style={{ background: `${accent}15`, border: `1px solid ${accent}70`, borderRadius: 4, padding: "6px 14px", boxShadow: `0 0 15px ${accent}30, inset 0 0 15px ${accent}10` }}>
          <span style={{ color: accent, fontSize: 12, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", textShadow: `0 0 10px ${accent}` }}>{displayBadge}</span>
        </div>
      </div>

      {/* Selo hexagonal */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: 18, right: 22, zIndex: 10, width: 70, height: 70, background: `${accent}20`, border: `2px solid ${accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", boxShadow: `0 0 20px ${accent}40` }}>
          <span style={{ color: accent, fontSize: 20, fontWeight: 900, lineHeight: 1, textShadow: `0 0 10px ${accent}` }}>-{discount}%</span>
          <span style={{ color: `${accent}cc`, fontSize: 8, fontWeight: 700 }}>OFF</span>
        </div>
      )}

      {/* Produto com moldura neon */}
      <div style={{ position: "absolute", top: "12%", left: "10%", right: "10%", height: "42%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura neon com glow duplo */}
        <div style={{ position: "absolute", inset: 4, borderRadius: 12, border: `1.5px solid ${accent}60`, boxShadow: `0 0 15px ${accent}25, inset 0 0 15px ${accent}08`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, border: `1px solid ${accent}20`, pointerEvents: "none" }} />
        {/* Linhas de scan horizontais dentro da moldura */}
        <div style={{ position: "absolute", top: "20%", left: 8, right: 8, height: 1, background: `${accent}12` }} />
        <div style={{ position: "absolute", bottom: "20%", left: 8, right: 8, height: 1, background: `${accent}12` }} />
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "65%", maxHeight: "90%", objectFit: "contain", filter: `drop-shadow(0 0 30px ${accent}40) drop-shadow(0 0 60px ${accent}20)`, position: "relative", zIndex: 2 }} />
        ) : (
          <div style={{ width: 120, height: 120, borderRadius: 16, background: `${accent}10`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, zIndex: 2 }}>📦</div>
        )}
      </div>

      {/* Separador neon */}
      <div style={{ position: "absolute", left: 24, right: 24, bottom: "38%", height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 10px ${accent}60`, zIndex: 10 }} />

      {/* Bloco de preço */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px 20px", zIndex: 10 }}>
        <p style={{ color: "white", fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0 0 20px rgba(255,255,255,0.1)" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <span style={{ color: `${accent}99`, fontSize: 13, fontWeight: 600 }}>R$</span>
          <span style={{ color: "white", fontSize: 42, fontWeight: 900, lineHeight: 1, textShadow: `0 0 30px ${accent}50, 0 0 60px ${accent}20`, letterSpacing: "-0.02em" }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 22, fontWeight: 800, textShadow: `0 0 15px ${accent}` }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginBottom: 10 }}>ou 12x de R$ {(price / 12).toFixed(2)}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 28, width: "auto", objectFit: "contain", filter: `drop-shadow(0 0 8px ${accent}30)` }} />
          <div style={{ background: `${accent}20`, border: `1px solid ${accent}60`, borderRadius: 6, padding: "8px 18px", boxShadow: `0 0 12px ${accent}30` }}>
            <span style={{ color: accent, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", textShadow: `0 0 8px ${accent}` }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}