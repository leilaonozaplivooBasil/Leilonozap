import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";

const TEMPLATES = {
  oferta: {
    name: "Oferta Imperdível",
    bg: "from-red-600 via-orange-500 to-yellow-500",
    badge: "🔥 OFERTA",
    textColor: "text-white",
  },
  desconto: {
    name: "Super Desconto",
    bg: "from-emerald-600 via-green-500 to-lime-400",
    badge: "💰 DESCONTO",
    textColor: "text-white",
  },
  lancamento: {
    name: "Lançamento",
    bg: "from-purple-700 via-violet-600 to-fuchsia-500",
    badge: "✨ NOVO",
    textColor: "text-white",
  },
  black: {
    name: "Black Premium",
    bg: "from-gray-900 via-gray-800 to-gray-700",
    badge: "⚡ PREMIUM",
    textColor: "text-white",
  },
  whatsapp: {
    name: "WhatsApp Story",
    bg: "from-green-700 via-emerald-600 to-teal-500",
    badge: "📱 CONFIRA",
    textColor: "text-white",
  },
};

export default function PromoTemplateCard({ product, templateKey, onShare }) {
  const cardRef = useRef(null);
  const template = TEMPLATES[templateKey];
  if (!template || !product) return null;

  const price = product.price_catalog || product.selling_price_retail || 0;
  const marketPrice = product.market_value || product.selling_price_retail || 0;
  const discount = marketPrice > price ? Math.round((1 - price / marketPrice) * 100) : 0;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `promo-${product.lot || product.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
    });
    canvas.toBlob(async (blob) => {
      if (navigator.share && blob) {
        const file = new File([blob], `promo-${product.lot || product.id}.png`, { type: "image/png" });
        try {
          await navigator.share({
            title: product.description,
            text: `${template.badge} ${product.description} - R$ ${price.toFixed(2)}`,
            files: [file],
          });
        } catch (e) {
          // fallback: download
          handleDownload();
        }
      } else {
        handleDownload();
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div
        ref={cardRef}
        className={`relative bg-gradient-to-br ${template.bg} rounded-2xl overflow-hidden aspect-square max-w-[400px] mx-auto`}
        style={{ width: "100%" }}
      >
        {/* Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {template.badge}
          </span>
        </div>

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <span className="bg-yellow-400 text-black text-sm font-black px-3 py-1.5 rounded-full">
              -{discount}%
            </span>
          </div>
        )}

        {/* Product Image */}
        <div className="absolute inset-0 flex items-center justify-center p-8 pt-14">
          {product.image_urls?.[0] ? (
            <img
              src={product.image_urls[0]}
              alt={product.description}
              className="max-w-full max-h-[55%] object-contain drop-shadow-2xl"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-32 h-32 rounded-2xl bg-white/10 flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
          )}
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5 pt-16">
          <p className={`${template.textColor} font-bold text-base leading-tight mb-2 line-clamp-2`}>
            {product.description}
          </p>
          <div className="flex items-end gap-2">
            {discount > 0 && (
              <span className="text-gray-400 line-through text-sm">
                R$ {marketPrice.toFixed(2)}
              </span>
            )}
            <span className="text-white font-black text-2xl">
              R$ {price.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-semibold">Leilão NoZap • Catálogo</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 max-w-[400px] mx-auto">
        <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
          <Download className="w-4 h-4" />
          Baixar
        </Button>
        <Button onClick={handleShare} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

export { TEMPLATES };