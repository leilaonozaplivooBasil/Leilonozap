import React from 'react';
import { Clock, Gavel, Truck } from 'lucide-react';
import ParceiroDocumentoModal from '../ParceiroDocumentoModal';
import ParceiroAnalisadorReal from '../analisador/ParceiroAnalisadorReal';
import { real } from '@/lib/operacaoNumeros';
import useContagemLeilao from './useContagemLeilao';

// 🔎 Oportunidade aberta — analisador completo (somente leitura) + Participar agora.
export default function OportunidadeDetalheModal({ oportunidade, onFechar, onParticipar }) {
  const o = oportunidade;
  const { texto, encerrado } = useContagemLeilao(o?.dataLeilao);
  if (!o) return null;

  const quando = o.dataLeilao
    ? new Date(o.dataLeilao).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <ParceiroDocumentoModal aberto titulo={o.nome} subtitulo="Oportunidade do dia" onFechar={onFechar}>
      <div className="space-y-7">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-pc-ouro/40 bg-pc-preto-2 p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-pc-ouro">
              <Clock className="h-3.5 w-3.5" /> Leilão
            </p>
            <p className="mt-1 text-sm font-bold text-pc-tinta">{quando}</p>
            <p className="text-[11px] text-pc-tinta-fraca">{texto}</p>
          </div>
          <div className="border border-pc-borda bg-pc-preto-2 p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-pc-ouro">
              <Gavel className="h-3.5 w-3.5" /> Lance de entrada
            </p>
            <p className="mt-1 text-sm font-bold text-pc-tinta">{real(o.lanceEntrada)}</p>
          </div>
          <div className="border border-pc-borda bg-pc-preto-2 p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-pc-ouro">
              <Truck className="h-3.5 w-3.5" /> Frete
            </p>
            <p className="mt-1 text-sm font-bold text-pc-tinta">{real(o.freteOportunidade)}</p>
          </div>
        </div>

        {o.observacaoParceiro && (
          <p className="border border-pc-borda bg-pc-preto-2 p-3 text-sm leading-relaxed text-pc-tinta-fraca">
            {o.observacaoParceiro}
          </p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-pc-ouro">
            Analisador completo do lote
          </h3>
          <ParceiroAnalisadorReal lote={o} />
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-pc-borda bg-pc-preto px-4 py-4 sm:-mx-8 sm:px-8">
          <button
            type="button"
            onClick={() => onParticipar(o)}
            className="min-h-[48px] w-full border border-pc-ouro bg-pc-ouro/10 text-sm font-bold uppercase tracking-[0.12em] text-pc-ouro transition-colors hover:bg-pc-ouro/20"
          >
            {encerrado ? 'Leilão encerrado — falar com a operação' : 'Participar agora'}
          </button>
          <p className="mt-2 text-center text-[11px] text-pc-tinta-fraca">
            Para entrar nesta oportunidade é necessário um plano de parceria ativo.
          </p>
        </div>

        <p className="border-t border-pc-borda pt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
          Valores apresentados para análise. Resultado passado não constitui promessa nem garantia
          de resultado futuro.
        </p>
      </div>
    </ParceiroDocumentoModal>
  );
}