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
    if (!selectedFormulaId || !marketValue) {
      toast.error('Selecione uma fórmula e insira o valor de mercado');
      return;
    }

    const formula = formulas.find(f => f.id === selectedFormulaId);
    if (!formula) return;

    const marketVal = parseFloat(marketValue);
    if (isNaN(marketVal) || marketVal <= 0) {
      toast.error('Valor de mercado inválido');
      return;
    }

    // Fórmula: Preço = (Valor Mercado × base%) × (1 + comissão% + imposto%)
    const baseValue = marketVal * (formula.base_percentage / 100);
    const multiplier = 1 + (formula.commission_percentage / 100) + (formula.tax_percentage / 100);
    const finalPrice = baseValue * multiplier;

    // Desconto sobre valor de mercado
    const discount = ((marketVal - finalPrice) / marketVal) * 100;

    setCalculatedPrice(finalPrice);
    setDiscountPercentage(discount);
  };

  const handleSave = async () => {
    if (!calculatedPrice) {
      toast.error('Calcule o preço primeiro');
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.Product.update(product.id, {
        pricing_formula_id: selectedFormulaId,
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

          {/* Seleção de Fórmula */}
          <div>
            <Label htmlFor="formula" className="text-gray-900 font-semibold">Fórmula de Precificação</Label>
            <select
              id="formula"
              value={selectedFormulaId}
              onChange={(e) => setSelectedFormulaId(e.target.value)}
              className="w-full mt-2 bg-white border border-gray-300 rounded-md px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma fórmula</option>
              {formulas.map(formula => (
                <option key={formula.id} value={formula.id}>
                  {formula.name}
                </option>
              ))}
            </select>

            {selectedFormula && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Fórmula:</strong> {selectedFormula.base_percentage}% do valor de mercado + {selectedFormula.commission_percentage}% comissão + {selectedFormula.tax_percentage}% imposto
                </p>
                {selectedFormula.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedFormula.description}</p>
                )}
              </div>
            )}
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
            disabled={!selectedFormulaId || !marketValue}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calcular Preço
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