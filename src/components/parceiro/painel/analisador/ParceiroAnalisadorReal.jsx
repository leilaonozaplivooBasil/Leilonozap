import React, { useMemo } from 'react';
import { derivarGrades } from '@/lib/loteParceiro';
import ParceiroKpis from './ParceiroKpis';
import ParceiroCenarios from './ParceiroCenarios';
import ParceiroRoscaQualidade from './ParceiroRoscaQualidade';
import ParceiroItensLote from './ParceiroItensLote';
import ParceiroDistribuicaoDepartamental from './ParceiroDistribuicaoDepartamental';

// 🔬 Analisador REAL do Parceiro — mesma leitura e mesmas cores do analisador
// interno da operação, em modo consulta. Não grava nada, não gera produto,
// não tem nenhuma ligação com o estoque.
export default function ParceiroAnalisadorReal({ lote }) {
  const grades = useMemo(() => {
    const g = lote?.grades;
    const temQtd = g && Object.values(g).some((v) => (v?.qtd || 0) > 0);
    return temQtd ? g : derivarGrades(lote?.itens);
  }, [lote]);

  if (!lote) return null;

  return (
    <div className="space-y-5 rounded-2xl border border-gray-700/70 bg-[#0d1117] p-3 sm:p-5">
      <ParceiroKpis
        quantidade={lote.quantidade}
        valorMercado={lote.valorMercado}
        custoTotal={lote.custoTotal}
      />
      <ParceiroCenarios lote={lote} grades={grades} />
      <ParceiroRoscaQualidade grades={grades} />
      <ParceiroDistribuicaoDepartamental
        categorias={lote.categorias}
        itensPorCategoria={lote.itensPorCategoria}
      />
      <ParceiroItensLote itens={lote.itens} />
    </div>
  );
}