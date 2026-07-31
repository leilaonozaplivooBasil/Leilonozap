import React, { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

// Parallax de camadas no padrão Apple: a pessoa quase não se move (só respira)
// e os produtos por cima se deslocam de 4 a 6x mais, saindo da caixa/do celular
// e voltando com um quiquezinho elástico. mix-blend-mode: multiply apaga o
// fundo branco dos recortes de produto sobre o fundo branco da seção.
export default function PersonagemParallax({ nome, base }) {
  const cardRef = useRef(null);
  const camadasRef = useRef([]);

  const mover = useCallback((clientX, clientY) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);

    camadasRef.current.forEach((el) => {
      if (!el) return;
      const s = Number(el.dataset.speed || 0);
      el.style.transform = `translate3d(${dx * s}px, ${dy * s}px, 0)`;
    });
    card.style.transform = `perspective(800px) rotateX(${(dy / r.height) * -4}deg) rotateY(${(dx / r.width) * 4}deg)`;
  }, []);

  const repousar = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    camadasRef.current.forEach((el) => {
      if (el) el.style.transform = 'translate3d(0, 0, 0)';
    });
  }, []);

  // Toque: dispara o "salto" dos produtos uma vez e volta sozinho.
  const tocar = useCallback((e) => {
    const t = e.touches?.[0];
    if (!t) return;
    mover(t.clientX, t.clientY);
    setTimeout(repousar, 700);
  }, [mover, repousar]);

  return (
    <div className="relative flex flex-none flex-col items-center snap-center">
      <div
        ref={cardRef}
        onMouseMove={(e) => mover(e.clientX, e.clientY)}
        onMouseLeave={repousar}
        onTouchStart={tocar}
        className="nz-parallax relative cursor-pointer"
      >
        {/* camada da pessoa: quase parada, só a respiração.
            O parallax escreve transform no span; o idle vive na img de dentro,
            senão um sobrescreveria o outro. */}
        <span
          ref={(el) => { camadasRef.current[0] = el; }}
          data-speed="0.03"
          className="nz-camada relative z-10 block"
        >
          <motion.img
            src={base}
            alt={`${nome} do Leilão NoZap`}
            loading="lazy"
            decoding="async"
            className="h-[260px] w-auto object-contain sm:h-[340px] lg:h-[420px] xl:h-[460px]"
            animate={{ y: [0, -4, 0], rotate: [0, 0.6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>

      </div>

      <span className="mt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-nz-tinta-fraca">
        {nome}
      </span>
    </div>
  );
}