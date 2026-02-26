import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

import ClassicTemplate from "./templates/ClassicTemplate";
import NeonTemplate from "./templates/NeonTemplate";
import DiagonalTemplate from "./templates/DiagonalTemplate";
import SpotlightTemplate from "./templates/SpotlightTemplate";
import MagazineTemplate from "./templates/MagazineTemplate";
import BrutalistTemplate from "./templates/BrutalistTemplate";

const TEMPLATES = {
  oferta: {
    name: "Oferta Explosiva",
    accentColor: "#ef4444",
    accentGlow: "rgba(239,68,68,0.6)",
    gradient: "linear-gradient(145deg, #1a0000 0%, #2d0a0a 25%, #0f0f0f 50%, #1a0505 75%, #0a0a0a 100%)",
    sealGradient: "linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)",
    badge: "🔥 OFERTA IMPERDÍVEL",
    sealText: "OFERTA",
    ribbonColor: "#ef4444",
  },
  desconto: {
    name: "Super Desconto",
    accentColor: "#10b981",
    accentGlow: "rgba(16,185,129,0.6)",
    gradient: "linear-gradient(145deg, #001a0f 0%, #0a2d1a 25%, #0f0f0f 50%, #051a0d 75%, #0a0a0a 100%)",
    sealGradient: "linear-gradient(135deg, #10b981, #059669, #047857)",
    badge: "💰 PREÇO IMBATÍVEL",
    sealText: "ECONOMIA",
    ribbonColor: "#10b981",
  },
  lancamento: {
    name: "Lançamento VIP",
    accentColor: "#a855f7",
    accentGlow: "rgba(168,85,247,0.6)",
    gradient: "linear-gradient(145deg, #0f001a 0%, #1a0a2d 25%, #0f0f0f 50%, #0d051a 75%, #0a0a0a 100%)",
    sealGradient: "linear-gradient(135deg, #a855f7, #9333ea, #7c3aed)",
    badge: "✨ LANÇAMENTO EXCLUSIVO",
    sealText: "NOVO",
    ribbonColor: "#a855f7",
  },
  black: {
    name: "Black Premium",
    accentColor: "#f59e0b",
    accentGlow: "rgba(245,158,11,0.5)",
    gradient: "linear-gradient(145deg, #0a0a00 0%, #1a1a0a 15%, #000000 40%, #0a0a05 70%, #050505 100%)",
    sealGradient: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
    badge: "⚡ BLACK PREMIUM",
    sealText: "PREMIUM",
    ribbonColor: "#f59e0b",
  },
  whatsapp: {
    name: "WhatsApp Promo",
    accentColor: "#25d366",
    accentGlow: "rgba(37,211,102,0.5)",
    gradient: "linear-gradient(145deg, #001a0a 0%, #0a2d15 25%, #0f0f0f 50%, #051a0b 75%, #0a0a0a 100%)",
    sealGradient: "linear-gradient(135deg, #25d366, #128c7e, #075e54)",
    badge: "📱 CORRE QUE ACABA!",
    sealText: "PROMO",
    ribbonColor: "#25d366",
  },
};

const LAYOUT_CONFIGS = {
  square: { ratio: "1/1", maxW: 480 },
  story: { ratio: "9/16", maxW: 360 },
  vertical: { ratio: "3/4", maxW: 420 },
};

export default function PromoTemplateCard({ product, templateKey, overrides = {}, layout = "square", design = "classic" }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const template = TEMPLATES[templateKey];
  if (!template || !product) return null;

  const price = product.price_catalog || product.selling_price_retail || 0;
  const marketPrice = product.market_value || product.selling_price_retail || 0;
  const discount = marketPrice > price ? Math.round((1 - price / marketPrice) * 100) : 0;

  const displayTitle = overrides.title || product.description;
  const displayImage = overrides.imageUrl || product.image_urls?.[0];
  const displayBadge = overrides.badgeText || template.sealText;
  const displayCta = overrides.ctaText || "COMPRE AGORA";
  const whatsappNumber = overrides.whatsappNumber || "";

  const accent = template.accentColor;
  const layoutCfg = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.square;

  const captureCard = async () => {
    if (!cardRef.current) return null;
    return html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true, allowTaint: false, logging: false });
  };

  const handleDownload = async () => {
    setDownloading(true);
    const canvas = await captureCard();
    if (canvas) {
      const link = document.createElement("a");
      link.download = `promo-${product.lot || product.id}-${design}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    setSharing(true);
    const canvas = await captureCard();
    if (canvas) {
      canvas.toBlob(async (blob) => {
        if (navigator.share && blob) {
          const file = new File([blob], `promo-${product.lot || product.id}.png`, { type: "image/png" });
          try { await navigator.share({ title: displayTitle, text: `${displayBadge} ${displayTitle} - R$ ${price.toFixed(2)}!`, files: [file] }); }
          catch { handleDownload(); }
        } else { handleDownload(); }
        setSharing(false);
      });
    } else { setSharing(false); }
  };

  const renderProductImage = (maxW = "80%", maxH = "100%") => displayImage ? (
    <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: maxW, maxHeight: maxH, objectFit: "contain", filter: `drop-shadow(0 8px 32px rgba(0,0,0,0.8)) drop-shadow(0 0 20px ${template.accentGlow}30)` }} />
  ) : (
    <div style={{ width: 140, height: 140, borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
  );

  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

  const commonProps = { displayTitle, displayImage, displayBadge, displayCta, whatsappNumber, price, marketPrice, discount, accent, template, renderProductImage, logoUrl };

  const WhatsAppBadge = ({ dark }) => whatsappNumber ? (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#25d366", flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span style={{ color: dark ? "#1f2937" : "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700 }}>{whatsappNumber}</span>
    </div>
  ) : null;

  const renderFlashTemplate = () => (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #f97316 0%, #ea580c 25%, #c026d3 60%, #7c3aed 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "52%", height: "100%", background: "white", clipPath: "polygon(0 0, 100% 0, 72% 100%, 0 100%)" }} />
      {/* Stripe patterns */}
      <div style={{ position: "absolute", top: 0, left: "48%", width: 6, height: "100%", background: "rgba(255,255,255,0.15)", transform: "skewX(-12deg)" }} />
      <div style={{ position: "absolute", top: 0, left: "51%", width: 3, height: "100%", background: "rgba(255,255,255,0.08)", transform: "skewX(-12deg)" }} />
      {/* Bolinhas decorativas */}
      <div style={{ position: "absolute", bottom: 80, left: 18, display: "grid", gridTemplateColumns: "repeat(4,8px)", gap: 5, zIndex: 3 }}>
        {Array.from({length:12}).map((_,i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i % 3 === 0 ? "#7c3aed" : "rgba(124,58,237,0.3)" }} />)}
      </div>
      {/* Badge */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <div style={{ background: "#7c3aed", padding: "10px 24px", clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)" }}>
          <span style={{ color: "white", fontSize: 15, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>⚡ {displayBadge}</span>
        </div>
      </div>
      {/* Selo */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 78, height: 78, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(249,115,22,0.5)", border: "4px solid rgba(255,255,255,0.3)" }}>
          <span style={{ color: "white", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 700 }}>OFF</span>
        </div>
      )}
      {/* Preço esquerda */}
      <div style={{ position: "absolute", bottom: "20%", left: 24, zIndex: 10, maxWidth: "44%" }}>
        <p style={{ color: "#222", fontSize: 15, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        {discount > 0 && <p style={{ color: "#aaa", fontSize: 13, textDecoration: "line-through", marginBottom: 2 }}>R$ {marketPrice.toFixed(2)}</p>}
        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ color: "#666", fontSize: 14, fontWeight: 600 }}>R$</span>
          <span style={{ color: "#111", fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: "#7c3aed", fontSize: 24, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
      </div>
      {/* Produto direita com moldura vibrante */}
      <div style={{ position: "absolute", top: "12%", right: "1%", width: "50%", height: "62%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura com borda roxa + sombra interna */}
        <div style={{ position: "absolute", inset: 6, borderRadius: 16, border: "2px solid rgba(124,58,237,0.35)", boxShadow: "inset 0 0 20px rgba(124,58,237,0.08)", pointerEvents: "none" }} />
        {/* Pontinhos nos cantos */}
        <div style={{ position: "absolute", top: 2, left: 2, width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", opacity: 0.4 }} />
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#f97316", opacity: 0.4 }} />
        {renderProductImage("88%", "88%")}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl} alt="Leilão NoZap" style={{ height: 36, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          {whatsappNumber && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: "4px 10px" }}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#25d366", flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{whatsappNumber}</span>
            </div>
          )}
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "7px 18px" }}>
          <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
        </div>
      </div>
    </div>
  );

  const renderRelampagoTemplate = () => (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0f0f0f 0%, #050505 50%, #000 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)", zIndex: 1 }} />
      <div style={{ position: "absolute", top: "3%", left: "50%", transform: "translateX(-50%)", fontSize: 140, lineHeight: 1, zIndex: 2, opacity: 0.06, filter: "drop-shadow(0 0 60px rgba(245,158,11,0.8))" }}>⚡</div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, transparent 5%, #f59e0b 30%, #ef4444 70%, transparent 95%)", zIndex: 5 }} />
      {/* Badge */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "8px 20px", borderRadius: 4, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(245,158,11,0.3)" }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ color: "#000", fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      </div>
      {/* Selo */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: 18, right: 18, zIndex: 10, width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #ef4444, #b91c1c)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(239,68,68,0.5)", border: "3px solid rgba(255,255,255,0.12)" }}>
          <span style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: 700 }}>OFF</span>
        </div>
      )}
      {/* Produto com moldura LED/digital */}
      <div style={{ position: "absolute", top: "10%", left: "12%", right: "12%", height: "42%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura com borda tipo LED scan */}
        <div style={{ position: "absolute", inset: 4, borderRadius: 8, border: "1px solid rgba(245,158,11,0.2)", boxShadow: "0 0 20px rgba(245,158,11,0.06), inset 0 0 20px rgba(0,0,0,0.3)", pointerEvents: "none" }} />
        {/* Linha de scan animada */}
        <div style={{ position: "absolute", top: 4, left: 4, right: 4, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)" }} />
        <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, height: 1, background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)" }} />
        {renderProductImage("60%", "90%")}
      </div>
      {/* Separador */}
      <div style={{ position: "absolute", left: "15%", right: "15%", bottom: "40%", height: 2, background: "linear-gradient(90deg, transparent, #f59e0b50, transparent)", zIndex: 10 }} />
      {/* Preço LED */}
      <div style={{ position: "absolute", bottom: "16%", left: 0, right: 0, zIndex: 10, padding: "0 24px" }}>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ background: "rgba(0,0,0,0.8)", borderRadius: 10, padding: "14px 18px", border: "1px solid rgba(34,211,238,0.15)", display: "inline-flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 16, fontWeight: 600 }}>R$</span>
          <span style={{ color: "#22d3ee", fontSize: 50, fontWeight: 900, fontFamily: "'Courier New', monospace", lineHeight: 1, textShadow: "0 0 25px rgba(34,211,238,0.7), 0 0 60px rgba(34,211,238,0.3)", letterSpacing: "0.04em" }}>{price.toFixed(2).replace(".",",")}</span>
        </div>
        {discount > 0 && <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, textDecoration: "line-through", marginTop: 6 }}>De R$ {marketPrice.toFixed(2)}</p>}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: 14, left: 24, right: 24, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
          <WhatsAppBadge />
        </div>
        <div style={{ background: "linear-gradient(135deg, #25d366, #128c7e)", borderRadius: 20, padding: "8px 18px", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}>
          <span style={{ fontSize: 14 }}>📱</span>
          <span style={{ color: "white", fontSize: 11, fontWeight: 800 }}>PEÇA JÁ</span>
        </div>
      </div>
    </div>
  );

  const renderWaveTemplate = () => (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)" }} />
      <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1 }} viewBox="0 0 500 250" preserveAspectRatio="none" width="100%" height="50%">
        <defs>
          <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={accent} stopOpacity="0.25" /><stop offset="100%" stopColor={accent} stopOpacity="0.05" /></linearGradient>
          <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={accent} stopOpacity="0.15" /><stop offset="100%" stopColor={accent} stopOpacity="0.02" /></linearGradient>
        </defs>
        <path d="M0,80 C60,20 120,140 200,70 C280,0 340,120 420,60 C460,30 480,80 500,50 L500,250 L0,250Z" fill="url(#wg1)" />
        <path d="M0,130 C70,70 150,190 250,110 C350,30 400,150 500,90 L500,250 L0,250Z" fill="url(#wg2)" />
        <path d="M0,180 C100,140 200,220 320,170 C440,120 480,200 500,160 L500,250 L0,250Z" fill={`${accent}08`} />
      </svg>
      {/* Círculos decorativos */}
      <div style={{ position: "absolute", top: 14, right: 14, zIndex: 3 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `2px solid ${accent}20`, position: "relative" }}>
          <div style={{ position: "absolute", top: 15, left: 15, width: 50, height: 50, borderRadius: "50%", background: `${accent}10`, border: `1px solid ${accent}15` }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: "42%", left: 14, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${accent}15`, zIndex: 3 }} />
      {/* Badge */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <div style={{ background: `rgba(15,23,42,0.8)`, backdropFilter: "blur(10px)", border: `1px solid ${accent}35`, borderRadius: 20, padding: "8px 18px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }} />
          <span style={{ color: "white", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      </div>
      {/* Selo */}
      {discount > 0 && (
        <div style={{ position: "absolute", top: 80, right: 22, zIndex: 10, width: 66, height: 66, borderRadius: "50%", background: template.sealGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 24px ${template.accentGlow}`, border: "3px solid rgba(255,255,255,0.2)", transform: "rotate(12deg)" }}>
          <span style={{ color: "white", fontSize: 19, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 7, fontWeight: 700 }}>OFF</span>
        </div>
      )}
      {/* Produto com moldura ondulada */}
      <div style={{ position: "absolute", top: "10%", left: "10%", right: "10%", height: "44%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura arredondada suave */}
        <div style={{ position: "absolute", inset: 4, borderRadius: 24, border: `1.5px solid ${accent}20`, boxShadow: `inset 0 0 20px ${accent}05`, pointerEvents: "none" }} />
        {/* Mini-ondas nas laterais */}
        <svg style={{ position: "absolute", left: -2, top: "20%", height: "60%", width: 8, zIndex: 1 }} viewBox="0 0 8 60" preserveAspectRatio="none"><path d={`M4,0 Q0,10 4,20 Q8,30 4,40 Q0,50 4,60`} fill="none" stroke={`${accent}30`} strokeWidth="1.5" /></svg>
        <svg style={{ position: "absolute", right: -2, top: "20%", height: "60%", width: 8, zIndex: 1 }} viewBox="0 0 8 60" preserveAspectRatio="none"><path d={`M4,0 Q8,10 4,20 Q0,30 4,40 Q8,50 4,60`} fill="none" stroke={`${accent}30`} strokeWidth="1.5" /></svg>
        {renderProductImage("64%", "90%")}
      </div>
      {/* Preço */}
      <div style={{ position: "absolute", bottom: "15%", left: 0, right: 0, zIndex: 10, padding: "0 24px" }}>
        <p style={{ color: "white", fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
          {discount > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>R$</span>
          <span style={{ color: "white", fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: accent, fontSize: 22, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginBottom: 6 }}>12x de R$ {(price / 12).toFixed(2)}</p>}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: 14, left: 24, right: 24, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
          <WhatsAppBadge />
        </div>
        <div style={{ background: template.sealGradient, borderRadius: 20, padding: "8px 20px", boxShadow: `0 4px 16px ${template.accentGlow}40` }}>
          <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{displayCta}</span>
        </div>
      </div>
    </div>
  );

  const renderGridTemplate = () => {
    const g = "#84cc16";
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "#111" }} />
        {/* Blocos geométricos */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "42%", height: "48%", background: g, zIndex: 1 }} />
        <div style={{ position: "absolute", top: 0, left: "42%", width: "22%", height: "52%", background: "#222", zIndex: 1 }} />
        <div style={{ position: "absolute", top: "58%", left: 0, width: "16%", height: "20%", background: g, zIndex: 1 }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "25%", height: "12%", background: "#222", zIndex: 1 }} />
        {/* Moldura */}
        <div style={{ position: "absolute", top: "6%", left: "6%", right: "6%", bottom: "6%", border: `2px solid ${g}35`, zIndex: 2, pointerEvents: "none" }} />
        {/* Badge */}
        <div style={{ position: "absolute", top: 18, left: 18, zIndex: 10 }}>
          <div style={{ background: "#000", padding: "8px 18px", borderRadius: 2 }}>
            <span style={{ color: g, fontSize: 13, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayBadge}</span>
          </div>
        </div>
        {/* Selo quadrado */}
        {discount > 0 && (
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 72, height: 72, background: g, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(132,204,22,0.4)" }}>
            <span style={{ color: "#000", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
            <span style={{ color: "rgba(0,0,0,0.5)", fontSize: 9, fontWeight: 700 }}>OFF</span>
          </div>
        )}
        {/* Produto com moldura geométrica */}
        <div style={{ position: "absolute", top: "8%", right: "3%", width: "52%", height: "55%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          {/* Moldura quadrada sem arredondamento */}
          <div style={{ position: "absolute", inset: 6, border: `2px solid ${g}40`, pointerEvents: "none" }} />
          {/* Triângulo canto inferior direito */}
          <div style={{ position: "absolute", bottom: 6, right: 6, width: 0, height: 0, borderBottom: `18px solid ${g}30`, borderLeft: "18px solid transparent", pointerEvents: "none" }} />
          {/* Triângulo canto superior esquerdo */}
          <div style={{ position: "absolute", top: 6, left: 6, width: 0, height: 0, borderTop: `18px solid ${g}30`, borderRight: "18px solid transparent", pointerEvents: "none" }} />
          {renderProductImage("85%", "85%")}
        </div>
        {/* Preço */}
        <div style={{ position: "absolute", bottom: "14%", left: 0, right: 0, zIndex: 10, padding: "0 24px" }}>
          <p style={{ color: "white", fontSize: 16, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            {discount > 0 && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>R$</span>
            <span style={{ color: "white", fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
            <span style={{ color: g, fontSize: 24, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
          </div>
        </div>
        {/* Footer */}
        <div style={{ position: "absolute", bottom: 12, left: 24, right: 24, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <WhatsAppBadge />
          </div>
          <div style={{ background: g, padding: "8px 20px", borderRadius: 2 }}>
            <span style={{ color: "#000", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTagTemplate = () => (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #fefce8 0%, #fef9c3 30%, #fef08a 70%, #fde047 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "65%", height: "55%", background: "linear-gradient(135deg, rgba(245,158,11,0.12), transparent)" }} />
      {/* Etiqueta */}
      <div style={{ position: "absolute", top: -6, right: 50, zIndex: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 2, height: 24, background: "#777" }} />
        <div style={{ width: 66, height: 84, background: "#1f2937", borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(0,0,0,0.35)", position: "relative" }}>
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", border: "2px solid #666" }} />
          <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 800, marginTop: 14 }}>ATÉ</span>
          <span style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{discount > 0 ? discount : 49}<span style={{ fontSize: 13, verticalAlign: "super" }}>%</span></span>
          <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 800 }}>OFF</span>
        </div>
      </div>
      {/* Badge */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <div style={{ background: "#1f2937", padding: "9px 20px", borderRadius: 6 }}>
          <span style={{ color: "white", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>🏷️ {displayBadge}</span>
        </div>
      </div>
      {/* Produto com moldura de etiqueta */}
      <div style={{ position: "absolute", top: "10%", left: "8%", right: "8%", height: "45%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        {/* Moldura com tracejado */}
        <div style={{ position: "absolute", inset: 8, borderRadius: 12, border: "2px dashed rgba(31,41,55,0.2)", pointerEvents: "none" }} />
        {/* Label "PRODUTO" no topo da moldura */}
        <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", background: "#fef9c3", padding: "0 8px", zIndex: 3 }}>
          <span style={{ color: "#92400e", fontSize: 7, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>PRODUTO</span>
        </div>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: "64%", maxHeight: "90%", objectFit: "contain", filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.2))", position: "relative", zIndex: 2 }} />
        ) : (
          <div style={{ width: 130, height: 130, borderRadius: 16, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, zIndex: 2 }}>📦</div>
        )}
      </div>
      {/* Preço */}
      <div style={{ position: "absolute", bottom: "16%", left: 0, right: 0, zIndex: 10, padding: "0 24px" }}>
        <p style={{ color: "#1f2937", fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          {discount > 0 && <span style={{ color: "rgba(0,0,0,0.3)", fontSize: 14, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <span style={{ color: "rgba(0,0,0,0.5)", fontSize: 14, fontWeight: 600 }}>R$</span>
          <span style={{ color: "#1f2937", fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{price.toFixed(2).split('.')[0]}</span>
          <span style={{ color: "#ef4444", fontSize: 24, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
        </div>
        {price > 50 && <p style={{ color: "rgba(0,0,0,0.35)", fontSize: 10, marginTop: 4 }}>12x de R$ {(price / 12).toFixed(2)}</p>}
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: 14, left: 24, right: 24, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl} alt="Leilão NoZap" style={{ height: 56, width: "auto", objectFit: "contain" }} />
          <WhatsAppBadge dark />
        </div>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
          <span style={{ color: "white", fontSize: 8, fontWeight: 800, textTransform: "uppercase", textAlign: "center", lineHeight: 1.2 }}>COMPRE<br/>AGORA</span>
        </div>
      </div>
    </div>
  );

  // Decide qual template renderizar
  const renderContent = () => {
    switch (design) {
      case "flash": return renderFlashTemplate();
      case "relampago": return renderRelampagoTemplate();
      case "wave": return renderWaveTemplate();
      case "grid": return renderGridTemplate();
      case "tag": return renderTagTemplate();
      case "neon": return <NeonTemplate {...commonProps} />;
      case "diagonal": return <DiagonalTemplate {...commonProps} />;
      case "spotlight": return <SpotlightTemplate {...commonProps} />;
      case "magazine": return <MagazineTemplate {...commonProps} />;
      case "brutalist": return <BrutalistTemplate {...commonProps} />;
      default: return <ClassicTemplate {...commonProps} />;
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        style={{
          width: "100%",
          maxWidth: layoutCfg.maxW,
          aspectRatio: layoutCfg.ratio,
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          background: "#000",
        }}
        className="mx-auto"
      >
        {renderContent()}
      </div>

      <div className="flex gap-3 mx-auto" style={{ maxWidth: layoutCfg.maxW }}>
        <Button onClick={handleDownload} disabled={downloading} variant="outline" className="flex-1 gap-2 bg-gray-800/80 border-gray-600 text-white hover:bg-gray-700 py-5 rounded-xl font-semibold">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Baixar HD
        </Button>
        <Button onClick={handleShare} disabled={sharing} className="flex-1 gap-2 py-5 rounded-xl font-semibold text-white" style={{ background: template.sealGradient, border: "none" }}>
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

export { TEMPLATES };