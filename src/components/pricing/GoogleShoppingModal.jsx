import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GoogleShoppingModal({ isOpen, onClose, productName }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && productName) {
      searchGoogleShopping();
    }
  }, [isOpen, productName]);

  const searchGoogleShopping = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Busque no Google Shopping os preços do produto: "${productName}". 
        
        Retorne uma lista de 5 a 10 resultados com as seguintes informações:
        - Nome completo do produto
        - Preço em formato numérico (apenas números, ex: 299.90)
        - Loja que está vendendo
        - Link direto para compra (invente URLs baseadas no nome da loja e produto)
        
        IMPORTANTE: Retorne preços REAIS do mercado brasileiro. Pesquise os preços atuais.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  store: { type: "string" },
                  url: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (response && response.results) {
        setResults(response.results);
      } else {
        setError('Nenhum resultado encontrado');
      }
    } catch (err) {
      console.error('Erro ao buscar no Google Shopping:', err);
      setError('Erro ao buscar preços. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white text-gray-900 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            🛒 Preços no Google Shopping
          </DialogTitle>
          <p className="text-gray-600 text-sm mt-2">
            Buscando: <span className="font-semibold">{productName}</span>
          </p>
        </DialogHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Buscando preços no Google Shopping...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
              <Button 
                onClick={searchGoogleShopping} 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{result.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Loja: <span className="font-medium">{result.store}</span>
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {result.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Ver Oferta
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}

              {/* Estatísticas */}
              <div className="mt-6 bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📊 Resumo dos Preços</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-blue-700">Menor Preço</p>
                    <p className="text-xl font-bold text-blue-900">
                      R$ {Math.min(...results.map(r => r.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Preço Médio</p>
                    <p className="text-xl font-bold text-blue-900">
                      R$ {(results.reduce((sum, r) => sum + r.price, 0) / results.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Maior Preço</p>
                    <p className="text-xl font-bold text-blue-900">
                      R$ {Math.max(...results.map(r => r.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}