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
    <Card className="bg-gray-800/60 border border-gray-700/80 text-white overflow-hidden flex flex-col">
      <CardHeader className="flex-row items-start gap-4 p-4">
        <img 
          src={mainImage} 
          alt={order.product_title} 
          className="w-24 h-24 object-cover rounded-lg border border-gray-700" 
        />
        <div className="flex-grow">
          <CardTitle className="text-lg mb-1 line-clamp-2 text-white">
            {order.product_title}
          </CardTitle>
          <p className="text-sm text-gray-400">
            Pedido em: {new Date(order.created_date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-grow">
        <div className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
          <span className="text-gray-300">Valor Total:</span>
          <span className="font-bold text-xl text-green-400">
            R$ {(order.total_amount || order.sale_price || 0).toFixed(2)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-900/50 p-4 flex flex-col gap-3">
        <Badge className={`flex items-center gap-2 text-sm ${config.color} w-fit`}>
          <config.icon className="w-4 h-4" />
          {config.text}
        </Badge>
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Button 
            onClick={() => onTrackClick(order)}
            variant="outline"
            className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            <Eye className="w-4 h-4 mr-2" />
            Acompanhar Pedido
          </Button>
        </div>
        {order.tracking_code && (
          <p className="text-xs text-gray-400 mt-2">
            Rastreio: <span className="text-green-400 font-mono">{order.tracking_code}</span>
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
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 text-white">
            <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            Meus Pedidos do Catálogo
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mt-2">
            Acompanhe suas compras do catálogo
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-2xl">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Você ainda não fez nenhum pedido</h2>
            <p className="text-gray-400 mb-6">Explore nosso catálogo e faça sua primeira compra!</p>
            <Link to={createPageUrl("Catalog")}>
              <Button className="bg-green-600 hover:bg-green-700">Ver Catálogo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {orders.map(order => (
              <CatalogOrderCard 
                key={order.id} 
                order={order} 
                onTrackClick={handleTrackClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}