import React from 'react';
import { LayoutGrid, BadgeCheck, Info } from 'lucide-react';
import { CONDICOES, contarPorCondicao } from '@/lib/condicaoProduto';

// 🏷️ 02/09/2026 — A FILEIRA DE FILTROS DA LOJA, POR CONDIÇÃO.
//
// Substitui as pílulas de origem (Direto de Fábrica / Arremate & Devoluções /
// Collection), que ficavam todas em 0: a origem precisa ser classificada à mão,
// porque os lotes grandes misturam fábrica e devolução. A condição já existia no
// banco desde a importação, escondida nos contadores qty_* — 289 dos 299 produtos
// da vitrine. O motivo completo está em @/lib/condicaoProduto.
//
// ⚠️ NÃO mover para cima do OfertasRelampago: aquele bloco tem `relative z-10
// -mt-16` e sobe de propósito para sobrepor o banner. As pílulas ficaram atrás
// dele e sumiram da tela (relatado no preview da #158).
//
// Pílula sem produto não é oferecida — abrir uma vitrine vazia é pior que não
// oferecer a seção. Mas se sobrar menos de duas, mostra todas: a fileira sumir
// por completo já aconteceu uma vez, e o sintoma é "a entrega não está no ar".

const ALERTA = new Set(['com_avarias', 'para_reparo']);

export default function PilulasCondicao({ produtos, filtro, onFiltroChange }) {
  const contagem = React.useMemo(() => contarPorCondicao(produtos), [produtos]);

  const comProduto = CONDICOES.filter((c) => (contagem[c.valor] || 0) > 0);
  const pilulas = comProduto.length >= 2 ? comProduto : CONDICOES;

  const estilo = (ativa) =>
    `flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
      ativa
        ? 'border-emerald-400/60 bg-emerald-500/15 text-white'
        : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-600 hover:text-white'
    }`;

  return (
    <div className="mb-6 flex flex-wrap gap-2.5" role="group" aria-label="Filtrar por estado do produto">
      <button
        type="button"
        onClick={() => onFiltroChange('todas')}
        aria-pressed={filtro === 'todas'}
        className={estilo(filtro === 'todas')}
      >
        <LayoutGrid className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <span>Todos</span>
      </button>

      {pilulas.map((c) => {
        const ativa = filtro === c.valor;
        const Icone = ALERTA.has(c.valor) ? Info : BadgeCheck;
        const cor = ALERTA.has(c.valor) ? 'text-amber-400' : 'text-emerald-400';
        return (
          <button
            key={c.valor}
            type="button"
            onClick={() => onFiltroChange(ativa ? 'todas' : c.valor)}
            aria-pressed={ativa}
            className={estilo(ativa)}
          >
            <Icone className={`h-4 w-4 shrink-0 ${cor}`} aria-hidden="true" />
            {/* rótulo curto: "Perfeito", "Bom", "Com avarias" — o longo
                ("Perfeito — sem marcas de uso") fica na página do produto */}
            <span>{c.resumo}</span>
            <span className="text-xs text-gray-400">{contagem[c.valor] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}
