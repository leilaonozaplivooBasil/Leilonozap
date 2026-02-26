import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Sparkles, Download, Loader2, Image as ImageIcon } from "lucide-react";

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

  const drawWhatsAppIcon = (ctx, x, y, size, color = "#25d366") => {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 24;
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.beginPath();
    // WhatsApp SVG path
    const p = new Path2D("M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.463 3.488A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z");
    ctx.fill(p);
    ctx.restore();
  };

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

        const W = canvas.width;
        const H = canvas.height;

        // === BARRA SUPERIOR: Nome do produto + Preço ===
        const topBarH = Math.round(H * 0.1);
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, W, topBarH);
        ctx.fillStyle = "#25d366";
        ctx.fillRect(0, topBarH - 3, W, 3);

        // Nome do produto
        const nameFontSize = Math.round(W * 0.035);
        ctx.font = `bold ${nameFontSize}px sans-serif`;
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const nameText = product.description.length > 40 ? product.description.substring(0, 40) + "..." : product.description;
        ctx.fillText(nameText, Math.round(W * 0.04), Math.round(topBarH * 0.4));

        // Preço em R$
        const priceFontSize = Math.round(W * 0.04);
        ctx.font = `900 ${priceFontSize}px sans-serif`;
        ctx.fillStyle = "#25d366";
        ctx.textAlign = "left";
        const priceText = `R$ ${price.toFixed(2)}`;
        ctx.fillText(priceText, Math.round(W * 0.04), Math.round(topBarH * 0.75));

        // Preço riscado (se tiver desconto)
        if (discount > 0) {
          const oldPriceFontSize = Math.round(W * 0.025);
          ctx.font = `600 ${oldPriceFontSize}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.textAlign = "left";
          const oldPriceText = `R$ ${marketPrice.toFixed(2)}`;
          const priceWidth = ctx.measureText(priceText).width;
          // Usar font de preço para medir
          ctx.font = `900 ${priceFontSize}px sans-serif`;
          const pw = ctx.measureText(priceText).width;
          ctx.font = `600 ${oldPriceFontSize}px sans-serif`;
          const oldX = Math.round(W * 0.04) + pw + 12;
          const oldY = Math.round(topBarH * 0.75);
          ctx.fillText(oldPriceText, oldX, oldY);
          // Linha riscada
          const oldW = ctx.measureText(oldPriceText).width;
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(oldX, oldY);
          ctx.lineTo(oldX + oldW, oldY);
          ctx.stroke();
        }

        // === BARRA INFERIOR: Logo + WhatsApp ===
        const barH = Math.round(H * 0.1);
        const barY = H - barH;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, barY, W, barH);
        ctx.fillStyle = "#25d366";
        ctx.fillRect(0, barY, W, 3);

        const finishWithoutLogo = () => {
          // WhatsApp ícone + número à direita
          if (whatsappNumber) {
            const iconSize = Math.round(W * 0.045);
            const fontSize = Math.round(W * 0.032);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = "white";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            const textX = W - Math.round(W * 0.04);
            const textY = barY + Math.round(barH / 2);
            ctx.fillText(whatsappNumber, textX, textY);
            const numWidth = ctx.measureText(whatsappNumber).width;
            drawWhatsAppIcon(ctx, textX - numWidth - iconSize - 8, textY - iconSize / 2, iconSize);
          }
          resolve(canvas.toDataURL("image/png", 1.0));
        };

        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          const logoH = Math.round(barH * 0.7);
          const logoW = Math.round(logoH * (logoImg.width / logoImg.height));
          const logoX = Math.round(W * 0.04);
          const logoY = barY + Math.round((barH - logoH) / 2);
          ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
          finishWithoutLogo();
        };
        logoImg.onerror = () => finishWithoutLogo();
        logoImg.src = LOGO_URL;
      };
      aiImg.src = aiImageUrl;
    });
  };

  const [error, setError] = useState(null);

  const generatePromoImage = async () => {
    setLoading(true);
    setError(null);

    const productName = product.description || "produto";
    const prompt = `A stunning high-quality product photography of "${productName}" on a premium dark background with dramatic lighting. Professional studio shot with green (#25d366) accent lighting and subtle bokeh effects. Clean, elegant composition suitable for social media. No text, no logos, no watermarks. Leave the bottom 12% of the image as clean dark space.`;

    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: product.image_urls?.[0] ? [product.image_urls[0]] : undefined,
      });

      setGeneratedImage(result.url);
      const final = await addOverlay(result.url);
      setCompositeImage(final);
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      setError("Não foi possível gerar a imagem. Tente novamente ou selecione um produto diferente.");
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!compositeImage) return;
    const link = document.createElement("a");
    link.href = compositeImage;
    link.download = `promo-ai-${product.lot || product.id}.png`;
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
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 mb-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

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