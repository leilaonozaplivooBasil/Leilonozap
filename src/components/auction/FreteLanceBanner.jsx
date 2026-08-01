import React from "react";
import { Loader2, Truck } from "lucide-react";
import { fmtBR } from "@/lib/money";

// Banner acima do input de lance: mostra o frete já calculado (uma vez, fixo
// durante toda a disputa) ou pede o CEP quando o perfil não tem um salvo.
export default function FreteLanceBanner({ status, freteValor, cep, onChangeCep, onCalcular }) {
  if (status === "ok" && freteValor > 0) {
    return (
      <div className="flex items-center gap-2 px-4 pt-3 text-xs text-gray-300">
        <Truck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        <span>Frete para seu CEP: <span className="font-bold text-green-400">R$ {fmtBR(freteValor)}</span> — já incluso no valor descontado da carteira</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 pt-3 text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        Calculando frete...
      </div>
    );
  }

  if (status === "needs_cep") {
    return (
      <div className="flex items-center gap-2 px-4 pt-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Seu CEP (só números)"
          value={cep}
          onChange={(e) => onChangeCep(e.target.value)}
          maxLength={9}
          className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm min-h-[40px]"
        />
        <button
          type="button"
          onClick={() => onCalcular(cep)}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-3 py-2 min-h-[40px] flex-shrink-0"
        >
          Calcular frete
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-4 pt-3 space-y-2">
        <p className="text-xs text-amber-400">Não conseguimos calcular o frete para esse CEP — confira e tente outro.</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Seu CEP (só números)"
            value={cep}
            onChange={(e) => onChangeCep(e.target.value)}
            maxLength={9}
            className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm min-h-[40px]"
          />
          <button
            type="button"
            onClick={() => onCalcular(cep)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-3 py-2 min-h-[40px] flex-shrink-0"
          >
            Calcular frete
          </button>
        </div>
      </div>
    );
  }

  return null;
}