import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Gem } from 'lucide-react';
import CountdownTimer from '@/components/common/CountdownTimer';
import { textoDeTermino } from '@/lib/relogioLeilao';
import { precoDoLeilao, emReais, AVISO_NAO_OFICIAL } from '@/lib/homeNova';

// 🎯 HERO — o leilão do dia.
//
// 🔴 NADA AQUI É TEXTO DIGITADO. Título, foto, preço e prazo saem do leilão que
// o hero aponta. A home antiga tinha a data escrita na arte, e no dia seguinte
// a página mentia sozinha. Sem leilão em cartaz, o hero não renderiza.
//
// 🎨 A IDENTIDADE vem do logo, não de uma paleta inventada: verde vivo do
// símbolo, verde quase preto do fundo e o CARAMELO do martelo (nz-ouro/marrom)
// como acento — é o único tom quente da marca, e é o que separa a página de
// "mais um site escuro com verde".
export default function HeroDoDia({ leilao, arte = null, chamada = 'Leilão do dia', naLoja = 0 }) {
  if (!leilao?.id) return null;

  const foto = arte || leilao.image_urls?.[0] || null;
  const preco = precoDoLeilao(leilao);
  // 💰 19/09/2026 — A ÂNCORA FALTAVA JUSTO NO ITEM MAIS CARO.
  //
  // Todo cartão do carrossel mostra "na loja R$ X" riscado embaixo do lance. O
  // hero, que carrega o produto de maior valor da casa, mostrava só "R$ 597,00"
  // solto — sem nada que dissesse de quanto ele partiu. A mesma régua do
  // carrossel vale aqui, incluindo a recusa ao selo de "-99%": dois fatos lado
  // a lado, sem prometer desconto que o martelo ainda não confirmou.
  const compara = naLoja > 0 && naLoja > preco;
  // `textoDeTermino` e não `dataDeTermino`: é ela que decide sozinha se
  // precisa do ano (a própria lib manda usar esta nas telas).
  const quando = textoDeTermino(leilao.end_time);

  return (
    <section className="relative overflow-hidden bg-nz-noite" data-teste="hero-do-dia">
      {/* halo do produto: luz que nasce atrás da foto, não um degradê chapado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(58% 70% at 76% 46%, rgba(46,157,99,0.30) 0%, rgba(46,157,99,0.07) 42%, transparent 72%)' }}
      />
      {/* trama fina: tira o "preto chapado" sem virar textura visível */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(80% 70% at 50% 40%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(80% 70% at 50% 40%, #000 30%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-[clamp(32px,5.5vw,64px)] md:grid-cols-[1.02fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-nz-ouro-claro/35 bg-nz-ouro-claro/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-nz-ouro-claro">
            <Gem size={13} /> {chamada}
          </span>

          <h1
            className="font-slab mt-5 font-extrabold leading-[1.02] tracking-[-0.025em] text-white"
            style={{ fontSize: 'clamp(2.1rem, 5vw, 3.7rem)' }}
          >
            {leilao.title}
          </h1>

          {/* 💰 O preço deixa de ser uma linha de texto e vira o segundo herói
              da tela — é o número que faz a pessoa clicar. */}
          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Lance atual</div>
              <div
                className="font-slab font-extrabold leading-none text-nz-verde-neon"
                style={{ fontSize: 'clamp(2rem, 4.2vw, 3rem)' }}
                data-teste="hero-preco"
              >
                {emReais(preco)}
              </div>
              {compara && (
                <div className="mt-1.5 text-[13px] text-white/40" data-teste="hero-na-loja">
                  na loja <span className="line-through">{emReais(naLoja)}</span>
                </div>
              )}
            </div>

            {/* ⏱️ Relógio VIVO, contando. A versão anterior escrevia "Termina
                20/09 às 18:00" e ficava parada: num leilão, o que move a pessoa
                é ver o tempo andando. */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Termina em</div>
              <div
                className="font-slab text-[1.6rem] font-bold leading-none text-white sm:text-[2rem]"
                data-teste="hero-contagem"
              >
                <CountdownTimer endTime={leilao.end_time} className="font-slab" />
              </div>
              {quando && <div className="mt-1.5 text-[12px] text-white/40" data-teste="hero-fim">{quando}</div>}
            </div>
          </div>

          <Link
            to={`/AuctionRoom?id=${encodeURIComponent(leilao.id)}`}
            className="group mt-8 inline-flex min-h-[56px] items-center gap-2.5 rounded-full bg-nz-verde-claro px-8 text-[16px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(46,157,99,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-nz-verde-neon hover:shadow-[0_16px_38px_-10px_rgba(63,208,126,0.9)]"
          >
            <Gavel size={18} className="transition-transform duration-200 group-hover:-rotate-12" />
            Dar meu lance
          </Link>

          {/* ⚖️ Obrigação de contrato, não enfeite — ver lib/homeNova.js */}
          <p className="mt-6 max-w-[46ch] text-[12px] leading-snug text-white/45" data-teste="aviso-nao-oficial">
            {AVISO_NAO_OFICIAL}
          </p>
        </div>

        {foto && (
          <div className="relative flex items-center justify-center">
            <img
              src={foto}
              alt={leilao.title}
              loading="eager"
              decoding="async"
              className="relative w-full max-w-[460px] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]"
              style={{ height: 'clamp(230px, 32vw, 400px)' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
