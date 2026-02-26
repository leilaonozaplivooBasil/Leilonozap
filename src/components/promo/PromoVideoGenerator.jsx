import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Sparkles, Download, Loader2, Image as ImageIcon } from "lucide-react";

export default function PromoVideoGenerator({ product }) {
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const price = product.price_catalog || product.selling_price_retail || 0;
  const marketPrice = product.market_value || product.selling_price_retail || 0;
  const discount = marketPrice > price ? Math.round((1 - price / marketPrice) * 100) : 0;

  const generatePromoImage = async () => {
    setLoading(true);
    const prompt = `Create a professional promotional banner image for an e-commerce product sale.
The product is: "${product.description}".
Price: R$ ${price.toFixed(2)}${discount > 0 ? ` (${discount}% OFF from R$ ${marketPrice.toFixed(2)})` : ''}.
Style: Modern, vibrant, eye-catching promotional banner.
Include visual elements like: sale badges, price tags, sparkles, dynamic background.
Brand: "Leilão NoZap" - green and dark theme.
The image should be suitable for social media and WhatsApp stories.
Do NOT include any text in the image, only visual design elements and product representation.
Make it look premium and professional.`;

    const result = await base44.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: product.image_urls?.[0] ? [product.image_urls[0]] : undefined,
    });

    setGeneratedImage(result.url);
    setLoading(false);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `promo-ai-${product.lot || product.id}.png`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Imagem Promocional com IA</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Gere uma imagem promocional única usando IA baseada no produto selecionado.
        </p>

        {!generatedImage ? (
          <Button
            onClick={generatePromoImage}
            disabled={loading}
            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-5"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando imagem com IA (10-15s)...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Imagem com IA
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-gray-700">
              <img
                src={generatedImage}
                alt="Promo gerada por IA"
                className="w-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                Baixar
              </Button>
              <Button
                onClick={() => {
                  setGeneratedImage(null);
                  generatePromoImage();
                }}
                className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Nova
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}