import React, { useState, useMemo } from "react";
import { Gavel, X, Zap } from "lucide-react";
import { addMoney, mulMoney, fmtBR, money } from "@/lib/money";

/**
 * PONTO 82 — Menu flutuante de lance.
 * Substitui os botões fixos: um único "Dar Lance" abre a folha com as opções
 * derivadas MATEMATICAMENTE do incremento vindo do banco + campo livre.
 * Não valida nem calcula nada além de somar o incremento — quem valida e
 * envia continua sendo o BidInput/useBidSubmission (motor intacto).
 */
export default function BidPopover({
  minBid,
  increment,
  freteValor = 0,
  isLoading = false,
  onEscolher,
}) {
  const [aberto, setAberto] = useState(false);
  const [valorLivre, setValorLivre] = useState("");

  // opções: mínimo permitido + 1x, 2x, 3x o incremento configurado pelo admin
  const opcoes = useMemo(
    () => [0, 1, 2, 3].map((n) => (n === 0 ? money(minBid) : addMoney(minBid, mulMoney(increment, n)))),
    [minBid, increment]
  );

  const escolher = (valor) => {
    setAberto(false);
    setValorLivre("");
    onEscolher(valor);
  };

  const confirmarLivre = () => {
    const v = parseFloat(String(valorLivre).replace(',', '.'));
    if (!v || isNaN(v)) return;
    escolher(money(v));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={isLoading}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl font-bold text-white transition-transform active:scale-[0.99] disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #059669, #047857)',
          boxShadow: '0 6px 22px rgba(16,185,129,0.35)',
        }}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Gavel className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap text-base">Dar Lance</span>
            <span className="hidden whitespace-nowrap text-xs font-medium text-emerald-100/80 sm:inline">
              a partir de R$ {fmtBR(minBid)}
            </span>
          </>
        )}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border p-4 sm:rounded-3xl"
            style={{ background: '#111a11', borderColor: 'rgba(16,185,129,0.25)', boxShadow: '0 -10px 40px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Escolha seu lance</p>
                <p className="text-[11px] text-emerald-300/70">
                  Incremento do leilão: + R$ {fmtBR(increment)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="grid h-9 w-9 place-items-center rounded-full text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {opcoes.map((valor, i) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => escolher(valor)}
                  disabled={isLoading}
                  className="flex min-h-[56px] flex-col items-start justify-center rounded-2xl px-3 py-2 text-left transition-colors disabled:opacity-60"
                  style={{
                    background: i === 0 ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  }}
                >
                  <span className="flex items-center gap-1 text-[15px] font-bold text-white tabular-nums">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" />
                    R$ {fmtBR(valor)}
                  </span>
                  <span className="text-[10px] leading-tight text-gray-400">
                    {i === 0 ? 'lance mínimo' : `+ R$ ${fmtBR(mulMoney(increment, i))} sobre o mínimo`}
                    {freteValor > 0 && ` · com frete R$ ${fmtBR(addMoney(valor, freteValor))}`}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={valorLivre}
                onChange={(e) => setValorLivre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarLivre(); } }}
                placeholder={`Digitar valor (mín. R$ ${fmtBR(minBid)})`}
                min={minBid}
                className="min-h-[48px] flex-1 min-w-0 rounded-2xl border border-white/12 bg-black/40 px-4 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={confirmarLivre}
                disabled={isLoading || !valorLivre}
                className="min-h-[48px] shrink-0 rounded-2xl px-4 font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}