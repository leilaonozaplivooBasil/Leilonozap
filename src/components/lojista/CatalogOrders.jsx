import React, { useState } from 'react';
import { fmtBR } from '@/lib/money';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye } from 'lucide-react';

// 🔴 Mesmo corte usado no Relatório (CatalogHome.jsx): pedidos antigos (antes
// de julho/2026) eram de teste. Julho e agosto reais permanecem, refletindo o saldo.
const REPORT_CUTOFF_DATE = new Date('2026-07-01T03:00:00.000Z');

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  pending_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  awaiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-nz-verde-fundo text-nz-verde border-nz-verde/30',
  shipped: 'bg-nz-marrom-fundo text-nz-marrom border-nz-marrom/30',
  delivered: 'bg-nz-verde-fundo text-nz-verde border-nz-verde/30',
  canceled: 'bg-red-50 text-red-600 border-red-200'
};

const STATUS_LABELS = {
  pending: 'Pendente',
  pending_payment: 'Pendente',
  awaiting_payment: 'Pendente',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado'
};

export default function CatalogOrders({ catalogSales = [], currentUserId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = catalogSales.filter(order => new Date(order.created_date) >= REPORT_CUTOFF_DATE).filter(order => {
    const matchSearch = !searchTerm || 
      (order.product_title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="bg-white border-nz-borda">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar cliente ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 pl-10"
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 text-gray-900">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pedidos */}
      <Card className="bg-white border-nz-borda">
        <CardContent className="pt-6">
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-nz-borda">
                  <tr className="text-gray-500 text-xs font-semibold uppercase">
                    <th className="px-4 py-3 text-left">Data/Hora</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nz-marrom/15">
                  {filteredOrders.map((order) => {
                    const date = new Date(order.created_date);
                    const dateStr = date.toLocaleDateString('pt-BR');
                    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <tr key={order.id} className="hover:bg-nz-marrom-fundo/30 transition">
                        <td className="px-4 py-4 text-gray-600 text-xs">
                          <div>{dateStr}</div>
                          <div className="text-gray-400 text-xs mt-1">{timeStr}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium">
                          {order.buyer_name || 'N/A'}
                          {currentUserId && order.buyer_id === currentUserId && (
                            <Badge className="ml-2 bg-nz-marrom-fundo text-nz-marrom border-nz-marrom/30 border">Compra Pessoal</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600">{order.product_title || 'Produto'}</td>
                        <td className="px-4 py-4">
                          <Badge className={`${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-gray-300'} border`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-nz-verde">
                          R$ {fmtBR((order.total_amount || 0))}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-900">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum pedido encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}