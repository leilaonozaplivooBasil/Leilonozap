import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Grid de 2 colunas que quebra o empilhamento vertical no fim da vitrine.
const CARDS = [
  {
    eyebrow: 'Rank Premiado',
    titulo: 'Suba no ranking. Leve o prêmio.',
    linha: 'Convide, some pontos e concorra aos produtos do dia.',
    cta: { label: 'Participar', to: '/rankpremiado' },
    fundo: 'linear-gradient(160deg, #FBF6E6 0%, #EDF4EC 60%, #DCEBE0 100%)',
    icone: '🏆',
  },
  {
    eyebrow: 'Livoo Live',
    titulo: 'Compre ao vivo, na hora.',
    linha: 'Transmissões com ofertas que acabam na frente de todos.',
    cta: { label: 'Assistir agora', to: '/LiveShopNoZap' },
    fundo: 'linear-gradient(160deg, #FDF0F6 0%, #F1F5F1 60%, #DDEBE2 100%)',
    icone: '▶',
  },
];

export default function BlocoEntretenimento() {
  return (
    <section className="w-full bg-nz-cinza-fundo px-3 pt-[clamp(48px,6vh,72px)] pb-3">
      <div className="mx-auto grid max-w-[1180px] gap-3 md:grid-cols-2">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.eyebrow}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center rounded-2xl px-6 pt-12 pb-14 text-center"
            style={{ background: c.fundo }}
          >
            <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-nz-verde">
              {c.eyebrow}
            </div>
            <h3
              className="mt-3 font-semibold leading-[1.1] tracking-[-0.02em] text-nz-tinta"
              style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.3rem)' }}
            >
              {c.titulo}
            </h3>
            <p className="mt-3 max-w-[340px] text-[16px] leading-[1.4] text-nz-tinta-fraca">
              {c.linha}
            </p>
            <Link
              to={c.cta.to}
              className="mt-7 inline-flex min-h-[44px] items-center rounded-full border border-nz-verde px-[22px] text-[16px] text-nz-verde transition-colors duration-200 hover:bg-nz-verde hover:text-white"
            >
              {c.cta.label}
            </Link>
            <div className="mt-10 select-none text-6xl opacity-30" aria-hidden="true">
              {c.icone}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}