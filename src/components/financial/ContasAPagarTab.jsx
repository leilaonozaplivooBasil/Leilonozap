import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, CircleDashed, AlertTriangle } from "lucide-react";
import {
  listarContasAPagar,
  totalEmAberto,
  montarLinhasExcel,
  nomeDoArquivo,
} from "@/lib/contasAPagar";

// 📋 ABA "A PAGAR" — a resposta inteira para "o que eu devo hoje?".
//
// Pedida pela Aline em 29/08/2026 (opção A), com três ajustes que ela mandou e
// que estão implementados exatamente assim:
//
//   ① "substituir o campo Conta pelo centro de custo" — a coluna Conta (de onde
//      saiu o dinheiro) só existe DEPOIS da baixa; numa tela do que ainda não foi
//      pago ela vinha vazia. O centro de custo já vem preenchido no lançamento.
//   ② "vir sem filtros" — não há um único controle de filtro aqui, de propósito.
//      Clicou na aba, a tela inteira já é a resposta. Quem quiser recortar tem o
//      filtro "A Pagar" na aba Gastos, que continua onde estava.
//   ③ "botão para eu extrair tudo para excel" — o botão abaixo. "Tudo" no sentido
//      dela: as parcelas do valor também (original, juros, já pago), não só o saldo.
//
// A regra do que entra e da ordem mora em src/lib/contasAPagar.js, com teste.
// Aqui é só pintura.
const TOM = {
  vencido: "text-red-400",
  urgente: "text-amber-400",
  normal: "text-gray-400",
};

const dinheiro = (n) =>
  (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dataBR = (d) => {
  const dt = new Date(d);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

export default function ContasAPagarTab({ expenses, onRowClick }) {
  const [exportando, setExportando] = useState(false);
  const contas = useMemo(() => listarContasAPagar(expenses), [expenses]);
  const total = totalEmAberto(contas);
  const vencidas = contas.filter((c) => c.diasParaVencer < 0).length;

  const exportarExcel = () => {
    setExportando(true);
    try {
      const ws = XLSX.utils.aoa_to_sheet(montarLinhasExcel(contas));
      // Largura das colunas: sem isto tudo sai espremido em ~8 caracteres e a
      // Aline abre a planilha tendo que arrastar coluna por coluna.
      ws["!cols"] = [
        { wch: 12 }, { wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contas a pagar");
      XLSX.writeFile(wb, nomeDoArquivo());
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da aba: o total e o botão. Nada mais — sem cards, sem filtro. */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-medium">Total em aberto</p>
          <p className="text-white text-2xl font-bold">R$ {dinheiro(total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {contas.length} conta(s) a pagar
            {vencidas > 0 && <span className="text-red-400"> · {vencidas} já vencida(s)</span>}
          </p>
        </div>
        <Button
          onClick={exportarExcel}
          disabled={exportando || contas.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar para Excel
        </Button>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        {contas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CircleDashed className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma conta a pagar. Tudo quitado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Vencimento</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Descrição</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium hidden md:table-cell">Empresa</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium hidden lg:table-cell">Categoria</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium hidden lg:table-cell">Centro de custo</th>
                  <th className="text-right py-3 px-3 text-gray-400 font-medium">Em aberto</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => onRowClick && onRowClick(c)}
                  >
                    <td className="py-3 px-3 text-gray-300 whitespace-nowrap">{dataBR(c.due_date)}</td>
                    <td className="py-3 px-3">
                      <div className="text-white font-medium">{c.description}</div>
                      {c.parcial && (
                        <div className="text-xs text-blue-400 mt-0.5">
                          Já pago: R$ {dinheiro(c.jaPago)} de R$ {dinheiro(c.valorOriginal + c.juros)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-300 hidden md:table-cell">{c.company || "-"}</td>
                    <td className="py-3 px-3 text-gray-300 hidden lg:table-cell">{c.category || "-"}</td>
                    <td className="py-3 px-3 text-gray-300 hidden lg:table-cell">{c.cost_center || "-"}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-white font-semibold">R$ {dinheiro(c.emAberto)}</div>
                      {c.juros > 0 && (
                        <div className="text-xs text-red-400">+R$ {dinheiro(c.juros)} juros</div>
                      )}
                    </td>
                    <td className={`py-3 px-3 text-xs whitespace-nowrap ${TOM[c.situacao.tom]}`}>
                      <span className="flex items-center gap-1">
                        {c.situacao.tom === "vencido" && <AlertTriangle className="w-3 h-3" />}
                        {c.situacao.texto}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700">
                  <td colSpan={5} className="py-3 px-3 text-gray-400 font-medium text-right">Total</td>
                  <td className="py-3 px-3 text-right text-white font-bold">R$ {dinheiro(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
