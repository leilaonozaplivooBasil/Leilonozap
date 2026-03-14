import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PromoCustomizer({ product, overrides, onChange }) {
  const fileInputRef = useRef(null);
  const images = product?.image_urls || [];
  const currentImageIndex = images.indexOf(overrides.imageUrl);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange({ ...overrides, imageUrl: file_url });
  };

  const handleSelectImage = (url) => {
    onChange({ ...overrides, imageUrl: url });
  };

  const handleReset = () => {
    onChange({
      imageUrl: images[0] || "",
      title: product?.description || "",
      badgeText: "",
      ctaText: "",
      whatsappNumber: overrides.whatsappNumber || "",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Personalizar Banner
        </h3>
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-500 hover:text-white gap-1.5 text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
          Resetar
        </Button>
      </div>

      {/* Seletor de Imagem */}
      <div>
        <Label className="text-gray-300 text-xs mb-2 block">Imagem do Produto</Label>
        {images.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => handleSelectImage(url)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  overrides.imageUrl === url
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                {overrides.imageUrl === url && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full gap-2 bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
          size="sm"
        >
          <ImagePlus className="w-4 h-4" />
          Enviar outra imagem
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Título do Produto */}
      <div>
        <Label className="text-gray-300 text-xs mb-1.5 block">Título do Produto</Label>
        <Input
          value={overrides.title}
          onChange={(e) => onChange({ ...overrides, title: e.target.value })}
          placeholder={product?.description}
          className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600"
        />
      </div>

      {/* Texto do Badge */}
      <div>
        <Label className="text-gray-300 text-xs mb-1.5 block">Texto do Selo (topo esquerdo)</Label>
        <Input
          value={overrides.badgeText}
          onChange={(e) => onChange({ ...overrides, badgeText: e.target.value })}
          placeholder="Ex: PREMIUM, OFERTA, NOVO..."
          className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600"
        />
      </div>

      {/* CTA */}
      <div>
        <Label className="text-gray-300 text-xs mb-1.5 block">Botão CTA (canto inferior)</Label>
        <Input
          value={overrides.ctaText}
          onChange={(e) => onChange({ ...overrides, ctaText: e.target.value })}
          placeholder="Ex: COMPRE AGORA, GARANTA JÁ..."
          className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600"
        />
      </div>

      {/* WhatsApp */}
      <div>
        <Label className="text-gray-300 text-xs mb-1.5 block">Número do WhatsApp (aparece no banner)</Label>
        <Input
          value={overrides.whatsappNumber || ""}
          onChange={(e) => onChange({ ...overrides, whatsappNumber: e.target.value })}
          placeholder="Ex: (21) 99999-9999"
          className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600"
        />
      </div>
    </div>
  );
}