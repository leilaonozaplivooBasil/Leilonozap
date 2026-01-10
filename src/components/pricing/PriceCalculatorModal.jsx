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
      <DialogContent className="max-w-2xl bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calculator className="w-6 h-6 text-blue-600" />
            Calcular Preço de Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Produto Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Produto</h3>
            <p className="text-gray-700">{product?.description}</p>
            <p className="text-sm text-gray-600 mt-1">
              Custo Unitário: <span className="font-semibold">R$ {(() => {
                const totalQty = (product?.quantity || 0) + (product?.quantity_sold || 0);
                const unitCost = totalQty > 0 ? (product?.cost_price || 0) / totalQty : (product?.cost_price || 0);
                return unitCost.toFixed(2);
              })()}</span>
            </p>
          </div>

          {/* Info da Fórmula Automática */}
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📊 Sistema de Precificação Automática</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• <strong>26% fixo:</strong> 20% comissão + 6% imposto</p>
              <p>• <strong>Margem variável:</strong> 50% até 700% de lucro</p>
              <p>• <strong>Desconto:</strong> 20% a 50% sobre valor de mercado</p>
              <p className="text-xs text-gray-600 mt-2">A calculadora encontra automaticamente a melhor margem que mantém competitividade no mercado.</p>
            </div>
          </div>

          {/* Valor de Mercado */}
          <div>
            <Label htmlFor="marketValue" className="text-gray-900 font-semibold">Valor de Mercado (R$)</Label>
            <Input
              id="marketValue"
              type="number"
              step="0.01"
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
              placeholder="Ex: 2800.00"
              className="mt-2 bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Botão Calcular */}
          <Button
            onClick={calculatePrice}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!marketValue}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calcular Preço Automaticamente
          </Button>

          {/* Resultado */}
          {calculatedPrice !== null && (
            <div className="space-y-3">
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-700">Preço de Venda Sugerido:</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {calculatedPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-gray-700">Desconto sobre Mercado:</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">
                    {discountPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Detalhamento:</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>• Valor de Mercado: R$ {parseFloat(marketValue).toFixed(2)}</p>
                  <p>• Base ({selectedFormula.base_percentage}%): R$ {(parseFloat(marketValue) * selectedFormula.base_percentage / 100).toFixed(2)}</p>
                  <p>• Comissão ({selectedFormula.commission_percentage}%): R$ {(parseFloat(marketValue) * selectedFormula.base_percentage / 100 * selectedFormula.commission_percentage / 100).toFixed(2)}</p>
                  <p>• Imposto ({selectedFormula.tax_percentage}%): R$ {(parseFloat(marketValue) * selectedFormula.base_percentage / 100 * selectedFormula.tax_percentage / 100).toFixed(2)}</p>
                  <p className="font-semibold text-green-600 pt-2 border-t border-gray-300">
                    • Total: R$ {calculatedPrice.toFixed(2)}
                  </p>
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