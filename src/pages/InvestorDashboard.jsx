import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Package, 
  CheckCircle, 
  ArrowRight,
  ShieldCheck,
  Calculator,
  Wallet
} from 'lucide-react';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
          const user = JSON.parse(savedUserJSON);
          setCurrentUser(user);
        } else {
          navigate(createPageUrl("Partners"));
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        navigate(createPageUrl("Partners"));
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const portfolios = [
    {
      id: 1,
      name: "Plano Visionário",
      minInvestment: 5000,
      expectedReturn: 3,
      duration: 60,
      products: ["Eletrodomésticos"],
      risk: "Baixo",
      description: "Ideal para quem está começando. Produtos de alta liquidez e demanda garantida.",
      features: [
        "Gestão 100% profissional",
        "Produtos pré-selecionados",
        "Retorno garantido em 60 dias",
        "Suporte dedicado"
      ]
    },
    {
      id: 2,
      name: "Plano Sócios de Ouro",
      minInvestment: 15000,
      expectedReturn: 3,
      duration: 60,
      products: ["Eletrodomésticos", "Eletrônicos", "Apple"],
      risk: "Baixo",
      description: "Para investidores que buscam maior retorno com segurança.",
      features: [
        "Diversificação de produtos",
        "Prioridade na escolha",
        "Retorno acelerado",
        "Relatórios semanais"
      ]
    },
    {
      id: 3,
      name: "Plano Fundadores",
      minInvestment: 30000,
      expectedReturn: 3,
      duration: 60,
      products: ["Todas as categorias"],
      risk: "Baixo",
      description: "Máximo retorno com acesso a todas as oportunidades.",
      features: [
        "Acesso exclusivo a novos lotes",
        "Escolha personalizada",
        "Retorno maximizado",
        "Gestor dedicado"
      ]
    }
  ];

  const calculateProjection = (investment, returnRate) => {
    const profit = investment * (returnRate / 100);
    const total = investment + profit;
    return { profit, total };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Bem-vindo, <span className="text-green-400">{currentUser?.full_name || 'Investidor'}</span>! 👋
          </h1>
          <p className="text-gray-400 text-lg">
            Escolha sua carteira de investimento e comece a lucrar
          </p>
        </div>

        {/* Como Funciona */}
        <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              Como Funciona o Investimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-500/30">
                  <Wallet className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Escolha sua Carteira</h3>
                <p className="text-gray-400 text-sm">
                  Selecione a carteira que melhor se adequa ao seu perfil e valor de investimento
                </p>
              </div>

              <div className="text-center p-4">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-500/30">
                  <Package className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Investimos em Produtos</h3>
                <p className="text-gray-400 text-sm">
                  Seu capital é aplicado na compra de produtos de alta demanda e liquidez garantida
                </p>
              </div>

              <div className="text-center p-4">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-500/30">
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. Receba seus Lucros</h3>
                <p className="text-gray-400 text-sm">
                  Em 60 dias, receba seu investimento + lucro garantido direto na sua conta
                </p>
              </div>
            </div>

            <div className="bg-green-600/10 rounded-lg p-6 border border-green-500/30">
              <h4 className="font-bold text-green-400 text-lg mb-3">📊 Por que é Seguro?</h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Produtos Testados:</strong> Todos os produtos são verificados antes da venda</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Gestão Profissional:</strong> Equipe especializada cuida de toda operação</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Alta Liquidez:</strong> Produtos com demanda comprovada no mercado</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Transparência Total:</strong> Acompanhamento das vendas e retorno garantido</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Carteiras de Investimento */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Escolha Seu <span className="text-green-400">Plano de Parceria</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => {
              const projection = calculateProjection(portfolio.minInvestment, portfolio.expectedReturn);
              
              return (
                <Card 
                  key={portfolio.id}
                  className="bg-gray-800/80 backdrop-blur-sm border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl text-white">{portfolio.name}</CardTitle>
                      <Badge className="bg-green-600">{portfolio.risk}</Badge>
                    </div>
                    <p className="text-gray-400 text-sm">{portfolio.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Valores */}
                    <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Investimento Mínimo</span>
                        <span className="text-white font-bold">
                          R$ {portfolio.minInvestment.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Retorno</span>
                        <span className="text-green-400 font-bold">{portfolio.expectedReturn}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Prazo</span>
                        <span className="text-white font-bold">{portfolio.duration} dias</span>
                      </div>
                    </div>

                    {/* Projeção */}
                    <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400 font-semibold">Projeção</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Lucro:</span>
                          <span className="text-green-400 font-bold">
                            + R$ {projection.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total:</span>
                          <span className="text-white font-bold">
                            R$ {projection.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Produtos */}
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Categorias:</p>
                      <div className="flex flex-wrap gap-2">
                        {portfolio.products.map((product, idx) => (
                          <Badge key={idx} variant="outline" className="border-gray-600 text-gray-300">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Benefícios:</p>
                      <ul className="space-y-1">
                        {portfolio.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Botão */}
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        // Aqui você pode adicionar lógica de contato ou formulário
                        window.open('https://wa.me/5511999999999?text=Olá! Tenho interesse na ' + portfolio.name, '_blank');
                      }}
                    >
                      Investir Agora
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-bold text-white mb-2">Quando recebo meu retorno?</h4>
              <p className="text-gray-400">
                Você recebe seu investimento + lucro em até 60 dias após a aplicação.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2">Posso investir mais de uma vez?</h4>
              <p className="text-gray-400">
                Sim! Você pode fazer quantos investimentos quiser, a qualquer momento.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2">E se os produtos não venderem?</h4>
              <p className="text-gray-400">
                Trabalhamos apenas com produtos de alta liquidez e demanda comprovada. Além disso, temos garantia de recompra.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2">Como acompanho meu investimento?</h4>
              <p className="text-gray-400">
                Você receberá relatórios semanais e terá acesso ao painel de acompanhamento em tempo real.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}