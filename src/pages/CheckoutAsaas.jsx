import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { asaasCreateCardPayment } from '@/functions/asaasCreateCardPayment';

export default function CheckoutAsaas() {
  const navigate = useNavigate();

  const [buyer, setBuyer] = useState({ name: '', cpfCnpj: '', mobilePhone: '', email: '' });
  const [item, setItem] = useState({ name: 'Pedido avulso', qty: 1, price: 100 });
  const [method, setMethod] = useState('PIX');
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => (Number(item.qty||1) * Number(item.price||0)), [item]);

  const createOrder = async () => {
    const orderNumber = 'ORD-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const currentUser = await base44.auth.me().catch(()=>null);
    const order = await base44.entities.AsaasOrder.create({
      orderNumber,
      userId: currentUser?.id || null,
      items: [{ name: item.name, qty: Number(item.qty), price: Number(item.price) }],
      totalAmount: total,
      status: 'CREATED',
      buyer: buyer,
      cpfCnpj: String(buyer.cpfCnpj).replace(/\D/g,''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return order;
  };

  const payPix = async () => {
    setLoading(true);
    try {
      const order = await createOrder();
      navigate(createPageUrl('PixPayment') + `?orderId=${order.id}`);
    } finally { setLoading(false); }
  };

  const payCard = async () => {
    setLoading(true);
    try {
      const order = await createOrder();
      const { data } = await asaasCreateCardPayment({ orderId: order.id, cardData: card, installments: Number(installments) });
      if (data?.payment?.normalizedStatus === 'PAID') {
        navigate(createPageUrl('PaymentSuccess') + `?orderId=${order.id}`);
      } else {
        navigate(createPageUrl('OrderStatus') + `?orderId=${order.id}`);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader><CardTitle>Dados do Comprador</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Nome completo" value={buyer.name} onChange={(e)=>setBuyer(v=>({...v, name: e.target.value}))} className="bg-gray-900 border-gray-700" />
            <Input placeholder="CPF/CNPJ" value={buyer.cpfCnpj} onChange={(e)=>setBuyer(v=>({...v, cpfCnpj: e.target.value}))} className="bg-gray-900 border-gray-700" />
            <Input placeholder="Celular" value={buyer.mobilePhone} onChange={(e)=>setBuyer(v=>({...v, mobilePhone: e.target.value}))} className="bg-gray-900 border-gray-700" />
            <Input placeholder="E-mail (opcional)" value={buyer.email} onChange={(e)=>setBuyer(v=>({...v, email: e.target.value}))} className="bg-gray-900 border-gray-700" />
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3 items-end">
            <Input placeholder="Descrição" value={item.name} onChange={(e)=>setItem(v=>({...v, name: e.target.value}))} className="bg-gray-900 border-gray-700 sm:col-span-2" />
            <Input type="number" placeholder="Qtd" value={item.qty} onChange={(e)=>setItem(v=>({...v, qty: e.target.value}))} className="bg-gray-900 border-gray-700" />
            <Input type="number" placeholder="Preço" value={item.price} onChange={(e)=>setItem(v=>({...v, price: e.target.value}))} className="bg-gray-900 border-gray-700" />
            <div className="text-right sm:col-span-3">Total: <strong>R$ {Number(total).toFixed(2)}</strong></div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader><CardTitle>Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant={method==='PIX'?'default':'outline'} onClick={()=>setMethod('PIX')} className={method==='PIX'? 'bg-emerald-600 hover:bg-emerald-700':'border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800'}><QrCode className="w-4 h-4 mr-2"/> Pix</Button>
              <Button variant={method==='CARD'?'default':'outline'} onClick={()=>setMethod('CARD')} className={method==='CARD'? 'bg-blue-600 hover:bg-blue-700':'border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800'}><CreditCard className="w-4 h-4 mr-2"/> Cartão</Button>
            </div>

            {method==='CARD' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Nome no cartão" value={card.holderName} onChange={(e)=>setCard(v=>({...v, holderName: e.target.value}))} className="bg-gray-900 border-gray-700 sm:col-span-2" />
                <Input placeholder="Número" value={card.number} onChange={(e)=>setCard(v=>({...v, number: e.target.value}))} className="bg-gray-900 border-gray-700 sm:col-span-2" />
                <Input placeholder="Mês (MM)" value={card.expiryMonth} onChange={(e)=>setCard(v=>({...v, expiryMonth: e.target.value}))} className="bg-gray-900 border-gray-700" />
                <Input placeholder="Ano (YYYY)" value={card.expiryYear} onChange={(e)=>setCard(v=>({...v, expiryYear: e.target.value}))} className="bg-gray-900 border-gray-700" />
                <Input placeholder="CVV" value={card.ccv} onChange={(e)=>setCard(v=>({...v, ccv: e.target.value}))} className="bg-gray-900 border-gray-700" />
                <div>
                  <label className="block text-sm mb-1">Parcelas</label>
                  <Select value={String(installments)} onValueChange={(v)=>setInstallments(Number(v))}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue placeholder="1x" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}).map((_,i)=> <SelectItem key={i+1} value={String(i+1)}>{i+1}x</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {method==='PIX' ? (
                <Button onClick={payPix} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">Gerar Pix</Button>
              ) : (
                <Button onClick={payCard} disabled={loading} className="bg-blue-600 hover:bg-blue-700">Pagar com Cartão</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}