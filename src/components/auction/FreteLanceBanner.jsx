import React from "react";
import { Loader2, Truck, MapPin, Search } from "lucide-react";
import { fmtBR } from "@/lib/money";

/**
 * PONTO 82 — CEP em UMA linha: input + botão + resultado.
 * Sem tabelas, sem texto longo, sem amarelo. Nenhum cálculo aqui — só UI:
 * quem cota o frete continua sendo o cotarFrete chamado pela sala.
 */
export default function FreteLanceBanner({ status, freteValor, cep, onChangeCep, onCalcular }) {
  if (status === "ok" && freteValor > 0) {
    return (
      <div className="mx-auto mt-3 flex max-w-lg items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <Truck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1 truncate text-xs text-emerald-100">Frete para seu CEP</span>
        <span className="shrink-0 text-sm font-bold text-emerald-300 tabular-nums">R$ {fmtBR(freteValor)}</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-auto mt-3 flex max-w-lg items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" />
        <span className="text-xs text-gray-300">Calculando frete…</span>
      </div>
    );
  }

  if (status === "needs_cep" || status === "error") {
    const falhou = status === "error";
    return (
      <div className="mx-auto mt-3 max-w-lg">
        {/* PONTO 83 — parado é NEUTRO (vermelho antes do erro faz o usuário achar
            que travou e desistir); foco vira verde da marca; erro real é ÂMBAR. */}
        <style>{`
          .nz-cep-form:focus-within { border-color: #1B7A48 !important; box-shadow: 0 0 0 3px rgba(27,122,72,0.18); }
        `}</style>
        <form
          onSubmit={(e) => { e.preventDefault(); onCalcular(cep); }}
          className="nz-cep-form flex items-center gap-2 rounded-xl p-1.5 transition-colors"
          style={{
            background: falhou ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${falhou ? 'rgba(245,158,11,0.40)' : 'rgba(255,255,255,0.10)'}`,
          }}
        >
          <MapPin className={`ml-1.5 h-4 w-4 shrink-0 ${falhou ? 'text-amber-400' : 'text-emerald-400'}`} />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => onChangeCep(e.target.value)}
            maxLength={9}
            className="min-h-[40px] min-w-0 flex-1 bg-transparent text-sm tracking-wider text-white placeholder:text-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Search className="h-3.5 w-3.5" />
            Calcular frete
          </button>
        </form>
        {falhou && (
          <p className="mt-1 px-2 text-[11px] text-amber-400">CEP não encontrado — confira e tente outro.</p>
        )}
      </div>
    );
  }

  return null;
}