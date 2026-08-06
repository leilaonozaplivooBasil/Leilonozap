import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { lerPlanilhaMercadoLivre } from '@/lib/parseLotePlanilha';
import { loteDaPlanilha } from '@/lib/loteParceiro';
import { LOTES_ARREMATADOS, carregarLoteArrematado } from '@/lib/lotesArrematadosParceiro';
import ParceiroLoteDetalheModal from './ParceiroLoteDetalheModal';

// 📦 Lotes reais que a operação já arrematou. Tocar em um lote abre o analisador
// completo (KPIs, custos, cenários, grades e item por item). Somente leitura.
export default function ParceiroLotesReais() {
  const [loteAberto, setLoteAberto] = useState(null);
  const [carregando, setCarregando] = useState(null);
  const [erro, setErro] = useState('');

  const abrir = async (item) => {
    setCarregando(item.url);
    setErro('');
    try {
      setLoteAberto(await carregarLoteArrematado(XLSX, lerPlanilhaMercadoLivre, loteDaPlanilha, item));
    } catch (e) {
      setErro(e?.message || 'Não foi possível abrir este lote.');
    } finally {
      setCarregando(null);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-pc-tinta sm:text-xl">Lotes que já arrematamos</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        Toque em um lote para ver o analisador completo: custo, grades, cenários de venda e
        item por item.
      </p>

      <div className="mt-6 space-y-3">
        {LOTES_ARREMATADOS.map((item) => (
          <button
            key={item.url}
            type="button"
            onClick={() => abrir(item)}
            disabled={!!carregando}
            className="flex min-h-[56px] w-full items-center gap-3 border border-pc-borda bg-pc-preto-2 p-4 text-left transition-colors hover:border-pc-ouro disabled:opacity-60"
          >
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-pc-ouro" strokeWidth={1.5} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-pc-tinta">{item.nome}</span>
              <span className="mt-0.5 block text-[11px] uppercase tracking-[0.12em] text-pc-tinta-fraca">
                Mercado Livre · Arrematado em {item.dataArremate}
              </span>
            </span>
            {carregando === item.url ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-pc-ouro" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
            )}
          </button>
        ))}
      </div>

      {erro && (
        <p className="mt-4 flex items-start gap-2 border border-pc-borda bg-pc-preto-2 p-3 text-sm text-pc-tinta">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
          {erro}
        </p>
      )}

      <ParceiroLoteDetalheModal lote={loteAberto} onFechar={() => setLoteAberto(null)} />
    </section>
  );
}