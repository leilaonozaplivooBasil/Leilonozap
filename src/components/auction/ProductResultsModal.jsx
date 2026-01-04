import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, ExternalLink, Loader2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ProductResultsModal({ isOpen, onClose, results, searchTerm, onSelectProduct }) {
  const [selectedResult, setSelectedResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (result) => {
    setIsImporting(true);
    setSelectedResult(result);
    
    try {
      await onSelectProduct(result.productUrl);
    } catch (error) {
      console.error("Erro ao importar:", error);
    } finally {
      setIsImporting(false);
      setSelectedResult(null);
    }
  };

  const marketplaceColors = {
    'Mercado Livre': 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    'Amazon': 'bg-orange-500/20 text-orange-400 border-orange-500',
    'Shopee': 'bg-red-500/20 text-red-400 border-red-500',
    'Magazine Luiza': 'bg-blue-500/20 text-blue-400 border-blue-500',
    'Casas Bahia': 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-400 flex items-center gap-2">
            🔍 Resultados para "{searchTerm}"
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Encontramos {results.length} anúncios. Escolha o melhor para importar:
          </p>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {results.map((result, index) => (
            <Card 
              key={index}
              className="bg-gray-800 border border-gray-700 hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/20"
            >
              <div className="p-4">
                <div className="flex gap-4">
                  {/* THUMBNAIL */}
                  <div className="w-28 h-28 flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative">
                    {result.thumbnailUrl && result.thumbnailUrl.startsWith('http') ? (
                      <>
                        <img 
                          src={result.thumbnailUrl} 
                          alt={result.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.warn('❌ Falha ao carregar thumbnail:', result.thumbnailUrl);
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            parent.innerHTML = `
                              <div class="flex flex-col items-center justify-center h-full text-gray-500 text-center p-2">
                                <div class="text-3xl mb-1">🏪</div>
                                <div class="text-xs">${result.marketplace}</div>
                              </div>
                            `;
                          }}
                        />
                        {/* Indicador de carregamento */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
                          <div className="text-2xl">⏳</div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-2">
                        <div className="text-3xl mb-1">🏪</div>
                        <div className="text-xs">{result.marketplace}</div>
                      </div>
                    )}
                  </div>

                  {/* INFO */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white mb-2 line-clamp-2">
                      {result.title}
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* MARKETPLACE */}
                      <Badge 
                        className={`${marketplaceColors[result.marketplace] || 'bg-gray-600 text-white border-gray-500'} border`}
                      >
                        🏪 {result.marketplace}
                      </Badge>

                      {/* PREÇO */}
                      {result.price && (
                        <Badge variant="outline" className="border-green-500 text-green-400">
                          💰 R$ {result.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}

                      {/* CONDIÇÃO */}
                      {result.condition && (
                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                          {result.condition === 'Novo' ? '✨' : '📦'} {result.condition}
                        </Badge>
                      )}

                      {/* RATING */}
                      {result.rating && result.rating > 0 && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                          {result.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    {/* VENDEDOR */}
                    {result.seller && (
                      <p className="text-xs text-gray-400 mb-2">
                        Vendedor: {result.seller}
                      </p>
                    )}

                    {/* AÇÕES */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        onClick={() => window.open(result.productUrl, '_blank')}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver Anúncio
                      </Button>

                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleImport(result)}
                        disabled={isImporting && selectedResult?.productUrl === result.productUrl}
                      >
                        {isImporting && selectedResult?.productUrl === result.productUrl ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            ✅ Importar Este
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}