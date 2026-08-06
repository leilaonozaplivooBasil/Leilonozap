import React from 'react';

// 🏬 Vitrine navegável do tour: barra de categorias + grade + carregar mais.
// ⚠️ SOMENTE LEITURA: sem preço, sem carrinho, sem comprar. Só curadoria.
export default function TourLojaVitrine({
  categorias,
  categoriaAtual,
  onTrocarCategoria,
  itens,
  carregando,
  carregandoMais,
  fim,
  erro,
  onCarregarMais,
  onAbrirItem,
  onTentarNovamente,
}) {
  const abas = [{ id: 'all', name: 'Todos' }, ...categorias];

  return (
    <div>
      {/* Categorias reais do catálogo — rolagem horizontal sem barra visível */}
      <div className="border-b border-pc-borda">
        <div className="nz-no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {abas.map((c) => {
            const ativo = categoriaAtual === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onTrocarCategoria(c.id)}
                className={`min-h-[44px] shrink-0 border px-4 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                  ativo
                    ? 'border-pc-ouro bg-pc-ouro text-pc-preto'
                    : 'border-pc-borda text-pc-tinta-fraca hover:border-pc-ouro hover:text-pc-ouro'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {erro && (
          <div className="border border-pc-borda p-10 text-center">
            <p className="text-sm text-pc-tinta-fraca">Não foi possível carregar os itens agora.</p>
            <button
              type="button"
              onClick={onTentarNovamente}
              className="mt-4 inline-flex min-h-[44px] items-center border border-pc-ouro px-5 text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!erro && carregando && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="border border-pc-borda">
                <div className="aspect-square animate-pulse bg-pc-preto" />
                <div className="space-y-2 p-3 sm:p-4">
                  <div className="h-3 w-3/4 animate-pulse bg-pc-borda" />
                  <div className="h-2 w-1/3 animate-pulse bg-pc-borda" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!erro && !carregando && itens.length === 0 && (
          <div className="border border-pc-borda p-10 text-center">
            <p className="text-sm text-pc-tinta-fraca">
              Nenhum item publicado nesta categoria no momento.
            </p>
            <button
              type="button"
              onClick={() => onTrocarCategoria('all')}
              className="mt-4 inline-flex min-h-[44px] items-center border border-pc-ouro px-5 text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
            >
              Ver todas as categorias
            </button>
          </div>
        )}

        {!erro && !carregando && itens.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {itens.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAbrirItem(item)}
                  className="group border border-pc-borda text-left transition-colors hover:border-pc-ouro"
                >
                  <div className="aspect-square overflow-hidden bg-pc-preto">
                    <img
                      src={item.image_urls[0]}
                      alt={item.description || 'Item da operação'}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={400}
                    />
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-pc-ouro sm:text-[10px]">
                      Curadoria aprovada
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-pc-tinta sm:text-sm">
                      {item.description || 'Item em operação'}
                    </h3>
                  </div>
                </button>
              ))}
            </div>

            {!fim && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={onCarregarMais}
                  disabled={carregandoMais}
                  className="flex min-h-[44px] items-center border border-pc-ouro px-6 text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto disabled:opacity-50"
                >
                  {carregandoMais ? 'Carregando…' : 'Ver mais itens'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}