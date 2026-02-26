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

export default function PromoTemplateCard({ product, templateKey, overrides = {}, layout = "square" }) {
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

  return (
    <div className="space-y-4">
      {/* === CARD PROMOCIONAL === */}
      <div
        ref={cardRef}
        style={{
          background: template.gradient,
          width: "100%",
          maxWidth: 480,
          aspectRatio: "1/1.15",
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
        className="mx-auto"
      >
        {/* === EFEITOS DE FUNDO === */}
        {/* Orbs luminosos */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 220, height: 220,
          background: `radial-gradient(circle, ${template.accentGlow} 0%, transparent 70%)`,
          borderRadius: "50%", filter: "blur(40px)", opacity: 0.4,
        }} />
        <div style={{
          position: "absolute", bottom: 40, left: -40, width: 180, height: 180,
          background: `radial-gradient(circle, ${template.accentGlow} 0%, transparent 70%)`,
          borderRadius: "50%", filter: "blur(50px)", opacity: 0.25,
        }} />

        {/* Grid pattern sutil */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}33 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

        {/* Linha decorativa diagonal */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
          borderLeft: `1px solid ${accent}15`,
          transform: "skewX(-15deg)", transformOrigin: "top right",
        }} />

        {/* === TOPO: SELO + BADGE === */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Badge esquerda */}
          <div style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${accent}40`,
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 8px ${accent}, 0 0 16px ${accent}80`,
              animation: "pulse 2s infinite",
            }} />
            <span style={{ color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {displayBadge}
            </span>
          </div>

          {/* Desconto selo rotacionado */}
          {discount > 0 && (
            <div style={{
              width: 68, height: 68, borderRadius: "50%",
              background: template.sealGradient,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 20px ${template.accentGlow}, 0 0 40px ${template.accentGlow}40`,
              transform: "rotate(12deg)",
              border: "3px solid rgba(255,255,255,0.2)",
            }}>
              <span style={{ color: "white", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>-{discount}%</span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>OFF</span>
            </div>
          )}
        </div>

        {/* === PRODUTO: IMAGEM CENTRAL === */}
        <div style={{
          position: "absolute", top: "12%", left: 0, right: 0, bottom: "42%",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 32px",
        }}>
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayTitle}
              crossOrigin="anonymous"
              style={{
                maxWidth: "80%",
                maxHeight: "100%",
                objectFit: "contain",
                filter: `drop-shadow(0 8px 32px rgba(0,0,0,0.8)) drop-shadow(0 0 20px ${template.accentGlow}30)`,
              }}
            />
          ) : (
            <div style={{
              width: 140, height: 140, borderRadius: 20,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 48,
            }}>📦</div>
          )}
        </div>

        {/* === FAIXA DECORATIVA === */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: "38%", height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}50, transparent)`,
        }} />

        {/* === INFO INFERIOR === */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 80%, transparent 100%)",
          padding: "48px 24px 20px",
        }}>
          {/* Nome do produto */}
          <p style={{
            color: "white", fontSize: 16, fontWeight: 700,
            lineHeight: 1.3, marginBottom: 12,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}>
            {displayTitle}
          </p>

          {/* Preços */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            {discount > 0 && (
              <span style={{
                color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 500,
                textDecoration: "line-through",
              }}>
                R$ {marketPrice.toFixed(2)}
              </span>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>R$</span>
              <span style={{
                color: "white", fontSize: 36, fontWeight: 900,
                letterSpacing: "-0.02em", lineHeight: 1,
                textShadow: `0 0 20px ${template.accentGlow}60`,
              }}>
                {price.toFixed(2).split('.')[0]}
              </span>
              <span style={{ color: accent, fontSize: 18, fontWeight: 800 }}>
                ,{price.toFixed(2).split('.')[1]}
              </span>
            </div>
          </div>

          {/* Parcelamento */}
          {price > 50 && (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500, marginBottom: 12 }}>
              ou até <span style={{ color: accent, fontWeight: 700 }}>12x</span> de R$ {(price / 12).toFixed(2)} sem juros
            </p>
          )}

          {/* Barra divisória */}
          <div style={{
            height: 1, marginBottom: 12,
            background: `linear-gradient(90deg, ${accent}40, ${accent}15, transparent)`,
          }} />

          {/* Rodapé */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
                border: `1px solid ${accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>🏷️</div>
              <div>
                <p style={{ color: "white", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{displayBrand}</p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 500, marginTop: 2 }}>{displayBrandSub}</p>
              </div>
            </div>

            {/* CTA */}
            <div style={{
              background: template.sealGradient,
              borderRadius: 10,
              padding: "7px 16px",
              boxShadow: `0 4px 16px ${template.accentGlow}40`,
            }}>
              <span style={{ color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {displayCta}
              </span>
            </div>
          </div>
        </div>

        {/* Borda interna sutil */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 20,
          border: `1px solid ${accent}12`,
          pointerEvents: "none",
        }} />

        {/* Pulse animation */}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>

      {/* === BOTÕES === */}
      <div className="flex gap-3 max-w-[480px] mx-auto">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          variant="outline"
          className="flex-1 gap-2 bg-gray-800/80 border-gray-600 text-white hover:bg-gray-700 py-5 rounded-xl font-semibold"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Baixar HD
        </Button>
        <Button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 gap-2 py-5 rounded-xl font-semibold text-white"
          style={{ background: template.sealGradient, border: "none" }}
        >
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

export { TEMPLATES };