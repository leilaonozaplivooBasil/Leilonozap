import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Check, AlertCircle, Loader2, TrendingUp } from 'lucide-react';

export default function PricingPreviewModal({ isOpen, onClose, products, onConfirm, isLoading }) {
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Reinicializa seleção toda vez que products mudar
  React.useEffect(() => {
    if (products) {
      setSelectedProducts(products.filter(p => p.status === 'success').map(p => p.id));
    }
  }, [products]);

  if (!isOpen || !products) return null;

  const successProducts = products.filter(p => p.status === 'success');
  const failedProducts = products.filter(p => p.status !== 'success');

  const handleConfirm = () => {
    const toUpdate = selectedProducts.map(id => {
      const product = products.find(p => p.id === id && p.status === 'success');
      return {
        id: product.id,
        selling_price_retail: product.calculated_price
      };
    });
    onConfirm(toUpdate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <CardHeader className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <CardTitle className="text-white">Preview de Precificação</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* RESUMO */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
              <p className="text-xs text-emerald-400 mb-1">✅ Sucesso</p>
              <p className="text-2xl font-bold text-emerald-300">{successProducts.length}</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
              <p className="text-xs text-yellow-400 mb-1">⚠️ Falhados</p>
              <p className="text-2xl font-bold text-yellow-300">{failedProducts.length}</p>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
              <p className="text-xs text-blue-400 mb-1">💰 Total</p>
              <p className="text-2xl font-bold text-blue-300">{products.length}</p>
            </div>
          </div>

          {/* PRODUTOS COM SUCESSO */}
          {successProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-300 uppercase">Produtos a Precificar</h3>
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 max-h-[300px] overflow-y-auto">
                {successProducts.map(product => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{product.description}</p>
                      <p className="text-xs text-gray-500">{product.lot || 'N/A'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Mercado</p>
                      <p className="font-bold text-emerald-400">R$ {product.market_price.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Venda (-20%)</p>
                      <p className="font-bold text-sky-400">R$ {product.calculated_price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRODUTOS COM FALHA */}
          {failedProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-yellow-300 uppercase">⚠️ Sem Preço de Mercado</h3>
              <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-3 space-y-2 max-h-[150px] overflow-y-auto">
                {failedProducts.map(product => (
                  <div key={product.id} className="text-xs text-yellow-200">
                    <p className="font-medium">{product.description}</p>
                    <p className="text-yellow-400/70">{product.error || 'Preço não encontrado no Google Shopping'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTÕES */}
          <div className="flex gap-2 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedProducts.length === 0 || isLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar ({selectedProducts.length})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}