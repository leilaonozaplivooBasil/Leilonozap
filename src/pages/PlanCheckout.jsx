import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { CreditCard, Smartphone, ArrowLeft, Check, Copy, CheckCircle } from 'lucide-react';

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
  
  const plan = location.state?.plan;

  useEffect(() => {
    const savedUserJSON = localStorage.getItem('currentUser');
    if (savedUserJSON) {
      setCurrentUser(JSON.parse(savedUserJSON));
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

    setIsProcessing(true);

    try {
      if (paymentMethod === 'pix') {
        // Pagamento via PIX com AbacatePay
        const response = await base44.functions.invoke('createPlanPixPayment', {
          amount: plan.minInvestment,
          plan_id: plan.id,
          plan_name: plan.name,
          user_name: currentUser.full_name,
          user_email: currentUser.email,
          user_phone: currentUser.phone || '11999999999',
          user_cpf: currentUser.cpf || '00000000000'
        });

        if (response.data.success) {
          setPixData({
            qr_code: `data:image/png;base64,${response.data.qr_code_base64}`,
            copy_paste: response.data.pix_code,
            transaction_id: response.data.billing_id
          });
        } else {
          throw new Error(response.data.error || 'Erro ao gerar PIX');
        }

      } else if (paymentMethod === 'card') {
        // Pagamento via Cartão com Stripe
        const response = await base44.functions.invoke('createPlanStripeCheckout', {
          amount: plan.minInvestment,
          plan_id: plan.id,
          plan_name: plan.name,
          customer_email: currentUser.email,
          customer_name: currentUser.full_name
        });

        if (response.data.checkout_url) {
          // Redireciona para o checkout do Stripe
          window.location.href = response.data.checkout_url;
        } else {
          throw new Error('Erro ao criar sessão de pagamento');
        }
      }

    } catch (error) {
      console.error("Erro no pagamento:", error);
      alert("Erro ao processar pagamento: " + (error.message || "Tente novamente."));
      setIsProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.copy_paste) {
      navigator.clipboard.writeText(pixData.copy_paste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
                // Exibe QR Code PIX
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 flex justify-center">
                    <img 
                      src={pixData.qr_code} 
                      alt="QR Code PIX" 
                      className="w-64 h-64"
                    />
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Código PIX Copia e Cola:</p>
                    <div className="bg-gray-900 rounded-lg p-3 break-all text-sm text-gray-300 relative">
                      {pixData.copy_paste}
                      <Button
                        onClick={copyPixCode}
                        size="sm"
                        className="absolute top-2 right-2 bg-green-600 hover:bg-green-700"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
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

                  <Button
                    onClick={() => navigate(createPageUrl("InvestorDashboard"))}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Voltar ao Dashboard
                  </Button>
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