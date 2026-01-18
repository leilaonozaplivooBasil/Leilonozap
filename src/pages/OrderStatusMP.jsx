import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function OrderStatusMP() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');

  const [payment, setPayment] = useState(null);
  const [related, setRelated] = useState(null); // auction or catalog sale
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!ref) { setLoading(false); return; }
    const list = await base44.entities.MercadoPagoPayment.filter({ external_reference: ref });
    const p = list?.[0] || null;
    setPayment(p);

    if (p?.auction_id) {
      const a = await base44.entities.Auction.filter({ id: p.auction_id });
      setRelated(a?.[0] || null);
    } else if (p?.catalog_sale_id) {
      const s = await base44.entities.CatalogSale.filter({ id: p.catalog_sale_id });
      setRelated(s?.[0] || null);
    } else {
      setRelated(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [ref]);

  useEffect(() => {
    if (!ref) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [ref]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  const status = payment?.status || 'pending';
  const approved = status === 'approved';
  const pending = ['in_process', 'pending'].includes(status);
  const failed = ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status);

  const StatusIcon = approved ? CheckCircle2 : pending ? Clock : AlertTriangle;
  const statusLabel = approved ? 'Pagamento aprovado' : pending ? 'Aguardando confirmação' : 'Pagamento não aprovado';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${approved ? 'text-emerald-500' : pending ? 'text-yellow-400' : 'text-red-500'}`} />
            <CardTitle className="text-white">Status do Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-300">
            <div><strong>Referência:</strong> {ref || '-'}</div>
            <div><strong>Status:</strong> {status}</div>
            {payment?.payment_method && (<div><strong>Método:</strong> {payment.payment_method}</div>)}
            {payment?.amount && (<div><strong>Valor:</strong> R$ {Number(payment.amount).toFixed(2)}</div>)}
            <div className="text-sm mt-2">{statusLabel}. Esta página atualiza automaticamente.</div>
          </CardContent>
        </Card>

        {related && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-300">
              {payment?.auction_id ? (
                <>
                  <div><strong>Leilão:</strong> {related.title}</div>
                  <div><strong>Total:</strong> R$ {Number(related.current_price).toFixed(2)}</div>
                </>
              ) : (
                <>
                  <div><strong>Produto:</strong> {related.product_title}</div>
                  <div><strong>Total:</strong> R$ {Number(related.sale_price).toFixed(2)}</div>
                  <div><strong>Status do pedido:</strong> {related.status}</div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {payment?.auction_id && (
            <a href={createPageUrl('MyWinnings')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Ir para Meus Arremates</Button>
            </a>
          )}
          {payment?.catalog_sale_id && (
            <a href={createPageUrl('Catalog')}>
              <Button variant="outline" className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Voltar ao Catálogo</Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}