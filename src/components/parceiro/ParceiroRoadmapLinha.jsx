import React, { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Check, Circle, Dot } from 'lucide-react';

// 🗺️ Linha do tempo do Roadmap 2026 — trilho vertical que "cresce" conforme o
// visitante desce a página, com os marcos entrando pelas laterais (alternados).
// ⚠️ Só marcos operacionais: proibido valor em R$, projeção e "investimento".
const MARCOS = [
  {
    periodo: 'Ago/2024',
    estado: 'concluido',
    titulo: 'MVP validado',
    texto:
      'Mais de 600 produtos comercializados via WhatsApp, Facebook e OLX, com mais de 60% de giro rápido. Validação prática do modelo.',
  },
  {
    periodo: 'Nov/2025',
    estado: 'concluido',
    titulo: 'Primeira estrutura executiva',
    texto: 'Operação comercial organizada e primeiras vendas através da rede.',
  },
  {
    periodo: 'Jul/2026',
    estado: 'concluido',
    titulo: 'Praças físicas fechadas',
    texto:
      '1 distribuidor em Bangu, 3 lojas físicas em Bangu e 1 distribuidor no Recreio.',
  },
  {
    periodo: 'Ago/2026',
    estado: 'atual',
    titulo: 'Aplicativo 100% entregue',
    texto:
      'Plataforma concluída e em fase de pré-lançamento, com vendas estratégicas em curso para consolidar números antes da abertura oficial.',
  },
  {
    periodo: 'Dez/2026',
    estado: 'previsto',
    titulo: 'Lançamento oficial',
    texto:
      'Meta mínima do memorando: 300 licenciados ativos, 8 lojas físicas e distribuidor no Recreio em operação.',
  },
];

const SELO = {
  concluido: { rotulo: 'Concluído', Icone: Check },
  atual: { rotulo: 'Em curso', Icone: Circle },
  previsto: { rotulo: 'Previsto', Icone: Dot },
};

export default function ParceiroRoadmapLinha() {
  const trilhoRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: trilhoRef,
    offset: ['start 80%', 'end 55%'],
  });
  // spring deixa o traço fluido em vez de "pular" a cada pixel de scroll
  const avanco = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });

  return (
    <div className="mt-16 border-t border-pc-borda pt-10">
      <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
        Linha do tempo — execução até dezembro de 2026
      </p>

      <div ref={trilhoRef} className="relative mt-10">
        {/* Trilho: à esquerda no mobile, centralizado no desktop */}
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-pc-borda md:left-1/2 md:-translate-x-1/2" />
        <motion.div
          style={{ scaleY: avanco }}
          className="absolute left-[11px] top-0 bottom-0 w-px origin-top bg-pc-ouro md:left-1/2 md:-translate-x-1/2"
        />

        <ol className="relative space-y-8 md:space-y-12">
          {MARCOS.map((m, i) => {
            const { rotulo, Icone } = SELO[m.estado];
            const destaque = m.estado === 'atual';
            const esquerda = i % 2 === 0; // alterna o lado no desktop
            return (
              <li key={m.periodo} className="relative pl-10 md:grid md:grid-cols-2 md:gap-14 md:pl-0">
                {/* Nó do trilho */}
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`absolute left-[5px] top-6 z-10 h-3.5 w-3.5 rounded-full border-2 md:left-1/2 md:-translate-x-1/2 ${
                    m.estado === 'previsto'
                      ? 'border-pc-borda bg-pc-preto'
                      : 'border-pc-ouro bg-pc-ouro'
                  }`}
                  style={
                    destaque
                      ? { boxShadow: '0 0 0 5px rgba(201, 165, 92, 0.18)' }
                      : undefined
                  }
                />

                <motion.article
                  initial={{ opacity: 0, x: esquerda ? -48 : 48 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className={`border p-5 sm:p-6 ${
                    destaque
                      ? 'border-pc-ouro bg-pc-preto-2'
                      : 'border-pc-borda bg-pc-preto-2'
                  } ${esquerda ? 'md:col-start-1 md:text-right' : 'md:col-start-2'}`}
                  style={destaque ? { boxShadow: '0 18px 50px rgba(201, 165, 92, 0.10)' } : undefined}
                >
                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${
                      esquerda ? 'md:justify-end' : ''
                    }`}
                  >
                    <span className="text-xs font-bold tracking-[0.15em] text-pc-ouro">
                      {m.periodo}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                        m.estado === 'previsto'
                          ? 'border-pc-borda text-pc-tinta-fraca'
                          : 'border-pc-ouro text-pc-ouro'
                      }`}
                    >
                      <Icone className="h-3 w-3" strokeWidth={2.5} />
                      {rotulo}
                    </span>
                  </div>
                  <h4 className="mt-3 text-base font-bold text-pc-tinta sm:text-lg">{m.titulo}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
                    {m.texto}
                  </p>
                </motion.article>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}