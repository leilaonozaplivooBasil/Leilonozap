import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { textoDeTermino } from '@/lib/relogioLeilao';
import { precoDoLeilao, emReais } from '@/lib/homeNova';

// 🎠 Carrossel de leilões — a mesma peça serve os dois blocos da home
// ("Em destaque" e "Leilões da semana"), só muda a lista e o rótulo do botão.
//
// Rolagem nativa com snap: sem biblioteca, funciona com o dedo no celular e com
// as setas no desktop. O cronômetro fica no card de propósito — num leilão, o
// tempo que falta é o que faz a pessoa clicar.

function CartaoDeLeilao({ leilao, rotuloDoBotao }) {
  const foto = leilao.image_urls?.[0] || null;
  const fim = textoDeTermino(leilao.end_time);

  return (
    <article
      className="flex w-[168px] flex-none flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:w-[200px]"
      data-teste="cartao-de-leilao"
    >
      <Link to={`/AuctionRoom?id=${encodeURIComponent(leilao.id)}`} className="block">
        <div className="h-[140px] overflow-hidden bg-white/5 sm:h-[160px]">
          {foto && (
            <img src={foto} alt={leilao.title} loading="lazy" decoding="async" className="h-full w-full object-contain" />
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-medium leading-[1.3] text-white">{leilao.title}</h3>
        {fim && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-white/45" data-teste="fim-do-cartao">
            <Clock size={11} /> {fim}
          </div>
        )}
        <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-white/40">Lance atual</div>
        <div className="text-[17px] font-semibold leading-tight text-nz-verde-claro" data-teste="preco-do-cartao">
          {emReais(precoDoLeilao(leilao))}
        </div>
        <Link
          to={`/AuctionRoom?id=${encodeURIComponent(leilao.id)}`}
          className="mt-3 flex min-h-[40px] items-center justify-center rounded-full bg-nz-verde-claro px-3 text-[13px] font-semibold text-white transition-colors hover:bg-nz-verde"
        >
          {rotuloDoBotao}
        </Link>
      </div>
    </article>
  );
}

export default function CarrosselDeLeiloes({
  titulo,
  subtitulo,
  leiloes = [],
  rotuloDoBotao = 'Dar lance',
  verTudo = { rotulo: 'Ver todos os leilões', para: '/leiloes' },
  teste = 'carrossel-de-leiloes',
}) {
  const trilho = useRef(null);
  if (leiloes.length === 0) return null;

  const deslizar = (direcao) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="bg-[#0A1410] px-5 py-[clamp(36px,5vw,64px)]" data-teste={teste}>
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.2rem)' }}>
              {titulo}
            </h2>
            {subtitulo && <p className="mt-2 text-[15px] text-white/55">{subtitulo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Link to={verTudo.para} className="mr-1 hidden items-center gap-1.5 text-[14px] font-medium text-nz-verde-claro hover:underline sm:inline-flex">
              {verTudo.rotulo} <ArrowRight size={15} />
            </Link>
            <button type="button" onClick={() => deslizar(-1)} aria-label="Anterior" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-nz-verde-claro hover:text-nz-verde-claro">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => deslizar(1)} aria-label="Próximo" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-nz-verde-claro hover:text-nz-verde-claro">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div ref={trilho} className="nz-no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {leiloes.map((a) => (
            <div key={a.id} className="snap-start">
              <CartaoDeLeilao leilao={a} rotuloDoBotao={rotuloDoBotao} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
