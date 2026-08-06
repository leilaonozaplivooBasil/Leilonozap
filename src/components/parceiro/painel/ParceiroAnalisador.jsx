import React from 'react';
import { BarChart3, Eye } from 'lucide-react';
import ParceiroLotesReais from './ParceiroLotesReais';
import ParceiroAnalisadorConsulta from './ParceiroAnalisadorConsulta';

// 📊 Tela "Analisador" do painel do Parceiro — MODO CONSULTA.
// Liberada somente após o Termo de Confidencialidade (gate no InvestorDashboard).
// Aqui o parceiro só lê: nada é gravado, nenhum lote é criado, nenhum produto é
// gerado no estoque.
export default function ParceiroAnalisador() {
  return (
    <div className="pb-4">
      <header className="border-b border-pc-borda pb-6">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
          <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} /> Analisador de lotes
        </p>
        <h1 className="mt-2 text-2xl font-bold text-pc-tinta sm:text-3xl">
          A conta que fazemos antes de dar um lance
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pc-tinta-fraca">
          Todo lote passa por esta leitura antes da compra: quantidade real, valor de mercado
          item por item, qualidade por grade e custo total com taxa e frete. É assim que
          sabemos, antes de pagar, se o lote vale ou não.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 border border-pc-borda px-3 py-2 text-[11px] text-pc-tinta-fraca">
          <Eye className="h-3.5 w-3.5 shrink-0 text-pc-ouro" strokeWidth={1.5} />
          Acesso em modo consulta — nada aqui altera o estoque ou a operação.
        </p>
      </header>

      <ParceiroLotesReais />
      <ParceiroAnalisadorConsulta />

      <p className="mt-12 border-t border-pc-borda pt-6 text-[11px] leading-relaxed text-pc-tinta-fraca">
        Os lotes apresentados são histórico real de compras já realizadas pela operação e servem
        exclusivamente para análise. Resultado passado não constitui promessa, garantia ou
        previsão de resultado futuro.
      </p>
    </div>
  );
}