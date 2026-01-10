import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GoogleShoppingModal({ isOpen, onClose, productName }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const googleShoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(productName)}`;

  useEffect(() => {
    if (isOpen && productName) {
      searchGoogleShopping();
    }
  }, [isOpen, productName]);

  const searchGoogleShopping = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('searchGoogleShopping', {
        productName: productName
      });

      if (response.data && response.data.products && response.data.products.length > 0) {
        setResults(response.data.products);
      } else {
        setError('Nenhum resultado encontrado. Tente abrir em nova aba.');
      }
    } catch (err) {
      console.error('Erro ao buscar no Google Shopping:', err);
      setError('Erro ao buscar preços. Use o botão "Abrir em Nova Aba".');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] bg-white text-gray-900 overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                🛒 Google Shopping
              </DialogTitle>
              <p className="text-gray-600 text-sm mt-2">
                Pesquisando: <span className="font-semibold">{productName}</span>
              </p>
            </div>
            <a
              href={googleShoppingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Abrir em Nova Aba
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 text-lg">Buscando preços reais no Google Shopping...</p>
              <p className="text-gray-500 text-sm mt-2">Isso pode levar alguns segundos</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center mx-4">
              <p className="text-red-600 font-semibold mb-4">{error}</p>
              <Button 
                onClick={searchGoogleShopping} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <div className="px-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((product, index) => (
                  <div 
                    key={index} 
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                  >
                    <div className="flex flex-col h-full">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
                        {product.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Store className="w-4 h-4" />
                        <span>{product.store}</span>
                      </div>

                      <div className="flex items-end justify-between mt-auto">
                        <div>
                          <p className="text-3xl font-bold text-green-600">
                            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          Ver Oferta
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumo dos Preços */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-4 text-lg">📊 Análise de Preços</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 mb-1">Menor Preço</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {Math.min(...results.map(r => r.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-blue-700 mb-1">Preço Médio</p>
                    <p className="text-2xl font-bold text-blue-900">
                      R$ {(results.reduce((sum, r) => sum + r.price, 0) / results.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-blue-700 mb-1">Maior Preço</p>
                    <p className="text-2xl font-bold text-orange-600">
                      R$ {Math.max(...results.map(r => r.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}