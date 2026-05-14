import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SellerSalesTable({ vendas }) {
  if (!vendas || vendas.length === 0) {
    return <p className="text-gray-400 text-center py-8">Nenhuma venda</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            <TableHead className="text-gray-400">Produto</TableHead>
            <TableHead className="text-gray-400 text-right">Valor</TableHead>
            <TableHead className="text-gray-400 text-right">Comissão</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-gray-400">Liberação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((venda) => (
            <TableRow key={venda.id} className="border-gray-700">
              <TableCell className="text-gray-300 text-sm">{venda.product_title}</TableCell>
              <TableCell className="text-gray-300 text-right">R$ {venda.total_amount.toFixed(2)}</TableCell>
              <TableCell className="text-green-400 font-semibold text-right">
                R$ {venda.commission_amount.toFixed(2)}
              </TableCell>
              <TableCell>
                {venda.is_liberada ? (
                  <Badge className="bg-green-900/30 text-green-400 border-green-500/30">Disponível</Badge>
                ) : (
                  <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-500/30">Bloqueado</Badge>
                )}
              </TableCell>
              <TableCell className="text-gray-400 text-sm">
                {venda.is_liberada ? (
                  <span className="text-green-400">✓ Liberada</span>
                ) : (
                  format(new Date(venda.liberada_em), "dd MMM", { locale: ptBR })
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}