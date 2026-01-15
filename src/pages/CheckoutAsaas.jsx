import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, QrCode, Lock, Package, MapPin, Truck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { asaasCreateCardPayment } from '@/functions/asaasCreateCardPayment';
import { calculateShipping } from '@/functions/calculateShipping';

export default function CheckoutAsaas() {
  const navigate = useNavigate();

  const [buyer, setBuyer] = useState({ name: '', cpfCnpj: '', mobilePhone: '', email: '' });
  const [item, setItem] = useState({ name: 'Pedido avulso', qty: 1, price: 100 });
  const [method, setMethod] = useState('CARD');
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({ zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState('');

  const total = useMemo(() => (Number(item.qty||1) * Number(item.price||0)), [item]);
  const shippingCost = useMemo(() => {
    const opt = shippingOptions.find(o => o.name === selectedShipping);
    return opt ? Number(opt.valor || 0) : 0;
  }, [shippingOptions, selectedShipping]);
  const totalWithShipping = useMemo(() => Number(total) + Number(shippingCost || 0), [total, shippingCost]);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const auctionId = params.get('auction_id');
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const u = JSON.parse(savedUser);
          setBuyer(v => ({
            ...v,
            name: u.full_name || v.name,
            cpfCnpj: u.cpf || v.cpfCnpj,
            mobilePhone: u.phone || v.mobilePhone,
            email: u.email || v.email,
          }));
        }
        if (auctionId) {
          const list = await base44.entities.Auction.filter({ id: auctionId });
          const a = list?.[0];
          if (a) {
            const price = Number(a.current_price || a.buy_now_price || 0);
            setItem({ name: a.title || 'Pedido avulso', qty: 1, price });
          }
        }
      } catch {}
    })();
  }, []);

  const createOrder = async () => {
    const orderNumber = 'ORD-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const currentUser = await base44.auth.me().catch(()=>null);
    const order = await base44.entities.AsaasOrder.create({
      orderNumber,
      userId: currentUser?.id || null,
      items: [{ name: item.name, qty: Number(item.qty), price: Number(item.price) }],
      totalAmount: totalWithShipping,
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

    const handleCalcShipping = async () => {
      if (!address.zip) return;
      setShippingLoading(true);
      try {
        const { data } = await calculateShipping({ cepDestino: address.zip, productId: item.product_id || 'generic' });
        const opts = Object.entries(data || {}).map(([name, info]) => ({
          name,
          valor: Number((info && info.valor) ? info.valor : 0),
          prazo: info?.prazo || ''
        })).filter(o => !isNaN(o.valor));
        setShippingOptions(opts);
        if (opts.length > 0) setSelectedShipping(opts[0].name);
      } finally {
        setShippingLoading(false);
      }
    };

     return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna esquerda: Formulário de pagamento */}
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {step===1 ? 'Dados do Comprador' : step===2 ? 'Endereço de Entrega' : 'Finalizar Compra'}
            </h1>
            <p className="text-gray-500 mt-1">
              {step===1 ? 'Preencha seus dados para continuar' : step===2 ? 'Informe o endereço e calcule o frete' : 'Escolha seu método de pagamento preferido'}
            </p>

            {/* Etapa 1: Dados do comprador */}
            {step===1 && (
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-gray-700">Nome completo</Label>
                  <Input value={buyer.name} onChange={(e)=>setBuyer(v=>({...v, name: e.target.value}))} placeholder="Seu nome" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <Label className="text-gray-700">CPF/CNPJ</Label>
                  <Input value={buyer.cpfCnpj} onChange={(e)=>setBuyer(v=>({...v, cpfCnpj: e.target.value}))} placeholder="000.000.000-00" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div>
                  <Label className="text-gray-700">Celular</Label>
                  <Input value={buyer.mobilePhone} onChange={(e)=>setBuyer(v=>({...v, mobilePhone: e.target.value}))} placeholder="(00) 90000-0000" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-gray-700">E-mail (opcional)</Label>
                  <Input value={buyer.email} onChange={(e)=>setBuyer(v=>({...v, email: e.target.value}))} placeholder="voce@email.com" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div className="sm:col-span-2 flex justify-end mt-2">
                  <Button onClick={()=>setStep(2)} disabled={!buyer.name || !buyer.cpfCnpj || !buyer.mobilePhone} className="bg-gray-900 hover:bg-black text-white">
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 2: Endereço e frete */}
            {step===2 && (
              <div className="mt-6 space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-700">CEP</Label>
                    <Input value={address.zip} onChange={(e)=>setAddress(v=>({...v, zip: e.target.value}))} placeholder="00000-000" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-gray-700">Rua</Label>
                    <Input value={address.street} onChange={(e)=>setAddress(v=>({...v, street: e.target.value}))} placeholder="Rua" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Número</Label>
                    <Input value={address.number} onChange={(e)=>setAddress(v=>({...v, number: e.target.value}))} placeholder="123" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Complemento</Label>
                    <Input value={address.complement} onChange={(e)=>setAddress(v=>({...v, complement: e.target.value}))} placeholder="Apto, bloco..." className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Bairro</Label>
                    <Input value={address.neighborhood} onChange={(e)=>setAddress(v=>({...v, neighborhood: e.target.value}))} placeholder="Bairro" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <Label className="text-gray-700">Cidade</Label>
                    <Input value={address.city} onChange={(e)=>setAddress(v=>({...v, city: e.target.value}))} placeholder="Cidade" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                  <div>
                    <Label className="text-gray-700">UF</Label>
                    <Input value={address.state} onChange={(e)=>setAddress(v=>({...v, state: e.target.value}))} placeholder="SP" className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleCalcShipping} disabled={!address.zip || shippingLoading} className="bg-gray-900 hover:bg-black text-white">
                    {shippingLoading ? 'Calculando...' : 'Calcular frete'}
                  </Button>
                  {shippingOptions.length > 0 && (
                    <div className="flex-1">
                      <Label className="text-gray-700">Opção de frete</Label>
                      <Select value={selectedShipping} onValueChange={setSelectedShipping}>
                        <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingOptions.map(opt => (
                            <SelectItem key={opt.name} value={opt.name}>
                              {opt.name} - R$ {opt.valor.toFixed(2)} {opt.prazo && `(${opt.prazo})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={()=>setStep(1)} className="border-gray-300">Voltar</Button>
                  <Button onClick={()=>setStep(3)} disabled={shippingOptions.length===0 || !selectedShipping} className="bg-gray-900 hover:bg-black text-white">Continuar</Button>
                </div>
              </div>
            )}

            {/* Etapa 3: Pagamento */}
            {step===3 && (
              <div>
                {/* Seleção de método */}
                <div className="flex items-center gap-2 mt-5">
                  <Button
                    variant="outline"
                    onClick={()=>setMethod('CARD')}
                    className={`border-gray-300 bg-white text-gray-900 hover:bg-gray-50 ${method==='CARD' ? 'ring-2 ring-gray-900' : ''}`}
                  >
                    <CreditCard className="w-4 h-4 mr-2"/>
                    Cartão de crédito
                  </Button>
                  <Button variant="outline" disabled className="border-gray-200 bg-gray-100 text-gray-400">
                    Boleto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={()=>setMethod('PIX')}
                    className={`border-gray-300 bg-white text-gray-900 hover:bg-gray-50 ${method==='PIX' ? 'ring-2 ring-gray-900' : ''}`}
                  >
                    <QrCode className="w-4 h-4 mr-2"/>
                    Pix
                  </Button>
                </div>

                {/* Campos do cartão */}
                {method==='CARD' && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <Label className="text-gray-700">Número do Cartão</Label>
                      <Input placeholder="0000 0000 0000 0000" value={card.number} onChange={(e)=>setCard(v=>({...v, number: e.target.value}))} className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                    </div>
                    <div>
                      <Label className="text-gray-700">Nome no Cartão</Label>
                      <Input placeholder="Nome como está no cartão" value={card.holderName} onChange={(e)=>setCard(v=>({...v, holderName: e.target.value}))} className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-700">Validade</Label>
                        <Input placeholder="MM/AA" value={card.expiryMonth && card.expiryYear ? `${card.expiryMonth}/${String(card.expiryYear).slice(-2)}` : ''}
                          onChange={(e)=>{
                            const val = e.target.value.replace(/[^0-9/]/g,'');
                            const [mm, aa] = val.split('/');
                            setCard(v=>({...v, expiryMonth: (mm||'').slice(0,2), expiryYear: (aa||'').slice(0,2)}));
                          }}
                          className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                      </div>
                      <div>
                        <Label className="text-gray-700">CVV</Label>
                        <Input placeholder="123" value={card.ccv} onChange={(e)=>setCard(v=>({...v, ccv: e.target.value}))} className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700">Parcelas</Label>
                      <Select value={String(installments)} onValueChange={(v)=>setInstallments(Number(v))}>
                        <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900">
                          <SelectValue placeholder={`1 x de R$${Number(total).toFixed(2)} (sem juros)`} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}).map((_,i)=> (
                            <SelectItem key={i+1} value={String(i+1)}>{`${i+1} x de R$${(total/(i+1)).toFixed(2)}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="save-card" />
                      <Label htmlFor="save-card" className="text-gray-700">Salvar cartão para compras futuras</Label>
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                      <Lock className="w-4 h-4 mr-2"/>
                      Seus dados estão protegidos com criptografia SSL
                    </div>
                    <Button onClick={payCard} disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white">
                      {`Finalizar pagamento (R$${Number(totalWithShipping).toFixed(2)})`}
                    </Button>
                  </div>
                )}

                {/* Alternativa Pix */}
                {method==='PIX' && (
                  <div className="mt-6 space-y-4">
                    <div className="text-sm text-gray-600">Você selecionou pagamento via Pix.</div>
                    <Button onClick={payPix} disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white">
                      {`Pagar com Pix (R$${Number(totalWithShipping).toFixed(2)})`}
                    </Button>
                  </div>
                )}

                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={()=>setStep(2)} className="border-gray-300">Voltar</Button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita: Resumo do pedido */}
          <div className="bg-white rounded-xl shadow p-6 h-fit">
            <h2 className="text-2xl font-semibold text-gray-900">Resumo do Pedido</h2>
            <p className="text-gray-500 mt-1">Detalhes da sua compra</p>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                  <Package className="w-6 h-6"/>
                </div>
                <div>
                  <div className="font-medium text-gray-900 truncate max-w-[180px]" title={item.name}>{item.name}</div>
                  <div className="text-sm text-gray-500">Quantidade: {item.qty}</div>
                </div>
              </div>
              <div className="text-right font-semibold text-gray-900">R$ {Number(total).toFixed(2)}</div>
            </div>

            <hr className="my-5" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="text-gray-900">R$ {Number(total).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Frete</span><span className="text-gray-900">{shippingCost ? `R$ ${Number(shippingCost).toFixed(2)}` : 'A calcular'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Desconto</span><span className="text-emerald-600">R$ 0,00</span></div>
            </div>

            <hr className="my-5" />

            <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">Total</span>
            <span className="text-2xl font-bold text-gray-900">R$ {Number(totalWithShipping).toFixed(2)}</span>
            </div>

            <div className="text-xs text-gray-400 mt-5 space-y-1">
              <div>* Frete calculado após CEP</div>
              <div>* Entrega estimada: 3-5 dias úteis</div>
            </div>

            <div className="text-sm text-gray-700 mt-6 font-medium">Métodos de pagamentos aceitos:</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Visa','Mastercard','Elo','Boleto','Pix'].map((m)=> (
                <span key={m} className="px-2 py-1 rounded-md border text-xs text-gray-700 bg-gray-50 border-gray-200">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}