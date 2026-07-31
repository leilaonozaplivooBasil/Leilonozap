import React from 'react';
import { motion } from 'framer-motion';
import ParCTA from './ParCTA';

const TEMAS = {
  cinza: 'bg-nz-cinza-fundo',
  branco: 'bg-white',
  verde: 'bg-nz-verde-fundo',
  escuro: 'bg-nz-verde-escuro',
};

// Bloco-mãe da vitrine. Ordem fixa: eyebrow → título → subtítulo → CTAs → mídia.
// A mídia sangra até a base (sem padding-bottom), como nas vitrines premium.
export default function BlocoVitrine({
  eyebrow,
  titulo,
  titulo2,
  subtitulo,
  primario,
  secundario,
  tema = 'cinza',
  children,
}) {
  const escuro = tema === 'escuro';

  return (
    <section className={`${TEMAS[tema]} w-full overflow-hidden`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="pt-[clamp(64px,9vh,108px)] px-5 text-center"
      >
        <div className="mx-auto max-w-[680px]">
          {eyebrow && (
            <div className={`mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] ${escuro ? 'text-nz-verde-claro' : 'text-nz-verde'}`}>
              {eyebrow}
            </div>
          )}

          <h2
            className={`font-semibold leading-[1.05] tracking-[-0.03em] ${escuro ? 'text-white' : 'text-nz-tinta'}`}
            style={{ fontSize: 'clamp(2.25rem, 6.5vw, 4.5rem)' }}
          >
            {titulo}
            {titulo2 && (
              <>
                <br />
                <span className={escuro ? 'text-nz-verde-claro' : 'text-nz-verde'}>{titulo2}</span>
              </>
            )}
          </h2>

          {subtitulo && (
            <p
              className={`mt-[14px] leading-[1.4] ${escuro ? 'text-white/70' : 'text-nz-tinta-fraca'}`}
              style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.5rem)' }}
            >
              {subtitulo}
            </p>
          )}

          {(primario || secundario) && (
            <div className="mt-8">
              <ParCTA primario={primario} secundario={secundario} escuro={escuro} solido={escuro} />
            </div>
          )}
        </div>

        {children && <div className="mt-12">{children}</div>}
      </motion.div>
    </section>
  );
}