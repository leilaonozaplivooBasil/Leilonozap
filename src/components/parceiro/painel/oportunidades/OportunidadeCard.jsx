import React from 'react';
import { Package, ChevronRight, Clock, Truck, Gavel } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';
import useContagemLeilao from './useContagemLeilao';

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
      className="block w-full border border-pc-borda bg-pc-preto-2 p-4 text-left transition-colors hover:border-pc-ouro/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-pc-tinta sm:text-base">{o.nome}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-pc-tinta-fraca">
              {o.origem}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${selo.cor}`}>
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

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-pc-tinta-fraca">Lance de entrada</dt>
          <dd className="flex items-center gap-1 text-sm font-bold text-pc-tinta">
            <Gavel className="h-3.5 w-3.5 text-pc-ouro" /> {real(o.lanceEntrada)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-pc-tinta-fraca">Frete</dt>
          <dd className="flex items-center gap-1 text-sm font-bold text-pc-tinta">
            <Truck className="h-3.5 w-3.5 text-pc-ouro" /> {real(o.freteOportunidade)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-pc-tinta-fraca">Itens</dt>
          <dd className="text-sm font-bold text-pc-tinta">{o.quantidade || 0}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-pc-tinta-fraca">Valor de mercado</dt>
          <dd className="text-sm font-bold text-pc-tinta">{real(o.valorMercado)}</dd>
        </div>
      </dl>

      {o.economiaPct != null && (
        <p className="mt-3 border-t border-pc-borda pt-3 text-xs font-bold text-emerald-400">
          Economia de {o.economiaPct.toFixed(1).replace('.', ',')}% sobre o valor de mercado
        </p>
      )}

      {o.observacaoParceiro && (
        <p className="mt-2 text-[11px] leading-relaxed text-pc-tinta-fraca">{o.observacaoParceiro}</p>
      )}
    </button>
  );
}