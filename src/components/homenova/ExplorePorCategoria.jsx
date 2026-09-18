import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { recadoDaCategoria } from '@/lib/homeNova';

// 🗂️ EXPLORE POR CATEGORIA.
//
// A contagem vem da view `vw_home_categorias`, que amarra o leilão à categoria
// DO PRODUTO. O campo `auctions.category` não é usado: 52% dos leilões estão
// nele como "outros", o que daria um card "Outros — 29" no lugar de vitrine.
//
// Sem imagem cadastrada, o card cai num bloco de cor com a inicial — some
// categoria nenhuma por falta de foto.
export default function ExplorePorCategoria({ categorias = [] }) {
  if (categorias.length === 0) return null;

  return (
    <section className="bg-[#0A1410] px-5 py-[clamp(40px,6vw,72px)]" data-teste="explore-categoria">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-nz-verde-claro">Categorias</span>
            <h2 className="mt-1 font-semibold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}>
              Explore por categoria
            </h2>
            <p className="mt-2 text-[15px] text-white/55">Os leilões abertos agora, organizados por setor.</p>
          </div>
          <Link
            to="/Loja-Virtual"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 px-5 text-[14px] font-medium text-white/80 transition-colors hover:border-nz-verde-claro hover:text-nz-verde-claro"
          >
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categorias.map((c) => (
            <Link
              key={c.id || c.nome}
              to={`/Loja-Virtual?categoria=${encodeURIComponent(c.id || c.nome)}`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:border-nz-verde-claro/60"
              data-teste="card-categoria"
            >
              <div className="relative h-[110px] overflow-hidden sm:h-[130px]">
                {c.imagem ? (
                  <img
                    src={c.imagem}
                    alt={c.nome}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-nz-verde/40 to-transparent text-[34px] font-semibold text-white/25">
                    {c.nome.charAt(0)}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-[14px] font-medium leading-tight text-white">{c.nome}</div>
                <div className="mt-1 text-[12px] text-white/50" data-teste="recado-categoria">
                  {recadoDaCategoria(c)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
