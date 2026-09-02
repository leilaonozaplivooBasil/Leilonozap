import React from 'react';
import { LayoutGrid, Sparkles, Flame, Crown } from 'lucide-react';
import { SECOES, contarPorSecao } from '@/lib/secoesVitrine';

// 🏷️ 02/09/2026 — a fileira de seções da Loja Virtual. O QUE cada rótulo filtra
// (e por que os nomes não descrevem o campo) está em @/lib/secoesVitrine —
// leia antes de mexer.
//
// ⚠️ NÃO mover para cima do OfertasRelampago: aquele bloco tem `relative z-10
// -mt-16` e sobe de propósito para sobrepor o banner. As pílulas ficaram atrás
// dele e sumiram da tela (relatado no preview da #158).

const ICONES = { Sparkles, Flame, Crown };

export default function PilulasVitrine({ produtos, filtro, onFiltroChange }) {
  const contagem = React.useMemo(() => contarPorSecao(produtos), [produtos]);

  // Seção vazia abre vitrine muda — não é oferecida. Mas se sobrar menos de
  // duas, mostra todas: a fileira sumir por completo já aconteceu uma vez, e o
  // sintoma do lado de fora é "a entrega não está no ar".
  const comProduto = SECOES.filter((s) => (contagem[s.valor] || 0) > 0);
  const pilulas = comProduto.length >= 2 ? comProduto : SECOES;

  const estilo = (ativa) =>
    `flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
      ativa
        ? 'border-emerald-400/60 bg-emerald-500/15 text-white'
        : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-600 hover:text-white'
    }`;

  return (
    <div className="mb-6 flex flex-wrap gap-2.5" role="group" aria-label="Filtrar por seção da loja">
      <button
        type="button"
        onClick={() => onFiltroChange('todas')}
        aria-pressed={filtro === 'todas'}
        className={estilo(filtro === 'todas')}
      >
        <LayoutGrid className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <span>Todos</span>
      </button>

      {pilulas.map(({ valor, rotulo, icone }) => {
        const Icone = ICONES[icone] || Sparkles;
        const ativa = filtro === valor;
        return (
          <button
            key={valor}
            type="button"
            onClick={() => onFiltroChange(ativa ? 'todas' : valor)}
            aria-pressed={ativa}
            className={estilo(ativa)}
          >
            <Icone className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>{rotulo}</span>
            <span className="text-xs text-gray-400">{contagem[valor] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}
