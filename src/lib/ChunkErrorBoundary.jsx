import React from 'react';

// Depois de um deploy, o chunk que o navegador tenta baixar pode não existir mais
// (hash antigo). Sem isso, o React desmonta a árvore inteira e o usuário vê tela
// branca. Aqui: 1 reload automático silencioso (pega a versão nova); se ainda
// assim falhar (sem rede, etc.), mostra um fallback com botão em vez de branco.

const RELOAD_KEY = 'lnz-chunk-reload-at';
const RELOAD_WINDOW_MS = 30_000;

export function reloadOnceForNewVersion() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); } catch { /* storage bloqueado */ }
  if (Date.now() - last < RELOAD_WINDOW_MS) return false;
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage bloqueado */ }
  window.location.reload();
  return true;
}

const isChunkLoadError = (error) => {
  const msg = String(error?.message || error || '');
  return /dynamically imported module|Importing a module script failed|Loading chunk|Loading CSS chunk|error loading|preload/i.test(msg);
};

export default class ChunkErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && reloadOnceForNewVersion()) {
      // reload em andamento — o fallback abaixo aparece só por um instante
    }
  }

  handleRetry = () => {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage bloqueado */ }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-200 text-sm">
          Atualizando o app para a versão mais recente…
        </p>
        <button
          onClick={this.handleRetry}
          className="mt-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Recarregar agora
        </button>
      </div>
    );
  }
}
