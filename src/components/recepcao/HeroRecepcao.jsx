import React from 'react';
import { Search } from 'lucide-react';
import ParCTA from './ParCTA';
import FilaProdutos from './FilaProdutos';

// Hero da vitrine: eyebrow ao vivo → título → subtítulo → CTAs → busca → produto.
// A busca é o gesto nº 1 de quem chega numa loja, por isso continua aqui.
export default function HeroRecepcao({ stats, produtos = [], q, setQ, onBuscar }) {
  return (
    <section className="w-full overflow-hidden bg-nz-cinza-fundo">
      <div className="px-5 pt-[clamp(56px,8vh,96px)] text-center">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-nz-borda bg-white px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-nz-tinta-fraca">
              {stats.leiloes > 0 ? `${stats.leiloes} leilões acontecendo agora` : 'Leilões ao vivo'}
            </span>
          </div>

          <h1
            className="font-semibold leading-[1.02] tracking-[-0.035em] text-nz-tinta"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)' }}
          >
            Arremate.
            <br />
            <span className="text-nz-verde">
              Por uma fração.
              <span className="align-super text-[0.42em] font-normal">*</span>
            </span>
          </h1>

          <p
            className="mx-auto mt-4 max-w-[560px] leading-[1.4] text-nz-tinta-fraca"
            style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)' }}
          >
            Leilões ao vivo e loja virtual com até 60% de desconto. Dê seu lance, arremate e receba em casa.
          </p>

          {/* Transparência: exigência de comunicação — visível logo de cara. */}
          <p className="mt-3 text-[13px] leading-snug text-nz-tinta-fraca">
            *Leilão não oficial
          </p>

          <div className="mt-8">
            <ParCTA
              primario={{ label: 'Entrar nos leilões', to: '/leiloes' }}
              secundario={{ label: 'Ver a loja', to: '/Loja-Virtual' }}
            />
          </div>

          <form onSubmit={onBuscar} className="mx-auto mt-8 max-w-[520px]">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nz-tinta-fraca" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="O que você está procurando?"
                aria-label="Buscar produtos"
                className="h-[52px] w-full rounded-full border border-nz-borda bg-white pl-11 pr-[104px] text-[15px] text-nz-tinta outline-none placeholder:text-nz-tinta-fraca focus:border-nz-verde"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 h-[40px] rounded-full bg-nz-verde px-5 text-[14px] font-medium text-white transition-colors hover:bg-nz-verde-claro"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] text-nz-tinta-fraca">
            <span><strong className="font-semibold text-nz-tinta">{stats.leiloes}</strong> leilões ativos</span>
            <span><strong className="font-semibold text-nz-tinta">{stats.produtos}+</strong> produtos na loja</span>
            <span><strong className="font-semibold text-nz-tinta">Brasil</strong> entrega em todo o país</span>
            <span><strong className="font-semibold text-nz-tinta">PIX &amp; Cartão</strong> pagamento seguro</span>
          </div>
        </div>

        <div className="mt-14">
          <FilaProdutos />
        </div>
      </div>
    </section>
  );
}