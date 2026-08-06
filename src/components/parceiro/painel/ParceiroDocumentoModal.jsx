import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// 📄 Modal de leitura de documento institucional — DENTRO da própria tela.
// Regra dura do pedido: o parceiro NUNCA sai do site. Sem nova aba, sem link
// externo, sem download, sem redirect. Ele lê tudo aqui e fecha.
//
// Fecha por: botão X, clique no fundo e tecla Esc.
// Mobile: ocupa a tela inteira, com a rolagem acontecendo SÓ no corpo do
// documento (o fundo é travado, senão a página de trás rola junto no iOS).
export default function ParceiroDocumentoModal({ aberto, titulo, subtitulo, onFechar, children }) {
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (e) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', aoTeclar);

    // 🔒 trava a rolagem do fundo enquanto o documento está aberto
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-stretch justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      {/* fundo — clique fecha */}
      <button
        type="button"
        aria-label="Fechar documento"
        onClick={onFechar}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex h-full w-full flex-col border-pc-borda bg-pc-preto sm:h-auto sm:max-h-[88vh] sm:max-w-4xl sm:border">
        {/* cabeçalho fixo */}
        <div
          className="flex items-start justify-between gap-3 border-b border-pc-borda px-4 py-4 sm:px-8"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-pc-tinta sm:text-xl">{titulo}</h2>
            {subtitulo && (
              <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-pc-ouro">{subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca transition-colors hover:border-pc-ouro hover:text-pc-ouro"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* corpo — a rolagem é aqui dentro */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}