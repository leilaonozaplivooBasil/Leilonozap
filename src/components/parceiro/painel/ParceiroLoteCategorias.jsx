import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';

// 🗂️ Categorias do lote com os itens dentro (abre e fecha). Somente leitura.
export default function ParceiroLoteCategorias({ categorias, itensPorCategoria }) {
  const [abertas, setAbertas] = useState(() => new Set());

  if (!categorias?.length) {
    return (
      <p className="text-sm text-pc-tinta-fraca">
        Esta planilha não trouxe o resumo por categoria.
      </p>
    );
  }

  const alternar = (nome) =>
    setAbertas((antes) => {
      const proximo = new Set(antes);
      proximo.has(nome) ? proximo.delete(nome) : proximo.add(nome);
      return proximo;
    });

  return (
    <div className="divide-y divide-pc-borda border border-pc-borda">
      {categorias.map((cat, i) => {
        const itens = itensPorCategoria?.[cat.nome] || [];
        const aberta = abertas.has(cat.nome);
        return (
          <div key={`${cat.nome}-${i}`}>
            <button
              type="button"
              onClick={() => itens.length > 0 && alternar(cat.nome)}
              className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                {itens.length > 0 && (
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 text-pc-ouro transition-transform ${aberta ? 'rotate-90' : ''}`}
                    strokeWidth={2}
                  />
                )}
                <span className="truncate text-xs font-semibold text-pc-tinta sm:text-sm">
                  {cat.nome}
                </span>
              </span>
              <span className="shrink-0 text-right text-[11px] text-pc-tinta-fraca sm:text-xs">
                {cat.qtd} un
                <span className="ml-2 font-bold text-pc-ouro">{real(cat.valor)}</span>
              </span>
            </button>

            {aberta && (
              <ul className="space-y-1.5 bg-pc-preto-2 px-3 py-3">
                {itens.slice(0, 60).map((item, idx) => (
                  <li
                    key={idx}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px]"
                  >
                    <span className="min-w-0 flex-1 text-pc-tinta-fraca">{item.desc}</span>
                    <span className="shrink-0 text-pc-tinta-fraca">
                      {item.qtd} un · {real(item.valor)}
                    </span>
                  </li>
                ))}
                {itens.length > 60 && (
                  <li className="pt-1 text-[11px] text-pc-tinta-fraca">
                    e mais {itens.length - 60} itens nesta categoria.
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}