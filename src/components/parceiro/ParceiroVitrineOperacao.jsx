import React, { useEffect, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import ParceiroSecao from './ParceiroSecao';
import ParceiroTourLoja from './ParceiroTourLoja';

// Bloco 06 — prova de operação: o que a curadoria já colocou para girar.
// Só imagem, título e categoria. NUNCA preço, aporte, resultado ou botão de compra.
// O percurso da Loja Virtual mora AQUI: a prova gera a curiosidade, o tour atende
// no mesmo lugar (antes ele ficava no bloco 07 e soava repetido).
export default function ParceiroVitrineOperacao() {
  const [itens, setItens] = useState(null); // null = carregando
  const [tourAberto, setTourAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    plataforma.entities.Product.list('-created_date', 24)
      .then((lista) => {
        if (!ativo) return;
        const comFoto = (lista || []).filter((p) => p?.image_urls?.[0]).slice(0, 6);
        setItens(comFoto);
      })
      .catch(() => { if (ativo) setItens([]); });
    return () => { ativo = false; };
  }, []);

  return (
    <>
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
          <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
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
          <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-3">
            {itens.map((p) => (
              <article key={p.id} className="border border-pc-borda bg-pc-preto">
                {/* moldura escura + object-contain: a foto de catálogo (fundo branco,
                    cores fortes) para de gritar sobre o preto institucional */}
                {/* pc-foto-papel: a impressão esconde as imagens da página (banners e
                    faixas decorativas viravam manchas no papel). A foto do item é a
                    exceção — ela É a prova de operação, então leva a marca que a
                    devolve no PDF (regra em src/index.css, bloco @media print). */}
                <div className="pc-foto-papel flex aspect-square items-center justify-center bg-pc-preto-2 p-5 sm:p-7">
                  <img
                    src={p.image_urls[0]}
                    alt={p.description || 'Item da operação'}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="border-t border-pc-borda p-4">
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

        <div className="mt-10 border-t border-pc-borda pt-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <p className="text-sm leading-relaxed text-pc-tinta-fraca">
            Veja o item curado dentro do canal, exatamente como o cliente encontra.
          </p>
          <button
            type="button"
            onClick={() => setTourAberto(true)}
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center border border-pc-ouro px-6 text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto sm:mt-0 sm:w-auto"
          >
            Percorrer a Loja Virtual
          </button>
        </div>
      </ParceiroSecao>

      {tourAberto && <ParceiroTourLoja canal="loja" onClose={() => setTourAberto(false)} />}
    </>
  );
}