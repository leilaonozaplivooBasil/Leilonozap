import React from 'react';
import { real, PREMISSAS, POR_LOTE } from '@/lib/operacaoNumeros';

// 📑 DEMONSTRATIVO DO CICLO — decomposição do resultado do lote comprado com o
// aporte, na MESMA metodologia oficial da operação (src/lib/operacaoNumeros.js):
// compra a ~25% do valor de mercado, venda a 20% abaixo do mercado, comissão de
// rede 30%, despesa operacional 20%, parceiros de compra 5% e imposto vigente.
// Nada é inventado aqui: são os percentuais oficiais aplicados ao seu aporte.
export default function ContasDemonstrativo({ aporte, taxaMensalPct = 3 }) {
  const capital = Number(aporte) || 0;
  const receita = capital * (POR_LOTE.receita / POR_LOTE.aquisicao); // 3,2× o capital
  const comissaoRede = receita * (PREMISSAS.pctComissaoRede / 100);
  const despesaOperacional = receita * (PREMISSAS.pctDespesaOperacional / 100);
  const parceirosCompra = receita * (PREMISSAS.pctParceirosCompra / 100);
  const imposto = receita * (PREMISSAS.aliquotaSimples / 100);
  const resultado = receita - capital - comissaoRede - despesaOperacional - parceirosCompra - imposto;
  const suaParte = capital * (taxaMensalPct / 100);

  const linhas = [
    { r: 'Receita bruta do lote (venda a 20% abaixo do mercado)', v: receita, tipo: 'entrada' },
    { r: 'Custo de aquisição do lote (seu capital aplicado)', v: -capital },
    { r: `Comissão da rede de vendas (${PREMISSAS.pctComissaoRede}%)`, v: -comissaoRede },
    { r: `Despesa operacional (${PREMISSAS.pctDespesaOperacional}%)`, v: -despesaOperacional },
    { r: `Remuneração dos parceiros de compra (${PREMISSAS.pctParceirosCompra}%)`, v: -parceirosCompra },
    { r: `Imposto — Simples Nacional ${String(PREMISSAS.aliquotaSimples).replace('.', ',')}%`, v: -imposto },
  ];

  return (
    <div className="border border-pc-borda bg-pc-preto-2">
      <div className="border-b border-pc-borda px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          Demonstrativo do ciclo — como o resultado se forma
        </p>
        <p className="mt-1 text-[11px] text-pc-tinta-fraca">
          Percentuais oficiais da operação aplicados ao aporte de {real(capital)}.
        </p>
      </div>

      <dl className="divide-y divide-pc-borda">
        {linhas.map((l) => (
          <div key={l.r} className="flex items-start justify-between gap-3 px-5 py-3">
            <dt className="min-w-0 text-xs leading-relaxed text-pc-tinta-fraca">{l.r}</dt>
            <dd
              className={`shrink-0 text-sm font-bold ${
                l.tipo === 'entrada' ? 'text-emerald-400' : 'text-pc-tinta'
              }`}
            >
              {l.v < 0 ? `− ${real(Math.abs(l.v))}` : real(l.v)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 bg-pc-preto px-5 py-4">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-pc-tinta">
            Resultado do ciclo
          </dt>
          <dd className="text-base font-black text-emerald-400">{real(resultado)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-pc-ouro/40 px-5 py-4">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-pc-ouro">
            Sua parte no ciclo ({String(taxaMensalPct).replace('.', ',')}% do aporte)
          </dt>
          <dd className="text-base font-black text-pc-ouro">{real(suaParte)}</dd>
        </div>
      </dl>

      <p className="border-t border-pc-borda px-5 py-4 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Demonstrativo metodológico. O valor efetivamente repassado é o APURADO do lote do seu ciclo, com
        nota, comprovante e extrato de vendas anexados no fechamento — pode ficar acima ou abaixo desta
        referência. Não é promessa de repasse.
      </p>
    </div>
  );
}