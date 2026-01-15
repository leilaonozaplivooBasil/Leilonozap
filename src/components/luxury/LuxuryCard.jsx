import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem } from "lucide-react";

export default function LuxuryCard({ item }) {
  const img = Array.isArray(item?.image_urls) && item.image_urls[0] ? item.image_urls[0] : null;
  const price = typeof item?.price === 'number' ? item.price : Number(item?.price || 0);
  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden hover:shadow-lg transition-all">
      <div className="w-full h-44 bg-gray-900 flex items-center justify-center">
        {img ? (
          <img src={img} alt={item.title} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-gray-500 text-sm">Sem imagem</div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-300 text-xs">
          <Gem className="w-4 h-4" /> Artigo de Luxo
        </div>
        <h3 className="text-white font-semibold line-clamp-2">{item.title}</h3>
        {item.description && (
          <p className="text-gray-400 text-sm line-clamp-3">{item.description}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <div className="text-green-400 font-bold">R$ {price.toFixed(2)}</div>
          <Button disabled variant="outline" className="border-gray-600 text-gray-300" title="Somente exibição">
            Em breve
          </Button>
        </div>
      </div>
    </Card>
  );
}