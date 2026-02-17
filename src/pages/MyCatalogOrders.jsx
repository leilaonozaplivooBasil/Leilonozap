import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Package, Truck, CheckCircle, Eye, ArrowLeft, Clock, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CatalogSale = base44.entities.CatalogSale;

const statusConfig = {
  pending_payment: { text: "Aguardando Pagamento", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { text: "Pago", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  processing: { text: "Processando", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { text: "Enviado", icon: Truck, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  delivered: { text: "Entregue", icon: Package, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  canceled: { text: "Cancelado", icon: Package, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const CatalogOrderCard = ({ order, onTrackClick }) => {
  const config = statusConfig[order.status] || statusConfig.pending_payment;
  const mainImage = order.product_image || "https://via.placeholder.com/150";

  return (
    <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 text-white overflow-hidden flex flex-col hover:border-white/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 group">
      {/* Imagem Quadrada Compacta */}
      <div className="flex justify-center items-center pt-3 pb-2">
        <div className="relative w-28 h-28 bg-gray-900/50 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center group-hover:border-white/20 transition-all">
          <img 
            src={mainImage} 
            alt={order.product_title} 
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" 
          />
        </div>
      </div>

      {/* Conteúdo */}
      <CardHeader className="flex-col gap-2 p-4 pb-3">
        <CardTitle className="text-base font-semibold line-clamp-2 text-white group-hover:text-green-300 transition-colors text-center">
          {order.product_title}
        </CardTitle>
        <p className="text-xs text-gray-400 text-center">
          {new Date(order.created_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: '2-digit' })}
        </p>
      </CardHeader>

      <CardContent className="px-4 py-3 flex-grow">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-3.5 rounded-lg flex justify-between items-center">
          <span className="text-gray-300 text-sm font-medium">Total:</span>
          <span className="font-bold text-lg text-green-400">
            R$ {(order.total_amount || order.sale_price || 0).toFixed(2)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-900/30 px-4 py-3 flex flex-col gap-3 border-t border-white/5">
        <Badge className={`flex items-center gap-2 text-xs font-semibold ${config.color} w-fit border`}>
          <config.icon className="w-3.5 h-3.5" />
          {config.text}
        </Badge>
        <button
          onClick={() => onTrackClick(order)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30"
        >
          <Eye className="w-4 h-4" />
          Acompanhar
        </button>
        {order.tracking_code && (
          <p className="text-xs text-gray-400 text-center">
            Rastreio: <span className="text-green-400 font-mono font-semibold">{order.tracking_code}</span>
          </p>
        )}
      </CardFooter>
    </Card>
  );
};

export default function MyCatalogOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const navigate = useNavigate();

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'todos') return orders;
    return orders.filter(order => order.status === activeFilter);
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) {
          setIsLoading(false);
          return;
        }
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        // Buscar pedidos do catálogo pelo buyer_id ou buyer_email
        console.log('🔍 Buscando pedidos para user:', { id: user.id, email: user.email });
        
        const allOrders = await CatalogSale.list("-created_date", 500);
        console.log('📦 Total de pedidos no sistema:', allOrders?.length || 0);
        
        // Filtrar pedidos do usuário (por ID, email ou created_by)
        const userOrders = allOrders.filter(order => 
          order.buyer_id === user.id || 
          order.buyer_email === user.email || 
          order.created_by === user.email
        );

        console.log('🔍 Pedidos encontrados:', userOrders.length, 'Filtros - buyer_id:', user.id, 'email:', user.email);
        
        console.log('✅ Pedidos do usuário:', userOrders.length, userOrders);
        setOrders(userOrders);
      } catch (error) {
        console.error("Failed to load catalog orders:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();

    // 🔄 Subscrever a atualizações em tempo real de CatalogSale
    const unsubscribe = CatalogSale.subscribe((event) => {
      if (event.type === 'update') {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return;
        
        const user = JSON.parse(savedUser);
        
        // Se atualização é para um pedido desse usuário, recarregar
        if (event.data?.buyer_id === user.id || event.data?.buyer_email === user.email) {
          console.log('📢 Pedido atualizado em tempo real:', event.id);
          
          setOrders(prev => 
            prev.map(order => order.id === event.id ? event.data : order)
          );

          // Se o pagamento foi confirmado, mostrar notificação
          if (event.data?.status === 'paid' && prev.find(o => o.id === event.id)?.status !== 'paid') {
            console.log('✅ Pagamento confirmado para pedido:', event.id);
            
            // Dispara evento global para mostrar popup
            window.dispatchEvent(new CustomEvent('paymentConfirmed', {
              detail: {
                sale_id: event.id,
                product_title: event.data.product_title,
                amount: event.data.total_amount
              }
            }));
          }
        }
      }
    });

    return unsubscribe;
  }, []);

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
              <h1 className="text-2xl sm:text-3xl font-black text-white">Meus Pedidos</h1>
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
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                    activeFilter === option.id
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                  }`}
                >
                  {option.label}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    activeFilter === option.id
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