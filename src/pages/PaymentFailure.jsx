import React, { useEffect, useState } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';

export default function PaymentFailure() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const [order, setOrder] = useState(null);

  useEffect(() => { (async ()=> { const list = await base44.entities.AsaasOrder.filter({ id: orderId }); setOrder(list?.[0] || null); })(); }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-2">Pagamento não aprovado</h1>
        <p className="text-gray-300 mb-4">Tente novamente com outro método ou verifique seus dados.</p>
        {order && (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 text-left">
            <div>Número do pedido: <strong>{order.orderNumber}</strong></div>
            <div>Total: <strong>R$ {fmtBR(Number(order.totalAmount))}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}