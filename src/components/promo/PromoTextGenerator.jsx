import React, { useState } from "react";
import { fmtBR } from '@/lib/money';
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Copy, Sparkles, MessageCircle, Instagram, Check, Loader2 } from "lucide-react";

export default function PromoTextGenerator({ product }) {
  const [texts, setTexts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  if (!product) return null;

  const price = product.price_catalog || product.selling_price_retail || 0;
  const marketPrice = product.market_value || product.selling_price_retail || 0;
  const discount = marketPrice > price ? Math.round((1 - price / marketPrice) * 100) : 0;

  const generateTexts = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Gere textos promocionais para o seguinte produto de um leilão/catálogo online chamado "Leilão NoZap":

Produto: ${product.description}
Preço: R$ ${fmtBR(price)}
${discount > 0 ? `Desconto: ${discount}% (de R$ ${fmtBR(marketPrice)} por R$ ${fmtBR(price)})` : ""}
Lote: ${product.lot || "N/A"}

Gere 3 textos:
1. "whatsapp": Texto curto para enviar via WhatsApp (máx 300 caracteres), com emojis, urgência e call-to-action
2. "instagram": Legenda para Instagram/Facebook (máx 500 caracteres), com hashtags relevantes
3. "stories": Texto curto para stories (máx 150 caracteres), impactante e direto

IMPORTANTE: Use linguagem de vendas brasileira, com emojis, e mencione "Leilão NoZap" ou "Catálogo NoZap".`,
      response_json_schema: {
        type: "object",
        properties: {
          whatsapp: { type: "string" },
          instagram: { type: "string" },
          stories: { type: "string" },
        },
      },
    });
    if (!result || result.ok === false || (!result.whatsapp && !result.instagram && !result.stories)) {
      alert(result?.needs_key ? '⚙️ A IA ainda não está conectada. Peça pra ativar a chave do AI Gateway.' : '⚠️ Não consegui gerar os textos agora. Tente de novo.');
      setLoading(false);
      return;
    }
    setTexts(result);
    setLoading(false);
  };

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const channels = [
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-400" },
    { key: "instagram", label: "Instagram / Facebook", icon: Instagram, color: "text-pink-400" },
    { key: "stories", label: "Stories", icon: Sparkles, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-4">
      {!texts ? (
        <Button
          onClick={generateTexts}
          disabled={loading}
          className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando textos com IA...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Gerar Textos Promocionais com IA
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          {channels.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm font-semibold text-white">{label}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyText(key, texts[key])}
                  className="gap-1.5 text-gray-400 hover:text-white"
                >
                  {copiedKey === key ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-xs">Copiar</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{texts[key]}</p>
            </div>
          ))}

          <Button
            onClick={generateTexts}
            variant="outline"
            className="w-full gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Sparkles className="w-4 h-4" />
            Gerar Novos Textos
          </Button>
        </div>
      )}
    </div>
  );
}