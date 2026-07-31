import React from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

// 📱 Convite de instalação do PWA (só mobile, discreto e dispensável):
//  - Android/Chrome: captura o beforeinstallprompt e mostra botão "Instalar" nativo.
//  - iOS/Safari: não existe beforeinstallprompt — mostra a dica Compartilhar →
//    Adicionar à Tela de Início.
//  - Não aparece se já está instalado (display-mode: standalone) nem se o usuário
//    dispensou nesta sessão. Aguarda 6s pra não brigar com o primeiro carregamento.
export default function InstallPwaPrompt() {
  const [deferred, setDeferred] = React.useState(null);
  const [show, setShow] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);

  React.useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) return;
    if (sessionStorage.getItem('pwaPromptDismissed')) return;
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    if (!mobile) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    // iOS nunca dispara o evento: mostra a dica após 6s de navegação
    let t = null;
    if (ios) t = setTimeout(() => setShow(true), 6000);

    return () => { window.removeEventListener('beforeinstallprompt', onBip); if (t) clearTimeout(t); };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { sessionStorage.setItem('pwaPromptDismissed', '1'); } catch (_) {}
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (_) {}
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div
      className="sm:hidden fixed inset-x-3 z-[60] rounded-2xl border border-green-400/25 bg-[#0b1018]/90 backdrop-blur-md backdrop-saturate-150 shadow-2xl shadow-black/60 p-3 flex items-center gap-3"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <img src="/pwa-192x192.png" alt="Leilão NoZap" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-white text-[13px] font-bold leading-tight">Instale o app Leilão NoZap</p>
        {isIos ? (
          <p className="text-gray-400 text-[11px] leading-tight mt-0.5 flex items-center gap-1 flex-wrap">
            Toque em <Share className="w-3.5 h-3.5 inline text-green-400" /> e depois
            <span className="inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-green-400" /> Adicionar à Tela de Início</span>
          </p>
        ) : (
          <p className="text-gray-400 text-[11px] leading-tight mt-0.5">Acesso direto da tela inicial, rápido como um app.</p>
        )}
      </div>
      {!isIos && deferred && (
        <button onClick={install} className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl bg-green-600 text-white text-xs font-bold">
          <Download className="w-3.5 h-3.5" /> Instalar
        </button>
      )}
      <button onClick={dismiss} aria-label="Fechar" className="shrink-0 grid h-11 w-11 place-items-center text-gray-500">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}