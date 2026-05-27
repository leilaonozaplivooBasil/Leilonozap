import React from "react";

const LOGO_URL = "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function NeonTemplate({ displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, renderProductImage, logoUrl }) {
  const WhatsAppBadge = () => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#25d366", flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;
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
        <div style={{ position: "absolute", top: 18, right: 22, zIndex: 10, width: 76, height: 76, background: `${accent}20`, border: `2px solid ${accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", boxShadow: `0 0 20px ${accent}40` }}>
          <span style={{ color: accent, fontSize: 8, fontWeight: 800, lineHeight: 1, textShadow: `0 0 10px ${accent}` }}>ATÉ</span>
          <span style={{ color: accent, fontSize: 20, fontWeight: 900, lineHeight: 1, textShadow: `0 0 10px ${accent}` }}>60%</span>
          <span style={{ color: `${accent}cc`, fontSize: 6, fontWeight: 700 }}>DE DESCONTO</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl || LOGO_URL} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <WhatsAppBadge />
          </div>
          <div style={{ background: `${accent}20`, border: `1px solid ${accent}60`, borderRadius: 6, padding: "8px 18px", boxShadow: `0 0 12px ${accent}30` }}>
            <span style={{ color: accent, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", textShadow: `0 0 8px ${accent}` }}>{displayCta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}