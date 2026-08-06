import React from 'react';
import { Check } from 'lucide-react';
import SlotVideoOperacao from './SlotVideoOperacao';

// 🔹 UM NÓ DO ROADMAP ASCENDENTE.
// estado: 'concluida' | 'atual' | 'futura'. No mobile o conteúdo fica sempre à
// direita do trilho; no desktop alterna de lado em volta do trilho central.
export default function RoadmapNo({ etapa, estado, lado, data, video }) {
  const concluida = estado === 'concluida';
  const atual = estado === 'atual';
  const grande = !!etapa.destaque;

  const rotulo = concluida ? 'Concluído' : atual ? 'Em andamento' : 'A seguir';
  const ladoDireito = lado === 'dir';

  return (
    <li className="relative pb-9 last:pb-0 md:grid md:grid-cols-2 md:gap-10">
      {/* marcador cravado no trilho */}
      <span
        aria-hidden="true"
        className={`absolute left-1 top-0 z-10 flex items-center justify-center rounded-full border md:left-1/2 md:-translate-x-1/2 ${
          grande ? 'h-10 w-10' : 'h-8 w-8'
        } ${
          concluida
            ? 'border-pc-ouro bg-pc-ouro/20 text-pc-ouro'
            : atual
              ? 'nz-rm-pulso border-pc-ouro bg-pc-preto-2 text-pc-ouro'
              : 'border-pc-borda bg-pc-preto-2 text-pc-tinta-fraca'
        }`}
      >
        {concluida ? (
          <Check className={grande ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.6} />
        ) : (
          <span
            className={`rounded-full ${grande ? 'h-3 w-3' : 'h-2 w-2'} ${
              atual ? 'bg-pc-ouro' : 'bg-pc-borda'
            }`}
          />
        )}
      </span>

      <div
        className={`min-w-0 pl-14 md:pl-0 ${
          ladoDireito ? 'md:col-start-2 md:pl-8' : 'md:col-start-1 md:row-start-1 md:pr-8 md:text-right'
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 ${ladoDireito ? '' : 'md:justify-end'}`}
        >
          <span className="border border-pc-ouro/40 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-pc-ouro">
            D+{etapa.dia}
          </span>
          {data && <span className="font-mono text-[11px] text-pc-tinta-fraca">{data}</span>}
          <span className="text-[10px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
            {etapa.marco}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
              concluida || atual ? 'text-pc-ouro' : 'text-pc-tinta-fraca/70'
            }`}
          >
            {rotulo}
          </span>
        </div>

        <h3
          className={`mt-1.5 font-bold ${grande ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} ${
            grande || atual ? 'text-pc-ouro' : 'text-pc-tinta'
          }`}
        >
          {etapa.titulo}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-pc-tinta-fraca">{etapa.texto}</p>

        {video && (
          <div className={ladoDireito ? '' : 'md:text-left'}>
            <SlotVideoOperacao
              titulo={video.titulo}
              legenda={video.legenda}
              url={video.url}
              poster={video.poster}
            />
          </div>
        )}
      </div>
    </li>
  );
}