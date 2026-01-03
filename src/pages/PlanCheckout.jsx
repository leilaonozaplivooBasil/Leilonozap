import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { CreditCard, Smartphone, ArrowLeft, Check } from 'lucide-react';

export default function PlanCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
      // Aqui você implementará a integração com o gateway de pagamento
      // Por enquanto, apenas simula o processo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Pagamento de R$ ${plan.minInvestment.toLocaleString('pt-BR')} via ${paymentMethod === 'pix' ? 'PIX' : 'Cartão'} processado!`);
      
      navigate(createPageUrl("InvestorDashboard"));
    } catch (error) {
      console.error("Erro no pagamento:", error);
      alert("Erro ao processar pagamento. Tente novamente.");
    } finally {
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
              <CardTitle className="text-xl text-white">Método de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
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
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}