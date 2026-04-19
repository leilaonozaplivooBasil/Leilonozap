import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Package, Truck, CheckCircle, Eye, ArrowLeft, Clock, Filter, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const CatalogSale = base44.entities.CatalogSale;

const statusConfig = {
  pending_payment: { text: "Aguardando Pagamento", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { text: "Pago", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  processing: { text: "Processando", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { text: "Enviado", icon: Truck, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  delivered: { text: "Entregue", icon: Package, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  canceled: { text: "Cancelado", icon: Package, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const CatalogOrderCard = ({ order, onTrackClick, onDeleteClick }) => {
  const config = statusConfig[order.status] || statusConfig.pending_payment;
  const mainImage = order.product_image || "https://via.placeholder.com/150";

  return (
    <div className="group cursor-pointer">
      <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 text-white overflow-hidden flex flex-col h-full hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300">

        {/* IMAGEM - Destaque Principal */}
        <div className="relative w-full bg-gradient-to-b from-gray-600/30 to-gray-900/60 px-5 pt-6 pb-5 flex justify-center">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-white/10 to-gray-900/40 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg shadow-black/40">
            <img
              src={mainImage}
              alt={order.product_title}
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%239CA3AF' text-anchor='middle' dy='.3em'%3EImagem%3C/text%3E%3C/svg%3E"
              }}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* NOME DO PRODUTO */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-green-300 transition-colors">
            {order.product_title}
          </h3>
        </div>

        {/* DATA + HORA */}
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500">
            {new Date(order.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(order.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* SEPARADOR */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

        {/* TOTAL */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total:</span>
            <span className="font-bold text-green-400 text-base">
              R$ {(order.total_amount || order.sale_price || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* STATUS */}
        <div className="px-4 pb-3">
          <Badge className={`flex items-center gap-1.5 text-xs font-semibold ${config.color} border w-full justify-center py-1.5`}>
            <config.icon className="w-3 h-3" />
            <span>{config.text}</span>
          </Badge>
        </div>

        {/* BOTÃO CTA */}
        <button
          onClick={() => onTrackClick(order)}
          className="mx-4 mb-4 py-2.5 px-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-green-500/40 flex items-center justify-center gap-2 group/btn"
        >
          <Eye className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
          Acompanhar Pedido
        </button>

        {/* EXCLUIR — pendentes e cancelados */}
        {(order.status === 'pending_payment' || order.status === 'canceled') && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteClick(order); }}
            className="mx-4 mb-4 py-2 px-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs transition-all duration-300 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Pedido
          </button>
        )}

        {/* RASTREIO (se houver) */}
        {order.tracking_code && (
          <div className="px-4 pb-4 text-center">
            <p className="text-xs text-gray-500">
              Rastreio: <span className="text-green-400 font-mono font-semibold text-xs">{order.tracking_code}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default function MyCatalogOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const navigate = useNavigate();

  const filteredOrders = useMemo(() => {
    let result = activeFilter === 'todos' ? [...orders] : orders.filter(order => order.status === activeFilter);
    // Ordena: mais recentes primeiro
    result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return result;
  }, [orders, activeFilter]);

  // Adiciona parâmetro from=catalog na URL para o layout mostrar o menu correto
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('from')) {
      urlParams.set('from', 'catalog');
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const fetchOrders = async (userId) => {
    try {
      const result = await base44.functions.invoke('getMyCatalogOrders', { buyer_id: userId });
      return result?.orders || result?.data?.orders || [];
    } catch (err) {
      console.error('invoke failed, trying direct fetch:', err.message);
      // Fallback: busca direta via CatalogSale entity com asServiceRole não disponível no frontend,
      // então tenta buscar via entidade diretamente (sujeita a RLS mas tenta mesmo assim)
      try {
        const directResult = await base44.entities.CatalogSale.filter({ buyer_id: userId }, '-created_date', 500);
        return directResult || [];
      } catch (e2) {
        console.error('Direct fetch also failed:', e2.message);
        return [];
      }
    }
  };

  useEffect(() => {
    // IDs já pagos no carregamento inicial — para nunca disparar popup em pedidos históricos
    const initialPaidIds = new Set();
    // Snapshot mutável dos pedidos atuais para comparação no polling
    let currentOrdersSnapshot = [];

    const loadDataAndStartPolling = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) { setIsLoading(false); return; }
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        const orders = await fetchOrders(user.id);
        // Popula o set com todos os IDs que JÁ estão pagos antes do polling começar
        orders.forEach(o => { if (o.status === 'paid') initialPaidIds.add(o.id); });
        currentOrdersSnapshot = orders;
        setOrders(orders);
      } catch (error) {
        console.error("Failed to load catalog orders:", error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataAndStartPolling();

    // 🔄 Polling: só dispara popup se um pedido mudou de não-pago para pago NESTA sessão
    const pollingTimer = setInterval(async () => {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;

      const user = JSON.parse(savedUser);
      try {
        const newOrders = await fetchOrders(user.id);

        newOrders.forEach(order => {
          if (order.status === 'paid' && !initialPaidIds.has(order.id)) {
            const oldOrder = currentOrdersSnapshot.find(o => o.id === order.id);
            if (oldOrder && oldOrder.status !== 'paid') {
              initialPaidIds.add(order.id); // Evita disparar de novo
              window.dispatchEvent(new CustomEvent('paymentConfirmed', {
                detail: {
                  sale_id: order.id,
                  product_title: order.product_title,
                  amount: order.total_amount
                }
              }));
            }
          }
        });

        currentOrdersSnapshot = newOrders;
        setOrders(newOrders);
      } catch (error) {
        console.debug('Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(pollingTimer);
  }, []);

  const [cancelingId, setCancelingId] = useState(null);

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Deseja excluir o pedido "${order.product_title}"?\n\nO pedido será removido permanentemente.`)) return;
    setCancelingId(order.id);
    try {
      await CatalogSale.delete(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success('Pedido excluído');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      toast.error('Erro ao excluir pedido');
    } finally {
      setCancelingId(null);
    }
  };

  const handleTrackClick = (order) => {
    // Navega para página de acompanhamento do pedido do catálogo
    navigate(createPageUrl('CatalogOrderTracking') + `?sale_id=${order.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-4">
        <ShoppingBag className="w-16 h-16 text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Faça Login Para Ver Seus Pedidos</h1>
        <p className="text-gray-400 mb-6">Você precisa estar conectado para acessar seu histórico de compras.</p>
        <Link to={createPageUrl("Catalog")}>
          <Button className="bg-green-600 hover:bg-green-700">Voltar para o Catálogo</Button>
        </Link>
      </div>
    );
  }

  const filterOptions = [
    { id: 'todos', label: 'Todos', count: orders.length },
    { id: 'pending_payment', label: 'Aguardando Pagamento', count: orders.filter(o => o.status === 'pending_payment').length },
    { id: 'paid', label: 'Pagos', count: orders.filter(o => o.status === 'paid').length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Meus Pedidos — Loja Virtual</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} no total
              </p>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-white/5">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Você ainda não fez nenhum pedido</h2>
            <p className="text-gray-400 mb-6">Explore nosso catálogo e faça sua primeira compra!</p>
            <Link to={createPageUrl("Catalog")}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500">Ver Catálogo</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="mb-8 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 mr-2 text-gray-400 text-sm">
                <Filter className="w-4 h-4" />
                <span className="font-semibold">Filtrar:</span>
              </div>
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setActiveFilter(option.id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeFilter === option.id
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                    }`}
                >
                  {option.label}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeFilter === option.id
                      ? 'bg-white/20'
                      : 'bg-gray-700'
                    }`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Cards */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/20 rounded-xl border border-white/5">
                <Package className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Nenhum pedido nesta categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {filteredOrders.map(order => (
                  <CatalogOrderCard
                    key={order.id}
                    order={order}
                    onTrackClick={handleTrackClick}
                    onDeleteClick={handleDeleteOrder}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}