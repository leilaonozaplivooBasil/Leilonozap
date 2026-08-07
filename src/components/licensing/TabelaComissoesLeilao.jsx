import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// 🧾 ITEM 2 DA AUDITORIA — a comissão de leilão NÃO é mais calculada na tela.
// Antes esta coluna multiplicava o arremate por 5% escrito no código, o que podia
// exibir um valor que NUNCA foi pago (divergindo do extrato oficial).
// Agora o valor vem SOMENTE dos registros de comissão já carregados no painel
// (CommissionRecord), casando pelo id do leilão. Sem registro → "—".
// Somente leitura: nada é calculado, consultado de novo ou gravado.
export default function TabelaComissoesLeilao({ arremates = [], registrosComissao = [] }) {
  // soma o que foi realmente apurado para este usuário naquele leilão
  const comissaoDoLeilao = (auctionId) => {
    const encontrados = (registrosComissao || []).filter(
      (r) => r && r.sale_id === auctionId && r.sale_type === 'auction'
    );
    if (encontrados.length === 0) return null;
    return encontrados.reduce((soma, r) => soma + (Number(r.amount) || 0), 0);
  };

  if (!arremates || arremates.length === 0) {
    return <p className="text-center py-8 text-gray-500">Arremates dos indicados: 0</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200">
            <TableHead className="text-gray-500">Produto</TableHead>
            <TableHead className="text-gray-500">Arrematante</TableHead>
            <TableHead className="text-gray-500">Valor</TableHead>
            <TableHead className="text-gray-500">Sua comissão</TableHead>
            <TableHead className="text-gray-500">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {arremates.map((auction) => {
            const comissao = comissaoDoLeilao(auction.id);
            return (
              <TableRow key={auction.id} className="border-gray-200">
                <TableCell className="text-gray-900 text-sm">{auction.title}</TableCell>
                <TableCell className="text-gray-700 text-sm">{auction.winner_name}</TableCell>
                <TableCell className="text-gray-900 font-semibold">R$ {(auction.current_price || 0).toFixed(2)}</TableCell>
                <TableCell>
                  {comissao === null ? (
                    <span className="text-gray-400">
                      —
                      <span className="block text-[11px] text-gray-400">ainda não apurada</span>
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold">R$ {comissao.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {auction.updated_date ? new Date(auction.updated_date).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}