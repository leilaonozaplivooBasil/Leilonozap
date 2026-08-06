import React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import useRentabilidadeAcumulada from './useRentabilidadeAcumulada';

const centavos = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

// 📈 Contador ao vivo da rentabilidade apurada do aporte (do 31º ao 60º dia).
export default function ContadorRentabilidade({ dataAssinatura, aporte, taxaMensalPct = 3 }) {
  const r = useRentabilidadeAcumulada(dataAssinatura, aporte, taxaMensalPct);

  return (
    <div className="border border-pc-ouro/50 bg-pc-preto-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <TrendingUp className="h-4 w-4" strokeWidth={1.8} /> Repasse apurado do ciclo
        </p>
        <span className="border border-pc-borda px-2 py-0.5 text-[10px] uppercase tracking-wide text-pc-tinta-fraca">
          Dia {r.diaAtual} do ciclo
        </span>
      </div>

      {r.iniciou ? (
        <>
          <p className="mt-4 break-words font-mono text-3xl font-black tracking-tight text-pc-tinta sm:text-4xl">
            {centavos(r.acumulado)}
          </p>
          <p className="mt-1 text-xs text-pc-tinta-fraca">
            {r.diasApurados.toFixed(2).replace('.', ',')} de 30 dias apurados · meta do ciclo{' '}
            {centavos(r.alvo)}
          </p>
          <div className="mt-4 h-1.5 w-full bg-pc-borda">
            <div className="h-full bg-pc-ouro transition-all" style={{ width: `${r.progressoPct}%` }} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-pc-tinta-fraca">
            <Clock className="h-3.5 w-3.5 text-pc-ouro" />
            {r.diasParaRepasse > 0
              ? `Faltam ${r.diasParaRepasse} dias para o primeiro repasse (60º dia).`
              : 'Ciclo fechado — repasse e demonstrativo disponíveis em Prestação de Contas.'}
          </p>
        </>
      ) : (
        <>
          <p className="mt-4 font-mono text-3xl font-black tracking-tight text-pc-tinta-fraca sm:text-4xl">
            {centavos(0)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca">
            A apuração começa no 31º dia do ciclo — faltam <strong className="text-pc-ouro">{r.diasParaApurar} dias</strong>.
            Até lá o capital está trabalhando na compra, na curadoria e na entrada dos produtos na Loja Virtual.
          </p>
        </>
      )}

      <p className="mt-4 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Valor de acompanhamento, apurado sobre o resultado real da operação e sujeito ao fechamento do
        ciclo. Não constitui promessa de repasse nem garantia de resultado futuro.
      </p>
    </div>
  );
}