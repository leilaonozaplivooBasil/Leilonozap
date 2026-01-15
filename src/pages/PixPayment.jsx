import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { asaasCreatePixPayment } from '@/functions/asaasCreatePixPayment';
import { asaasPollPaymentStatus } from '@/functions/asaasPollPaymentStatus';

export default function PixPayment() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const [payment, setPayment] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await asaasCreatePixPayment({ orderId });
        setPayment(data.payment);
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || 'Falha ao gerar Pix';
        try {
          await base44.entities.SystemLog.create({
            step: 'PixPayment_Create',
            status: 'error',
            message: msg,
            component_name: 'PixPayment',
            error_details: { stack: err?.stack, data: err?.response?.data },
            url: window.location.href,
            user_agent: navigator.userAgent
          });
        } catch (_) {}
        alert(`Erro ao gerar Pix: ${msg}`);
      }
    })();
  }, [orderId]);

  useEffect(() => {
    if (!payment?.pixExpirationDate) return;
    const end = new Date(payment.pixExpirationDate).getTime();
    const int = setInterval(() => {
      const diff = Math.max(0, end - Date.now());
      setTimeLeft(Math.floor(diff/1000));
    }, 1000);
    return () => clearInterval(int);
  }, [payment]);

  const copy = async () => {
    if (payment?.pixPayload) await navigator.clipboard.writeText(payment.pixPayload);
  };

  const refresh = async () => {
    try {
      const { data } = await asaasPollPaymentStatus({ asaasPaymentId: payment.asaasPaymentId });
      if (data?.normalizedStatus === 'PAID') {
        window.location.href = createPageUrl('PaymentSuccess') + `?orderId=${payment.orderId}`;
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Falha ao checar status';
      try {
        await base44.entities.SystemLog.create({
          step: 'PixPayment_Refresh',
          status: 'error',
          message: msg,
          component_name: 'PixPayment',
          error_details: { stack: err?.stack, data: err?.response?.data },
          url: window.location.href,
          user_agent: navigator.userAgent
        });
      } catch (_) {}
    }
  };

  if (!payment) return <div className="min-h-screen bg-gray-900 text-white p-6">Gerando Pix...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader><CardTitle>Pagamento via Pix</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-center">
            {payment.pixEncodedImageBase64 && (
              <img src={`data:image/png;base64,${payment.pixEncodedImageBase64}`} alt="QR Code Pix" className="mx-auto w-60 h-60 object-contain bg-white rounded" />
            )}
            <div>
              <Button variant="outline" onClick={copy} className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Copiar código Pix</Button>
            </div>
            <div>Expira em: {timeLeft ?? '-'}s</div>
            <div className="flex justify-center gap-2">
              <Button onClick={refresh} className="bg-emerald-600 hover:bg-emerald-700">Já paguei, verificar</Button>
              <a href={createPageUrl('OrderStatus') + `?orderId=${payment.orderId}`} className="inline-block">
                <Button variant="outline" className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Ver status</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}