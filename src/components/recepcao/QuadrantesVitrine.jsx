import React from 'react';
import { Link } from 'react-router-dom';

// Grade 2x2 no padrão Apple: cada quadrante é um bloco full-bleed com título,
// linha de apoio, CTAs e UM produto grande sem moldura ocupando a base.
const QUADRANTES = [
  {
    titulo: 'Loja Virtual',
    apoio: 'Entrega em todo o Brasil.',
    bg: '#F5F6F5',
    escuro: false,
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/c2652d991_generated_image.png',
    ctas: [{ label: 'Comprar agora', to: '/Loja-Virtual' }],
  },
  {
    titulo: 'Direto de fábrica',
    apoio: 'Preço de atacado, sem intermediário.',
    bg: '#FFFFFF',
    escuro: false,
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/fa76ed3f1_generated_image.png',
    ctas: [{ label: 'Saber mais', to: '/DiretoDeFabrica' }],
  },
  {
    titulo: 'Leilão ao vivo',
    apoio: 'Dê seu lance e veja o martelo bater.',
    bg: '#0C1F16',
    escuro: true,
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/7d402220f_generated_image.png',
    ctas: [{ label: 'Entrar na sala', to: '/leiloes' }],
  },
  {
    titulo: 'Como funciona',
    apoio: 'Lance, arremate e receba em casa.',
    bg: '#F1F7F3',
    escuro: false,
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/a0135bbdf_generated_image.png',
    ctas: [{ label: 'Como funciona', to: '/Licensing' }],
  },
];

function Quadrante({ q }) {
  const cor = q.escuro ? '#FFFFFF' : 'var(--nz-tinta)';
  const corApoio = q.escuro ? 'rgba(255,255,255,0.72)' : 'var(--nz-tinta-fraca)';
  return (
    <div
      className="relative flex flex-col items-center overflow-hidden pt-[clamp(40px,5vw,64px)]"
      style={{ background: q.bg, color: cor }}
    >
      <h3
        className="px-5 text-center font-semibold leading-[1.06] tracking-[-0.03em]"
        style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}
      >
        {q.titulo}
      </h3>
      <p
        className="mt-2 max-w-[34ch] px-5 text-center leading-[1.35]"
        style={{ fontSize: 'clamp(0.95rem, 1.2vw, 1.1rem)', color: corApoio }}
      >
        {q.apoio}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 px-5">
        {q.ctas.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={`rounded-full px-6 py-2 text-sm font-medium transition-opacity hover:opacity-80 ${
              q.escuro ? 'bg-white text-nz-verde-escuro' : 'bg-nz-verde text-white'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <img
        src={q.img}
        alt={q.titulo}
        loading="lazy"
        decoding="async"
        className="mt-[clamp(20px,3vw,34px)] w-full max-w-[520px] object-contain"
        style={{
          height: 'clamp(200px, 26vw, 320px)',
          objectPosition: 'center bottom',
          // apaga o retângulo de fundo do render: multiply come o branco nos
          // quadrantes claros, screen come o preto no quadrante escuro
          mixBlendMode: q.escuro ? 'screen' : 'multiply',
          // e a máscara dissolve as bordas do render, pra não sobrar retângulo
          maskImage: 'radial-gradient(62% 62% at 50% 52%, #000 42%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(62% 62% at 50% 52%, #000 42%, transparent 78%)',
        }}
      />
    </div>
  );
}

export default function QuadrantesVitrine() {
  return (
    <section className="grid w-full grid-cols-1 gap-[3px] bg-white md:grid-cols-2">
      {QUADRANTES.map((q) => (
        <Quadrante key={q.titulo} q={q} />
      ))}
    </section>
  );
}