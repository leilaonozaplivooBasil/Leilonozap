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
  Wallet,
  TrendingUp,
  Clock,
  MapPin,
  TestTube,
  Store,
  User
} from 'lucide-react';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvestments, setActiveInvestments] = useState([]);
  const [showInvestments, setShowInvestments] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
          const user = JSON.parse(savedUserJSON);
          setCurrentUser(user);
          
          // Simula investimentos ativos (em produção, viria do banco)
          setActiveInvestments([
            {
              id: 1,
              plan: "Plano Visionário",
              amount: 5000,
              startDate: "2026-01-02",
              currentStep: 3,
              products: [
                { name: "Micro-ondas Philco 20L", quantity: 4 },
                { name: "Liquidificador Arno", quantity: 6 }
              ],
              estimatedProfit: 150,
              estimatedReturn: "2026-03-03"
            },
            {
              id: 2,
              plan: "Plano Sócios de Ouro",
              amount: 15000,
              startDate: "2026-01-02",
              currentStep: 1,
              products: [
                { name: "iPhone 13 128GB", quantity: 3 },
                { name: "AirPods Pro", quantity: 5 }
              ],
              estimatedProfit: 450,
              estimatedReturn: "2026-03-03"
            }
          ]);
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

  const investmentSteps = [
    {
      id: 1,
      title: "Produto Comprado",
      icon: Package,
      description: "Produtos adquiridos com seu investimento",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30"
    },
    {
      id: 2,
      title: "Entregue no Rio de Janeiro",
      icon: MapPin,
      description: "Produtos chegaram ao centro de distribuição",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30"
    },
    {
      id: 3,
      title: "Testados e Aprovados",
      icon: TestTube,
      description: "Controle de qualidade concluído",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/30"
    },
    {
      id: 4,
      title: "Disponíveis na Loja",
      icon: Store,
      description: "Produtos à venda nos nossos canais",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      borderColor: "border-cyan-500/30"
    },
    {
      id: 5,
      title: "Lucro Contabilizado",
      icon: DollarSign,
      description: "Seu retorno está garantido!",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30"
    }
  ];

  const calculateProjection = (investment, returnRate) => {
    const profit = investment * (returnRate / 100);
    const total = investment + profit;
    return { profit, total };
  };

  const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfit = activeInvestments.reduce((sum, inv) => sum + inv.estimatedProfit, 0);

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
        
        {/* Perfil do Parceiro */}
        <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-3xl font-bold">
                {currentUser?.full_name?.charAt(0) || 'P'}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">
                  {currentUser?.full_name || 'Investidor'} 
                </h1>
                <p className="text-gray-400">Parceiro Investidor</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-2xl font-bold">R$ {totalProfit.toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-gray-400">Lucro Estimado Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo da Carteira */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Wallet className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Investido</p>
                  <p className="text-2xl font-bold text-white">R$ {totalInvested.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Lucro Estimado</p>
                  <p className="text-2xl font-bold text-green-400">+ R$ {totalProfit.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gray-800/80 backdrop-blur-sm border-gray-700 cursor-pointer hover:border-purple-500/50 transition-all"
            onClick={() => setShowInvestments(!showInvestments)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Investimentos Ativos</p>
                  <p className="text-2xl font-bold text-white">{activeInvestments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investimentos Ativos */}
        {activeInvestments.length > 0 && showInvestments && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-6">
              Meus <span className="text-green-400">Investimentos Ativos</span>
            </h2>
            
            <div className="space-y-6">
              {activeInvestments.map((investment) => (
                <Card key={investment.id} className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl text-white mb-1">{investment.plan}</CardTitle>
                        <p className="text-sm text-gray-400">
                          Iniciado em {new Date(investment.startDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">R$ {investment.amount.toLocaleString('pt-BR')}</p>
                        <p className="text-sm text-green-400 font-semibold">+ R$ {investment.estimatedProfit.toLocaleString('pt-BR')} lucro</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Produtos */}
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Produtos do Investimento
                      </h4>
                      <div className="space-y-2">
                        {investment.products.map((product, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{product.name}</span>
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              {product.quantity}x
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline de Etapas */}
                    <div>
                      <h4 className="font-semibold text-white mb-4">Etapas do Processo</h4>
                      <div className="relative">
                        {/* Linha conectora */}
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-700" />
                        
                        <div className="space-y-4">
                          {investmentSteps.map((step, idx) => {
                            const isCompleted = idx < investment.currentStep;
                            const isCurrent = idx === investment.currentStep;
                            const Icon = step.icon;
                            
                            return (
                              <div key={step.id} className="relative flex items-start gap-4">
                                {/* Ícone */}
                                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCompleted 
                                    ? 'bg-green-500/20 border-green-500' 
                                    : isCurrent
                                    ? `${step.bgColor} ${step.borderColor}`
                                    : 'bg-gray-800 border-gray-700'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-6 h-6 text-green-400" />
                                  ) : (
                                    <Icon className={`w-6 h-6 ${isCurrent ? step.color : 'text-gray-600'}`} />
                                  )}
                                </div>
                                
                                {/* Conteúdo */}
                                <div className={`flex-1 pb-4 ${isCurrent ? 'animate-pulse' : ''}`}>
                                  <h5 className={`font-semibold mb-1 ${
                                    isCompleted ? 'text-green-400' : isCurrent ? step.color : 'text-gray-500'
                                  }`}>
                                    {step.title}
                                    {isCompleted && ' ✓'}
                                    {isCurrent && ' (Em andamento)'}
                                  </h5>
                                  <p className="text-sm text-gray-400">{step.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Data de Retorno */}
                    <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm text-gray-400">Retorno Previsto</p>
                          <p className="font-bold text-white">
                            {new Date(investment.estimatedReturn).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          R$ {(investment.amount + investment.estimatedProfit).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-400">valor total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Planos Disponíveis */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {activeInvestments.length > 0 ? 'Contratar ' : 'Escolha Seu '}
            <span className="text-green-400">Novo Plano</span>
          </h2>
          <p className="text-gray-400 mb-6">
            {activeInvestments.length > 0 
              ? 'Faça novos investimentos e aumente seus lucros' 
              : 'Selecione o plano ideal para começar a investir'
            }
          </p>
          
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

        {/* Informações */}
        <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-white mb-2">📦 Produtos Verificados</h4>
                <p className="text-gray-400 text-sm">
                  Todos os produtos passam por rigoroso controle de qualidade em nosso centro no Rio de Janeiro.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">💰 Lucro Garantido</h4>
                <p className="text-gray-400 text-sm">
                  3% de retorno sobre o valor investido, independente do volume de vendas.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">📊 Acompanhamento Real</h4>
                <p className="text-gray-400 text-sm">
                  Veja em tempo real todas as etapas do seu investimento neste dashboard.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">🔒 Investimento Seguro</h4>
                <p className="text-gray-400 text-sm">
                  Produtos de alta liquidez e contratos formalizados garantem sua segurança.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}