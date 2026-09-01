import React from 'react';
import { Sparkles, Flame, Crown, LayoutGrid } from 'lucide-react';
import { ORIGENS, FILTRO_COLLECTION, contarPorFiltro } from '@/lib/origemProduto';

// 🏭 02/09/2026 — AS PÍLULAS DO LEILÃO, AGORA NA LOJA VIRTUAL.
//
// A área de leilão já tinha "Direto de Fábrica", "Arremate & Devoluções" e
// "Collection"; a loja não tinha nenhuma. A tentação era copiar o componente
// AuctionSectorLinks — mas lá as pílulas são LINKS para as páginas de leilão
// (DiretoDeFabrica, ArremateDevolucoes, LuxuryCollection). Copiado como está, o
// cliente que está comprando clicaria e seria jogado para dentro do leilão: o
// contrário do que a loja quer. Aqui elas filtram os produtos da própria loja.
//
// Pílula com contagem 0 NÃO é exibida. A origem dos produtos é preenchida à mão
// (os lotes misturam fábrica e devolução, então não dá para deduzir), e uma pílula
// que abre uma vitrine vazia é pior que não oferecer a seção.

const ICONES = { Sparkles, Flame, Crown };

export default function PilulasOrigem({ produtos, filtro, onFiltroChange }) {
  const contagem = React.useMemo(() => contarPorFiltro(produtos), [produtos]);

  const disponiveis = [
    ...ORIGENS.map((o) => ({ ...o, total: contagem[o.valor] || 0 })),
    { valor: FILTRO_COLLECTION, rotulo: 'Collection', icone: 'Crown', total: contagem[FILTRO_COLLECTION] || 0 },
  ].filter((o) => o.total > 0);

  // Uma pílula sozinha não é escolha nenhuma — o cliente já está vendo tudo.
  if (disponiveis.length < 2) return null;

  const pilula = (ativa) =>
    `flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
      ativa
        ? 'border-emerald-400/60 bg-emerald-500/15 text-white'
        : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-600 hover:text-white'
    }`;

  return (
    <div className="mb-6 flex flex-wrap gap-2.5" role="group" aria-label="Filtrar por origem do produto">
      <button
        type="button"
        onClick={() => onFiltroChange('todos')}
        aria-pressed={filtro === 'todos'}
        className={pilula(filtro === 'todos')}
      >
        <LayoutGrid className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <span>Todos</span>
      </button>

      {disponiveis.map((o) => {
        const Icone = ICONES[o.icone] || Sparkles;
        const ativa = filtro === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onFiltroChange(ativa ? 'todos' : o.valor)}
            aria-pressed={ativa}
            className={pilula(ativa)}
          >
            <Icone className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>{o.rotulo}</span>
            <span className="text-xs text-gray-400">{o.total}</span>
          </button>
        );
      })}
    </div>
  );
}
