import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

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
  square:    { ratio: "1/1.15", maxW: 480 },
  story:     { ratio: "9/16",   maxW: 400 },
  landscape: { ratio: "16/9",   maxW: 600 },
  minimal:   { ratio: "1/1",    maxW: 480 },
  split:     { ratio: "1/1",    maxW: 520 },
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

  // Overrides customizáveis
  const displayTitle = overrides.title || product.description;
  const displayImage = overrides.imageUrl || product.image_urls?.[0];
  const displayBadge = overrides.badgeText || template.sealText;
  const displayCta = overrides.ctaText || "COMPRE AGORA";
  const displayBrand = overrides.brandName || "Leilão NoZap";
  const displayBrandSub = overrides.brandSub || "Catálogo Oficial";

  const layoutCfg = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.square;

  const captureCard = async () => {
    if (!cardRef.current) return null;
    return html2canvas(cardRef.current, {
      scale: 3,
      backgroundColor: null,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    const canvas = await captureCard();
    if (canvas) {
      const link = document.createElement("a");
      link.download = `promo-${product.lot || product.id}-${templateKey}.png`;
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
          try {
            await navigator.share({
              title: product.description,
              text: `${template.badge} ${product.description} - Por apenas R$ ${price.toFixed(2)}! 🛒`,
              files: [file],
            });
          } catch (e) {
            handleDownload();
          }
        } else {
          handleDownload();
        }
        setSharing(false);
      });
    } else {
      setSharing(false);
    }
  };

  const accent = template.accentColor;

  // === DESIGN-SPECIFIC BACKGROUND ===
  const getDesignBackground = () => {
    switch (design) {
      case "neon":
        return `linear-gradient(145deg, #000010 0%, #0a0a2e 30%, #050520 60%, #000015 100%)`;
      case "diagonal":
        return `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 40%, #0f0f0f 60%, #050505 100%)`;
      case "spotlight":
        return `radial-gradient(ellipse at 50% 35%, #1a1a1a 0%, #0a0a0a 40%, #000000 100%)`;
      case "magazine":
        return `linear-gradient(180deg, #f8f8f8 0%, #eeeeee 40%, #e0e0e0 100%)`;
      case "brutalist":
        return `#000000`;
      case "flash":
        return `linear-gradient(135deg, #f97316 0%, #ea580c 30%, #7c3aed 70%, #6d28d9 100%)`;
      case "relampago":
        return `linear-gradient(180deg, #111111 0%, #0a0a0a 40%, #000000 100%)`;
      case "wave":
        return `linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)`;
      case "grid":
        return `#1a1a1a`;
      case "tag":
        return `linear-gradient(145deg, #fefce8 0%, #fef9c3 30%, #fef08a 60%, #fde047 100%)`;
      default: // classic
        return template.gradient;
    }
  };

  const isLightBg = design === "magazine" || design === "tag";
  const isMagazine = design === "magazine";
  const textColor = isLightBg ? "#111" : "white";
  const textMuted = isLightBg ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)";
  const textSemi = isLightBg ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";

  // === RENDER POR LAYOUT ===
  const renderBgEffects = () => {
    if (design === "neon") {
      return (
        <>
          <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, background: `radial-gradient(circle, ${accent}60 0%, transparent 60%)`, borderRadius: "50%", filter: "blur(60px)", opacity: 0.5 }} />
          <div style={{ position: "absolute", bottom: -40, left: -60, width: 240, height: 240, background: `radial-gradient(circle, ${accent}50 0%, transparent 60%)`, borderRadius: "50%", filter: "blur(70px)", opacity: 0.35 }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, borderRadius: "50%", filter: "blur(50px)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `2px solid ${accent}30`, pointerEvents: "none", boxShadow: `inset 0 0 40px ${accent}10, 0 0 30px ${accent}15` }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes neonFlicker { 0%,100% { opacity:1; } 50% { opacity:0.85; } }`}</style>
        </>
      );
    }
    if (design === "diagonal") {
      return (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "140%", background: `linear-gradient(135deg, ${accent}12, transparent)`, transform: "skewX(-20deg)" }} />
            <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "40%", height: "120%", background: `linear-gradient(-45deg, ${accent}08, transparent)`, transform: "skewX(15deg)" }} />
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: template.sealGradient }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: template.sealGradient, opacity: 0.6 }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1px solid ${accent}15`, pointerEvents: "none" }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "spotlight") {
      return (
        <>
          <div style={{ position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)", width: 350, height: 350, background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`, borderRadius: "50%", filter: "blur(30px)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 35%, transparent 30%, rgba(0,0,0,0.6) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1px solid ${accent}10`, pointerEvents: "none" }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "magazine") {
      return (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: template.sealGradient }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: template.sealGradient }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", pointerEvents: "none" }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "brutalist") {
      return (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: `4px solid ${accent}`, borderRadius: 20, pointerEvents: "none", zIndex: 5 }} />
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, bottom: 8, border: `1px solid ${accent}40`, borderRadius: 14, pointerEvents: "none", zIndex: 5 }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "flash") {
      return (
        <>
          {/* White diagonal slice */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "55%", height: "100%", background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 60%, transparent 61%)", zIndex: 1 }} />
          {/* Border frame */}
          <div style={{ position: "absolute", inset: 12, border: `3px solid ${accent}`, borderRadius: 12, pointerEvents: "none", zIndex: 2 }} />
          {/* Decorative dots */}
          <div style={{ position: "absolute", top: 40, left: 30, display: "grid", gridTemplateColumns: "repeat(5,8px)", gap: 6, zIndex: 3 }}>
            {Array.from({length: 15}).map((_,i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed" }} />)}
          </div>
          <div style={{ position: "absolute", bottom: 30, left: 20, display: "grid", gridTemplateColumns: "repeat(4,8px)", gap: 6, zIndex: 3 }}>
            {Array.from({length: 8}).map((_,i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: `${accent}60` }} />)}
          </div>
          {/* Arrow shapes */}
          <div style={{ position: "absolute", top: "15%", right: "5%", width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: `20px solid ${accent}`, transform: "rotate(45deg)", opacity: 0.6, zIndex: 3 }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "relampago") {
      return (
        <>
          {/* Lightning bolt glow */}
          <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", fontSize: 80, lineHeight: 1, zIndex: 2, filter: "drop-shadow(0 0 30px rgba(245,158,11,0.8)) drop-shadow(0 0 60px rgba(245,158,11,0.4))", opacity: 0.15 }}>⚡</div>
          {/* LED-style scanlines */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)", zIndex: 1 }} />
          {/* Top accent line */}
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, zIndex: 3 }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "wave") {
      return (
        <>
          {/* Wave shapes */}
          <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1 }} viewBox="0 0 500 200" preserveAspectRatio="none" width="100%" height="40%">
            <path d="M0,120 C100,60 200,180 300,100 C400,20 450,140 500,80 L500,200 L0,200Z" fill={`${accent}25`} />
            <path d="M0,150 C80,100 180,200 280,130 C380,60 430,160 500,110 L500,200 L0,200Z" fill={`${accent}15`} />
          </svg>
          {/* Accent circles */}
          <div style={{ position: "absolute", top: 20, right: 20, width: 60, height: 60, borderRadius: "50%", border: `2px solid ${accent}30`, zIndex: 2 }} />
          <div style={{ position: "absolute", top: 35, right: 35, width: 30, height: 30, borderRadius: "50%", background: `${accent}20`, zIndex: 2 }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1px solid rgba(255,255,255,0.06)`, pointerEvents: "none" }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "grid") {
      const gridAccent = "#84cc16";
      return (
        <>
          {/* Large colored block top-left */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "35%", height: "40%", background: gridAccent, zIndex: 1 }} />
          {/* Small colored block bottom-left */}
          <div style={{ position: "absolute", bottom: "20%", left: 0, width: "15%", height: "15%", background: gridAccent, zIndex: 1 }} />
          {/* Dark block overlay */}
          <div style={{ position: "absolute", top: 0, left: "35%", width: "30%", height: "55%", background: "#333", zIndex: 1 }} />
          {/* Inner frame */}
          <div style={{ position: "absolute", top: "12%", left: "12%", right: "12%", bottom: "12%", border: `2px solid ${gridAccent}50`, zIndex: 2, pointerEvents: "none" }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    if (design === "tag") {
      return (
        <>
          {/* Hanging tag */}
          <div style={{ position: "absolute", top: -5, right: 60, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 2, height: 20, background: "#555" }} />
            <div style={{ width: 56, height: 70, background: "#1f2937", borderRadius: "4px 4px 4px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", position: "relative" }}>
              <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, borderRadius: "50%", border: "2px solid #555", background: "transparent" }} />
              <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 800, marginTop: 10 }}>PRODUTO</span>
              <span style={{ color: "white", fontSize: 16, fontWeight: 900, lineHeight: 1 }}>49<span style={{ fontSize: 10, verticalAlign: "super" }}>%</span></span>
              <span style={{ color: "#ef4444", fontSize: 8, fontWeight: 700 }}>OFF</span>
            </div>
          </div>
          {/* Diagonal accent */}
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "60%", height: "50%", background: `linear-gradient(135deg, ${accent}20, transparent)` }} />
          {/* CTA circle */}
          <div style={{ position: "absolute", bottom: 20, left: 20, width: 56, height: 56, borderRadius: "50%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", zIndex: 5 }}>
            <span style={{ color: "white", fontSize: 8, fontWeight: 800, textTransform: "uppercase", textAlign: "center", lineHeight: 1.2 }}>COMPRE<br/>AGORA</span>
          </div>
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", pointerEvents: "none" }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </>
      );
    }
    // classic
    return (
      <>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, background: `radial-gradient(circle, ${template.accentGlow} 0%, transparent 70%)`, borderRadius: "50%", filter: "blur(40px)", opacity: 0.4 }} />
        <div style={{ position: "absolute", bottom: 40, left: -40, width: 180, height: 180, background: `radial-gradient(circle, ${template.accentGlow} 0%, transparent 70%)`, borderRadius: "50%", filter: "blur(50px)", opacity: 0.25 }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}33 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", borderLeft: `1px solid ${accent}15`, transform: "skewX(-15deg)", transformOrigin: "top right" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1px solid ${accent}12`, pointerEvents: "none" }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </>
    );
  };

  const renderBadge = () => {
    if (design === "brutalist") {
      return (
        <div style={{ background: accent, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#000", fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      );
    }
    if (design === "magazine") {
      return (
        <div style={{ borderBottom: `2px solid ${accent}`, padding: "4px 0", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{displayBadge}</span>
        </div>
      );
    }
    const badgeBg = design === "neon" ? `${accent}20` : "rgba(0,0,0,0.6)";
    const badgeBorder = design === "neon" ? `${accent}60` : `${accent}40`;
    return (
      <div style={{ background: badgeBg, backdropFilter: "blur(12px)", border: `1px solid ${badgeBorder}`, borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, ...(design === "neon" ? { boxShadow: `0 0 12px ${accent}30` } : {}) }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}, 0 0 16px ${accent}80`, animation: "pulse 2s infinite" }} />
        <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayBadge}</span>
      </div>
    );
  };

  const renderDiscountSeal = (size = 68) => discount > 0 ? (
    <div style={{ width: size, height: size, borderRadius: "50%", background: template.sealGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${template.accentGlow}, 0 0 40px ${template.accentGlow}40`, transform: "rotate(12deg)", border: "3px solid rgba(255,255,255,0.2)" }}>
      <span style={{ color: "white", fontSize: size * 0.29, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: size * 0.1, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>OFF</span>
    </div>
  ) : null;

  const renderProductImage = (maxW = "80%", maxH = "100%") => displayImage ? (
    <img src={displayImage} alt={displayTitle} crossOrigin="anonymous" style={{ maxWidth: maxW, maxHeight: maxH, objectFit: "contain", filter: `drop-shadow(0 8px 32px rgba(0,0,0,0.8)) drop-shadow(0 0 20px ${template.accentGlow}30)` }} />
  ) : (
    <div style={{ width: 140, height: 140, borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📦</div>
  );

  const renderPriceBlock = (titleSize = 16, priceSize = 36) => {
    const neonShadow = design === "neon" ? `0 0 30px ${accent}50, 0 0 60px ${accent}20` : `0 0 20px ${template.accentGlow}60`;
    const brutalistStyle = design === "brutalist";
    return (
      <>
        <p style={{ color: textColor, fontSize: titleSize, fontWeight: brutalistStyle ? 900 : 700, lineHeight: 1.3, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: isMagazine ? "none" : "0 2px 8px rgba(0,0,0,0.5)", ...(brutalistStyle ? { textTransform: "uppercase", letterSpacing: "0.05em" } : {}) }}>{displayTitle}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          {discount > 0 && <span style={{ color: textMuted, fontSize: priceSize * 0.4, fontWeight: 500, textDecoration: "line-through" }}>R$ {marketPrice.toFixed(2)}</span>}
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ color: textSemi, fontSize: priceSize * 0.4, fontWeight: 600 }}>R$</span>
            <span style={{ color: textColor, fontSize: priceSize, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, textShadow: isMagazine ? "none" : neonShadow }}>{price.toFixed(2).split('.')[0]}</span>
            <span style={{ color: accent, fontSize: priceSize * 0.5, fontWeight: 800 }}>,{price.toFixed(2).split('.')[1]}</span>
          </div>
        </div>
        {price > 50 && <p style={{ color: isMagazine ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500, marginBottom: 10 }}>ou até <span style={{ color: accent, fontWeight: 700 }}>12x</span> de R$ {(price / 12).toFixed(2)} sem juros</p>}
      </>
    );
  };

  const renderFooter = () => {
    if (design === "brutalist") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "white", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>{displayBrand}</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 600, marginTop: 2 }}>{displayBrandSub}</p>
          </div>
          <div style={{ background: accent, padding: "8px 18px" }}>
            <span style={{ color: "#000", fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      );
    }
    if (design === "magazine") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#111", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{displayBrand}</p>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: 9, fontWeight: 500, marginTop: 2 }}>{displayBrandSub}</p>
          </div>
          <div style={{ background: template.sealGradient, borderRadius: 6, padding: "7px 16px" }}>
            <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${accent}30, ${accent}10)`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏷️</div>
          <div>
            <p style={{ color: "white", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{displayBrand}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 500, marginTop: 2 }}>{displayBrandSub}</p>
          </div>
        </div>
        <div style={{ background: template.sealGradient, borderRadius: 10, padding: "7px 16px", boxShadow: `0 4px 16px ${template.accentGlow}40` }}>
          <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{displayCta}</span>
        </div>
      </div>
    );
  };

  const renderCardContent = () => {
    if (layout === "split") {
      return (
        <>
          {renderBgEffects()}
          {/* Left half: image */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "48%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            {renderProductImage("90%", "80%")}
          </div>
          {/* Right half: info */}
          <div style={{ position: "absolute", top: 0, right: 0, width: "52%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px 24px 12px" }}>
            <div style={{ marginBottom: 12 }}>{renderBadge()}</div>
            {renderDiscountSeal(56)}
            <div style={{ marginTop: 16 }}>{renderPriceBlock(15, 32)}</div>
            <div style={{ height: 1, margin: "10px 0", background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
            {renderFooter()}
          </div>
        </>
      );
    }

    if (layout === "minimal") {
      return (
        <>
          {renderBgEffects()}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
            <div style={{ marginBottom: 16 }}>{renderBadge()}</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              {renderProductImage("65%", "60%")}
            </div>
            <div style={{ width: "100%", textAlign: "left", marginTop: 16 }}>
              {renderPriceBlock(15, 30)}
              <div style={{ height: 1, margin: "8px 0", background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
              {renderFooter()}
            </div>
          </div>
          {discount > 0 && <div style={{ position: "absolute", top: 16, right: 16 }}>{renderDiscountSeal(60)}</div>}
        </>
      );
    }

    if (layout === "landscape") {
      return (
        <>
          {renderBgEffects()}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 16px", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {renderBadge()}
            {renderDiscountSeal(54)}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, width: "45%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px 16px" }}>
            {renderProductImage("85%", "80%")}
          </div>
          <div style={{ position: "absolute", top: 0, right: 0, width: "55%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 20px 16px 8px" }}>
            {renderPriceBlock(14, 28)}
            <div style={{ height: 1, margin: "8px 0", background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
            {renderFooter()}
          </div>
        </>
      );
    }

    if (layout === "story") {
      return (
        <>
          {renderBgEffects()}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "20px 20px", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {renderBadge()}
            {renderDiscountSeal(60)}
          </div>
          <div style={{ position: "absolute", top: "10%", left: 0, right: 0, height: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            {renderProductImage("75%", "100%")}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "28%", height: 1, background: `linear-gradient(90deg, transparent, ${accent}50, transparent)` }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.4) 75%, transparent 100%)", padding: "56px 24px 28px" }}>
            {renderPriceBlock(17, 38)}
            <div style={{ height: 1, margin: "10px 0", background: `linear-gradient(90deg, ${accent}40, ${accent}15, transparent)` }} />
            {renderFooter()}
          </div>
        </>
      );
    }

    // Default: square
    const bottomGrad = isMagazine
      ? "linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 80%, transparent 100%)"
      : "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 80%, transparent 100%)";
    return (
      <>
        {renderBgEffects()}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {renderBadge()}
          {renderDiscountSeal(68)}
        </div>
        <div style={{ position: "absolute", top: "12%", left: 0, right: 0, bottom: "42%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          {renderProductImage("80%", "100%")}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "38%", height: 1, background: `linear-gradient(90deg, transparent, ${accent}50, transparent)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: bottomGrad, padding: "48px 24px 20px" }}>
          {renderPriceBlock(16, 36)}
          <div style={{ height: 1, marginBottom: 12, background: `linear-gradient(90deg, ${accent}40, ${accent}15, transparent)` }} />
          {renderFooter()}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        style={{
          background: getDesignBackground(),
          width: "100%",
          maxWidth: layoutCfg.maxW,
          aspectRatio: layoutCfg.ratio,
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
        className="mx-auto"
      >
        {renderCardContent()}
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