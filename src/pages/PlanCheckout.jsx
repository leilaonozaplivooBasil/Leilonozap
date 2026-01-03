import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { CreditCard, Smartphone, ArrowLeft, Check, Copy, CheckCircle, User } from 'lucide-react';

// Importar Stripe
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_live_51QcWdFBjHfNcD5d0Yd5w6qHzafNk7cQKqzUZEuMwOkVvZKFaJHWgWKPUJYnxWc4CzcTWMWLvlzYXi8Sz4pGHO9gQ00tjL6bvI0');

export default function PlanCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [showCpfForm, setShowCpfForm] = useState(false);
  
  const plan = location.state?.plan;

  useEffect(() => {
    const savedUserJSON = localStorage.getItem('currentUser');
    if (savedUserJSON) {
      const user = JSON.parse(savedUserJSON);
      setCurrentUser(user);
      // Não preenche automaticamente - sempre pede CPF e telefone
      setCpf('');
      setPhone('');
    } else {
      navigate(createPageUrl("Partners"));
    }

    if (!plan) {
      navigate(createPageUrl("InvestorDashboard"));
    }
  }, [navigate, plan]);

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert("Por favor, selecione um método de pagamento");
      return;
    }

    // 🆕 Se for PIX, sempre mostra formulário de CPF/telefone
    if (paymentMethod === 'pix') {
      setShowCpfForm(true);
      return;
    }

    setIsProcessing(true);

    try {
      // 🎯 CRIA REGISTRO TEMPORÁRIO DE "LEILÃO" PARA O PLANO (igual aos leilões reais)
      const tempAuction = await base44.entities.Auction.create({
        title: `Plano de Investimento: ${plan.name}`,
        description: `Compra do plano ${plan.name} - Investimento de R$ ${plan.minInvestment.toLocaleString('pt-BR')}`,
        starting_price: plan.minInvestment,
        current_price: plan.minInvestment,
        increment: 0,
        buy_now_price: plan.minInvestment,
        end_time: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ended', // 🆕 Já marca como "ended" para não aparecer em leilões ativos
        order_status: 'awaiting_payment', // 🆕 Status de pedido
        category: 'outros',
        winner_id: currentUser.id,
        winner_name: currentUser.full_name,
        product_source: 'factory_new',
        is_test_auction: false,
        image_urls: plan.imageKey ? [
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
        ] : []
      });

      if (paymentMethod === 'pix') {
        // 🎯 USA EXATAMENTE O MESMO SISTEMA DOS LEILÕES
        const response = await base44.functions.invoke('createAbacatePayPix', {
          auction_id: tempAuction.id,
          user_name: currentUser.full_name,
          user_email: currentUser.email,
          user_phone: phone.replace(/\D/g, ''),
          user_cpf: cpf.replace(/\D/g, '')
        });

        if (response.data && response.data.success) {
          setPixData({
            qr_code: `data:image/png;base64,${response.data.qr_code_base64}`,
            copy_paste: response.data.pix_code,
            transaction_id: response.data.billing_id,
            auction_id: tempAuction.id // 🆕 Guarda o ID para rastreamento
          });
          setIsProcessing(false);
        } else {
          throw new Error(response.data?.error || 'Erro ao gerar PIX');
        }

      } else if (paymentMethod === 'card') {
        // 🎯 USA EXATAMENTE O MESMO SISTEMA DOS LEILÕES
        const response = await base44.functions.invoke('stripeCheckout', {
          auction_id: tempAuction.id
        });

        if (response.data && response.data.checkout_url) {
          window.location.href = response.data.checkout_url;
        } else {
          throw new Error(response.data?.error || 'Erro ao criar sessão de pagamento');
        }
      }

    } catch (error) {
      console.error("Erro completo:", error);
      const errorMsg = error.response?.data?.error || error.message || "Erro desconhecido. Tente novamente.";
      alert("Erro ao processar pagamento: " + errorMsg);
      setIsProcessing(false);
    }
  };



  if (!plan || !currentUser) {
    return null;
  }

  const profit = plan.minInvestment * (plan.expectedReturn / 100);
  const total = plan.minInvestment + profit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("InvestorDashboard"))}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-3xl font-bold mb-8">
          Finalizar <span className="text-green-400">Compra</span>
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Resumo do Plano */}
          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">Resumo da Compra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Plano Selecionado</p>
                <p className="text-2xl font-bold text-white">{plan.name}</p>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor da Compra</span>
                  <span className="text-white font-semibold">
                    R$ {plan.minInvestment.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Retorno ({plan.expectedReturn}%)</span>
                  <span className="text-green-400 font-semibold">
                    + R$ {profit.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prazo</span>
                  <span className="text-white font-semibold">{plan.duration} dias</span>
                </div>
              </div>

              <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total a Receber</span>
                  <span className="text-2xl font-bold text-green-400">
                    R$ {total.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-3 text-sm text-gray-400">
                <Check className="w-4 h-4 inline mr-2 text-green-400" />
                Gestão 100% profissional
                <br />
                <Check className="w-4 h-4 inline mr-2 text-green-400" />
                Risco zero - garantia é o produto
              </div>
            </CardContent>
          </Card>

          {/* Método de Pagamento */}
          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">
                {pixData ? 'Pagamento PIX' : 'Método de Pagamento'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {pixData ? (
                // Exibe QR Code PIX (qr_code_base64 já vem com prefixo data:image/png;base64, da AbacatePay)
                <div className="space-y-4">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                    <img 
                      src={pixData.qr_code_base64} 
                      alt="QR Code PIX" 
                      className="w-64 h-64 mx-auto mb-4 rounded-lg"
                    />
                    <p className="text-sm text-gray-700 mb-2">Ou copie o código PIX:</p>
                    <div className="flex gap-2">
                      <input
                        value={pixData.pix_code}
                        readOnly
                        className="text-xs bg-white border border-gray-300 rounded px-2 py-1 flex-1 font-mono"
                      />
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.pix_code);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        size="icon"
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-lg font-bold mt-4 text-green-700">
                      R$ {pixData.amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/30 text-sm text-gray-300">
                    <p className="font-semibold mb-2">Instruções:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Abra o app do seu banco</li>
                      <li>Escolha pagar via PIX</li>
                      <li>Escaneie o QR Code ou cole o código</li>
                      <li>Confirme o pagamento</li>
                    </ol>
                    <p className="mt-3 text-yellow-400">
                      ⚠️ Aguarde a confirmação do pagamento. Isso pode levar alguns minutos.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate(createPageUrl("InvestorDashboard"))}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Dashboard
                    </Button>
                    {pixData.auction_id && (
                      <Button
                        onClick={() => navigate(`${createPageUrl("OrderTracking")}?auction_id=${pixData.auction_id}`)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Acompanhar Pedido
                      </Button>
                    )}
                  </div>
                </div>
              ) : showCpfForm ? (
                // 🆕 FORMULÁRIO DE CPF E TELEFONE
                <div className="space-y-4">
                  <div className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/30 mb-4">
                    <p className="text-blue-400 text-sm">
                      📝 Para pagamento via PIX, precisamos do seu CPF e telefone
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">CPF *</label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 11) value = value.slice(0, 11);

                        // Formata: 123.456.789-01
                        if (value.length > 9) {
                          value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
                        } else if (value.length > 6) {
                          value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
                        } else if (value.length > 3) {
                          value = `${value.slice(0, 3)}.${value.slice(3)}`;
                        }

                        setCpf(value);
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Telefone (com DDD) *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 11) value = value.slice(0, 11);

                        // Formata: (11) 99999-9999
                        if (value.length > 10) {
                          value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                        } else if (value.length > 6) {
                          value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
                        } else if (value.length > 2) {
                          value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        }

                        setPhone(value);
                      }}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => setShowCpfForm(false)}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={async () => {
                        const cleanCpf = cpf.replace(/\D/g, '');
                        const cleanPhone = phone.replace(/\D/g, '');

                        if (cleanCpf.length !== 11) {
                          alert("CPF deve ter 11 dígitos");
                          return;
                        }

                        if (cleanPhone.length < 10) {
                          alert("Telefone inválido");
                          return;
                        }

                        setIsProcessing(true);

                        try {
                          // Salva CPF e telefone no perfil do usuário
                          await base44.entities.AppUser.update(currentUser.id, {
                            cpf: cleanCpf,
                            phone: cleanPhone
                          });

                          // Atualiza localStorage
                          const updatedUser = { ...currentUser, cpf: cleanCpf, phone: cleanPhone };
                          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                          setCurrentUser(updatedUser);

                          // Cria o leilão temporário e gera o PIX
                          const tempAuction = await base44.entities.Auction.create({
                            title: `Plano de Investimento: ${plan.name}`,
                            description: `Compra do plano ${plan.name} - Investimento de R$ ${plan.minInvestment.toLocaleString('pt-BR')}`,
                            starting_price: plan.minInvestment,
                            current_price: plan.minInvestment,
                            increment: 0,
                            buy_now_price: plan.minInvestment,
                            end_time: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                            status: 'ended',
                            order_status: 'awaiting_payment',
                            category: 'outros',
                            winner_id: currentUser.id,
                            winner_name: currentUser.full_name,
                            product_source: 'factory_new',
                            is_test_auction: false,
                            image_urls: plan.imageKey ? [
                              'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
                            ] : []
                          });

                          const response = await base44.functions.invoke('createAbacatePayPix', {
                            auction_id: tempAuction.id,
                            user_name: currentUser.full_name,
                            user_email: currentUser.email,
                            user_phone: cleanPhone,
                            user_cpf: cleanCpf
                          });

                          if (response.data && response.data.success) {
                            setPixData({
                              qr_code_base64: response.data.qr_code_base64,
                              pix_code: response.data.pix_code,
                              billing_id: response.data.billing_id,
                              amount: plan.minInvestment,
                              auction_id: tempAuction.id
                            });
                            setShowCpfForm(false);
                          } else {
                            throw new Error(response.data?.error || 'Erro ao gerar PIX');
                          }
                        } catch (error) {
                          console.error("Erro completo:", error);
                          alert("Erro ao processar: " + (error.message || "Tente novamente"));
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        'Continuar'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                // Seleção de método de pagamento
                <>

              {/* PIX */}
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'pix' ? 'bg-green-600' : 'bg-gray-700'
                  }`}>
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-white">PIX</p>
                    <p className="text-sm text-gray-400">Pagamento instantâneo</p>
                  </div>
                  {paymentMethod === 'pix' && (
                    <Check className="w-6 h-6 text-green-400" />
                  )}
                </div>
              </button>

              {/* Cartão de Crédito */}
              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'card' ? 'bg-green-600' : 'bg-gray-700'
                  }`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-white">Cartão de Crédito</p>
                    <p className="text-sm text-gray-400">Parcelamento disponível</p>
                  </div>
                  {paymentMethod === 'card' && (
                    <Check className="w-6 h-6 text-green-400" />
                  )}
                </div>
              </button>

              {/* Botão Finalizar */}
              <Button
                onClick={handlePayment}
                disabled={!paymentMethod || isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 font-bold mt-6"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  `Pagar R$ ${plan.minInvestment.toLocaleString('pt-BR')}`
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Ao confirmar, você concorda com nossos termos e condições
              </p>
              </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}