import React, { useState } from 'react';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

// 🗂️ Distribuição Departamental (Resumo Oficial) — leitura IDÊNTICA à do
// analisador interno da operação: categoria abre e mostra os itens de dentro.
export default function ParceiroDistribuicaoDepartamental({ categorias, itensPorCategoria }) {
  const [abertas, setAbertas] = useState(() => new Set());

  if (!categorias?.length) return null;

  const alternar = (nome) =>
    setAbertas((antes) => {
      const proximo = new Set(antes);
      proximo.has(nome) ? proximo.delete(nome) : proximo.add(nome);
      return proximo;
    });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-xl">
      <div className="border-b border-gray-700 bg-gray-900/20 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          Distribuição Departamental (Resumo Oficial)
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          Visão macro informada pela aba raiz do leilão. Toque na categoria para abrir os itens.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900 uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3 text-xs font-semibold sm:px-6 sm:py-4">
                Categoria / Departamento
              </th>
              <th className="w-24 border-l border-gray-700 px-4 py-3 text-center text-xs font-semibold sm:w-32 sm:px-6 sm:py-4">
                Quantidade
              </th>
              <th className="w-36 border-l border-gray-700 px-4 py-3 text-right text-xs font-semibold sm:w-48 sm:px-6 sm:py-4">
                Valor de Mercado
              </th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat, i) => {
              const itens = itensPorCategoria?.[cat.nome] || [];
              const aberta = abertas.has(cat.nome);
              return (
                <React.Fragment key={`${cat.nome}-${i}`}>
                  <tr
                    onClick={() => itens.length > 0 && alternar(cat.nome)}
                    className={`border-b border-gray-700/50 transition-colors ${
                      itens.length > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : ''
                    }`}
                  >
                    <td className="flex items-center gap-2 px-4 py-3 font-medium text-gray-300 sm:px-6 sm:py-4">
                      {itens.length > 0 && (
                        <span
                          className={`inline-block text-gray-500 transition-transform ${aberta ? 'rotate-90' : ''}`}
                        >
                          ▶
                        </span>
                      )}
                      {cat.nome}
                      {itens.length > 0 && (
                        <span className="ml-1 text-xs text-gray-600">({itens.length} itens)</span>
                      )}
                    </td>
                    <td className="border-l border-gray-700/50 px-4 py-3 text-center text-gray-400 sm:px-6 sm:py-4">
                      {cat.qtd} un
                    </td>
                    <td className="border-l border-gray-700/50 px-4 py-3 text-right font-bold text-emerald-400 sm:px-6 sm:py-4">
                      {brl(cat.valor)}
                    </td>
                  </tr>
                  {aberta &&
                    itens.map((sub, si) => (
                      <tr key={`sub-${i}-${si}`} className="border-b border-gray-700/30 bg-gray-900/60">
                        <td className="py-2.5 pl-8 pr-4 text-sm text-gray-400 sm:pl-12 sm:pr-6">
                          <span className="mr-2 text-gray-600">└</span>
                          {sub.desc}
                        </td>
                        <td className="border-l border-gray-700/30 px-4 py-2.5 text-center text-sm text-gray-500 sm:px-6">
                          {sub.qtd} un
                        </td>
                        <td className="border-l border-gray-700/30 px-4 py-2.5 text-right text-sm font-medium text-emerald-600 sm:px-6">
                          {brl(sub.valor)}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}