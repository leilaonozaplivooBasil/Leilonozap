import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { createAbacatePayPix } from '@/functions/createAbacatePayPix';
import { generateContractPDF } from '@/functions/generateContractPDF';
import { checkAbacatePayPix } from '@/functions/checkAbacatePayPix';
import { toast } from 'sonner';

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
  Loader2,
  Copy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const FeaturedProduct = base44.entities.FeaturedProduct;

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvestments, setActiveInvestments] = useState([]);
  const [showInvestments, setShowInvestments] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [productImages, setProductImages] = useState({});
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [pixFormData, setPixFormData] = useState({ name: '', phone: '', email: '', cpf: '' });
  const [pixData, setPixData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [acceptedContract, setAcceptedContract] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
          const user = JSON.parse(savedUserJSON);
          setCurrentUser(user);
          setPixFormData({
            name: user?.full_name || '',
            phone: user?.phone || '',
            email: user?.email || '',
            cpf: user?.cpf || ''
          });

          // Carrega imagens dos produtos em destaque
          try {
            const products = await FeaturedProduct.filter({ is_active: true });
            const imageMap = {};
            products.forEach(product => {
              const category = product.category?.toLowerCase();
              if (category === 'eletrônicos' || category === 'eletronicos') {
                imageMap.eletronicos = product.image_url;
              } else if (category === 'eletrodomésticos' || category === 'eletrodomesticos') {
                imageMap.eletrodomesticos = product.image_url;
              } else if (category === 'apple') {
                imageMap.apple = product.image_url;
              }
            });
            setProductImages(imageMap);
          } catch (error) {
            console.error('Erro ao carregar imagens:', error);
          }
          
          // Simula compras ativas (em produção, viria do banco)
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
      features: commonFeatures,
      imageKey: "eletronicos"
    },
    {
      id: 2,
      name: "Plano Sócios de Ouro",
      minInvestment: 15000,
      expectedReturn: 3,
      duration: 60,
      products: ["Eletrodomésticos", "Eletrônicos", "Apple"],
      risk: "Baixo",
      description: "Para parceiros que buscam maior retorno com segurança.",
      features: commonFeatures,
      imageKey: "eletrodomesticos"
    },
    {
      id: 3,
      name: "Plano Elite",
      minInvestment: 30000,
      expectedReturn: 3,
      duration: 60,
      products: ["Todas as categorias"],
      risk: "Baixo",
      description: "Máximo retorno com acesso a todas as oportunidades.",
      features: commonFeatures,
      imageKey: "apple"
    }
  ];

  const investmentSteps = [
    {
      id: 1,
      title: "Produto Comprado",
      icon: Package,
      description: "Produtos adquiridos",
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

  useEffect(() => {
    if (!showPlansModal || isPaused) return;
    
    const interval = setInterval(() => {
      setSelectedPlanIndex((prev) => (prev === portfolios.length - 1 ? 0 : prev + 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [showPlansModal, isPaused, portfolios.length]);

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        
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
                  <p className="text-green-400 font-semibold text-sm sm:text-base">Parceiro de Compra</p>
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
                  <p className="text-gray-400 text-xs sm:text-sm">Total de Compras</p>
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
                  <p className="text-gray-400 text-xs sm:text-sm">Compras Ativas</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{activeInvestments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compras Ativas */}
        {activeInvestments.length > 0 && showInvestments && (
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
              Minhas <span className="text-green-400">Compras Ativas</span>
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

        {/* Modal de Planos - MOBILE OPTIMIZED */}
        <Dialog open={showPlansModal} onOpenChange={setShowPlansModal}>
          <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white p-3 sm:p-4 md:p-6 max-h-[95vh] overflow-y-auto">
            <DialogHeader className="mb-3 text-center">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
                {activeInvestments.length > 0 ? 'Contratar ' : 'Escolha Seu '}
                <span className="text-green-400">Novo Plano</span>
              </DialogTitle>
              <p className="text-gray-400 text-xs text-center">
                {activeInvestments.length > 0 
                  ? 'Faça novas compras e aumente seus lucros' 
                  : 'Selecione o plano ideal para começar a comprar'
                }
              </p>
            </DialogHeader>

            {/* Visualização do Contrato */}
            {showContract ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
                    alt="Leilão NoZap"
                    className="h-16 mx-auto mb-4"
                  />
                  <h3 className="text-xl font-bold text-green-400">CONTRATO DE PARCERIA</h3>
                  <p className="text-gray-400 text-sm">Leia atentamente antes de prosseguir</p>
                </div>

                <ScrollArea className="h-[50vh] bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="text-gray-300 text-sm space-y-4 pr-4">
                    <h4 className="text-green-400 font-bold text-center text-base">CONTRATO DE PARCERIA DE COMPRA E OPERAÇÃO COMERCIAL</h4>
                    
                    <p>Pelo presente instrumento particular, de um lado <strong className="text-white">LEILÃO NOZAP</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 51.544.091/0001-67, com sede em Av. das Américas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ, 22640-102, doravante denominada PLATAFORMA, e de outro lado <strong className="text-white">PARCEIRO DE COMPRA</strong>, pessoa física ou jurídica devidamente cadastrada na plataforma, doravante denominado simplesmente PARCEIRO, resolvem celebrar o presente Contrato de Parceria de Compra e Operação Comercial, que se regerá pelas cláusulas e condições abaixo.</p>

                    <h5 className="text-green-400 font-bold mt-4">1. OBJETO</h5>
                    <p>1.1. O presente contrato tem por objeto a formalização da parceria comercial entre a PLATAFORMA e o PARCEIRO para a aquisição de produtos selecionados, disponibilizados no catálogo digital da PLATAFORMA, com finalidade de operações comerciais estruturadas, sob gestão integral da PLATAFORMA.</p>
                    <p>1.2. O PARCEIRO participa das operações por meio da compra de produtos, os quais são destinados à comercialização conforme a estratégia operacional da PLATAFORMA.</p>

                    <h5 className="text-green-400 font-bold mt-4">2. NATUREZA DA PARCERIA</h5>
                    <p>2.1. As partes reconhecem que esta relação possui natureza estritamente comercial, não caracterizando, em nenhuma hipótese:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>investimento financeiro;</li>
                      <li>contrato de investimento coletivo;</li>
                      <li>sociedade;</li>
                      <li>joint venture;</li>
                      <li>relação trabalhista;</li>
                      <li>captação pública de recursos;</li>
                      <li>promessa de rendimento financeiro.</li>
                    </ul>
                    <p>2.2. O PARCEIRO atua como parceiro comercial de compra, participando de operações reais de circulação de mercadorias.</p>

                    <h5 className="text-green-400 font-bold mt-4">3. FUNCIONAMENTO DA PARCERIA</h5>
                    <p>3.1. O PARCEIRO selecionará produtos disponíveis no catálogo da PLATAFORMA e realizará a compra mínima definida no momento da adesão.</p>
                    <p>3.2. A PLATAFORMA será responsável por:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>curadoria e seleção dos produtos;</li>
                      <li>validação de qualidade e procedência;</li>
                      <li>gestão comercial e logística;</li>
                      <li>acompanhamento operacional via painel digital;</li>
                      <li>comercialização dos produtos nos canais próprios.</li>
                    </ul>
                    <p>3.3. O PARCEIRO poderá acompanhar, em tempo real, por meio do painel exclusivo: status das operações; evolução comercial; valores a receber; histórico das compras realizadas.</p>

                    <h5 className="text-green-400 font-bold mt-4">4. RETORNO COMERCIAL AO PARCEIRO</h5>
                    <p>4.1. Em contrapartida à compra realizada, o PARCEIRO fará jus a um retorno comercial previamente estabelecido, calculado sobre o valor da compra, conforme condições apresentadas no momento da adesão.</p>
                    <p>4.2. O retorno comercial não está vinculado a volume de vendas individuais do PARCEIRO, mas sim à execução operacional da PLATAFORMA, dentro de seu modelo de negócios.</p>
                    <p>4.3. O prazo estimado para encerramento da operação e disponibilização do retorno será informado no painel, respeitando o ciclo comercial de cada produto.</p>

                    <h5 className="text-green-400 font-bold mt-4">5. PAGAMENTOS</h5>
                    <p>5.1. Os pagamentos ao PARCEIRO ocorrerão por meio eletrônico, em conta de titularidade do PARCEIRO, conforme dados cadastrados.</p>
                    <p>5.2. Os valores serão liberados após a conclusão do ciclo operacional correspondente à compra realizada.</p>

                    <h5 className="text-green-400 font-bold mt-4">6. RISCOS OPERACIONAIS</h5>
                    <p>6.1. A PLATAFORMA adota critérios rigorosos de seleção, controle e gestão, reduzindo riscos operacionais.</p>
                    <p>6.2. Ainda assim, o PARCEIRO declara estar ciente de que toda operação comercial envolve variáveis de mercado, logística e fornecedores.</p>
                    <p>6.3. A PLATAFORMA compromete-se a atuar com diligência máxima, transparência e boa-fé.</p>

                    <h5 className="text-green-400 font-bold mt-4">7. OBRIGAÇÕES DO PARCEIRO</h5>
                    <p>7.1. Realizar o cadastro com informações verdadeiras;</p>
                    <p>7.2. Efetuar as compras conforme as regras da plataforma;</p>
                    <p>7.3. Acompanhar as informações disponibilizadas no painel;</p>
                    <p>7.4. Manter seus dados atualizados.</p>

                    <h5 className="text-green-400 font-bold mt-4">8. OBRIGAÇÕES DA PLATAFORMA</h5>
                    <p>8.1. Disponibilizar produtos de alta liquidez;</p>
                    <p>8.2. Operar a logística e comercialização;</p>
                    <p>8.3. Garantir transparência total via painel;</p>
                    <p>8.4. Efetuar os repasses conforme estabelecido.</p>

                    <h5 className="text-green-400 font-bold mt-4">9. VIGÊNCIA, PRAZO E CICLO OPERACIONAL</h5>
                    <p>9.1. O presente contrato terá vigência de 12 (doze) meses, contados a partir da data de aceite eletrônico pelo PARCEIRO.</p>
                    <p>9.2. Durante a vigência, o valor correspondente ao plano de parceria adquirido pelo PARCEIRO será integralmente alocado em operações sucessivas de compra e recompra de produtos, dentro da estratégia operacional da PLATAFORMA.</p>
                    <p>9.3. O ciclo financeiro da parceria observará as seguintes regras:</p>
                    <p className="ml-4">a) O primeiro retorno comercial será disponibilizado ao PARCEIRO em até 60 (sessenta) dias contados da data da compra inicial;</p>
                    <p className="ml-4">b) Após o primeiro ciclo, os retornos subsequentes ocorrerão em ciclos mensais, com disponibilização a cada 30 (trinta) dias;</p>
                    <p className="ml-4">c) O valor principal do plano adquirido permanecerá reaplicado continuamente em novas operações de compra, enquanto vigente o contrato.</p>
                    <p>9.4. Os valores de retorno comercial apurados após o período inicial de 60 (sessenta) dias poderão ser sacados mensalmente pelo PARCEIRO, até o término da vigência contratual.</p>
                    <p>9.5. Ao final do prazo de 12 (doze) meses, a parceria será automaticamente encerrada, salvo manifestação expressa das partes para celebração de novo acordo, o qual poderá conter condições, prazos e critérios distintos.</p>
                    <p>9.6. Encerrada a vigência contratual, o valor integral correspondente à compra realizada pelo PARCEIRO será disponibilizado para saque em até 60 (sessenta) dias, contados da data formal de encerramento do contrato, respeitados os ciclos operacionais e financeiros em andamento.</p>

                    <h5 className="text-green-400 font-bold mt-4">10. CONFIDENCIALIDADE</h5>
                    <p>10.1. As partes comprometem-se a manter sigilo absoluto sobre informações estratégicas, comerciais e operacionais.</p>

                    <h5 className="text-green-400 font-bold mt-4">11. DISPOSIÇÕES GERAIS</h5>
                    <p>11.1. O aceite eletrônico deste contrato possui plena validade jurídica.</p>
                    <p>11.2. Este contrato representa a totalidade do acordo entre as partes.</p>

                    <h5 className="text-green-400 font-bold mt-4">12. FORO</h5>
                    <p>12.1. Fica eleito o foro da comarca do Rio de Janeiro/RJ para dirimir quaisquer questões oriundas deste contrato.</p>

                    <div className="border-t border-gray-600 mt-6 pt-4 text-center">
                      <p className="text-gray-400 italic">E, por estarem de pleno acordo, o PARCEIRO manifesta seu aceite eletrônico aos termos acima.</p>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowContract(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        toast.info("Gerando PDF do contrato...");
                        const response = await generateContractPDF();
                        const blob = new Blob([response.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Contrato_Parceria_LeilaoNoZap.pdf';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                        toast.success("Contrato PDF baixado com sucesso!");
                      } catch (error) {
                        console.error('Erro ao baixar PDF:', error);
                        toast.error("Erro ao gerar PDF do contrato");
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4"
                  >
                    📥 Baixar PDF
                  </Button>
                </div>
              </motion.div>
            ) : !selectedPlan ? (
              <>
                {/* Carousel para todos os tamanhos */}
                <div className="relative py-2"
                     onMouseEnter={() => setIsPaused(true)}
                     onMouseLeave={() => setIsPaused(false)}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedPlanIndex}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-center px-10"
                    >
                      {(() => {
                        const portfolio = portfolios[selectedPlanIndex];
                        const projection = calculateProjection(portfolio.minInvestment, portfolio.expectedReturn);

                        return (
                          <Card className="bg-gray-800 backdrop-blur-sm border-2 border-gray-700 w-full max-w-md overflow-hidden">
                           {/* Imagem do Produto - ALTURA RESPONSIVA */}
                           <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-gray-900">
                              {productImages[portfolio.imageKey] ? (
                                <img 
                                  src={productImages[portfolio.imageKey]} 
                                  alt={portfolio.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                  <Package className="w-16 h-16 text-gray-600" />
                                </div>
                              )}
                              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-green-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                                RISCO ZERO
                              </div>
                            </div>

                            <CardContent className="p-3 sm:p-4">
                              {/* Título e Descrição */}
                              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{portfolio.name}</h3>
                              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">{portfolio.description}</p>
                              
                              {/* Cards de Valores - MOBILE OTIMIZADO */}
                              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                                <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3 border border-gray-700">
                                  <p className="text-gray-400 text-[10px] sm:text-sm mb-1">Compra Mínima</p>
                                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white leading-tight">
                                    R$ {portfolio.minInvestment.toLocaleString('pt-BR')}
                                  </p>
                                </div>
                                <div className="bg-green-600/10 rounded-lg p-2 sm:p-3 border border-green-500/30">
                                  <p className="text-gray-400 text-[10px] sm:text-sm mb-1">Lucro Estimado ({portfolio.expectedReturn}%)</p>
                                  <p className="text-base sm:text-xl md:text-2xl font-bold text-green-400 leading-tight">
                                    R$ {projection.profit.toLocaleString('pt-BR')}
                                  </p>
                                </div>
                              </div>

                              {/* Informações Inferiores */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                                <span className="flex items-center gap-1">⏱️ Retorno em {portfolio.duration} dias</span>
                                <span className="flex items-center gap-1">📦 Gestão 100% nossa</span>
                              </div>

                              {/* Botão - TAMANHO RESPONSIVO */}
                              <Button 
                                className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base py-3 sm:py-4 font-semibold"
                                onClick={() => {
                                  setSelectedPlan(portfolio);
                                  setPixData(null);
                                }}
                              >
                                Comprar Agora
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Arrows - MAIORES EM MOBILE */}
                  <button
                    onClick={() => setSelectedPlanIndex((prev) => (prev === 0 ? portfolios.length - 1 : prev - 1))}
                    className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <button
                    onClick={() => setSelectedPlanIndex((prev) => (prev === portfolios.length - 1 ? 0 : prev + 1))}
                    className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Indicators */}
                <div className="flex justify-center gap-2 mt-3 sm:mt-4">
                  {portfolios.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPlanIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === selectedPlanIndex 
                          ? 'w-6 bg-green-500' 
                          : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : !pixData ? (
              /* Formulário PIX */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white">{selectedPlan.name}</h3>
                  <p className="text-2xl font-bold text-green-400 mt-2">
                    R$ {selectedPlan.minInvestment.toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-300">Nome Completo</Label>
                    <Input
                      value={pixFormData.name}
                      onChange={(e) => setPixFormData({...pixFormData, name: e.target.value})}
                      placeholder="João Silva"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Telefone</Label>
                    <Input
                      value={pixFormData.phone}
                      onChange={(e) => setPixFormData({...pixFormData, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">E-mail</Label>
                    <Input
                      value={pixFormData.email}
                      onChange={(e) => setPixFormData({...pixFormData, email: e.target.value})}
                      placeholder="joao@email.com"
                      type="email"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">CPF</Label>
                    <Input
                      value={pixFormData.cpf}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPixFormData({...pixFormData, cpf: value});
                        
                        // Valida CPF em tempo real
                        const cleanCpf = value.replace(/\D/g, '');
                        if (cleanCpf.length === 11) {
                          const validateCPF = (cpf) => {
                            if (/^(\d)\1+$/.test(cpf)) return false;
                            let sum = 0;
                            for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
                            let remainder = (sum * 10) % 11;
                            if (remainder === 10 || remainder === 11) remainder = 0;
                            if (remainder !== parseInt(cpf[9])) return false;
                            sum = 0;
                            for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
                            remainder = (sum * 10) % 11;
                            if (remainder === 10 || remainder === 11) remainder = 0;
                            if (remainder !== parseInt(cpf[10])) return false;
                            return true;
                          };
                          if (!validateCPF(cleanCpf)) {
                            toast.error("CPF inválido. Verifique os números.");
                          }
                        }
                      }}
                      placeholder="000.000.000-00"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Botão Ler Contrato */}
                <Button
                  onClick={() => setShowContract(true)}
                  variant="outline"
                  className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 mb-3"
                >
                  📄 Ler Contrato de Parceria
                </Button>

                {/* Checkbox Aceitar Contrato */}
                <div className="flex items-center space-x-3 bg-gray-800 rounded-lg p-3 border border-gray-700 mb-3">
                  <Checkbox 
                    id="accept-contract" 
                    checked={acceptedContract}
                    onCheckedChange={(checked) => setAcceptedContract(checked)}
                    className="border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <label 
                    htmlFor="accept-contract" 
                    className="text-sm text-gray-300 cursor-pointer leading-tight"
                  >
                    Li e aceito os termos do <span className="text-green-400 font-semibold">Contrato de Parceria</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedPlan(null);
                      setAcceptedContract(false);
                    }}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={async () => {
                      const { name, phone, email, cpf } = pixFormData;
                      if (!name || !phone || !email || !cpf) {
                        toast.error("Preencha todos os campos");
                        return;
                      }

                      // Validação de CPF
                      const cleanCpf = cpf.replace(/\D/g, '');
                      if (cleanCpf.length !== 11) {
                        toast.error("CPF inválido. Deve ter 11 dígitos.");
                        return;
                      }

                      // Validação básica de CPF (dígitos verificadores)
                      const validateCPF = (cpf) => {
                        if (cpf.length !== 11) return false;
                        if (/^(\d)\1+$/.test(cpf)) return false; // Todos dígitos iguais
                        
                        let sum = 0;
                        for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
                        let remainder = (sum * 10) % 11;
                        if (remainder === 10 || remainder === 11) remainder = 0;
                        if (remainder !== parseInt(cpf[9])) return false;
                        
                        sum = 0;
                        for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
                        remainder = (sum * 10) % 11;
                        if (remainder === 10 || remainder === 11) remainder = 0;
                        if (remainder !== parseInt(cpf[10])) return false;
                        
                        return true;
                      };

                      if (!validateCPF(cleanCpf)) {
                        toast.error("CPF inválido. Verifique os números digitados.");
                        return;
                      }

                      setIsProcessing(true);
                      try {
                        toast.info("Gerando QR Code PIX...");

                        const tempAuction = await base44.entities.Auction.create({
                          title: selectedPlan.name,
                          description: selectedPlan.description,
                          starting_price: selectedPlan.minInvestment,
                          current_price: selectedPlan.minInvestment,
                          increment: 0,
                          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                          status: 'sold',
                          winner_id: currentUser.id,
                          winner_name: currentUser.full_name,
                          order_status: 'awaiting_payment',
                          is_investment_plan: true,
                          image_urls: productImages[selectedPlan.imageKey] ? [productImages[selectedPlan.imageKey]] : []
                        });

                        const response = await createAbacatePayPix({
                          auction_id: tempAuction.id,
                          user_name: name,
                          user_email: email,
                          user_phone: phone,
                          user_cpf: cpf
                        });

                        if (response?.data?.success) {
                          setPixData(response.data);
                          toast.success("QR Code gerado com sucesso!");
                        } else {
                          toast.error(response?.data?.error || "Erro ao gerar QR Code");
                        }
                      } catch (error) {
                        console.error('❌ Erro:', error);
                        toast.error("Erro ao processar: " + error.message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing || !acceptedContract}
                    className={`flex-1 ${acceptedContract ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'}`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>📱 Gerar PIX</>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* QR Code PIX */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-bold text-white text-center">💚 Pague com PIX</h3>
                <div className="bg-white rounded-lg p-4">
                  <img 
                    src={pixData.qr_code_base64} 
                    alt="QR Code PIX" 
                    className="w-64 h-64 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-300 text-center">Ou copie o código PIX:</p>
                <div className="flex gap-2">
                  <Input
                    value={pixData.pix_code}
                    readOnly
                    className="text-xs bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.pix_code);
                      toast.success("Código copiado!");
                    }}
                    size="icon"
                    variant="outline"
                    className="border-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-2xl font-bold text-green-400 text-center">
                  R$ {selectedPlan.minInvestment.toLocaleString('pt-BR')}
                </p>

                <Button
                  onClick={async () => {
                    setIsCheckingPayment(true);
                    try {
                      toast.info("Verificando pagamento...");
                      
                      const response = await checkAbacatePayPix({
                        billing_id: pixData.billing_id,
                        auction_id: pixData.auction_id
                      });

                      if (response?.data?.is_paid || response?.is_paid) {
                        toast.success("✅ Pagamento confirmado!");
                        setShowPlansModal(false);
                        setTimeout(() => {
                          window.location.reload();
                        }, 2000);
                      } else {
                        toast.info("⏳ Pagamento ainda não identificado. Aguarde e tente novamente.");
                      }
                    } catch (error) {
                      toast.error("Erro ao verificar: " + error.message);
                    } finally {
                      setIsCheckingPayment(false);
                    }
                  }}
                  disabled={isCheckingPayment}
                  className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-4"
                >
                  {isCheckingPayment ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>✅ Já efetuei o pagamento</>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setPixData(null);
                    setSelectedPlan(null);
                  }}
                  variant="outline"
                  className="w-full bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300"
                >
                  Cancelar
                </Button>
              </motion.div>
            )}


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
                  Veja em tempo real todas as etapas da sua compra neste dashboard.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">🔒 Compra Segura</h4>
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