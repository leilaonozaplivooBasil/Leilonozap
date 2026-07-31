import React from 'react';
import { motion } from 'framer-motion';
import ParCTA from './ParCTA';
import PersonagemParallax from './PersonagemParallax';

// Recortes de produto usados como camadas soltas por cima das figuras
const PROD = {
  tenis: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/9bfb69055_generated_image.png',
  fone: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/25454d868_generated_image.png',
  note: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/5033bfa19_generated_image.png',
  caixa: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/53c9d7db0_generated_image.png',
};

// Os 3 papéis da rede em recorte die-cut. A figura é a camada lenta (só respira)
// e cada produto listado é uma camada solta que se desloca muito mais no mouse.
const PAPEIS = [
  {
    nome: 'Lojista',
    base: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/4517e824a_generated_image.png',
    produtos: [
      { img: PROD.note, top: '20%', left: '1%', w: '20%', speed: 0.14, delay: 0, rot: -4 },
      { img: PROD.fone, top: '10%', left: '80%', w: '16%', speed: 0.2, delay: 0.6, rot: 5 },
      { img: PROD.tenis, top: '52%', left: '82%', w: '17%', speed: 0.17, delay: 1.2, rot: -3 },
    ],
  },
  {
    nome: 'Executivo',
    base: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/93e5f52fc_generated_image.png',
    produtos: [
      { img: PROD.note, top: '16%', left: '80%', w: '19%', speed: 0.16, delay: 0.3, rot: 4 },
      { img: PROD.caixa, top: '55%', left: '2%', w: '15%', speed: 0.19, delay: 0.9, rot: -5 },
    ],
  },
  {
    nome: 'Licenciado',
    base: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/0393373a9_generated_image.png',
    produtos: [
      { img: PROD.tenis, top: '12%', left: '80%', w: '18%', speed: 0.2, delay: 0, rot: 5 },
      { img: PROD.fone, top: '28%', left: '2%', w: '16%', speed: 0.15, delay: 0.7, rot: -4 },
      { img: PROD.caixa, top: '60%', left: '83%', w: '15%', speed: 0.18, delay: 1.4, rot: 4 },
    ],
  },
];

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
            Lojista, Executivo ou Licenciado — escolha seu modelo de negócio e comece a faturar com o Leilão NoZap.
          </p>
          <div className="mt-8">
            <ParCTA
              primario={{ label: 'Ver modelos de negócio', to: '/Licensing' }}
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

          <div className="nz-no-scrollbar relative flex snap-x snap-mandatory items-end gap-4 overflow-x-auto px-4 pb-0 md:justify-center md:gap-10 md:overflow-visible lg:gap-16">
            {PAPEIS.map((p) => (
              <PersonagemParallax key={p.nome} nome={p.nome} base={p.base} />
            ))}
          </div>

          {/* Volta elástica das camadas (o quiquezinho da Apple ao sair) */}
          <style>{`
            .nz-parallax, .nz-camada {
              transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
              will-change: transform;
            }
            @media (prefers-reduced-motion: reduce) {
              .nz-parallax, .nz-camada { transition: none; transform: none !important; }
            }
          `}</style>
        </div>
      </motion.div>
    </section>
  );
}