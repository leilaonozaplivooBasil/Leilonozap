import React from 'react';

// Cartão em forma de documento/passaporte. Paleta clean: grafite + 1 acento verde.
//
// 🔴 TEXTO REESCRITO EM 15/09/2026 (dono: "texto antigo tem que tirar"). Dizia
// "Crédito na carteira R$ 110 — os 10% de bônus entram na hora": era a regra de
// 01 a 19/08. Desde 19/08 o cliente deposita R$ 100 de saldo de lance e ganha um
// CUPOM de R$ 10, bloqueado, que libera pra Loja Virtual conforme perde leilões.
// Prometer R$ 110 no saldo gerava reclamação (caso Alexandre, 15/09).
export default function CartaoPassaporte({ titular, valorPago = 100, cupom = 10, ativo = false }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/12 bg-[#121714] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
          Passaporte · Leilão NoZap
        </p>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full border border-emerald-400/40 text-emerald-300">
          {ativo ? 'Ativo' : 'Sem validade'}
        </span>
      </div>

      <div className="px-5 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Saldo de lance</p>
        <p className="mt-1 text-white font-semibold tabular-nums" style={{ fontSize: 'clamp(2rem,9vw,2.8rem)', lineHeight: 1 }}>
          R$ {valorPago.toLocaleString('pt-BR')}
        </p>
        <p className="mt-1.5 text-sm text-white/60">
          + cupom de <span className="text-emerald-300 font-medium">R$ {cupom.toLocaleString('pt-BR')}</span> pra Loja Virtual — libera conforme os leilões que você disputar terminarem sem vitória.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">Titular</p>
            <p className="text-xs font-medium text-white/90 uppercase tracking-[0.1em] truncate">
              {(titular || 'Cliente NoZap').slice(0, 24)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">Natureza</p>
            <p className="text-xs font-medium text-white/90">Crédito de consumo</p>
          </div>
        </div>
      </div>
    </div>
  );
}