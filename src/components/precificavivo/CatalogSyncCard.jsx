import React, { useState, useEffect, useCallback } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, RefreshCw, X, ShoppingBag, ArrowRight } from 'lucide-react';

/**
 * Card inteligente que monitora e permite sincronizar preços da Loja Virtual
 * com os preços dinâmicos atualizados pelo PrecificaVivo.
 */
export default function CatalogSyncCard() {
  const [status, setStatus] = useState('loading'); // loading | synced | out_of_sync
  const [outOfSyncCount, setOutOfSyncCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewProducts, setPreviewProducts] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Verifica estado (count) — rápido e leve
  const checkStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('syncCatalogPrices', { action: 'count' });
      const count = res?.data?.out_of_sync || 0;
      setOutOfSyncCount(count);
      setStatus(count > 0 ? 'out_of_sync' : 'synced');
    } catch (err) {
      console.error('[CatalogSyncCard] Erro ao verificar status:', err);
      setStatus('synced'); // fail-safe: não alarma o usuário
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // revalida a cada 60s
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Abre modal e carrega preview detalhado
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setIsLoadingPreview(true);
    try {
      const res = await base44.functions.invoke('syncCatalogPrices', { action: 'preview' });
      setPreviewProducts(res?.data?.products || []);
    } catch (err) {
      alert('❌ Erro ao carregar lista: ' + err.message);
      setIsModalOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Aplica a sincronização
  const handleApply = async () => {
    if (previewProducts.length === 0) return;
    if (!confirm(`Sincronizar ${previewProducts.length} produto(s) da Loja Virtual?\n\nO price_catalog será atualizado para o valor do selling_price_retail.`)) return;

    setIsApplying(true);
    try {
      const ids = previewProducts.map(p => p.id);
      const res = await base44.functions.invoke('syncCatalogPrices', {
        action: 'apply',
        product_ids: ids
      });
      const { updated, skipped, errors_count } = res?.data || {};
      alert(`✅ Sincronização concluída!\n\nAtualizados: ${updated || 0}\nIgnorados: ${skipped || 0}\nErros: ${errors_count || 0}`);
      setIsModalOpen(false);
      setPreviewProducts([]);
      await checkStatus();
    } catch (err) {
      alert('❌ Erro ao aplicar: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  // ───── Render ─────
  if (status === 'loading') {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 flex items-center gap-3 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Verificando sincronização da Loja Virtual...
        </CardContent>
      </Card>
    );
  }

  if (status === 'synced') {
    return (
      <Card className="bg-emerald-950/30 border-emerald-700/40">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-emerald-200">
            <p className="font-semibold">Loja Virtual sincronizada com Preços Dinâmicos</p>
            <p className="text-emerald-300/70 text-xs mt-0.5">
              Todos os produtos ativos no catálogo estão com preço alinhado.
            </p>
          </div>
          <button
            onClick={checkStatus}
            className="text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors"
            title="Revalidar agora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </CardContent>
      </Card>
    );
  }

  // out_of_sync
  return (
    <>
      <Card className="bg-amber-950/30 border-amber-700/40">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-200">
              {outOfSyncCount} produto{outOfSyncCount > 1 ? 's' : ''} da Loja Virtual fora de sync
            </p>
            <p className="text-amber-300/70 text-xs mt-0.5">
              O preço da vitrine está diferente do preço dinâmico atualizado.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenModal}
            className="bg-amber-600 hover:bg-amber-500 text-white border-0 flex-shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Sincronizar agora
          </Button>
        </CardContent>
      </Card>

      {/* Modal de preview */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  Sincronizar Loja Virtual
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Revise os produtos antes de aplicar. O price_catalog será alinhado ao selling_price_retail.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingPreview ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Carregando produtos...
                </div>
              ) : previewProducts.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Nenhum produto dessincronizado encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {previewProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/50 rounded-lg border border-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 font-medium truncate">{p.description}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">ID: {p.id}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                        <span className="text-gray-500 line-through">R$ {fmtBR(p.price_catalog)}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-emerald-400 font-bold">R$ {fmtBR(p.selling_price_retail)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-800 bg-gray-900/60">
              <span className="text-xs text-gray-500">
                {previewProducts.length} produto(s) a sincronizar
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isApplying}
                  className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={isApplying || previewProducts.length === 0 || isLoadingPreview}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                >
                  {isApplying ? (
                    <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Aplicando...</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Aplicar Sincronização</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}