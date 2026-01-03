import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

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
  User,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvestments, setActiveInvestments] = useState([]);
  const [showInvestments, setShowInvestments] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

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

  const commonFeatures = [
    "Gestão 100% profissional",
    "Produtos pré-selecionados",
    "Retorno garantido em 60 dias",
    "Suporte dedicado"
  ];

  const portfolios = [
    {
      id: 1,
      name: "Plano Visionário",
      minInvestment: 5000,
      expectedReturn: 3,
      duration: 60,
      products: ["Eletrônicos"],
      risk: "Baixo",
      description: "Ideal para quem está começando. Produtos de alta liquidez e demanda garantida.",
      features: commonFeatures
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
      features: commonFeatures
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
      features: commonFeatures
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
      borderColor: "border-blue-500/30",
      daysToComplete: 5
    },
    {
      id: 2,
      title: "Entregue no Rio de Janeiro",
      icon: MapPin,
      description: "Produtos chegaram ao centro de distribuição",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      daysToComplete: 15
    },
    {
      id: 3,
      title: "Testados e Aprovados",
      icon: TestTube,
      description: "Controle de qualidade concluído",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/30",
      daysToComplete: 20
    },
    {
      id: 4,
      title: "Disponíveis na Loja",
      icon: Store,
      description: "Produtos à venda nos nossos canais",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      borderColor: "border-cyan-500/30",
      daysToComplete: 30
    },
    {
      id: 5,
      title: "Lucro Contabilizado",
      icon: DollarSign,
      description: "Seu retorno está garantido!",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
      daysToComplete: 60
    }
  ];

  const calculateDaysPassed = (startDate) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCurrentStep = (daysPassed) => {
    if (daysPassed < 5) return 0;
    if (daysPassed < 15) return 1;
    if (daysPassed < 20) return 2;
    if (daysPassed < 30) return 3;
    return 4;
  };

  const getLiquidFillPercentage = (daysPassed) => {
    const maxDays = 60;
    const percentage = Math.min((daysPassed / maxDays) * 100, 100);
    return percentage;
  };

  const calculateProjection = (investment, returnRate) => {
    const profit = investment * (returnRate / 100);
    const total = investment + profit;
    return { profit, total };
  };

  const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfit = activeInvestments.reduce((sum, inv) => sum + inv.estimatedProfit, 0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      setSelectedPlanIndex((prev) => (prev === portfolios.length - 1 ? 0 : prev + 1));
    }
    if (touchStart - touchEnd < -75) {
      // Swipe right
      setSelectedPlanIndex((prev) => (prev === 0 ? portfolios.length - 1 : prev - 1));
    }
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
        
        {/* Perfil do Parceiro */}
        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-green-900/20 backdrop-blur-sm border-2 border-green-500/30 mb-8 shadow-2xl shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-500">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <motion.div 
                className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-lg shadow-green-500/50 relative"
                animate={{ 
                  boxShadow: [
                    '0 10px 40px rgba(34, 197, 94, 0.5)',
                    '0 10px 60px rgba(34, 197, 94, 0.7)',
                    '0 10px 40px rgba(34, 197, 94, 0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {currentUser?.full_name?.charAt(0) || 'P'}
                </motion.span>
                <div className="absolute inset-0 rounded-full bg-green-400/20 blur-xl animate-pulse"></div>
                </motion.div>
                <div className="flex-1 text-center sm:text-left">
                <motion.h1 
                  className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {currentUser?.full_name || 'Investidor'} 
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-green-400 font-semibold text-sm sm:text-base">Parceiro Investidor</p>
                  </motion.div>
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-4 w-full sm:w-auto">
                  <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                  >
                  <Button
                    onClick={() => setShowPlansModal(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 transition-all duration-300 text-base sm:text-lg px-4 sm:px-6 py-4 sm:py-6 font-bold relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.5 }}
                    />
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 relative z-10" />
                    <span className="relative z-10">Contratar Novo Plano</span>
                    </Button>
                    </motion.div>
                    <motion.div 
                    className="text-center sm:text-right bg-green-500/10 rounded-lg px-4 py-2 border border-green-500/30 w-full sm:w-auto"
                  animate={{ 
                    borderColor: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.6)', 'rgba(34, 197, 94, 0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center justify-center sm:justify-end gap-2 text-green-400 mb-1">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                    <motion.span 
                      className="text-2xl sm:text-3xl font-bold"
                      animate={{ 
                        textShadow: [
                          '0 0 10px rgba(34, 197, 94, 0.5)',
                          '0 0 20px rgba(34, 197, 94, 0.8)',
                          '0 0 10px rgba(34, 197, 94, 0.5)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      R$ {totalProfit.toLocaleString('pt-BR')}
                    </motion.span>
                  </div>
                  <p className="text-sm text-gray-300 font-semibold">Lucro Estimado Total</p>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo da Carteira */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Total Investido</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">R$ {totalInvested.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Lucro Estimado</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-400">+ R$ {totalProfit.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gray-800/80 backdrop-blur-sm border-gray-700 cursor-pointer hover:border-purple-500/50 transition-all"
            onClick={() => setShowInvestments(!showInvestments)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Investimentos Ativos</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{activeInvestments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investimentos Ativos */}
        {activeInvestments.length > 0 && showInvestments && (
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
              Meus <span className="text-green-400">Investimentos Ativos</span>
            </h2>
            
            <div className="space-y-6">
              {activeInvestments.map((investment) => {
                const daysPassed = calculateDaysPassed(investment.startDate);
                const currentStepIndex = getCurrentStep(daysPassed);
                const liquidFillPercentage = getLiquidFillPercentage(daysPassed);
                
                return (
                  <Card key={investment.id} className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div>
                          <CardTitle className="text-lg sm:text-xl text-white mb-1">{investment.plan}</CardTitle>
                          <p className="text-xs sm:text-sm text-gray-400">
                            Iniciado em {new Date(investment.startDate).toLocaleDateString('pt-BR')} • {daysPassed} dias
                          </p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <p className="text-xl sm:text-2xl font-bold text-white">R$ {investment.amount.toLocaleString('pt-BR')}</p>
                          <p className="text-xs sm:text-sm text-green-400 font-semibold">+ R$ {investment.estimatedProfit.toLocaleString('pt-BR')} lucro</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                      {/* Timeline de Etapas */}
                      <div>
                        <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Etapas do Processo</h4>
                        <div className="relative">
                          {/* Linha conectora */}
                          <div className="absolute left-5 sm:left-6 top-6 bottom-6 w-0.5 bg-gray-700" />

                          <div className="space-y-3 sm:space-y-4">
                            {investmentSteps.map((step, idx) => {
                              const isCompleted = idx < currentStepIndex;
                              const isCurrent = idx === currentStepIndex;
                              const Icon = step.icon;

                              return (
                                <div key={step.id} className="relative flex items-start gap-3 sm:gap-4">
                                  {/* Ícone */}
                                  <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all overflow-hidden ${
                                    isCompleted 
                                      ? 'bg-green-500/20 border-green-500' 
                                      : isCurrent
                                      ? `${step.bgColor} ${step.borderColor}`
                                      : 'bg-gray-800 border-gray-700'
                                  }`}>
                                    {/* Efeito de preenchimento líquido para última etapa */}
                                    {step.id === 5 && (
                                      <div 
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500/40 to-green-500/20 transition-all duration-1000"
                                        style={{ height: `${liquidFillPercentage}%` }}
                                      >
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-green-400/60 animate-pulse" />
                                      </div>
                                    )}

                                    {isCompleted ? (
                                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 relative z-10" />
                                    ) : (
                                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCurrent ? step.color : 'text-gray-600'} relative z-10`} />
                                    )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className={`flex-1 pb-3 sm:pb-4 ${isCurrent ? 'animate-pulse' : ''}`}>
                                    <h5 className={`font-semibold mb-1 text-sm sm:text-base ${
                                      isCompleted ? 'text-green-400' : isCurrent ? step.color : 'text-gray-500'
                                    }`}>
                                      {step.title}
                                      {isCompleted && ' ✓'}
                                      {isCurrent && ' - Em andamento'}
                                      </h5>
                                      <p className="text-xs sm:text-sm text-gray-400">{step.description}</p>

                                    {/* Barra de progresso para última etapa */}
                                    {step.id === 5 && currentStepIndex >= 4 && (
                                      <div className="mt-2">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                          <span>Preenchimento</span>
                                          <span>{liquidFillPercentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000"
                                            style={{ width: `${liquidFillPercentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                              })}
                              </div>
                          </div>
                      </div>

                      {/* Data de Retorno */}
                      <div className="bg-green-600/10 rounded-lg p-3 sm:p-4 border border-green-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                          <div>
                            <p className="text-xs sm:text-sm text-gray-400">Retorno Previsto</p>
                            <p className="font-bold text-white text-sm sm:text-base">
                              {new Date(investment.estimatedReturn).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <p className="text-xl sm:text-2xl font-bold text-green-400">
                            R$ {(investment.amount + investment.estimatedProfit).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-400">valor total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal de Planos */}
        <Dialog open={showPlansModal} onOpenChange={setShowPlansModal}>
          <DialogContent className="max-w-6xl max-h-[95vh] bg-gray-900 border-gray-700 text-white p-4">
            <DialogHeader className="mb-3 text-center">
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">
                {activeInvestments.length > 0 ? 'Contratar ' : 'Escolha Seu '}
                <span className="text-green-400">Novo Plano</span>
              </DialogTitle>
              <p className="text-gray-400 text-xs sm:text-sm text-center">
                {activeInvestments.length > 0 
                  ? 'Faça novos investimentos e aumente seus lucros' 
                  : 'Selecione o plano ideal para começar a investir'
                }
              </p>
            </DialogHeader>

            {/* Desktop: Grid / Mobile: Carousel */}
            <div className="hidden md:grid md:grid-cols-3 gap-3">
              {portfolios.map((portfolio) => {
                const projection = calculateProjection(portfolio.minInvestment, portfolio.expectedReturn);
                
                return (
                  <Card 
                    key={portfolio.id}
                    className="bg-gray-800/80 backdrop-blur-sm border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-[1.02] flex flex-col h-full"
                  >
                    <CardHeader className="p-3 pb-2 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <CardTitle className="text-lg text-white">{portfolio.name}</CardTitle>
                        <Badge className="bg-green-600 text-xs">{portfolio.risk}</Badge>
                      </div>
                      <p className="text-gray-400 text-xs min-h-[32px]">{portfolio.description}</p>
                    </CardHeader>
                    
                    <CardContent className="space-y-2 p-3 pt-0 text-center flex-1 flex flex-col">
                      {/* Valores */}
                      <div className="bg-gray-900/50 rounded-lg p-1.5 space-y-0.5 text-[11px]">
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
                      <div className="bg-green-600/10 rounded-lg p-1.5 border border-green-500/30">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Calculator className="w-3 h-3 text-green-400" />
                          <span className="text-[11px] text-green-400 font-semibold">Projeção</span>
                        </div>
                        <div className="space-y-0.5 text-[11px]">
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
                        <p className="text-[11px] text-gray-400 mb-0.5">Categorias:</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {portfolio.products.map((product, idx) => (
                            <Badge key={idx} variant="outline" className="border-gray-600 text-gray-300 text-[9px] px-1.5 py-0">
                              {product}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Features */}
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="text-[11px] text-gray-400 mb-0.5">Benefícios:</p>
                        <ul className="space-y-0.5">
                          {portfolio.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center justify-center gap-1 text-[11px] text-gray-300 leading-tight">
                              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Botão */}
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-sm py-2 mt-2 font-semibold"
                        onClick={() => {
                          window.open('https://wa.me/5511999999999?text=Olá! Tenho interesse na ' + portfolio.name, '_blank');
                          setShowPlansModal(false);
                        }}
                      >
                        Investir Agora
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
                })}
                </div>

                {/* Mobile: Carousel System */}
                <div className="md:hidden px-2">
                  {/* Selected Plan Card */}
                  <div 
                    className="flex justify-center mb-4"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {portfolios.map((portfolio, idx) => {
                      if (idx !== selectedPlanIndex) return null;
                      const projection = calculateProjection(portfolio.minInvestment, portfolio.expectedReturn);

                      return (
                        <div key={portfolio.id} className="w-[95%]">
                          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 flex flex-col">
                            <CardHeader className="p-3 pb-1.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                <CardTitle className="text-base text-white leading-tight">{portfolio.name}</CardTitle>
                                <Badge className="bg-green-600 text-[9px] px-1.5 py-0.5">{portfolio.risk}</Badge>
                              </div>
                              <p className="text-gray-400 text-[11px] leading-tight">{portfolio.description}</p>
                            </CardHeader>

                            <CardContent className="space-y-1.5 p-3 pt-0 text-center flex-1 flex flex-col">
                              {/* Valores */}
                              <div className="bg-gray-900/50 rounded-lg p-2 space-y-1 text-xs">
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
                              <div className="bg-green-600/10 rounded-lg p-2 border border-green-500/30">
                                <div className="flex items-center gap-1 mb-1">
                                  <Calculator className="w-3 h-3 text-green-400" />
                                  <span className="text-xs text-green-400 font-semibold">Projeção</span>
                                </div>
                                <div className="space-y-0.5 text-xs">
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
                                <p className="text-xs text-gray-400 mb-1">Categorias:</p>
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {portfolio.products.map((product, idx) => (
                                    <Badge key={idx} variant="outline" className="border-gray-600 text-gray-300 text-xs px-1.5 py-0">
                                      {product}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Features */}
                              <div className="flex-1 flex flex-col justify-center">
                                <p className="text-xs text-gray-400 mb-1">Benefícios:</p>
                                <ul className="space-y-0.5">
                                  {portfolio.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center justify-center gap-1 text-xs text-gray-300">
                                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Botão */}
                              <Button 
                                className="w-full bg-green-600 hover:bg-green-700 text-sm py-2 mt-2"
                                onClick={() => {
                                  window.open('https://wa.me/5511999999999?text=Olá! Tenho interesse na ' + portfolio.name, '_blank');
                                  setShowPlansModal(false);
                                }}
                              >
                                Investir Agora
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>

                  {/* Indicators */}
                  <div className="flex justify-center gap-2 mt-4">
                    {portfolios.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPlanIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === selectedPlanIndex ? 'bg-green-500 w-6' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                  3% de retorno sobre o valor de compra, independente do volume de vendas.
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