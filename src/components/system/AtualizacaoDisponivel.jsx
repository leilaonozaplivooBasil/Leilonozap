import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useAppVersion } from '@/hooks/useAppVersion';
import { fastTap } from '@/lib/fastTap';

// Rotas onde JAMAIS recarregamos sozinho (dinheiro/lance em jogo).
const CRITICAS = ['auction', 'checkout', 'cart', 'carrinho', 'pagamento', 'deposit', 'carteira', 'vendedor'];

// 🧹 Limpeza + recarga.
// ⚠️ CAUSA-RAIZ do "aperto e não acontece nada": apagar TODOS os caches (o
// precache de js/css + até 300 imagens do runtime) e desregistrar o service
// worker é uma operação que no celular leva vários segundos — e o reload só
// vinha DEPOIS de tudo, sem nenhum sinal na tela. Agora a limpeza tem prazo
// máximo (1,2s): se não terminar, recarrega de qualquer forma. O service worker
// é 'autoUpdate', então a versão nova entra no reload mesmo sem limpeza total.
function limparCacheERecarregar() {
  const limpeza = (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map((k) => caches.delete(k)));
      }
    } catch {
      // se falhar a limpeza, ainda vale recarregar
    }
  })();
  const prazo = new Promise((r) => setTimeout(r, 1200));
  Promise.race([limpeza, prazo]).then(() => window.location.reload());
}

export default function AtualizacaoDisponivel() {
  const temAtualizacao = useAppVersion();
  const [atualizando, setAtualizando] = useState(false);

  // Feedback imediato no toque: o usuário vê que o comando foi aceito mesmo
  // que a recarga leve um instante (rede lenta / cache sendo limpo).
  const atualizarAgora = () => {
    if (atualizando) return;
    setAtualizando(true);
    limparCacheERecarregar();
  };

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
          disabled={atualizando}
          {...fastTap(atualizarAgora)}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.97] disabled:opacity-80"
        >
          {atualizando && <Loader2 className="h-4 w-4 animate-spin" />}
          {atualizando ? 'Atualizando...' : 'Atualizar agora'}
        </button>
      </div>
    </div>
  );
}