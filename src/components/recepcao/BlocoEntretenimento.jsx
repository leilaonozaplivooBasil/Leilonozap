import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Fecho da vitrine no formato "faixa de cartazes" (padrão Apple TV):
// título centralizado e cartões cinematográficos colados, largura total,
// com scroll lateral no celular. Cada cartaz leva a um destino real.
const CARTAZES = [
  {
    eyebrow: 'Livoo Live',
    titulo: 'Compre ao vivo, na hora.',
    linha: 'Ofertas que acabam na frente de todos.',
    cta: { label: 'Assistir agora', to: '/LiveShopNoZap' },
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/21edd6e2e_generated_image.png',
  },
  {
    eyebrow: 'Rank Premiado',
    titulo: 'Suba no ranking. Leve o prêmio.',
    linha: 'Convide, some pontos e concorra aos produtos do dia.',
    cta: { label: 'Participar', to: '/rankpremiado' },
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/defd4eb65_generated_image.png',
  },
  {
    eyebrow: 'Indique e fature',
    titulo: 'Mandou o link. Caiu comissão.',
    linha: 'Mostre o produto pra quem você conhece.',
    cta: { label: 'Começar a indicar', to: '/Licensing' },
    img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/95957b962_generated_image.png',
  },
];

export default function BlocoEntretenimento() {
  return (
    <section className="w-full bg-white pt-[clamp(56px,7vh,88px)]">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="px-5 text-center font-semibold leading-[1.05] tracking-[-0.03em] text-nz-tinta"
        style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}
      >
        Diversão que dá dinheiro.
      </motion.h2>

      <div className="nz-no-scrollbar mt-[clamp(28px,4vh,44px)] flex snap-x snap-mandatory gap-1 overflow-x-auto md:grid md:grid-cols-3 md:gap-1 md:overflow-visible">
        {CARTAZES.map((c, i) => (
          <motion.div
            key={c.eyebrow}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group relative min-w-[82vw] snap-center overflow-hidden md:min-w-0"
            style={{ height: 'clamp(420px, 52vw, 620px)' }}
          >
            <img
              src={c.img}
              alt={c.titulo}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
              style={{ filter: 'brightness(1.04) saturate(1.02)' }}
            />
            {/* véu leve: só o rodapé escurece pro texto branco ficar legível —
                o miolo da foto fica aceso pra não brigar com o clean do site */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(6,12,9,0.86) 0%, rgba(6,12,9,0.52) 30%, rgba(6,12,9,0.12) 52%, rgba(6,12,9,0) 68%)' }}
              aria-hidden="true"
            />
            {/* degradê do branco entrando na faixa: evita o corte seco no topo */}
            <div
              className="absolute inset-x-0 top-0 h-24"
              style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0))' }}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 text-left md:p-8">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {c.eyebrow}
              </div>
              <h3
                className="mt-2 font-semibold leading-[1.12] tracking-[-0.02em] text-white"
                style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)' }}
              >
                {c.titulo}
              </h3>
              <p className="mt-2 max-w-[300px] text-[15px] leading-[1.4] text-white/75">
                {c.linha}
              </p>
              <Link
                to={c.cta.to}
                className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-white px-[22px] text-[15px] font-medium text-nz-verde-escuro transition-colors duration-200 hover:bg-nz-verde hover:text-white"
              >
                {c.cta.label}
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}