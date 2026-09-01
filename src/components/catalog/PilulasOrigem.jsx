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
// ⚠️ 02/09/2026 — CORREÇÃO DE UMA DECISÃO ERRADA MINHA.
// A primeira versão escondia pílula com contagem 0 e sumia com a fileira inteira se
// sobrasse menos de duas. Como a coluna `product_source` nasceu vazia (ninguém tinha
// classificado ainda), o resultado em produção foi: nenhuma pílula, em lugar nenhum.
// A demanda era "esses filtros precisam aparecer na loja" — e eu entreguei uma tela
// que não mostrava nada até alguém preencher 299 produtos à mão.
//
// Agora as três aparecem sempre, com a contagem à vista. Clicar numa vazia leva a um
// aviso explicando que ninguém classificou ainda — não a uma vitrine vazia e muda.
// A honestidade continua onde importa: um produto SEM origem não é contado em pílula
// nenhuma. Nada é chutado; o que falta é dito.

const ICONES = { Sparkles, Flame, Crown };

export default function PilulasOrigem({ produtos, filtro, onFiltroChange }) {
  const contagem = React.useMemo(() => contarPorFiltro(produtos), [produtos]);

  const pilulas = [
    ...ORIGENS.map((o) => ({ ...o, total: contagem[o.valor] || 0 })),
    { valor: FILTRO_COLLECTION, rotulo: 'Collection', icone: 'Crown', total: contagem[FILTRO_COLLECTION] || 0 },
  ];

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

      {pilulas.map((o) => {
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
