import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

// 👁️ Alternador de HOMOLOGAÇÃO — só aparece para contas validadoras.
//
// Desligado: o validador vê tudo liberado (como sempre).
// Ligado: o painel se comporta como para um parceiro novo, sem nada assinado —
// é assim que se testa o bloqueio real das telas.
//
// ⚠️ 100% visual. Não grava nada, não altera cadastro, não cria nem apaga
// assinatura. Ao recarregar a página volta ao normal.
export default function ParceiroModoVisita({ ativo, onAlternar }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border border-pc-borda bg-pc-preto-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-pc-ouro">
          Modo homologação
        </p>
        <p className="mt-1 text-xs leading-relaxed text-pc-tinta-fraca">
          {ativo
            ? 'Você está vendo o painel como um parceiro novo, sem nada assinado.'
            : 'Sua conta é validadora: todas as telas aparecem liberadas.'}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onAlternar(!ativo)}
        className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 border px-4 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
          ativo
            ? 'border-pc-ouro bg-pc-ouro text-pc-preto'
            : 'border-pc-borda text-pc-tinta-fraca hover:border-pc-ouro hover:text-pc-ouro'
        }`}
      >
        {ativo ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
        {ativo ? 'Voltar ao acesso total' : 'Ver como parceiro novo'}
      </button>
    </div>
  );
}