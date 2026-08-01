// PONTO 74 — linha de frete do carrinho: calcula, LISTA e deixa o cliente ESCOLHER
// uma transportadora. O valor escolhido entra no total; o servidor recota na hora de pagar.
import React from 'react';
import { money } from '@/lib/format';
import { Truck, Check, Loader2 } from 'lucide-react';

export default function FreteResumo({ opcoes, selecionada, onSelecionar, onCalcular, calculando, mensagem, retirada }) {
  if (retirada) {
    return (
      <div className="flex justify-between items-center text-base">
        <span className="text-gray-400">Valor do frete</span>
        <span className="text-green-400 font-medium">Grátis (retirada na loja)</span>
      </div>
    );
  }

  const temOpcoes = Array.isArray(opcoes) && opcoes.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-base gap-3">
        <span className="text-gray-400">Valor do frete</span>
        {selecionada ? (
          <span className="text-green-400 font-medium text-right">{money(selecionada.preco)}</span>
        ) : (
          <button
            onClick={onCalcular}
            disabled={calculando}
            className="text-green-400 font-medium text-sm underline hover:text-green-300 disabled:opacity-60 min-h-[44px] px-1"
          >
            {calculando ? (<span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> calculando…</span>) : 'Calcular frete'}
          </button>
        )}
      </div>

      {selecionada && (
        <p className="text-xs text-gray-400 -mt-1">
          {[selecionada.empresa, selecionada.nome].filter(Boolean).join(' ')}
          {selecionada.prazo ? ` · chega em até ${selecionada.prazo} ${selecionada.prazo === 1 ? 'dia útil' : 'dias úteis'}` : ''}
        </p>
      )}

      {mensagem && <p className="text-yellow-400/90 text-xs">{mensagem}</p>}

      {temOpcoes && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            {selecionada ? 'Trocar transportadora' : 'Escolha a transportadora'}
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {opcoes.map((o) => {
              const ativa = selecionada && String(selecionada.id) === String(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onSelecionar(o)}
                  className={`w-full flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left transition-colors min-h-[44px] ${ativa ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30 hover:border-green-500/50'}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 grid place-items-center shrink-0 ${ativa ? 'border-green-500 bg-green-500' : 'border-gray-500'}`}>
                    {ativa && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-white truncate">
                      {[o.empresa, o.nome].filter(Boolean).join(' ')}
                    </span>
                    {o.prazo ? (
                      <span className="block text-[10px] text-gray-400">até {o.prazo} {o.prazo === 1 ? 'dia útil' : 'dias úteis'}</span>
                    ) : null}
                  </span>
                  <span className="text-green-400 font-bold text-sm shrink-0">{money(o.preco)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!temOpcoes && !selecionada && !calculando && !mensagem && (
        <p className="text-gray-500 text-xs flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Calcule o frete para ver o total do pedido.
        </p>
      )}
    </div>
  );
}