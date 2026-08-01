// CalculadoraFrete — CEP + opções de entrega em cartões selecionáveis.
// Mobile-first: 1 coluna, alvos de toque ≥44px, não quebra em 320px.
import React from 'react';
import { Truck, Loader2, AlertCircle, Search } from 'lucide-react';
import useFrete from './useFrete';
import OpcaoFreteCard from './OpcaoFreteCard';

export default function CalculadoraFrete({
  items = [],
  autoCalcular = false,
  onSelecionar,
  titulo = 'Calcular frete e prazo',
  className = '',
}) {
  const frete = useFrete({ items, autoCalcular });

  const escolher = (op) => {
    frete.setSelecionada(op);
    if (onSelecionar) onSelecionar(op);
  };

  // avisa o pai sempre que a cotação traz uma nova opção padrão (a mais barata)
  React.useEffect(() => {
    if (frete.selecionada && onSelecionar) onSelecionar(frete.selecionada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frete.selecionada?.id]);

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
        <h3 className="text-sm sm:text-base font-semibold text-white">{titulo}</h3>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); frete.calcular(); }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={frete.cep}
          onChange={(e) => frete.setCep(e.target.value)}
          maxLength={9}
          className="min-h-[44px] flex-1 min-w-0 rounded-xl bg-black/40 border border-white/15 px-4 text-white placeholder:text-gray-500 tracking-wider focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={frete.carregando}
          className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {frete.carregando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando</>
            : <><Search className="w-4 h-4" /> Calcular</>}
        </button>
      </form>

      {frete.erro && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs sm:text-sm text-amber-200">{frete.erro}</p>
        </div>
      )}

      {frete.opcoes.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-400">
            {frete.opcoes.length} opções · a mais barata primeiro
          </p>
          {frete.opcoes.map((op) => (
            <OpcaoFreteCard
              key={op.id}
              opcao={op}
              selecionada={frete.selecionada?.id === op.id}
              onSelecionar={() => escolher(op)}
            />
          ))}
        </div>
      )}
    </div>
  );
}