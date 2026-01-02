import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  TruckIcon, 
  CheckCircle, 
  Clock, 
  CreditCard,
  ArrowLeft,
  Mail
} from 'lucide-react';

export default function OrderTracking() {
  const [auction, setAuction] = useState(null);
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const auctionId = new URLSearchParams(location.search).get('auction_id');
  const isSaiDeBaixo = location.state?.fromSaiDeBaixo || sessionStorage.getItem('saiDeBaixoContext') === 'true';

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true);
        
        // Busca leilão
        const auctionData = await base44.entities.Auction.filter({ id: auctionId });
        if (auctionData.length > 0) {
          setAuction(auctionData[0]);
        }

        // Busca pagamento
        const paymentData = await base44.entities.Payment.filter({ auction_id: auctionId });
        if (paymentData.length > 0) {
          setPayment(paymentData[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do pedido:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (auctionId) {
      loadOrderData();
    }
  }, [auctionId]);

  const getStatusInfo = (status) => {
    const statuses = {
      awaiting_payment: { 
        label: 'Aguardando Pagamento', 
        color: 'bg-yellow-500', 
        icon: Clock,
        description: 'Realize o pagamento para prosseguir com o envio'
      },
      paid: { 
        label: 'Pagamento Confirmado', 
        color: 'bg-green-500', 
        icon: CheckCircle,
        description: 'Seu pedido está sendo preparado para envio'
      },
      shipped: { 
        label: 'Em Transporte', 
        color: 'bg-blue-500', 
        icon: TruckIcon,
        description: 'Seu pedido está a caminho'
      },
      delivered: { 
        label: 'Entregue', 
        color: 'bg-green-600', 
        icon: Package,
        description: 'Pedido entregue com sucesso!'
      },
      canceled: { 
        label: 'Cancelado', 
        color: 'bg-red-500', 
        icon: Clock,
        description: 'Este pedido foi cancelado'
      }
    };
    return statuses[status] || statuses.awaiting_payment;
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900'} flex items-center justify-center`}>
        <div className={`${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Carregando pedido...</div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900'} p-6`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} mb-4`}>Pedido não encontrado</p>
          <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>
    );
  }

  const status = auction.order_status || 'awaiting_payment';
  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-gradient-to-br from-gray-50 to-gray-100' : 'bg-gray-900'} p-6`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
            Acompanhar Pedido
          </h1>
        </div>

        {/* Status Card */}
        <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800 border-gray-700'}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full ${isSaiDeBaixo ? 'bg-red-600' : statusInfo.color} flex items-center justify-center shadow-lg`}>
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                  {statusInfo.label}
                </h2>
                <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                  {statusInfo.description}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className={`flex items-center gap-3 ${status !== 'awaiting_payment' ? 'opacity-100' : 'opacity-50'}`}>
                <CheckCircle className={`w-5 h-5 ${status !== 'awaiting_payment' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`font-medium ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Pagamento confirmado</span>
              </div>
              <div className={`flex items-center gap-3 ${status === 'shipped' || status === 'delivered' ? 'opacity-100' : 'opacity-50'}`}>
                <TruckIcon className={`w-5 h-5 ${status === 'shipped' || status === 'delivered' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className={`font-medium ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Em transporte</span>
              </div>
              <div className={`flex items-center gap-3 ${status === 'delivered' ? 'opacity-100' : 'opacity-50'}`}>
                <Package className={`w-5 h-5 ${status === 'delivered' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`font-medium ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Entregue</span>
              </div>
            </div>

            {/* Código de Rastreio */}
            {auction.tracking_code && (status === 'shipped' || status === 'delivered') && (
              <div className={`mt-6 pt-6 border-t ${isSaiDeBaixo ? 'border-gray-200' : 'border-gray-700'}`}>
                <h3 className={`font-semibold mb-2 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                  Código de Rastreio
                </h3>
                <div className={`${isSaiDeBaixo ? 'bg-gray-100' : 'bg-gray-900/50'} rounded-lg p-4 flex items-center justify-between`}>
                  <code className={`font-mono text-lg ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    {auction.tracking_code}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(auction.tracking_code);
                      alert('✅ Código copiado!');
                    }}
                    className="bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900"
                  >
                    Copiar
                  </Button>
                </div>
                <p className={`text-xs mt-2 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                  Use este código para rastrear sua encomenda no site dos Correios
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produto */}
        <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800 border-gray-700'}>
          <CardHeader>
            <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>
              Detalhes do Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {auction.image_urls && auction.image_urls[0] && (
                <img 
                  src={auction.image_urls[0]} 
                  alt={auction.title}
                  className={`w-24 h-24 object-cover rounded-lg ${isSaiDeBaixo ? 'border-2 border-gray-200' : ''}`}
                />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} mb-2`}>
                  {auction.title}
                </h3>
                <p className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`}>
                  R$ {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Pagamento */}
        {payment && (
          <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>
                <CreditCard className="w-5 h-5 inline mr-2" />
                Informações de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>Método:</span>
                <span className={`font-medium ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                  {payment.payment_method === 'pix' ? 'PIX' : 
                   payment.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'Gateway'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>Status:</span>
                <Badge className={
                  payment.status === 'paid' ? 'bg-green-600' :
                  payment.status === 'pending' ? 'bg-yellow-600' :
                  'bg-red-600'
                }>
                  {payment.status === 'paid' ? 'Pago' :
                   payment.status === 'pending' ? 'Pendente' : 'Falhou'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contato */}
        <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800 border-gray-700'}>
          <CardHeader>
            <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
              Entre em contato conosco caso tenha alguma dúvida sobre seu pedido.
            </p>
            <div className={`flex items-center gap-2 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
              <Mail className="w-4 h-4" />
              <span className="font-medium">relacionamento@leilaonozap.com</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}