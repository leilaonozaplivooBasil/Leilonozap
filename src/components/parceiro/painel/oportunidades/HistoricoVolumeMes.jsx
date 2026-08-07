import React from 'react';
import { BarChart3 } from 'lucide-react';
import { resumirLastro, brl, vezes, inteiro } from '@/lib/lastroOperacao';
import LucroAcumuladoMes from './LucroAcumuladoMes';

const MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

// 📅 HISTÓRICO DE VOLUME DA OPERAÇÃO NO MÊS — prova de capacidade de alocação
// acumulada: cada lote publicado soma no volume do mês. Componente PURO.
export default function HistoricoVolumeMes({ lotesDoMes = [] }) {
  if (!lotesDoMes.length) return null;
  const r = resumirLastro(lotesDoMes);

  const linhas = [
    { rotulo: 'Lotes no mês', valor: inteiro(r.lotes) },
    { rotulo: 'Capital movimentado', valor: brl(r.capital) },
    { rotulo: 'Itens processados', valor: inteiro(r.itens) },
    { rotulo: 'Repasse potencial aos parceiros', valor: brl(r.repasse) },
  ];

  return (
    <div className="mt-4 border border-pc-borda bg-pc-preto-2 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro sm:text-[11px]">
        <BarChart3 className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        Volume da operação · {MES.format(new Date())}
      </p>

      <p className="mt-2 break-words text-2xl font-black leading-none text-pc-tinta sm:text-3xl">
        {brl(r.lastro)}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
        em valor de mercado já colocado na mesa neste mês — a {vezes(r.multiploLastro)} do capital
        empregado. Cada novo lote soma neste histórico.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 border-t border-pc-borda pt-4 sm:grid-cols-2 xl:grid-cols-4">
        {linhas.map((l) => (
          <div key={l.rotulo}>
            <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
              {l.rotulo}
            </p>
            <p className="mt-0.5 break-words text-base font-bold text-pc-tinta sm:text-lg">
              {l.valor}
            </p>
          </div>
        ))}
      </div>

      {/* 📈 quanto isso vira de lucro e ROI se arrematarmos tudo */}
      <LucroAcumuladoMes resumo={r} />

      <p className="mt-4 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Acumulado dos lotes publicados no mês. Valores de referência/projeção — não constituem
        promessa de rentabilidade.
      </p>
    </div>
  );
}