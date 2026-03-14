import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pending_payment: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  awaiting_payment: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  paid: 'bg-green-500/20 text-green-300 border-green-500/30',
  shipped: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  canceled: 'bg-red-500/20 text-red-300 border-red-500/30'
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

export default function CatalogOrders({ catalogSales = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = catalogSales.filter(order => {
    const matchSearch = !searchTerm || 
      (order.product_title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar cliente ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900 border-gray-600 text-white pl-10"
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-600 text-white">
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
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6">
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700">
                  <tr className="text-gray-400 text-xs font-semibold uppercase">
                    <th className="px-4 py-3 text-left">Data/Hora</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredOrders.map((order) => {
                    const date = new Date(order.created_date);
                    const dateStr = date.toLocaleDateString('pt-BR');
                    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-700/30 transition">
                        <td className="px-4 py-4 text-gray-300 text-xs">
                          <div>{dateStr}</div>
                          <div className="text-gray-500 text-xs mt-1">{timeStr}</div>
                        </td>
                        <td className="px-4 py-4 text-white font-medium">{order.buyer_name || 'N/A'}</td>
                        <td className="px-4 py-4 text-gray-300">{order.product_title || 'Produto'}</td>
                        <td className="px-4 py-4">
                          <Badge className={`${STATUS_COLORS[order.status] || 'bg-gray-700 text-gray-300 border-gray-600'} border`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-green-400">
                          R$ {(order.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
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
              <p className="text-gray-400">Nenhum pedido encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}