import React from 'react';
import { real } from '@/lib/operacaoNumeros';

// 📊 Distribuição de grades (A a U) em barras — leitura, sem gráfico pesado,
// pra funcionar liso em celular fraco. Padrão preto/dourado do painel.
const ROTULOS = {
  A: 'Novo / intacto',
  B: 'Vitrine',
  C: 'Útil',
  D: 'Escoável',
  E: 'Avariado',
  U: 'Não classificado',
};

export default function ParceiroGradeBarras({ grades, quantidadeTotal }) {
  if (!grades) return null;
  const linhas = Object.entries(grades).filter(([, v]) => (v?.qtd || 0) > 0);
  if (!linhas.length) return null;
  const total = quantidadeTotal || linhas.reduce((s, [, v]) => s + v.qtd, 0);

  return (
    <div className="space-y-3">
      {linhas.map(([grade, v]) => {
        const pctGrade = total > 0 ? (v.qtd / total) * 100 : 0;
        return (
          <div key={grade}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-pc-tinta">
                Grade {grade}
                <span className="ml-2 font-normal text-pc-tinta-fraca">{ROTULOS[grade]}</span>
              </span>
              <span className="text-xs text-pc-tinta-fraca">
                {v.qtd} un · {real(v.valorMarket)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-pc-preto-2">
              <div
                className="h-full bg-pc-ouro"
                style={{ width: `${Math.max(pctGrade, 1)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}