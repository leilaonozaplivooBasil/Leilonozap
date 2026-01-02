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

export default function OrderTrackingSaiDeBaixo() {
  const [auction, setAuction] = useState(null);
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const auctionId = new URLSearchParams(location.search).get('auction_id');

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true);
        
        const auctionData = await base44.entities.Auction.filter({ id: auctionId });
        if (auctionData.length > 0) {
          setAuction(auctionData[0]);
        }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-900">Carregando pedido...</div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-900 mb-4">Pedido não encontrado</p>
          <Button onClick={() => navigate(-1)} className="bg-red-600 hover:bg-red-700">Voltar</Button>
        </div>
      </div>
    );
  }

  const status = auction.order_status || 'awaiting_payment';

  const getStatusInfo = (status) => {
    const statuses = {
      awaiting_payment: { 
        label: 'Aguardando Pagamento', 
        color: 'bg-red-600', 
        icon: Clock,
        description: 'Realize o pagamento para prosseguir com o envio'
      },
      paid: { 
        label: 'Pagamento Confirmado', 
        color: 'bg-red-600', 
        icon: CheckCircle,
        description: 'Seu pedido está sendo preparado para envio'
      },
      shipped: { 
        label: 'Em Transporte', 
        color: 'bg-red-600', 
        icon: TruckIcon,
        description: 'Seu pedido está a caminho'
      },
      delivered: { 
        label: 'Entregue', 
        color: 'bg-red-600', 
        icon: Package,
        description: 'Pedido entregue com sucesso!'
      },
      canceled: { 
        label: 'Cancelado', 
        color: 'bg-red-600', 
        icon: Clock,
        description: 'Este pedido foi cancelado'
      }
    };
    return statuses[status] || statuses.awaiting_payment;
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Acompanhar Pedido
          </h1>
        </div>

        {/* Status Card */}
        <Card className="bg-white border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full ${statusInfo.color} flex items-center justify-center shadow-lg`}>
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {statusInfo.label}
                </h2>
                <p className="text-gray-600">
                  {statusInfo.description}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className={`flex items-center gap-3 ${status !== 'awaiting_payment' ? 'opacity-100' : 'opacity-50'}`}>
                <CheckCircle className={`w-5 h-5 ${status !== 'awaiting_payment' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900">Pagamento confirmado</span>
              </div>
              <div className={`flex items-center gap-3 ${status === 'shipped' || status === 'delivered' ? 'opacity-100' : 'opacity-50'}`}>
                <TruckIcon className={`w-5 h-5 ${status === 'shipped' || status === 'delivered' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900">Em transporte</span>
              </div>
              <div className={`flex items-center gap-3 ${status === 'delivered' ? 'opacity-100' : 'opacity-50'}`}>
                <Package className={`w-5 h-5 ${status === 'delivered' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900">Entregue</span>
              </div>
            </div>

            {/* Código de Rastreio */}
            {auction.tracking_code && (status === 'shipped' || status === 'delivered') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-2 text-gray-900">
                  Código de Rastreio
                </h3>
                <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
                  <code className="font-mono text-lg text-gray-900">
                    {auction.tracking_code}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(auction.tracking_code);
                      alert('✅ Código copiado!');
                    }}
                    className="border-gray-300 text-gray-700"
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-xs mt-2 text-gray-600">
                  Use este código para rastrear sua encomenda no site dos Correios
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes do Produto */}
        <Card className="bg-white border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-100">
            <CardTitle className="text-gray-900">Detalhes do Produto</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-4">
              {auction.image_urls && auction.image_urls[0] && (
                <img 
                  src={auction.image_urls[0]} 
                  alt={auction.title}
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                  {auction.title}
                </h3>
                <p className="text-2xl font-bold text-red-600">
                  R$ {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {auction.updated_date && (
                  <p className="text-sm text-gray-500 mt-2">
                    Arrematado em: {new Date(auction.updated_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Pagamento */}
        {payment && (
          <Card className="bg-white border-2 border-gray-200 shadow-lg">
            <CardHeader className="border-b-2 border-gray-100">
              <CardTitle className="text-gray-900">
                <CreditCard className="w-5 h-5 inline mr-2" />
                Informações de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Método:</span>
                <span className="font-medium text-gray-900">
                  {payment.payment_method === 'pix' ? 'PIX' : 
                   payment.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'Gateway'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
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
        <Card className="bg-white border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-100">
            <CardTitle className="text-gray-900">
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-gray-600">
              Entre em contato conosco caso tenha alguma dúvida sobre seu pedido.
            </p>
            <div className="flex items-center gap-2 text-gray-900">
              <Mail className="w-4 h-4" />
              <span className="font-medium">suporte@saidebaixo.com</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}