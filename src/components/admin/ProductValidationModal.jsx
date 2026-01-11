import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";
import ProductImagePreview from "./ProductImagePreview";

export default function ProductValidationModal({ productData, onConfirm, onCancel, isLoading }) {
  if (!productData) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl bg-gray-800 border border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-xl text-yellow-400 flex items-center gap-2">
            ⚠️ Validar Dados do Produto
          </CardTitle>
          <p className="text-sm text-gray-400 mt-2">Revise os dados encontrados no Mercado Livre antes de importar</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* IMAGENS */}
          <div>
            <h3 className="text-sm font-bold text-blue-400 mb-3">Imagens do Produto</h3>
            <ProductImagePreview imageUrls={productData.image_urls || []} />
          </div>

          {/* TÍTULO */}
          <div>
            <h3 className="text-sm font-bold text-blue-400 mb-2">Título</h3>
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200">
              {productData.title || "Sem título"}
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div>
            <h3 className="text-sm font-bold text-blue-400 mb-2">Descrição</h3>
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 max-h-[150px] overflow-y-auto text-sm">
              {productData.description || "Sem descrição"}
            </div>
          </div>

          {/* PREÇO (opcional) */}
          {productData.price && (
            <div>
              <h3 className="text-sm font-bold text-blue-400 mb-2">Preço de Referência</h3>
              <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 text-green-400 font-semibold">
                R$ {parseFloat(productData.price).toFixed(2)}
              </div>
            </div>
          )}

          {/* BOTÕES */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button 
              onClick={onCancel} 
              disabled={isLoading}
              variant="outline" 
              className="flex-1 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Rejeitar
            </Button>
            <Button 
              onClick={onConfirm} 
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isLoading ? "Importando..." : "Confirmar e Importar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}