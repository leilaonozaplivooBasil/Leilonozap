import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
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
          <p className="text-sm text-gray-400 mt-2">Revise os dados encontrados antes de importar</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* FONTE E LINK DO ANÚNCIO */}
          {productData.sourceUrl && (
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-semibold">FONTE DO ANÚNCIO</p>
                  <p className="text-sm text-blue-300 mt-1">{productData.source || 'Loja Online'}</p>
                </div>
                <a 
                  href={productData.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-semibold transition-colors"
                >
                  Ver Anúncio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* IMAGENS COM URLs */}
          <div>
            <h3 className="text-sm font-bold text-blue-400 mb-3">Imagens do Produto ({productData.image_urls?.length || 0} encontradas)</h3>
            {productData.image_urls && productData.image_urls.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {productData.image_urls.map((url, idx) => (
                  <div key={idx} className="bg-gray-900 border border-gray-600 rounded-lg p-2 flex items-center gap-2">
                    <img 
                      src={url} 
                      alt={`Imagem ${idx + 1}`}
                      className="w-12 h-12 rounded object-cover bg-gray-800"
                      onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect width="18" height="18" x="3" y="3" rx="2"/%3E%3Ccircle cx="9" cy="9" r="2"/%3E%3Cpath d="m21 15-5-5L5 21"/%3E%3C/svg%3E'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{url.substring(0, 50)}...</p>
                    </div>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs flex-shrink-0"
                    >
                      🔗
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 text-center text-gray-400 text-sm">
                ⚠️ Nenhuma imagem disponível
              </div>
            )}
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

          {/* PREÇO */}
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