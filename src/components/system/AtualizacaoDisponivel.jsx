import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useAppVersion, marcarTentativa, MAX_TENTATIVAS } from '@/hooks/useAppVersion';
import { fastTap } from '@/lib/fastTap';

// Rotas onde JAMAIS recarregamos sozinho (dinheiro / lance / operação em jogo).
const CRITICAS = [
  'auction', 'checkout', 'cart', 'carrinho', 'pagamento', 'deposit', 'carteira',
  'vendedor', 'pdv', 'painel', 'aporte', 'pix', 'transferir', 'saque',
  'withdraw', 'lance', 'parceiro',
];

// Cache de imagens preservado: apagá-lo faria o celular baixar tudo de novo.
const CACHE_PRESERVADO = 'supabase-imagens';

// 🧹 Limpeza + recarga que REALMENTE busca a versão nova.
// ⚠️ NÃO desregistramos mais o service worker: fazer isso matava justamente o
// 'autoUpdate' que traz o bundle novo e entregava o aparelho ao cache do
// navegador (causa do "aperto e volta a mesma versão"). Agora pedimos
// registration.update(), limpamos só o precache e navegamos com cache-busting.
function limparCacheERecarregar(versaoAlvo) {
  const limpeza = (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
      if ('caches' in window) {
        const chaves = await caches.keys();
        await Promise.all(
          chaves
            .filter((k) => k !== CACHE_PRESERVADO)
            .map((k) => caches.delete(k))
        );
      }
    } catch {
      // se falhar a limpeza, ainda vale recarregar
    }
  })();
  const prazo = new Promise((r) => setTimeout(r, 2500));
  Promise.race([limpeza, prazo]).then(() => {
    const params = new URLSearchParams(window.location.search);
    if (versaoAlvo) params.set('nzv', String(versaoAlvo));
    const busca = params.toString();
    window.location.replace(window.location.pathname + (busca ? `?${busca}` : ''));
  });
}

export default function AtualizacaoDisponivel() {
  const { temAtualizacao, versaoServidor, esgotado } = useAppVersion();
  const [atualizando, setAtualizando] = useState(false);

  // Limpa o ?nzv= da URL depois que a carga nova subiu (não poluir links).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('nzv')) return;
    params.delete('nzv');
    const busca = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (busca ? `?${busca}` : '')
    );
  }, []);

  // Feedback imediato no toque: o usuário vê que o comando foi aceito mesmo
  // que a recarga leve um instante (rede lenta / cache sendo limpo).
  const atualizarAgora = () => {
    if (atualizando) return;
    setAtualizando(true);
    marcarTentativa(versaoServidor);
    limparCacheERecarregar(versaoServidor);
  };

  // Auto-atualização silenciosa: só em rota tranquila, só com a aba na frente,
  // só sem campo em foco — e NUNCA depois de 2 tentativas gastas (fim do loop).
  useEffect(() => {
    if (!temAtualizacao || esgotado) return;
    const rota = (window.location.pathname + window.location.search).toLowerCase();
    if (CRITICAS.some((c) => rota.includes(c))) return;
    const t = setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      marcarTentativa(versaoServidor);
      limparCacheERecarregar(versaoServidor);
    }, 8000);
    return () => clearTimeout(t);
  }, [temAtualizacao, esgotado, versaoServidor]);

  if (!temAtualizacao) return null;

  return (
    <div className="fixed left-3 right-3 z-[9998] flex justify-center" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="flex items-center gap-3 max-w-md w-full sm:w-auto px-4 py-3 rounded-2xl bg-nz-tinta text-white shadow-2xl">
        <RefreshCw className="w-4 h-4 shrink-0 text-nz-verde-claro" />
        <span className="text-sm font-medium flex-1">
          {esgotado ? 'Atualização pendente — toque para forçar' : 'Nova versão disponível'}
        </span>
        <button
          type="button"
          disabled={atualizando}
          {...fastTap(atualizarAgora)}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.97] disabled:opacity-80"
        >
          {atualizando && <Loader2 className="h-4 w-4 animate-spin" />}
          {atualizando ? 'Atualizando...' : esgotado ? 'Forçar' : 'Atualizar agora'}
        </button>
      </div>
    </div>
  );
}