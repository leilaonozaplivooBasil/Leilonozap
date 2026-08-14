import React, { useState, useEffect, useMemo } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Package, Truck, CheckCircle, Clock, X, RefreshCw, PartyPopper, XCircle } from 'lucide-react';
// Truck já importado acima — reutilizado nos badges de frete
import { toast } from 'sonner';
import PageFullscreen from "@/components/admin/PageFullscreen";

const CatalogSale = base44.entities.CatalogSale;

// 📦 Só produto físico entra nesta fila de envio. Kinds digitais puros (depósito de
// carteira, comissão, adesão, etc.) são outras cobranças na mesma tabela — não precisam
// de etiqueta/rastreio. O Passaporte de Lances FICA na lista: é um produto vendido, só que
// com entrega automática e instantânea (crédito direto na carteira do cliente).
const KINDS_DIGITAIS = new Set([
  'wallet_deposit', 'commission_deposit', 'operacao_deposit',
  'adesao', 'seller_adhesion', 'partner_plan', 'reposicao', 'seller_freight',
]);
const isPedidoFisico = (o) => !KINDS_DIGITAIS.has(o.kind);
const isPassaporte = (o) => o?.kind === 'passaporte';
const STATUS_PAGO = new Set(['paid', 'preparando', 'shipped', 'saiu_entrega', 'delivered', 'entregue']);
// 🎫 Passaporte é entrega automática: assim que o pagamento confirma, o crédito já cai na
// carteira do cliente — não existe "preparar envio". Por isso exibimos direto como entregue.
const getDisplayTitle = (o) => isPassaporte(o) ? 'Compra de Passaporte de Lances — Leilão NoZap' : o.product_title;

const STATUS_CONFIG = {
  pending_payment: { label: 'Aguardando Pagamento', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  paid: { label: 'Pago — Preparar Envio', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Package },
  shipped: { label: 'Enviado', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  canceled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
  // status reais em português (gravados pelo painel do vendedor / updateOrderStatus)
  preparando: { label: 'Preparando', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Package },
  saiu_entrega: { label: 'Saiu para entrega', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X },
};

// 🎫 Badge exclusivo do Passaporte quando o pagamento já confirmou: nunca "Preparar Envio".
const STATUS_PASSAPORTE_ENTREGUE = { label: 'Entregue — Automático', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: PartyPopper };
const getDisplayStatusConfig = (o) => (isPassaporte(o) && STATUS_PAGO.has(o.status)) ? STATUS_PASSAPORTE_ENTREGUE : (STATUS_CONFIG[o.status] || STATUS_CONFIG.paid);

// 🚚 Frete fica em raw_base44 (JSON) — nunca em total_amount (base de comissão).
// amount_charged = produto + frete, o que o cliente realmente pagou.
const getFrete = (order) => {
  let raw = order?.raw_base44;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
  const frete = raw?.frete;
  if (!frete || !Number(frete.valor)) return null;
  return {
    valor: Number(frete.valor) || 0,
    transportadora: [frete.empresa, frete.servico].filter(Boolean).join(' '),
    totalCobrado: Number(raw.amount_charged) || null,
  };
};

export default function CatalogOrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('paid');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // Lê direto da tabela catalog_sales (getCatalogOrders é stub da migração — retornava vazio).
      // O acesso de admin já é protegido pela rota (RequireRole) + RLS de leitura.
      const allOrders = await base44.entities.CatalogSale.filter({}, '-created_date', 1000);
      setOrders(Array.isArray(allOrders) ? allOrders.filter(isPedidoFisico) : []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.product_title?.toLowerCase().includes(term) ||
        o.buyer_name?.toLowerCase().includes(term) ||
        o.buyer_email?.toLowerCase().includes(term) ||
        o.tracking_code?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [orders, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: orders.length,
    // 🎫 Passaporte pago já conta como entregue (entrega automática), não como "pronto pra enviar"
    paid: orders.filter(o => !( isPassaporte(o) && STATUS_PAGO.has(o.status)) && (o.status === 'paid' || o.status === 'preparando')).length,
    shipped: orders.filter(o => o.status === 'shipped' || o.status === 'saiu_entrega').length,
    delivered: orders.filter(o => (isPassaporte(o) && STATUS_PAGO.has(o.status)) || o.status === 'delivered' || o.status === 'entregue').length,
    pending: orders.filter(o => o.status === 'pending_payment').length,
  }), [orders]);

  const handleOpenOrder = (order) => {
    setSelectedOrder(order);
    setTrackingCode(order.tracking_code || '');
    setNewStatus(order.status);
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const updateData = { status: newStatus };
      if (trackingCode.trim()) {
        updateData.tracking_code = trackingCode.trim();
        if (newStatus === 'paid') updateData.status = 'shipped'; // auto-avança para enviado
      }
      if (newStatus === 'shipped' && !trackingCode.trim() && !selectedOrder.tracking_code) {
        toast.error('Informe o código de rastreio para marcar como enviado');
        return;
      }
      await CatalogSale.update(selectedOrder.id, updateData);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updateData } : o));
      toast.success('Pedido atualizado com sucesso!');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast.error('Erro ao atualizar pedido');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PageFullscreen>
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-7 h-7 text-green-400" />
              Gestão de Pedidos — Loja Virtual
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gerencie envios, rastreios e status de cada pedido</p>
          </div>
          <Button onClick={loadOrders} variant="outline" className="border-gray-600 text-gray-300 hover:text-white gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', filter: 'all' },
            { label: 'Aguardando Pgto', value: stats.pending, color: 'text-yellow-400', filter: 'pending_payment' },
            { label: 'Pagos (Enviar)', value: stats.paid, color: 'text-blue-400', filter: 'paid' },
            { label: 'Enviados', value: stats.shipped, color: 'text-indigo-400', filter: 'shipped' },
            { label: 'Entregues', value: stats.delivered, color: 'text-green-400', filter: 'delivered' },
          ].map(card => (
            <Card
              key={card.filter}
              onClick={() => setFilterStatus(card.filter)}
              className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:border-green-500/50 ${filterStatus === card.filter ? 'border-green-500' : ''}`}
            >
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-gray-400 mt-1">{card.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por produto, comprador, email ou rastreio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {/* Lista de Pedidos */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const config = getDisplayStatusConfig(order);
              const StatusIcon = config.icon;
              return (
                <Card key={order.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Imagem */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        {order.product_image ? (
                          <img src={order.product_image} alt={getDisplayTitle(order)} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 m-auto mt-4 text-gray-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{getDisplayTitle(order)}</p>
                        <p className="text-sm text-gray-400">{order.buyer_name} • {order.buyer_email}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-green-400 font-bold text-sm">R$ {fmtBR((order.total_amount || order.sale_price || 0))}</span>
                          <span className="text-gray-500 text-xs">{new Date(order.created_date).toLocaleDateString('pt-BR')}</span>
                          {order.tracking_code && (
                            <span className="text-indigo-300 text-xs font-mono inline-flex items-center gap-1"><Package className="w-3 h-3" />{order.tracking_code}</span>
                          )}
                          {(() => {
                            const frete = getFrete(order);
                            if (!frete) return null;
                            return (
                              <span className="text-amber-300 text-xs inline-flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                Frete: R$ {fmtBR(frete.valor)}{frete.transportadora ? ` — ${frete.transportadora}` : ''}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Status + Ação */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge className={`${config.color} border text-xs flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleOpenOrder(order)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          Gerenciar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Gerenciamento */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-white text-lg">Gerenciar Pedido</CardTitle>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-1">
                <p className="text-sm text-gray-400">Produto: <span className="text-white font-medium">{getDisplayTitle(selectedOrder)}</span></p>
                {isPassaporte(selectedOrder) && (
                  <p className="text-xs text-green-400 font-medium">🎫 Entrega automática — crédito cai na carteira do cliente na hora da confirmação do pagamento.</p>
                )}
                <p className="text-sm text-gray-400">Comprador: <span className="text-white">{selectedOrder.buyer_name}</span></p>
                <p className="text-sm text-gray-400">Email: <span className="text-white">{selectedOrder.buyer_email}</span></p>
                <p className="text-sm text-gray-400">Valor do produto: <span className="text-green-400 font-bold">R$ {fmtBR((selectedOrder.total_amount || selectedOrder.sale_price || 0))}</span></p>
                {(() => {
                  const frete = getFrete(selectedOrder);
                  if (!frete) return null;
                  return (
                    <>
                      <p className="text-sm text-gray-400">Frete: <span className="text-amber-300 font-bold">R$ {fmtBR(frete.valor)}</span>{frete.transportadora ? <span className="text-gray-400"> — {frete.transportadora}</span> : null}</p>
                      {frete.totalCobrado != null && (
                        <p className="text-sm text-gray-400">Total cobrado do cliente: <span className="text-white font-bold">R$ {fmtBR(frete.totalCobrado)}</span></p>
                      )}
                    </>
                  );
                })()}
                {selectedOrder.buyer_phone && (
                  <p className="text-sm text-gray-400">Telefone: <span className="text-white">{selectedOrder.buyer_phone}</span></p>
                )}
              </div>

              {!isPassaporte(selectedOrder) && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Status do Pedido</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="pending_payment">⏳ Aguardando Pagamento</SelectItem>
                        <SelectItem value="paid"><span className="inline-flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" />Pago</span></SelectItem>
                        <SelectItem value="shipped"><span className="inline-flex items-center gap-2"><Truck className="w-3.5 h-3.5" />Enviado</span></SelectItem>
                        <SelectItem value="delivered"><span className="inline-flex items-center gap-2"><PartyPopper className="w-3.5 h-3.5" />Entregue</span></SelectItem>
                        <SelectItem value="canceled"><span className="inline-flex items-center gap-2"><XCircle className="w-3.5 h-3.5" />Cancelado</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Código de Rastreio</label>
                    <Input
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Ex: AA123456789BR"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ao adicionar o código, o status será atualizado para "Enviado" automaticamente</p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                {!isPassaporte(selectedOrder) && (
                  <Button
                    onClick={handleSaveOrder}
                    disabled={isUpdating}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedOrder(null)}
                  variant="outline"
                  className={`border-gray-600 text-gray-300 ${isPassaporte(selectedOrder) ? 'flex-1' : ''}`}
                  disabled={isUpdating}
                >
                  {isPassaporte(selectedOrder) ? 'Fechar' : 'Cancelar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </PageFullscreen>
  );
}