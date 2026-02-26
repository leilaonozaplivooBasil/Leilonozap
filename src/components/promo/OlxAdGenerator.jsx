import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Sparkles, Copy, Check, Loader2, MapPin } from "lucide-react";

function formatPhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 10) return raw;
  const ddd1 = digits.substring(0, 1);
  const ddd2 = digits.substring(1, 2);
  const rest = digits.substring(2).split("").join(" ");
  return `( ${ddd1} ${ddd2} ) ${rest}`;
}

export default function OlxAdGenerator({ product }) {
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [generatedAd, setGeneratedAd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const price = product.price_catalog || product.selling_price_retail || 0;
  const marketPrice = product.market_value || product.selling_price_retail || 0;
  const discount = marketPrice > price ? Math.round((1 - price / marketPrice) * 100) : 0;
  const formattedPhone = formatPhone(telefone);

  const generateAd = async () => {
    if (!telefone || !cidade) return;
    setLoading(true);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Gere uma descrição para anúncio de OLX/Marketplace para o seguinte produto:

Produto: ${product.description}
Preço: R$ ${price.toFixed(2)}
${discount > 0 ? `Preço de mercado: R$ ${marketPrice.toFixed(2)} (${discount}% de desconto)` : ""}
Localização: ${bairro ? bairro + ", " : ""}${cidade}
Telefone formatado: ${formattedPhone}

REGRAS OBRIGATÓRIAS - siga EXATAMENTE esta estrutura:

1. TÍTULO CHAMATIVO em CAPS incluindo o NOME DO PRODUTO e a localização (${bairro ? bairro + ", " : ""}${cidade}). Algo como "${product.description.toUpperCase()} - OPORTUNIDADE EM ${cidade.toUpperCase()}!" ou "${product.description.toUpperCase()} IMPERDÍVEL NO ${bairro ? bairro.toUpperCase() : cidade.toUpperCase()}!"

2. Uma linha em branco

3. Frase convidando para chamar no WhatsApp ou entrar em contato, incluindo o número EXATAMENTE assim: ${formattedPhone}

4. Uma linha em branco

5. Descrição detalhada do produto (3-5 linhas), destacando qualidades, estado, e benefícios

6. Uma linha em branco

7. Frase de impacto/urgência motivando a compra (ex: "Não perca essa chance!", "Corre que é só uma unidade!")

8. Uma linha em branco

9. Frase final de contato com o número EXATAMENTE assim: ${formattedPhone} (ex: "Chame agora no WhatsApp: ${formattedPhone}")

IMPORTANTE:
- O número de telefone DEVE aparecer EXATAMENTE como ${formattedPhone} (com espaços entre TODOS os dígitos)
- Use emojis moderadamente
- Linguagem brasileira informal de marketplace
- NÃO coloque preço no texto (o preço vai no campo separado da OLX)
- Retorne APENAS o texto do anúncio, nada mais`,
      response_json_schema: {
        type: "object",
        properties: {
          ad_text: { type: "string" },
        },
      },
    });

    setGeneratedAd(result.ad_text);
    setLoading(false);
  };

  const copyText = () => {
    if (!generatedAd) return;
    navigator.clipboard.writeText(generatedAd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Anúncio OLX / Marketplace</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Gere descrições prontas para anunciar na OLX, Facebook Marketplace e similares.
        </p>

        {/* Campos */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm text-gray-300 font-medium mb-1 block">Cidade *</label>
            <Input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: Rio de Janeiro"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-1 block">Bairro</label>
            <Input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Ex: Bangu"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-1 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Número do WhatsApp *
            </label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex: 21996629605"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            />
            {telefone && (
              <p className="text-xs text-green-400 mt-1">
                Será exibido como: {formattedPhone}
              </p>
            )}
          </div>
        </div>

        {/* Produto selecionado */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            {product.image_urls?.[0] && (
              <img src={product.image_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div>
              <p className="text-white font-medium text-sm">{product.description}</p>
              <p className="text-emerald-400 font-bold">R$ {price.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Gerar / Resultado */}
        {!generatedAd ? (
          <Button
            onClick={generateAd}
            disabled={loading || !telefone || !cidade}
            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-5"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando anúncio...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Anúncio OLX
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-400">Descrição Gerada</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyText}
                  className="gap-1.5 text-gray-400 hover:text-white"
                >
                  {copied ? (
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
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{generatedAd}</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => { setGeneratedAd(null); generateAd(); }}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Novo
              </Button>
              <Button
                onClick={copyText}
                variant="outline"
                className="flex-1 gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" />
                Copiar Texto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}