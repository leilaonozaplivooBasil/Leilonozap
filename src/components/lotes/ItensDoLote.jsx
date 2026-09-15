// 📋 ITENS DO LOTE — a lista completa do que veio na planilha, sempre visível
// logo abaixo do painel de análise.
//
// Dono (15/09/2026): "o analisador tem uma lista de todos os produtos: quando eu
// analiso, fica logo abaixo, ele abre todos os produtos em uma lista. E ele não
// está aparecendo." Não estava aparecendo porque nunca existiu nesta tela: os
// itens só apareciam dentro do modal de grade (clicando numa linha de ticket
// médio) ou na tabela departamental, que dependia de uma aba "Resumo" que 2 de
// 3 planilhas reais não têm. Aqui a lista nasce de `rawItemsByGrade`, que o
// parser sempre preenche.
import React, { useMemo, useState } from 'react';
import { ListChecks, Search } from 'lucide-react';

const GRADE_COLORS = {
  A: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  B: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
  C: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  D: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
  E: 'bg-red-500/15 border-red-500/40 text-red-300',
  U: 'bg-slate-500/15 border-slate-500/40 text-slate-300',
};
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const PASSO = 100;

export default function ItensDoLote({ itens }) {
  const [busca, setBusca] = useState('');
  const [grade, setGrade] = useState(null);
  const [limite, setLimite] = useState(PASSO);

  const lista = Array.isArray(itens) ? itens : [];
  const gradesPresentes = useMemo(
    () => [...new Set(lista.map((i) => String(i.grade || 'U').toUpperCase()))].sort(),
    [lista]
  );
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((i) =>
      (!grade || String(i.grade || 'U').toUpperCase() === grade) &&
      (!q || String(i.desc || '').toLowerCase().includes(q))
    );
  }, [lista, busca, grade]);
  const visiveis = filtrados.slice(0, limite);
  const totais = useMemo(
    () => filtrados.reduce((a, i) => ({ qtd: a.qtd + (Number(i.qtd) || 0), valor: a.valor + (Number(i.valor) || 0) }), { qtd: 0, valor: 0 }),
    [filtrados]
  );

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
      <div className="p-5 border-b border-[#30363d] bg-slate-800/20 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <ListChecks size={16} className="text-blue-400" />
            Itens do Lote ({lista.length})
          </h3>
          <p className="text-xs text-slate-400 mt-1">Todos os produtos lidos da planilha, com grade, quantidade e valor de mercado.</p>
        </div>
        {lista.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setLimite(PASSO); }}
                placeholder="Buscar item…"
                className="w-full sm:w-56 min-h-[40px] bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setGrade(null); setLimite(PASSO); }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${!grade ? 'bg-white/10 border-white/30 text-white' : 'border-slate-600 text-slate-500 hover:text-slate-300'}`}
              >
                Todas
              </button>
              {gradesPresentes.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { setGrade(grade === g ? null : g); setLimite(PASSO); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${grade === g ? (GRADE_COLORS[g] || GRADE_COLORS.U) : 'border-slate-600 text-slate-500 hover:text-slate-300'}`}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          <p className="text-base font-semibold mb-1">Nenhum item foi lido da planilha</p>
          <p className="text-sm">Confira se a aba de produtos tem as colunas Descrição, Grade/Condição, Quantidade e Valor Total.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#0d1117] border-b border-[#30363d]">
                <tr className="text-slate-400 uppercase tracking-wider text-xs">
                  <th className="px-5 py-3 font-semibold w-16">#</th>
                  <th className="px-5 py-3 font-semibold w-20">Grade</th>
                  <th className="px-5 py-3 font-semibold">Descrição</th>
                  <th className="px-5 py-3 font-semibold text-center w-20">Qtd</th>
                  <th className="px-5 py-3 font-semibold text-right w-36">Valor de mercado</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((item, i) => {
                  const g = String(item.grade || 'U').toUpperCase();
                  return (
                    <tr key={i} className="border-b border-[#30363d]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-2.5 text-slate-600 tabular-nums">{i + 1}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[g] || GRADE_COLORS.U}`}>{g}</span>
                      </td>
                      <td className="px-5 py-2.5 text-slate-300">{item.desc || '—'}</td>
                      <td className="px-5 py-2.5 text-center text-slate-400 tabular-nums">{item.qtd}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-emerald-400 tabular-nums">{fmt(item.valor)}</td>
                    </tr>
                  );
                })}
                {visiveis.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Nenhum item bate com a busca.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
            <p className="text-slate-400">
              Mostrando <span className="text-white font-semibold">{visiveis.length}</span> de <span className="text-white font-semibold">{filtrados.length}</span>
              {filtrados.length !== lista.length ? ` (de ${lista.length} no lote)` : ''}
              {' · '}<span className="text-slate-300">{totais.qtd} un</span>{' · '}<span className="text-emerald-400 font-semibold">{fmt(totais.valor)}</span>
            </p>
            {filtrados.length > visiveis.length && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setLimite((l) => l + PASSO)} className="px-3 py-1.5 rounded-lg border border-[#30363d] text-slate-300 hover:text-white hover:border-blue-500/40 text-xs font-bold min-h-[36px]">
                  Ver mais {Math.min(PASSO, filtrados.length - visiveis.length)}
                </button>
                <button type="button" onClick={() => setLimite(filtrados.length)} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold min-h-[36px]">
                  Ver todos ({filtrados.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
