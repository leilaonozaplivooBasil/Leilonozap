import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { HOME_SECTOR_CARDS } from '@/lib/sectors';

// Todas as verticais do negócio como portas discretas — densidade só no fim
// da vitrine, nunca competindo com o topo.
export default function SetoresClean() {
  return (
    <section className="w-full bg-white px-5 pt-[clamp(56px,8vh,96px)] pb-[clamp(56px,8vh,96px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[1080px]"
      >
        <h2
          className="text-center font-semibold leading-[1.1] tracking-[-0.03em] text-nz-tinta"
          style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3rem)' }}
        >
          Por onde você quer começar?
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-center text-[16px] leading-[1.4] text-nz-tinta-fraca">
          Escolha o setor e vá direto ao ponto.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_SECTOR_CARDS.map((s) => {
            const conteudo = (
              <>
                <span className="text-[16px] text-nz-tinta group-hover:text-nz-verde">{s.title}</span>
                <span className="text-nz-verde opacity-0 transition-opacity group-hover:opacity-100">›</span>
              </>
            );
            return s.external ? (
              <a
                key={s.title}
                href={s.external}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[48px] items-center justify-between border-b border-nz-borda"
              >
                {conteudo}
              </a>
            ) : (
              <Link
                key={s.title}
                to={createPageUrl(s.page)}
                className="group flex min-h-[48px] items-center justify-between border-b border-nz-borda"
              >
                {conteudo}
              </Link>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}