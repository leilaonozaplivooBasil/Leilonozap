import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

// 📄 Ficha do item DENTRO do tour (não é navegação pra outra página).
// ⚠️ SOMENTE LEITURA: sem preço, sem frete, sem comprar, sem carrinho.
export default function TourLojaProduto({ item, nomeCategoria, canalNome, onVoltar }) {
  const fotos = (item.image_urls || []).filter(Boolean);
  // Leilão tem title próprio; no catálogo o título vive em description
  const titulo = item.title || item.description || 'Item em operação';
  const eLeilao = /leil/i.test(canalNome || '');
  const [ativa, setAtiva] = useState(0);

  return (
    <div className="p-4 sm:p-6">
      <button
        type="button"
        onClick={onVoltar}
        className="flex min-h-[44px] items-center gap-2 border border-pc-borda px-4 text-xs font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca transition-colors hover:border-pc-ouro hover:text-pc-ouro"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à vitrine
      </button>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="aspect-square overflow-hidden border border-pc-borda bg-pc-preto">
            <img
              src={fotos[ativa]}
              alt={titulo}
              className="h-full w-full object-contain"
              decoding="async"
            />
          </div>
          {fotos.length > 1 && (
            <div className="nz-no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {fotos.map((f, i) => (
                <button
                  key={f + i}
                  type="button"
                  onClick={() => setAtiva(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={`h-14 w-14 shrink-0 overflow-hidden border sm:h-16 sm:w-16 ${
                    i === ativa ? 'border-pc-ouro' : 'border-pc-borda'
                  }`}
                >
                  <img src={f} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-pc-ouro">
            {nomeCategoria || 'Curadoria da operação'}
          </p>
          <h2 className="mt-3 text-xl font-bold leading-snug text-pc-tinta sm:text-2xl">
            {titulo}
          </h2>

          <dl className="mt-6 divide-y divide-pc-borda border-y border-pc-borda text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-pc-tinta-fraca">Canal de venda</dt>
              <dd className="text-right font-medium text-pc-tinta">{canalNome || 'Loja Virtual própria'}</dd>
            </div>
            {item.grade && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-pc-tinta-fraca">Condição / grade</dt>
                <dd className="text-right font-medium uppercase text-pc-tinta">{item.grade}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-pc-tinta-fraca">Situação</dt>
              <dd className="text-right font-medium text-pc-tinta">
                {eLeilao ? 'Lote em operação' : 'Publicado e ativo'}
              </dd>
            </div>
          </dl>

          {/* Descrição livre só no catálogo: texto de lote pode conter valores */}
          {!eLeilao && item.long_description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-pc-tinta-fraca">
              {item.long_description}
            </p>
          )}

          <p className="mt-6 border-t border-pc-borda pt-4 text-[10px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
            Ficha exibida como o público final a encontra no canal próprio, com os
            valores omitidos nesta apresentação.
          </p>
        </div>
      </div>
    </div>
  );
}