import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// 🧮 Modal do cálculo aberto — agora é a MESA DE REUNIÃO do canal: recebe todo o
// detalhamento que saiu do cartão (descrição, notas do já atingido, metas e base
// de cálculo) além do passo a passo da conta. Nada foi perdido da página: o
// cartão ficou com o impacto, aqui mora a régua completa.
// Paleta exclusiva --pc-.
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
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col border border-pc-ouro bg-pc-preto sm:max-h-[88vh]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-pc-borda p-5 sm:p-6">
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

        {/* área rolável própria: no celular o conteúdo maior nunca fica cortado */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {/* 1 — o que é o canal (texto que saiu do cartão) */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">O canal</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-pc-tinta-fraca">
              {canal.rotulo}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-pc-tinta-fraca">{canal.texto}</p>
          </section>

          {/* 2 — onde estamos hoje, com todas as notas */}
          <section className="mt-8 border-t border-pc-borda pt-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Onde estamos hoje</p>
            <p className="mt-2 text-xl font-bold leading-tight text-pc-tinta sm:text-2xl">
              {canal.atingido}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca">{canal.atingidoNota}</p>
            {canal.atingidoSecundario && (
              <div className="mt-4 border-t border-pc-borda pt-4">
                <p className="text-sm font-semibold leading-snug text-pc-tinta">
                  {canal.atingidoSecundario}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-pc-tinta-fraca">
                  {canal.atingidoSecundarioNota}
                </p>
              </div>
            )}
            {canal.atingidoExtra && (
              <p className="mt-4 border-t border-pc-borda pt-4 text-xs leading-relaxed text-pc-tinta">
                {canal.atingidoExtra}
              </p>
            )}
          </section>

          {/* 3 — as metas e a base conservadora */}
          <section className="mt-8 border-t border-pc-borda pt-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Para onde vamos</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="border border-pc-borda bg-pc-preto-2 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-pc-tinta-fraca">
                  Meta mínima (memorando)
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-pc-tinta">
                  {canal.metaMinima}
                </p>
              </div>
              <div className="border border-pc-borda bg-pc-preto-2 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-pc-tinta-fraca">
                  Meta alcançável até dez/2026
                </p>
                <p className="mt-2 text-sm font-semibold leading-snug text-pc-tinta">
                  {canal.metaAlcancavel}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-pc-tinta-fraca">
              Base de cálculo conservadora: <span className="text-pc-tinta">{canal.base}</span>
            </p>
          </section>

          {/* 4 — o passo a passo da conta */}
          <section className="mt-8 border-t border-pc-borda pt-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">A conta, passo a passo</p>
            <ol className="mt-4 space-y-4">
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
          </section>

          <p className="mt-8 border-t border-pc-ouro/25 pt-5 text-xs leading-relaxed text-pc-tinta-fraca">
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