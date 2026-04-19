import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Image as ImageIcon } from 'lucide-react';

export default function ConfirmProductDuplicationModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  isLoading
}) {
  const [includeAuction, setIncludeAuction] = useState(true);
  const [includeCatalog, setIncludeCatalog] = useState(true);

  // Preço da Loja Virtual = mercado × 0.80 (−20% do mercado)
  // O starting_price É o valor de mercado (base)
  const calcAutoPrice = () => {
    const mercado = parseFloat(formData.starting_price) || 0;
    return mercado > 0 ? (mercado * 0.80).toFixed(2) : '';
  };

  const [catalogPrice, setCatalogPrice] = useState(() => calcAutoPrice());

  // Recalcula quando o modal abre (formData pode mudar)
  useEffect(() => {
    if (isOpen) setCatalogPrice(calcAutoPrice());
  }, [isOpen, formData.buy_now_price, formData.starting_price]);

  const imageCount = (formData.image_urls || []).filter(url => url && url.trim()).length;

  const handleConfirm = () => {
    if (!includeAuction && !includeCatalog) {
      alert('⚠️ Selecione pelo menos um destino (Leilão ou Loja Virtual)');
      return;
    }
    onConfirm({
      includeAuction,
      includeCatalog,
      catalogPrice: parseFloat(catalogPrice) || 0
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-2 border-green-500/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-400 flex items-center gap-2">
            ✅ Confirmar Cadastro de Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* RESUMO DO PRODUTO */}
          <Card className="bg-gray-800/50 border border-gray-700 p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              📦 Resumo do Produto
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Nome:</span>
                <span className="text-white font-medium">{formData.title || '(não preenchido)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Preço Inicial:</span>
                <span className="text-green-400 font-bold">R$ {parseFloat(formData.starting_price || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-400">Imagens:</span>
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{imageCount} imagem{imageCount !== 1 ? 'ns' : ''}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* AVISO CRÍTICO */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300">
              O produto será <strong>duplicado automaticamente</strong> nos destinos selecionados com as MESMAS informações e imagens.
            </p>
          </div>

          {/* SELEÇÃO DE DESTINOS */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              🎯 Onde adicionar este produto?
            </h3>

            {/* CHECKBOX LEILÃO */}
            <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              includeAuction 
                ? 'bg-green-900/20 border-green-500 ring-2 ring-green-500/30' 
                : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'
            }`}
              onClick={() => setIncludeAuction(!includeAuction)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={includeAuction}
                  onCheckedChange={setIncludeAuction}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">🔨 Adicionar ao Leilão</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Produto aparecerá na seção de leilões para concorrência de preço
                  </div>
                </div>
              </div>
            </div>

            {/* CHECKBOX LOJA VIRTUAL */}
            <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              includeCatalog 
                ? 'bg-green-900/20 border-green-500 ring-2 ring-green-500/30' 
                : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'
            }`}
              onClick={() => setIncludeCatalog(!includeCatalog)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={includeCatalog}
                  onCheckedChange={setIncludeCatalog}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">🛒 Adicionar à Loja Virtual</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Produto fica disponível para venda direta pelos licenciados
                  </div>
                </div>
              </div>
            </div>

            {/* PREÇO DA LOJA VIRTUAL */}
            {includeCatalog && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                <div>
                  <Label className="text-gray-300 text-sm mb-1 block">🛒 Preço na Loja Virtual (R$) <span className="text-green-400 text-xs">(automático — editável)</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={catalogPrice}
                    onChange={(e) => setCatalogPrice(e.target.value)}
                    placeholder="Ex: 199.90"
                    className="bg-gray-900 border-gray-600 text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <p className="text-xs text-gray-500 mt-1">= mercado × 0.80 (−20% do mercado) — ajuste se necessário</p>
                </div>

                {/* PREVIEW DOS PREÇOS DO LEILÃO */}
                {catalogPrice && parseFloat(catalogPrice) > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600 space-y-1.5">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Preços que serão aplicados:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">📊 Valor de mercado (base):</span>
                      <span className="text-white font-bold">R$ {parseFloat(formData.starting_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">🛒 Loja Virtual (−20% mercado):</span>
                      <span className="text-blue-400 font-bold">R$ {parseFloat(catalogPrice).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">🔨 Lance inicial (−40% mercado):</span>
                      <span className="text-yellow-400 font-bold">R$ {(parseFloat(formData.starting_price || 0) * 0.60).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">⚡ Arremate Agora (= loja):</span>
                      <span className="text-green-400 font-bold">R$ {parseFloat(catalogPrice).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VALIDAÇÃO */}
          {!includeAuction && !includeCatalog && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">Selecione pelo menos um destino</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            ← Voltar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (!includeAuction && !includeCatalog)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>✅ Concluir</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}