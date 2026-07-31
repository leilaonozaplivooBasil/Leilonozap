import React from 'react';
import { motion } from 'framer-motion';
import ParCTA from './ParCTA';

// Os 4 papéis da rede em recorte die-cut, sobrepostos e flutuando em fases
// diferentes — é o bloco que humaniza a vitrine.
const PAPEIS = [
  { nome: 'Leiloeiro', img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/0b26ab432_generated_image.png', delay: 0, amp: 6, rot: -1.2 },
  { nome: 'Lojista', img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/ebfa6363e_generated_image.png', delay: 0.4, amp: 9, rot: 1.1 },
  { nome: 'Executivo', img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/e7a395b60_generated_image.png', delay: 0.8, amp: 7, rot: -0.9 },
  { nome: 'Licenciado', img: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/58815263b_generated_image.png', delay: 1.2, amp: 10, rot: 1.3 },
];

function Personagem({ p }) {
  return (
    <div className="group relative flex flex-none flex-col items-center snap-center md:-ml-8 md:first:ml-0">
      <motion.img
        src={p.img}
        alt={`${p.nome} do Leilão NoZap`}
        loading="lazy"
        decoding="async"
        className="h-[200px] w-auto object-contain sm:h-[300px] lg:h-[360px] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.02]"
        animate={{ y: [0, -p.amp, 0], rotate: [0, p.rot, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
      />
      <span className="mt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-nz-tinta-fraca">
        {p.nome}
      </span>
    </div>
  );
}

export default function PersonagensRede() {
  return (
    <section className="w-full overflow-hidden bg-white">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="pt-[clamp(64px,9vh,108px)] px-5 text-center"
      >
        <div className="mx-auto max-w-[680px]">
          <h2
            className="font-semibold leading-[1.05] tracking-[-0.03em] text-nz-tinta"
            style={{ fontSize: 'clamp(2.25rem, 6.5vw, 4.5rem)' }}
          >
            Sua renda, resolvida.
          </h2>
          <p
            className="mt-[14px] leading-[1.4] text-nz-tinta-fraca"
            style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.5rem)' }}
          >
            Leiloeiro, Lojista, Executivo ou Licenciado — escolha seu papel na rede e comece a faturar com o Leilão NoZap.
          </p>
          <div className="mt-8">
            <ParCTA
              primario={{ label: 'Escolher meu papel', to: '/Licensing' }}
              secundario={{ label: 'Ver os planos', to: '/Evoluir' }}
            />
          </div>
        </div>

        {/* formas verdes preenchendo os vazios entre os recortes */}
        <div className="relative mt-10">
          <svg
            viewBox="0 0 1200 320"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-full w-full md:block"
            preserveAspectRatio="none"
          >
            <circle cx="180" cy="250" r="70" fill="#1B7A48" opacity="0.10" />
            <rect x="480" y="210" width="110" height="110" rx="24" fill="#2E9D63" opacity="0.12" />
            <circle cx="760" cy="240" r="56" fill="#7FD6A6" opacity="0.18" />
            <rect x="960" y="230" width="130" height="90" rx="18" fill="#1B7A48" opacity="0.09" />
          </svg>

          <div className="nz-no-scrollbar relative flex snap-x snap-mandatory items-end gap-4 overflow-x-auto px-4 pb-0 md:justify-center md:gap-0 md:overflow-visible">
            {PAPEIS.map((p) => (
              <Personagem key={p.nome} p={p} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}