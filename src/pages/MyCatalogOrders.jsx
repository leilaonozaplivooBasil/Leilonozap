import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Package, Truck, CheckCircle, Eye, ArrowLeft, Clock, X, MapPin, User, Phone, Mail, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CatalogSale = base44.entities.CatalogSale;

const statusConfig = {
  pending_payment: { text: "Aguardando Pagamento", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { text: "Pago", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  processing: { text: "Processando", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { text: "Enviado", icon: Truck, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  delivered: { text: "Entregue", icon: Package, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  canceled: { text: "Cancelado", icon: Package, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const CatalogOrderCard = ({ order, onViewDetails }) => {
  const config = statusConfig[order.status] || statusConfig.pending_payment;
  const mainImage = order.product_image || "https://via.placeholder.com/150";

  return (
    <Card 
      className="bg-gray-800/60 border border-gray-700/80 text-white overflow-hidden flex flex-col cursor-pointer hover:border-green-500/50 transition-all"
      onClick={() => onViewDetails(order)}
    >
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
            Cliente: {order.buyer_name}
          </p>
          <p className="text-sm text-gray-400">
            Valor: R$ {(order.total_amount || order.sale_price || 0).toFixed(2)}
          </p>
        </div>
      </CardHeader>
      <CardFooter className="bg-gray-900/50 p-4 flex flex-col gap-3">
        <Badge className={`flex items-center gap-2 text-sm ${config.color} w-fit`}>
          <config.icon className="w-4 h-4" />
          {config.text}
        </Badge>
      </CardFooter>
    </Card>
  );
};

const OrderDetailsModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  const config = statusConfig[order.status] || statusConfig.pending_payment;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Detalhes do Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status */}
          <div>
            <Badge className={`flex items-center gap-2 text-sm ${config.color} w-fit`}>
              <config.icon className="w-4 h-4" />
              {config.text}
            </Badge>
          </div>

          {/* Produto */}
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-400">📦 Produto</h3>
            <div className="flex gap-4">
              <img 
                src={order.product_image || "https://via.placeholder.com/150"} 
                alt={order.product_title}
                className="w-24 h-24 object-cover rounded-lg border border-gray-600"
              />
              <div className="flex-1">
                <p className="font-semibold text-white mb-2">{order.product_title}</p>
                <p className="text-sm text-gray-400">Quantidade: {order.quantity || 1}</p>
                <p className="text-sm text-gray-400">Preço unitário: R$ {order.sale_price?.toFixed(2)}</p>
                <p className="text-lg font-bold text-green-400 mt-2">Total: R$ {order.total_amount?.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">👤 Dados do Cliente</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Nome:</span>
                <span className="text-sm text-white font-medium">{order.buyer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Email:</span>
                <span className="text-sm text-white font-medium">{order.buyer_email}</span>
              </div>
              {order.buyer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Telefone:</span>
                  <span className="text-sm text-white font-medium">{order.buyer_phone}</span>
                </div>
              )}
              {order.buyer_cpf && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">CPF:</span>
                  <span className="text-sm text-white font-medium">{order.buyer_cpf}</span>
                </div>
              )}
            </div>
          </div>

          {/* Endereço de Entrega */}
          {order.shipping_address && (
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">📍 Endereço de Entrega</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white">
                  {order.shipping_address.street}, {order.shipping_address.number}
                </p>
                {order.shipping_address.complement && (
                  <p className="text-gray-300">{order.shipping_address.complement}</p>
                )}
                <p className="text-gray-300">
                  {order.shipping_address.neighborhood}
                </p>
                <p className="text-gray-300">
                  {order.shipping_address.city} - {order.shipping_address.state}
                </p>
                <p className="text-gray-300">
                  CEP: {order.shipping_address.zip_code}
                </p>
              </div>
            </div>
          )}

          {/* Código de Rastreio */}
          {order.tracking_code && (
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-indigo-400">🚚 Rastreamento</h3>
              <p className="text-sm text-gray-300">Código:</p>
              <p className="text-lg font-mono text-green-400 font-bold">{order.tracking_code}</p>
            </div>
          )}

          {/* Datas */}
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">📅 Cronologia</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Pedido realizado:</span>
                <span className="text-white">{new Date(order.created_date).toLocaleString('pt-BR')}</span>
              </div>
              {order.payment_confirmed_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Pagamento confirmado:</span>
                  <span className="text-white">{new Date(order.payment_confirmed_date).toLocaleString('pt-BR')}</span>
                </div>
              )}
              {order.shipped_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Enviado em:</span>
                  <span className="text-white">{new Date(order.shipped_date).toLocaleString('pt-BR')}</span>
                </div>
              )}
              {order.delivered_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Entregue em:</span>
                  <span className="text-white">{new Date(order.delivered_date).toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" className="border-gray-600 text-white">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function MyCatalogOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
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
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <OrderDetailsModal 
        order={selectedOrder}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}