import React, { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppVersion } from '@/hooks/useAppVersion';

// Rotas onde JAMAIS recarregamos sozinho (dinheiro/lance em jogo).
const CRITICAS = ['auction', 'checkout', 'cart', 'carrinho', 'pagamento', 'deposit', 'carteira', 'vendedor'];

async function limparCacheERecarregar() {
  try {
    if ('caches' in window) {
      const chaves = await caches.keys();
      await Promise.all(chaves.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // se falhar a limpeza, ainda vale recarregar
  }
  window.location.reload();
}

export default function AtualizacaoDisponivel() {
  const temAtualizacao = useAppVersion();

  // Auto-atualização silenciosa só em rota tranquila (nunca em lance/checkout).
  useEffect(() => {
    if (!temAtualizacao) return;
    const rota = (window.location.pathname + window.location.search).toLowerCase();
    const critica = CRITICAS.some((c) => rota.includes(c));
    if (critica) return;
    const t = setTimeout(() => { limparCacheERecarregar(); }, 4000);
    return () => clearTimeout(t);
  }, [temAtualizacao]);

  if (!temAtualizacao) return null;

  return (
    <div className="fixed left-3 right-3 z-[9998] flex justify-center" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="flex items-center gap-3 max-w-md w-full sm:w-auto px-4 py-3 rounded-2xl bg-nz-tinta text-white shadow-2xl">
        <RefreshCw className="w-4 h-4 shrink-0 text-nz-verde-claro" />
        <span className="text-sm font-medium flex-1">Nova versão disponível</span>
        <button
          type="button"
          onClick={limparCacheERecarregar}
          className="px-4 py-2 rounded-full text-sm font-bold bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.97]"
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
}