import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// 🌐 TOUR DO PLANO DE EXPANSÃO — a página do Lucre é exibida VIVA e EMBUTIDA
// dentro da camada institucional do Parceiro, sem tirar ninguém da página.
// ⚠️ A página do Lucre NÃO é copiada nem alterada: é a rota real /Lucre.
export default function ParceiroTourExpansao({ onClose }) {
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === 'Escape') onClose(); };
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col bg-pc-preto/95 p-0 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Percurso pelo plano de expansão"
    >
      <div
        className="mx-auto flex h-full w-full max-w-6xl flex-col border border-pc-ouro/40 bg-pc-preto-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-pc-borda p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-pc-ouro">
              Estrutura de Alavancagem · Percurso demonstrativo
            </p>
            <h2 className="mt-1.5 truncate text-lg font-bold text-pc-tinta sm:text-2xl">
              Plano de expansão da rede
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar percurso"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca transition-colors hover:border-pc-ouro hover:text-pc-ouro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tela dentro da tela: a página real, emoldurada em dourado */}
        <div className="relative min-h-0 flex-1 border-y border-pc-ouro/25 bg-pc-preto">
          {!carregou && (
            <div className="absolute inset-0 space-y-4 p-6">
              <div className="h-6 w-1/3 animate-pulse bg-pc-borda" />
              <div className="h-3 w-2/3 animate-pulse bg-pc-borda" />
              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-48 animate-pulse border border-pc-borda bg-pc-preto-2" />
                ))}
              </div>
            </div>
          )}
          <iframe
            src="/Lucre"
            title="Plano de expansão — Lucre com a Leilão NoZap"
            className="h-full w-full border-0"
            loading="lazy"
            onLoad={() => setCarregou(true)}
          />
        </div>

        <p className="shrink-0 px-4 py-3 text-[10px] leading-relaxed text-pc-tinta-fraca sm:px-6 sm:text-xs">
          Percurso demonstrativo do plano de expansão. Condições comerciais tratadas
          somente após cadastro e termo de confidencialidade.
        </p>
      </div>
    </div>
  );
}