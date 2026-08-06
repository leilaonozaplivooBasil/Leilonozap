import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ParceiroSecao from './ParceiroSecao';

// Bloco 07 — prova de operação: o que a curadoria já colocou para girar.
// Só imagem, título e categoria. NUNCA preço, aporte, resultado ou botão de compra.
export default function ParceiroVitrineOperacao() {
  const [itens, setItens] = useState(null); // null = carregando

  useEffect(() => {
    let ativo = true;
    base44.entities.Product.list('-created_date', 24)
      .then((lista) => {
        if (!ativo) return;
        const comFoto = (lista || []).filter((p) => p?.image_urls?.[0]).slice(0, 8);
        setItens(comFoto);
      })
      .catch(() => { if (ativo) setItens([]); });
    return () => { ativo = false; };
  }, []);

  return (
    <ParceiroSecao numero="06" rotulo="Prova de operação" referencia="Curadoria vigente" fundo="preto-2">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          O que a operação <span className="text-pc-ouro">gira hoje</span>
        </h2>
        <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
          Itens aprovados pela curadoria e já colocados
          <br className="hidden sm:block" /> nos canais próprios de venda.
        </p>
      </div>

      {itens === null && (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-pc-borda">
              <div className="aspect-square animate-pulse bg-pc-preto" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-3/4 animate-pulse bg-pc-borda" />
                <div className="h-2 w-1/3 animate-pulse bg-pc-borda" />
              </div>
            </div>
          ))}
        </div>
      )}

      {itens?.length === 0 && (
        <p className="mt-12 border border-pc-borda p-10 text-center text-sm text-pc-tinta-fraca">
          Nenhum item publicado no momento.
        </p>
      )}

      {itens?.length > 0 && (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((p) => (
            <article key={p.id} className="border border-pc-borda">
              <div className="aspect-square overflow-hidden bg-pc-preto">
                <img
                  src={p.image_urls[0]}
                  alt={p.description || 'Item da operação'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={400}
                />
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Curadoria aprovada</p>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-pc-tinta">
                  {p.description || 'Item em operação'}
                </h3>
                {p.category && (
                  <p className="mt-2 text-xs capitalize text-pc-tinta-fraca">
                    {String(p.category).replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </ParceiroSecao>
  );
}