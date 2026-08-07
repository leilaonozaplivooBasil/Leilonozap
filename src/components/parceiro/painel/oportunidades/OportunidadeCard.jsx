import React from 'react';
import { Package, ChevronRight, Clock, Truck, Gavel } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';
import useContagemLeilao from './useContagemLeilao';
import MarcaMarketplace from './MarcaMarketplace';

// 🌟 Cartão de uma oportunidade do dia — clicável, somente leitura.
export default function OportunidadeCard({ oportunidade, onAbrir }) {
  const o = oportunidade;
  const { texto, encerrado, hoje } = useContagemLeilao(o.dataLeilao);

  const quando = o.dataLeilao
    ? new Date(o.dataLeilao).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const selo = encerrado
    ? { texto: 'Encerrado', cor: 'border-pc-borda text-pc-tinta-fraca' }
    : hoje
      ? { texto: 'Abre hoje', cor: 'border-emerald-500/50 text-emerald-400' }
      : { texto: 'Em breve', cor: 'border-pc-ouro/50 text-pc-ouro' };

  return (
    <button
      type="button"
      onClick={() => onAbrir(o)}
      className="block w-full rounded-lg border border-pc-borda bg-pc-preto-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-pc-ouro/60 hover:shadow-lg hover:shadow-black/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug text-pc-tinta sm:text-base">{o.nome}</p>
            <span className="mt-1.5 inline-flex">
              <MarcaMarketplace origem={o.origem} />
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${selo.cor}`}>
            {selo.texto}
          </span>
          <ChevronRight className="h-4 w-4 text-pc-tinta-fraca" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-pc-tinta-fraca">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-pc-ouro" /> Leilão {quando} · {texto}
        </span>
        {o.vagas > 0 && <span>{o.vagas} vagas</span>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { r: 'Lance de entrada', v: real(o.lanceEntrada), Icone: Gavel },
          { r: 'Frete', v: real(o.freteOportunidade), Icone: Truck },
          { r: 'Itens', v: String(o.quantidade || 0) },
          { r: 'Valor de mercado', v: real(o.valorMercado) },
        ].map(({ r, v, Icone }) => (
          <div key={r} className="rounded-md border border-pc-borda bg-pc-preto p-2.5">
            <dt className="text-[9px] uppercase leading-snug tracking-[0.12em] text-pc-tinta-fraca">
              {r}
            </dt>
            <dd className="mt-1 flex items-center gap-1 break-words text-sm font-bold text-pc-tinta">
              {Icone && <Icone className="h-3.5 w-3.5 shrink-0 text-pc-ouro" />} {v}
            </dd>
          </div>
        ))}
      </dl>

      {o.economiaPct != null && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
          ↓ Economia de {o.economiaPct.toFixed(1).replace('.', ',')}% sobre o valor de mercado
        </p>
      )}

      {o.observacaoParceiro && (
        <p className="mt-2 text-[11px] leading-relaxed text-pc-tinta-fraca">{o.observacaoParceiro}</p>
      )}
    </button>
  );
}