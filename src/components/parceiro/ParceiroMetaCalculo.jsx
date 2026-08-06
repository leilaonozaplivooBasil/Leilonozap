import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// 🧮 Modal do cálculo aberto — mostra o caminho entre o número REAL de hoje e a
// meta do canal, passo a passo, para o parceiro conferir a conta em vez de
// confiar na palavra. Paleta exclusiva --pc-.
export default function ParceiroMetaCalculo({ canal, onClose }) {
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!canal) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-pc-ouro bg-pc-preto">
        <div className="flex items-start justify-between gap-4 border-b border-pc-borda p-5 sm:p-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Cálculo aberto</p>
            <h3 className="mt-1.5 text-lg font-bold text-pc-tinta sm:text-xl">{canal.titulo}</h3>
          </div>
          <button
            type="button"
            aria-label="Fechar cálculo"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca transition-colors hover:border-pc-ouro hover:text-pc-ouro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <ol className="space-y-4">
            {canal.calculo.map((passo, i) => (
              <li key={passo.rotulo} className="border border-pc-borda bg-pc-preto-2 p-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold tracking-[0.15em] text-pc-ouro">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
                      {passo.rotulo}
                    </p>
                    <p className="mt-1 text-sm font-bold text-pc-tinta sm:text-base">
                      {passo.valor}
                    </p>
                    {passo.nota && (
                      <p className="mt-1.5 text-xs leading-relaxed text-pc-tinta-fraca">
                        {passo.nota}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 border-t border-pc-ouro/25 pt-5 text-xs leading-relaxed text-pc-tinta-fraca">
            <span className="text-pc-tinta">A estrutura que sustenta a conta já existe:</span>{' '}
            {canal.estruturaExistente}
          </p>
          <p className="mt-4 text-[10px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
            Cálculo aberto para conferência. Não é promessa de resultado.
          </p>
        </div>
      </div>
    </div>
  );
}