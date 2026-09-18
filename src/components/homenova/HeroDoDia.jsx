import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Flame } from 'lucide-react';
import { textoDeTermino } from '@/lib/relogioLeilao';
import { precoDoLeilao, emReais, AVISO_NAO_OFICIAL } from '@/lib/homeNova';

// 🎯 HERO — o leilão do dia.
//
// 🔴 NADA AQUI É TEXTO DIGITADO. Título, foto, preço e data saem do leilão que
// o hero aponta. A home antiga tinha a data escrita na arte, e no dia seguinte
// a página mentia sozinha. Sem leilão em cartaz, o hero não renderiza.
export default function HeroDoDia({ leilao, arte = null, chamada = 'Leilão especial' }) {
  if (!leilao?.id) return null;

  const foto = arte || leilao.image_urls?.[0] || null;
  const fim = textoDeTermino(leilao.end_time);
  const preco = precoDoLeilao(leilao);

  return (
    <section
      className="relative overflow-hidden bg-[#0A1410]"
      style={{ background: 'radial-gradient(120% 90% at 78% 40%, #123D2A 0%, #0A1410 62%)' }}
      data-teste="hero-do-dia"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-[clamp(36px,6vw,72px)] md:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-nz-fogo-claro/40 bg-nz-fogo/15 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-nz-fogo-claro">
            <Flame size={14} /> {chamada}
          </span>

          <h1
            className="mt-5 font-semibold leading-[1.05] tracking-[-0.03em] text-white"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)' }}
          >
            {leilao.title}
          </h1>

          <p className="mt-4 text-[15px] leading-[1.5] text-white/70 sm:text-[17px]">
            Lance atual{' '}
            <strong className="font-semibold text-nz-verde-claro" data-teste="hero-preco">
              {emReais(preco)}
            </strong>
            {fim && (
              <>
                {' · '}
                <span data-teste="hero-fim">Termina {fim}</span>
              </>
            )}
          </p>

          <Link
            to={`/AuctionRoom?id=${encodeURIComponent(leilao.id)}`}
            className="mt-7 inline-flex min-h-[54px] items-center gap-2 rounded-full bg-nz-verde-claro px-8 text-[16px] font-semibold text-white transition-colors hover:bg-nz-verde"
          >
            <Gavel size={18} /> Ver leilão
          </Link>

          {/* ⚖️ Obrigação de contrato, não enfeite — ver lib/homeNova.js */}
          <p className="mt-5 max-w-[46ch] text-[12px] leading-snug text-white/45" data-teste="aviso-nao-oficial">
            {AVISO_NAO_OFICIAL}
          </p>
        </div>

        {foto && (
          <div className="relative">
            <img
              src={foto}
              alt={leilao.title}
              loading="eager"
              decoding="async"
              className="mx-auto w-full max-w-[460px] object-contain"
              style={{ height: 'clamp(220px, 32vw, 380px)' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
