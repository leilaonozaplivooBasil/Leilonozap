import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function PriceCalculatorModal({ isOpen, onClose, product, onSave }) {
  const [formulas, setFormulas] = useState([]);
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [discountPercentage, setDiscountPercentage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMargin, setSelectedMargin] = useState(null);
  const [profitPercentage, setProfitPercentage] = useState(null);
  const [manualDiscount, setManualDiscount] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  useEffect(() => {
    loadFormulas();
  }, []);

  useEffect(() => {
    if (product) {
      // Calcula valor de mercado como 1400% do custo unitário (14x)
      const totalQty = (product.quantity || 0) + (product.quantity_sold || 0);
      const unitCost = totalQty > 0 ? (product.cost_price || 0) / totalQty : (product.cost_price || 0);
      const suggestedMarketValue = unitCost * 14;
      
      setMarketValue(product.market_value?.toString() || suggestedMarketValue.toFixed(2));
      
      if (product.pricing_formula_id) {
        setSelectedFormulaId(product.pricing_formula_id);
      }
    }
  }, [product]);

  const loadFormulas = async () => {
    try {
      const allFormulas = await base44.entities.PricingFormula.filter({ is_active: true });
      setFormulas(allFormulas);
    } catch (error) {
      console.error('Erro ao carregar fórmulas:', error);
      toast.error('Erro ao carregar fórmulas');
    }
  };

  const calculatePrice = () => {
    if (!marketValue) {
      toast.error('Insira o valor de mercado');
      return;
    }

    const marketVal = parseFloat(marketValue);
    if (isNaN(marketVal) || marketVal <= 0) {
      toast.error('Valor de mercado inválido');
      return;
    }

    // 📊 NOVA LÓGICA: Tabela de margens
    const marginTable = [7.0, 6.0, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0, 1.75, 1.5, 0.5];
    const discountRange = [0.20, 0.50]; // 20% a 50% de desconto

    // Calcula custo unitário
    const totalQty = (product?.quantity || 0) + (product?.quantity_sold || 0);
    const unitCost = totalQty > 0 ? (product?.cost_price || 0) / totalQty : (product?.cost_price || 0);

    if (unitCost <= 0) {
      toast.error('Custo unitário inválido');
      return;
    }

    // Tenta cada margem da tabela
    let approvedPrice = null;
    let approvedMargin = null;
    let approvedDiscount = null;

    for (const M of marginTable) {
      // Fórmula: Preço_Sugerido = (C × (1 + M)) ÷ 0,74
      const suggestedPrice = (unitCost * (1 + M)) / 0.74;

      // Verifica se cabe dentro do range de desconto (20% a 50%)
      for (let K = discountRange[0]; K <= discountRange[1]; K += 0.01) {
        const priceCap = marketVal * (1 - K);
        
        if (suggestedPrice <= priceCap) {
          approvedPrice = suggestedPrice;
          approvedMargin = M;
          approvedDiscount = ((marketVal - suggestedPrice) / marketVal) * 100;
          break;
        }
      }

      if (approvedPrice) break;
    }

    if (!approvedPrice) {
      toast.error('Produto não aprovado: não atinge margem mínima de 50% mesmo com 50% de desconto');
      setCalculatedPrice(null);
      setDiscountPercentage(null);
      setSelectedMargin(null);
      setProfitPercentage(null);
      return;
    }

    // Calcula lucro sobre o custo
    const profitOverCost = ((approvedPrice * 0.74 - unitCost) / unitCost) * 100;

    setCalculatedPrice(approvedPrice);
    setDiscountPercentage(approvedDiscount);
    setSelectedMargin(approvedMargin);
    setProfitPercentage(profitOverCost);

    toast.success(`Preço calculado com margem de ${(approvedMargin * 100).toFixed(0)}%`);
  };

  const handleSave = async () => {
    if (!calculatedPrice) {
      toast.error('Calcule o preço primeiro');
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.Product.update(product.id, {
        market_value: parseFloat(marketValue),
        calculated_price: calculatedPrice,
        discount_percentage: discountPercentage,
        selling_price_retail: calculatedPrice
      });

      toast.success('Preço calculado e salvo com sucesso!');
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar o preço calculado');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFormula = formulas.find(f => f.id === selectedFormulaId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-white text-gray-900 max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calculator className="w-6 h-6 text-blue-600" />
            Calcular Preço de Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Produto Info + Valor de Mercado - LADO A LADO */}
          <div className="grid grid-cols-2 gap-4">
            {/* Produto Info */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">Produto</h3>
              <p className="text-gray-700 text-sm">{product?.description}</p>
              <p className="text-xs text-gray-600 mt-1">
                Custo Unitário: <span className="font-semibold">R$ {(() => {
                  const totalQty = (product?.quantity || 0) + (product?.quantity_sold || 0);
                  const unitCost = totalQty > 0 ? (product?.cost_price || 0) / totalQty : (product?.cost_price || 0);
                  return unitCost.toFixed(2);
                })()}</span>
              </p>
            </div>

            {/* Valor de Mercado */}
            <div>
              <Label htmlFor="marketValue" className="text-gray-900 font-semibold text-sm">Valor de Mercado (R$)</Label>
              <Input
                id="marketValue"
                type="number"
                step="0.01"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                placeholder="Ex: 2800.00"
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
              <Button
                onClick={calculatePrice}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                disabled={!marketValue}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Preço
              </Button>
            </div>
          </div>

          {/* Info da Fórmula Automática - COMPACTA */}
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3">
            <h3 className="font-semibold text-blue-900 mb-1 text-sm">📊 Sistema Automático</h3>
            <div className="text-xs text-gray-700 grid grid-cols-3 gap-2">
              <p>• <strong>26% fixo:</strong> 20% comissão + 6% imposto</p>
              <p>• <strong>Margem:</strong> 50% até 700%</p>
              <p>• <strong>Desconto:</strong> 20% a 50%</p>
            </div>
          </div>

          {/* Resultado - LAYOUT OTIMIZADO */}
          {calculatedPrice !== null && (
            <div className="space-y-3">
              {/* Cards Principais - 3 COLUNAS */}
              <div className="grid grid-cols-3 gap-3">
                {/* Preço Sugerido */}
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3">
                  <div className="text-center">
                    <span className="text-xs font-semibold text-gray-700 block mb-1">💰 Preço de Venda</span>
                    <span className="text-2xl font-bold text-green-600 block">
                      R$ {calculatedPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Desconto */}
                <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-3">
                  <div className="text-center">
                    <span className="text-xs font-semibold text-gray-700 block mb-1">🏷️ Desconto Cliente</span>
                    <span className="text-2xl font-bold text-orange-600 block">
                      {discountPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* LUCRO LÍQUIDO */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-3">
                  <div className="text-center">
                    <span className="text-xs font-semibold text-blue-900 block mb-1">💎 SEU LUCRO</span>
                    <span className="text-2xl font-black text-blue-600 block">
                      R$ {(() => {
                        const totalQty = (product?.quantity || 0) + (product?.quantity_sold || 0);
                        const unitCost = totalQty > 0 ? (product?.cost_price || 0) / totalQty : (product?.cost_price || 0);
                        const netProfit = (calculatedPrice * 0.74) - unitCost;
                        return netProfit.toFixed(2);
                      })()}
                    </span>
                    <span className="text-[10px] text-blue-700 block mt-1">(já descontado 26%)</span>
                  </div>
                </div>
              </div>

              {/* Breakdown - 2 COLUNAS */}
              <div className="grid grid-cols-2 gap-3">
                {/* Coluna Esquerda - Valores Base */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">📊 Valores Base</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Preço no Mercado:</span>
                      <span className="font-semibold text-gray-900">R$ {parseFloat(marketValue).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Seu Custo (unidade):</span>
                      <span className="font-semibold text-gray-900">
                        R$ {(() => {
                          const totalQty = (product?.quantity || 0) + (product?.quantity_sold || 0);
                          const unitCost = totalQty > 0 ? (product?.cost_price || 0) / totalQty : (product?.cost_price || 0);
                          return unitCost.toFixed(2);
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-1.5">
                      <span className="text-gray-700">Margem Aplicada:</span>
                      <span className="font-semibold text-blue-600">
                        {selectedMargin ? `${(selectedMargin * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Comissão + Imposto:</span>
                      <span className="font-semibold text-red-600">- R$ {(calculatedPrice * 0.26).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita - Resultado Final */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">✅ Resultado Final</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-green-100 p-2 rounded">
                      <span className="font-bold text-gray-900 text-xs">Preço de Venda:</span>
                      <span className="text-lg font-black text-green-600">
                        R$ {calculatedPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-100 p-2 rounded">
                      <span className="font-bold text-gray-900 text-xs">Seu Lucro Real:</span>
                      <span className="text-lg font-black text-blue-600">
                        R$ {(() => {
                          const totalQty = (product?.quantity || 0) + (product?.quantity_sold || 0);
                          const unitCost = totalQty > 0 ? (product?.cost_price || 0) / totalQty : (product?.cost_price || 0);
                          const netProfit = (calculatedPrice * 0.74) - unitCost;
                          return netProfit.toFixed(2);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!calculatedPrice || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Salvando...' : 'Salvar Preço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}