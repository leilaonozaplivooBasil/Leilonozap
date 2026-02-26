import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Sparkles, Download, Loader2, Image as ImageIcon, Phone } from "lucide-react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png";

export default function PromoVideoGenerator({ product }) {
  const [generatedImage, setGeneratedImage] = useState(null);
  const [compositeImage, setCompositeImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  if (!product) return null;

  const price = product.price_catalog || product.selling_price_retail || 0;
  const marketPrice = product.market_value || product.selling_price_retail || 0;
  const discount = marketPrice > price ? Math.round((1 - price / marketPrice) * 100) : 0;

  const addOverlay = (aiImageUrl) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const aiImg = new Image();
      aiImg.crossOrigin = "anonymous";
      aiImg.onload = () => {
        canvas.width = aiImg.width;
        canvas.height = aiImg.height;
        ctx.drawImage(aiImg, 0, 0);

        // Barra inferior semi-transparente
        const barH = Math.round(canvas.height * 0.12);
        const barY = canvas.height - barH;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, barY, canvas.width, barH);

        // Linha verde no topo da barra
        ctx.fillStyle = "#25d366";
        ctx.fillRect(0, barY, canvas.width, 3);

        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          // Logo à esquerda
          const logoH = Math.round(barH * 0.7);
          const logoW = Math.round(logoH * (logoImg.width / logoImg.height));
          const logoX = Math.round(canvas.width * 0.04);
          const logoY = barY + Math.round((barH - logoH) / 2);
          ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

          // WhatsApp ícone + número à direita
          if (whatsappNumber) {
            const fontSize = Math.round(canvas.width * 0.035);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = "#25d366";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            const textX = canvas.width - Math.round(canvas.width * 0.04);
            const textY = barY + Math.round(barH / 2);
            ctx.fillText("📱 " + whatsappNumber, textX, textY);
          }

          resolve(canvas.toDataURL("image/png", 1.0));
        };
        logoImg.onerror = () => {
          // Se logo falhar, gera sem ela
          if (whatsappNumber) {
            const fontSize = Math.round(canvas.width * 0.035);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = "#25d366";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            const textX = canvas.width - Math.round(canvas.width * 0.04);
            const textY = barY + Math.round(barH / 2);
            ctx.fillText("📱 " + whatsappNumber, textX, textY);
          }
          resolve(canvas.toDataURL("image/png", 1.0));
        };
        logoImg.src = LOGO_URL;
      };
      aiImg.src = aiImageUrl;
    });
  };

  const generatePromoImage = async () => {
    setLoading(true);
    const prompt = `Create a professional promotional banner image for an e-commerce product sale.
The product is: "${product.description}".
Price: R$ ${price.toFixed(2)}${discount > 0 ? ` (${discount}% OFF from R$ ${marketPrice.toFixed(2)})` : ''}.
Style: Modern, vibrant, eye-catching promotional banner.
Include visual elements like: sale badges, price tags, sparkles, dynamic background.
Brand colors: green (#25d366) and dark theme.
The image should be suitable for social media and WhatsApp stories.
Do NOT include any text or logos in the image, only visual design elements and product representation.
Make it look premium and professional.
IMPORTANT: Leave the bottom 12% of the image clean/empty - it will be used for a branded footer overlay.`;

    const result = await base44.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: product.image_urls?.[0] ? [product.image_urls[0]] : undefined,
    });

    setGeneratedImage(result.url);
    const final = await addOverlay(result.url);
    setCompositeImage(final);
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
        <p className="text-sm text-gray-400 mb-3">
          Gere uma imagem promocional única usando IA baseada no produto selecionado.
        </p>

        {/* Campo WhatsApp */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 font-medium mb-1.5 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-400" />
            Número do WhatsApp
          </label>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="Ex: 21996629605"
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">Será exibido no rodapé da imagem junto com a logo Leilão NoZap</p>
        </div>

        {!compositeImage ? (
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
                src={compositeImage}
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
                  setCompositeImage(null);
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