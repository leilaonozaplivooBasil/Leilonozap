import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ParCTA from './ParCTA';

const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// O único bloco escuro da página — o clímax. Mock de sala com lances subindo
// (animação puramente visual, sem nenhuma consulta de dados).
export default function BlocoAoVivo() {
  const [valor, setValor] = useState(184.5);

  useEffect(() => {
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduz) return;
    const t = setInterval(() => {
      setValor((v) => (v > 640 ? 184.5 : v + 12.5));
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="w-full overflow-hidden bg-nz-verde-escuro">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="px-5 pt-[clamp(64px,9vh,108px)] pb-[clamp(56px,8vh,96px)] text-center"
      >
        <div className="mx-auto max-w-[680px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-red-300">Ao vivo</span>
          </div>

          <h2
            className="font-semibold leading-[1.05] tracking-[-0.03em] text-white"
            style={{ fontSize: 'clamp(2.25rem, 6.5vw, 4.5rem)' }}
          >
            Leilão ao vivo.
            <br />
            <span className="text-nz-verde-claro">Todo dia.</span>
          </h2>

          <p
            className="mt-[14px] leading-[1.4] text-white/70"
            style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.5rem)' }}
          >
            Entre na sala, dê seu lance em tempo real e veja o martelo bater na sua frente.
          </p>

          <div className="mt-8">
            <ParCTA
              primario={{ label: 'Entrar na sala', to: '/leiloes' }}
              secundario={{ label: 'Como funciona', to: '/Licensing' }}
              escuro
              solido
            />
          </div>
        </div>

        {/* painel de lance subindo */}
        <div className="mx-auto mt-12 w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-left backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Lance atual</div>
          <motion.div
            key={valor}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-1 text-4xl font-semibold text-nz-verde-claro"
          >
            {money(valor)}
          </motion.div>
          <div className="mt-4 space-y-2">
            {['Ana C. deu um lance', 'Marcos deu um lance', 'Você pode ser o próximo'].map((l, i) => (
              <div key={l} className="flex items-center gap-2 text-[13px] text-white/55">
                <span className={`h-1.5 w-1.5 rounded-full ${i === 2 ? 'bg-nz-verde-claro' : 'bg-white/30'}`} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}