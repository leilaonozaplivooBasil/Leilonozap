import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  TruckIcon,
  CheckCircle,
  Clock,
  ArrowLeft,
  Mail
} from 'lucide-react';

export default function CatalogOrderTracking() {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const saleId = new URLSearchParams(location.search).get('sale_id');

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true);

        // Busca venda via backend (bypass RLS)
        const result = await base44.functions.invoke('getCatalogOrderById', { sale_id: saleId });
        const data = result?.data || result;
        if (data?.found && data?.order) {
          setOrder(data.order);
          console.log('✅ Pedido carregado:', data.order.id);
        } else {
          console.warn('⚠️ Nenhum pedido encontrado para ID:', saleId);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados do pedido:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (saleId) {
      console.log('🔍 Buscando pedido com ID:', saleId);
      loadOrderData();
    } else {
      console.warn('⚠️ Nenhum sale_id na URL');
      setIsLoading(false);
    }
  }, [saleId]);

  const getStatusInfo = (status) => {
    const statuses = {
      pending_payment: {
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
      processing: {
        label: 'Processando',
        color: 'bg-blue-500',
        icon: Package,
        description: 'Seu pedido está sendo preparado'
      },
      shipped: {
        label: 'Em Transporte',
        color: 'bg-indigo-500',
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
    return statuses[status] || statuses.pending_payment;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando pedido...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white mb-4">Pedido não encontrado</p>
          <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>
    );
  }

  const status = order.status || 'pending_payment';
  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  // Verifica se passou por cada etapa
  const isPaid = status === 'paid' || status === 'processing' || status === 'shipped' || status === 'delivered';
  const isShipped = status === 'shipped' || status === 'delivered';
  const isDelivered = status === 'delivered';

  return (
    <div className="min-h-screen bg-gray-900 p-6">
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
          <h1 className="text-2xl font-bold text-white">
            Acompanhar Pedido
          </h1>
        </div>

        {/* Status Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full ${statusInfo.color} flex items-center justify-center shadow-lg`}>
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {statusInfo.label}
                </h2>
                <p className="text-gray-400">
                  {statusInfo.description}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className={`flex items-center gap-3 ${isPaid ? 'opacity-100' : 'opacity-50'}`}>
                <CheckCircle className={`w-5 h-5 ${isPaid ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium text-white">Pagamento confirmado</span>
              </div>
              <div className={`flex items-center gap-3 ${isShipped ? 'opacity-100' : 'opacity-50'}`}>
                <TruckIcon className={`w-5 h-5 ${isShipped ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium text-white">Em transporte</span>
              </div>
              <div className={`flex items-center gap-3 ${isDelivered ? 'opacity-100' : 'opacity-50'}`}>
                <Package className={`w-5 h-5 ${isDelivered ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium text-white">Entregue</span>
              </div>
            </div>

            {/* Código de Rastreio */}
            {order.tracking_code && (isShipped || isDelivered) && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="font-semibold mb-2 text-white">
                  Código de Rastreio
                </h3>
                <div className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                  <code className="font-mono text-lg text-white">
                    {order.tracking_code}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(order.tracking_code);
                      alert('✅ Código copiado!');
                    }}
                    className="bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900"
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-xs mt-2 text-gray-400">
                  Use este código para rastrear sua encomenda no site dos Correios
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produto */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Detalhes do Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {order.product_image && (
                <img
                  src={order.product_image}
                  alt={order.product_title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">
                  {order.product_title}
                </h3>
                <p className="text-2xl font-bold text-green-400">
                  R$ {(order.total_amount || order.sale_price)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-400">
              Entre em contato conosco caso tenha alguma dúvida sobre seu pedido.
            </p>
            <div className="flex items-center gap-2 text-white">
              <Mail className="w-4 h-4" />
              <span className="font-medium">relacionamento@leilaonozap.com</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}