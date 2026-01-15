import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { asaasPollPaymentStatus } from '@/functions/asaasPollPaymentStatus';
import { createPageUrl } from '@/utils';

export default function OrderStatus() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);

  const load = async () => {
    const ord = await base44.entities.AsaasOrder.get(orderId);
    setOrder(ord);
    const pays = await base44.entities.AsaasPayment.filter({ orderId });
    setPayment(pays?.[0] || null);
  };

  useEffect(() => { load(); }, [orderId]);

  const refresh = async () => {
    if (payment?.asaasPaymentId) {
      await asaasPollPaymentStatus({ asaasPaymentId: payment.asaasPaymentId });
      await load();
    }
  };

  if (!order) return <div className="min-h-screen bg-gray-900 text-white p-6">Carregando...</div>;

  const paid = order.status === 'PAID';
  const failed = ['FAILED','CANCELED','EXPIRED'].includes(order.status || '');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader><CardTitle>Status do Pedido</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div>Número: <strong>{order.orderNumber}</strong></div>
            <div>Total: <strong>R$ {Number(order.totalAmount).toFixed(2)}</strong></div>
            <div>Status: <strong>{order.status}</strong></div>
            {payment && <div>Pagamento: <strong>{payment.normalizedStatus || payment.status}</strong></div>}
            <div className="flex gap-2 mt-3">
              <Button onClick={refresh} className="bg-emerald-600 hover:bg-emerald-700">Atualizar</Button>
              {paid && (
                <a href={createPageUrl('PaymentSuccess') + `?orderId=${order.id}`}><Button variant="outline" className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Ver Recibo</Button></a>
              )}
              {failed && (
                <a href={createPageUrl('PaymentFailure') + `?orderId=${order.id}`}><Button variant="outline" className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Detalhes</Button></a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}