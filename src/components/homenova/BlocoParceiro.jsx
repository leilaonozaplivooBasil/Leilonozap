import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gem, Users, TrendingUp } from 'lucide-react';

// 🤝 BLOCO PARCEIRO.
//
// O mock trazia DOIS blocos colados (a faixa "Transforme indicações" e o bloco
// grande), com o mesmo botão repetido três vezes em 15% da página — o mesmo
// vício da home antiga, que gasta 4 das 18 saídas vendendo renda para quem
// ainda não comprou nada. Aqui os dois viram um: os selos da faixa entraram
// como apoio do bloco, e sobrou UM caminho.
const SELOS = [
  { icone: Gem, titulo: 'Comissão real', linha: 'Percentual do seu cargo em cada venda' },
  { icone: Users, titulo: 'Suporte dedicado', linha: 'Time de apoio pra sua estrutura' },
  { icone: TrendingUp, titulo: 'Oportunidades', linha: 'Em todo o Brasil, todos os dias' },
];

export default function BlocoParceiro({ foto = null }) {
  return (
    <section className="relative overflow-hidden bg-nz-noite-2" data-teste="bloco-parceiro">
      {foto && (
        <>
          <img src={foto} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-right" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #07100C 22%, rgba(7,16,12,0.78) 52%, rgba(7,16,12,0.25) 100%)' }} />
        </>
      )}

      {/* halo quente: é o caramelo do martelo do logo, o único tom quente da marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 80% at 82% 50%, rgba(245,196,81,0.10) 0%, transparent 70%)' }}
      />
      {/* trama fina: mesma do hero, para os dois blocos escuros conversarem */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(75% 80% at 30% 45%, #000 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(75% 80% at 30% 45%, #000 20%, transparent 100%)',
        }}
      />

      {/* 🤝 19/09/2026 — A METADE DIREITA ESTAVA VAZIA.
          Tudo cabia em 560px à esquerda e sobravam 640px de preto: 475px de
          altura com metade da tela sem nada. Os três selos, que estavam
          espremidos numa linha de rodapé do bloco, viram a coluna da direita —
          cada um um cartão de verdade, com o mesmo repouso bonito e a mesma
          reação ao mouse que os cards de leilão ganharam. */}
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-[clamp(48px,7vw,88px)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="max-w-[560px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-nz-ouro-claro/30 bg-nz-ouro-claro/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-nz-ouro-claro">
            Para quem quer faturar
          </span>
          <h2 className="font-slab mt-4 font-extrabold leading-[1.04] tracking-[-0.03em] text-white" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)' }}>
            Seja um <span className="text-nz-verde-neon">Parceiro</span>
          </h2>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.55] text-white/70">
            Indique, divulgue e ganhe com o Leilão NoZap.
          </p>

          <Link
            to="/Lucre"
            className="group mt-7 inline-flex min-h-[54px] items-center gap-2 rounded-full bg-nz-verde-claro px-7 text-[16px] font-bold text-white shadow-[0_10px_30px_-12px_rgba(46,157,99,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-nz-verde-neon hover:shadow-[0_16px_40px_-12px_rgba(63,208,126,0.95)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Quero ser parceiro
            <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
          </Link>
        </div>

        <div className="grid gap-3">
          {SELOS.map((s) => (
            <div
              key={s.titulo}
              className="group/selo flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-nz-ouro-claro/45 hover:bg-white/[0.07] hover:shadow-[0_16px_34px_-20px_rgba(245,196,81,0.55)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              data-teste="selo-parceiro"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-nz-ouro-claro/25 bg-nz-ouro-claro/10 transition-colors duration-300 group-hover/selo:border-nz-ouro-claro/60 group-hover/selo:bg-nz-ouro-claro/20">
                <s.icone size={19} className="text-nz-ouro-claro" />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white">{s.titulo}</div>
                <div className="mt-1 text-[13px] leading-snug text-white/55">{s.linha}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
