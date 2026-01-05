import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { forceSyncStats } from "@/functions/forceSyncStats";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Users, BarChart, DollarSign, Zap, Star, ShieldCheck, LogIn, Loader2, Search, TrendingUp, Info, RefreshCw, Wallet, Clock, Smartphone } from 'lucide-react';

import LicenseeRegistrationModal from '../components/licensing/LicenseeRegistrationModal';
import LoginModal from '../components/common/LoginModal';
import CommissionStatementModal from '../components/admin/CommissionStatementModal';
import AuctionSelectionModal from '../components/licensing/AuctionSelectionModal';
import EarningsSimulator from '../components/licensing/EarningsSimulator';
import JourneyAnimation from '../components/licensing/JourneyAnimation';

const fetchWithRetry = async (fetchFunction, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFunction();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isNetworkError = error.message?.includes('Network') || error.message?.includes('Failed to fetch');
      
      if (isLastAttempt || !isNetworkError) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const StatCard = ({ icon: Icon, label, value, onClick, isLoading }) => (
    <Card
        onClick={onClick}
        className={`bg-white border-gray-300 backdrop-blur-sm transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-red-500/60 hover:bg-gray-50' : ''}`}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
            <Icon className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
                <div className="text-2xl font-bold text-gray-900">{value}</div>
            )}
        </CardContent>
    </Card>
);

const LandingContent = ({ onRegisterClick, onLoginClick }) => {
    const [hoveredBenefit, setHoveredBenefit] = React.useState(null);
    const cardsRef = React.useRef(null);

    const scrollToCards = () => {
        cardsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    const benefits = [
        { 
            icon: DollarSign, 
            text: "Ganhos em Dinheiro Real",
            description: "Receba comissões em dinheiro (R$) toda vez que seus indicados arrematarem produtos. Quanto mais eles compram, mais você ganha!"
        },
        { 
            icon: Zap, 
            text: "Comissões Recorrentes",
            description: "Ganhe 3% em cada arremate dos seus indicados. Renda passiva e recorrente para você!"
        },
        { 
            icon: BarChart, 
            text: "Dashboard em Tempo Real",
            description: "Acompanhe suas comissões, indicados e performance ao vivo. Transparência total sobre seus ganhos!"
        },
        { 
            icon: ShieldCheck, 
            text: "Sistema de Alavancagem",
            description: "Construa sua rede de indicados e multiplique seus ganhos. Quanto mais você cresce, maiores são as recompensas!"
        },
    ];

    return (
        <>
            <div className="text-center">
                <div className="mb-12">
                    <div className="inline-flex flex-col items-center gap-3 bg-white backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-300 hover:border-red-500/50 transition-all duration-300 shadow-lg">
                        <p className="text-gray-600 text-sm font-medium">
                            Já tem uma conta?
                        </p>
                        <button
                            onClick={onLoginClick}
                            className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-red-500/50 transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <LogIn className="w-5 h-5" />
                            </div>
                            <span>Entrar na Minha Conta</span>
                        </button>
                        <p className="text-gray-500 text-xs">
                            Acesse seu painel de influenciador
                        </p>
                    </div>
                </div>

                <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <button
                            onClick={scrollToCards}
                            className="px-4 bg-gray-50 text-gray-600 text-sm font-medium hover:text-red-600 transition-colors cursor-pointer"
                        >
                            Ou cadastre-se agora
                        </button>
                    </div>
                </div>
            </div>

            <JourneyAnimation />

            <div className="mb-16 mt-20">
              <EarningsSimulator theme="saidebaixo" />
            </div>

            <div ref={cardsRef} className="mt-16 max-w-2xl mx-auto">
                <Card className="bg-white backdrop-blur-sm border-2 border-red-500/50 shadow-xl hover:shadow-red-500/30 hover:border-red-400 transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                                <Smartphone className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <div className="text-red-600 font-bold">Influencie</div>
                                <div className="text-sm text-gray-600 font-normal">Programa de Influenciadores</div>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-gray-700 text-base leading-relaxed">
                            Torne-se um <strong className="text-gray-900">Influenciador Sai de Baixo</strong> e receba <strong className="text-red-600">3% em dinheiro real (R$)</strong> sobre CADA arremate que seus indicados fizerem. Ganhos passivos e recorrentes direto na sua conta!
                        </p>
                        
                        <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-2">
                            <p className="text-red-600 font-semibold flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Benefícios de ser um Influenciador:
                            </p>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li>✅ Link de indicação exclusivo</li>
                                <li>✅ 3% em R$ de cada arremate dos indicados</li>
                                <li>✅ Pagamento em dinheiro real</li>
                                <li>✅ Dashboard com estatísticas em tempo real</li>
                                <li>✅ Sistema de alavancagem para crescimento</li>
                            </ul>
                        </div>

                        <div className="pt-2">
                            <Button
                                size="lg"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-base py-6 rounded-lg shadow-lg hover:shadow-red-500/50 transition-all"
                                onClick={onRegisterClick}
                            >
                                <Smartphone className="w-5 h-5 mr-2" />
                                Quero ser um Influenciador agora!
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-20">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Seus Benefícios Como Influenciador</h2>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {benefits.map((item, index) => (
                        <div 
                            key={item.text} 
                            className="flex flex-col items-center group"
                            onMouseEnter={() => setHoveredBenefit(index)}
                            onMouseLeave={() => setHoveredBenefit(null)}
                        >
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white border-2 border-red-500/30 mb-4 transform group-hover:scale-110 group-hover:border-red-600 transition-all shadow-lg cursor-pointer">
                                <item.icon className="h-10 w-10 text-red-600" />
                            </div>
                            <p className="font-semibold text-gray-900 text-base">{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {hoveredBenefit !== null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
                        style={{ perspective: '1000px' }}
                    >
                        <div className="bg-white border-2 border-red-500/50 rounded-2xl p-6 shadow-2xl max-w-sm mx-4"
                             style={{ 
                                 boxShadow: '0 0 60px rgba(239, 68, 68, 0.4), 0 20px 80px rgba(0,0,0,0.8)'
                             }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-500/20 rounded-xl flex-shrink-0 border border-red-500/30">
                                    {React.createElement(benefits[hoveredBenefit].icon, {
                                        className: "w-8 h-8 text-red-600"
                                    })}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-2">
                                        {benefits[hoveredBenefit].text}
                                    </h4>
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                        {benefits[hoveredBenefit].description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const DashboardContent = ({ user, isAdmin }) => {
  const navigate = useNavigate();
  const walletCardRef = useRef(null);
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [searchTerm, setSearchTerm] = useState('');

  const [isAuctionSelectionModalOpen, setIsAuctionSelectionModalOpen] = useState(false);
  const [viewingCommissionsFor, setViewingCommissionsFor] = useState(null);

  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);

  const [realMetrics, setRealMetrics] = useState({
    indicatedCount: null,
    networkBidsCount: null,
  });

  const [myClients, setMyClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [pendingWithdrawalAmount, setPendingWithdrawalAmount] = useState(0);

  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const referralLink = `https://leilaonozap.app${createPageUrl('SaiDeBaixo')}?ref=${user.referral_code}`;

  const userLevels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : ['usuario']);
  const primaryLevel = user.primary_career_level || userLevels[0] || 'usuario';
  
  const careerLevelsMap = {
    'usuario': 'Usuário',
    'licenciado_aplicativo': 'Licenciado Aplicativo',
    'licenciado_catalogo': 'Licenciado Catálogo',
    'executivo': 'Executivo',
    'diretor': 'Diretor',
    'ceo': 'CEO',
    'conselheiro': 'Conselheiro',
    'fundador': 'Fundador'
  };

  const careerHierarchy = ['fundador', 'conselheiro', 'ceo', 'diretor', 'executivo', 'licenciado_catalogo', 'licenciado_aplicativo', 'usuario'];
  
  const highestLevel = careerHierarchy.find(level => userLevels.includes(level)) || 'usuario';
  
  const shortName = user.display_first_name && user.display_last_name
    ? `${user.display_first_name} ${user.display_last_name}`
    : (() => {
        const nameParts = user.full_name.split(' ');
        return nameParts.length > 1 
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` 
          : nameParts[0];
      })();
  
  const highestLevelName = careerLevelsMap[highestLevel];
  const primaryLevelName = careerLevelsMap[primaryLevel];

  const valoraNotesDashboard = [
    { value: 200, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/83f8b9a48_200_front.jpg" },
    { value: 100, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/15d210cda_cdula-100-reais_anverso.jpg" },
    { value: 50, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/109de79bd_50_front.jpg" },
    { value: 20, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/81c45e110_20_front.jpg" },
    { value: 10, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/85f62789d_Anverso_da_cdula_de_10_reais.PNG" },
    { value: 5, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/8f25db571_5_front.jpg" },
    { value: 2, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/90f9e2b2b_Anverso_da_cdula_de_dois_reais.PNG" }
  ];

  const fetchRealMetrics = useCallback(async () => {
    if (!user || !user.id) return;

    if (isFetchingRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    if (timeSinceLastFetch < 15000 && lastFetchTimeRef.current !== 0) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      const indicatedUsers = await fetchWithRetry(
        () => AppUser.filter({ referred_by_id: user.id })
      );
      
      const indicatedCount = Array.isArray(indicatedUsers) ? indicatedUsers.length : 0;

      await delay(500);

      let networkBidsCount = 0;
      if (indicatedCount > 0 && Array.isArray(indicatedUsers)) {
        const indicatedUserIds = indicatedUsers.map(u => u.id).filter(Boolean);
        if (indicatedUserIds.length > 0) {
          try {
            const wonAuctions = await fetchWithRetry(
              () => Auction.filter({
                status: { $in: ["ended", "sold"] },
                winner_id: { $in: indicatedUserIds },
                is_investment_plan: { $ne: true },
                is_test_auction: { $ne: true }
              })
            );
            networkBidsCount = Array.isArray(wonAuctions) ? wonAuctions.length : 0;
          } catch (error) {
            networkBidsCount = user.network_bids_count || 0;
          }
        }
      }

      setRealMetrics({ indicatedCount, networkBidsCount });

    } catch (error) {
      setRealMetrics({
        indicatedCount: user.indicated_clients_count || 0,
        networkBidsCount: user.network_bids_count || 0,
      });
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

  const fetchMyClients = useCallback(async () => {
    if (!user || !user.id || isLoadingClients) return;

    setIsLoadingClients(true);
    try {
      await delay(500);
      
      const clients = await fetchWithRetry(
        () => AppUser.filter({ referred_by_id: user.id }, "-created_date", 200)
      );
      
      setMyClients(Array.isArray(clients) ? clients : []);
    } catch (error) {
      setMyClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [user, isLoadingClients]);

  const fetchMyWithdrawals = useCallback(async () => {
    if (!user || !user.id || isLoadingWithdrawals) return;

    setIsLoadingWithdrawals(true);
    try {
      await delay(500);
      
      const withdrawals = await fetchWithRetry(
        () => base44.entities.WithdrawalRequest.filter({ influencer_id: user.id }, "-created_date", 100)
      );
      
      setMyWithdrawals(Array.isArray(withdrawals) ? withdrawals : []);
      
      const pending = withdrawals
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + (w.amount || 0), 0);
      setPendingWithdrawalAmount(pending);
    } catch (error) {
      setMyWithdrawals([]);
      setPendingWithdrawalAmount(0);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  }, [user, isLoadingWithdrawals]);

  useEffect(() => {
    const loadData = async () => {
      await fetchRealMetrics();
      await delay(3000);
      await fetchMyClients();
      await delay(2000);
      await fetchMyWithdrawals();
    };

    const initialTimeout = setTimeout(loadData, 1000);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, []);

  const getNoteStack = (balance) => {
    const sortedNotes = [...valoraNotesDashboard].sort((a, b) => a.value - b.value);
    let centerNote = sortedNotes.find(note => balance >= note.value) || sortedNotes[0];

    if (!centerNote && sortedNotes.length > 0) {
      centerNote = sortedNotes[0];
    } else if (!centerNote) {
      return [{}, {}, {}, {}, {}];
    }

    const currentIndex = sortedNotes.findIndex(note => note.value === centerNote.value);
    const getCircularIndex = (idx) => (idx + sortedNotes.length) % sortedNotes.length;

    const guardianNote = sortedNotes[0];
    const backBackNote = sortedNotes[getCircularIndex(currentIndex - 2)];
    const backNote = sortedNotes[getCircularIndex(currentIndex - 1)];
    const frontNote = centerNote;
    const sideNote = sortedNotes[getCircularIndex(currentIndex + 1)];
    
    return [guardianNote, backBackNote, backNote, frontNote, sideNote];
  };

  const [guardianNote, backBackNote, backNote, frontNote, sideNote] = getNoteStack(user.valora_pay_balance || 0);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link copiado!');
  };

  const handleAuctionSelect = (auctionId) => {
    setIsAuctionSelectionModalOpen(false);
    navigate(createPageUrl(`AuctionRoom?id=${auctionId}&useBalance=true`));
  };

  const handleWithdrawalSubmit = async (e) => {
    if (e) e.preventDefault();

    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      toast.error('Valor inválido');
      return;
    }

    if (amount < 30) {
      toast.error('Saque mínimo é de R$ 30,00');
      return;
    }

    if (amount > (user.valora_pay_balance || 0)) {
      toast.error('Saldo indisponível');
      return;
    }

    if (!pixKey || pixKey.trim() === '') {
      toast.error('Informe a chave PIX');
      return;
    }

    setIsProcessingWithdrawal(true);

    try {
      const response = await base44.functions.invoke('requestWithdrawal', {
        amount,
        pix_key: pixKey,
        pix_key_type: pixKeyType
      });

      const data = response?.data;

      if (data?.success) {
        toast.success(data.message || 'Saque solicitado com sucesso!');
        setShowWithdrawalModal(false);
        setWithdrawalAmount('');
        setPixKey('');

        await delay(2000);
        await fetchRealMetrics();
        await delay(1000);
        await fetchMyWithdrawals();
      } else {
        toast.error(data?.error || 'Erro ao solicitar saque');
      }
    } catch (error) {
      toast.error(`❌ Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsProcessingWithdrawal(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm) return myClients;
    const term = searchTerm.toLowerCase();
    return myClients.filter(client =>
      (client.full_name && client.full_name.toLowerCase().includes(term)) ||
      (client.nickname && client.nickname.toLowerCase().includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    );
  }, [myClients, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel do Influenciador</h1>
          <p className="text-gray-600">
            Seja bem-vindo, <strong className="text-gray-900">{shortName}</strong>! 
            <strong className="text-red-600">Influenciador</strong> Sai de Baixo 👋
          </p>
        </div>
      </div>

      <Card ref={walletCardRef} className="mb-8 bg-gradient-to-br from-red-50 to-red-100/50 border-red-300 backdrop-blur-sm overflow-hidden shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Saldo Disponível</h3>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-bold text-gray-900">
                  R$ {(user.valora_pay_balance || 0).toFixed(2)}
                </span>
              </div>
              {pendingWithdrawalAmount > 0 && (
                <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Saque em Processo: R$ {pendingWithdrawalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Aguardando aprovação
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsAuctionSelectionModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Usar Saldo em Leilões
                </Button>
                <Button
                  onClick={() => setShowWithdrawalModal(true)}
                  className="bg-gray-800 hover:bg-gray-900 text-white"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Sacar Dinheiro
                </Button>
              </div>
            </div>
            
            <div className="relative w-64 h-40 flex items-center justify-center nota-stack-container">
              {guardianNote && guardianNote.url && (
                <img
                  src={guardianNote.url}
                  alt=""
                  className="absolute w-60 h-36 rounded-lg shadow-2xl transform -rotate-15 translate-y-3 -translate-x-1 nota-stack-guardian nota-entrance-guardian"
                  style={{ zIndex: 0, opacity: 0.65 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              
              {backBackNote && backBackNote.url && (
                <img
                  src={backBackNote.url}
                  alt=""
                  className="absolute w-60 h-36 rounded-lg shadow-2xl transform -rotate-10 translate-y-2 nota-stack-backback nota-entrance-backback"
                  style={{ zIndex: 1, opacity: 0.7 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              
              {backNote && backNote.url && (
                <img
                  src={backNote.url}
                  alt=""
                  className="absolute w-60 h-36 rounded-lg shadow-2xl transform -rotate-5 translate-y-1 nota-stack-back nota-entrance-back"
                  style={{ zIndex: 2, opacity: 0.8 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              
              {sideNote && sideNote.url && (
                <img
                  src={sideNote.url}
                  alt=""
                  className="absolute w-60 h-36 rounded-lg shadow-2xl transform rotate-10 translate-x-3 nota-stack-side nota-entrance-side"
                  style={{ zIndex: 3, opacity: 0.9 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}

              {frontNote && frontNote.url && (
                <img
                  src={frontNote.url}
                  alt=""
                  className="absolute w-60 h-36 rounded-lg shadow-2xl transform rotate-2 nota-stack-front nota-entrance-front"
                  style={{ zIndex: 4 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
            icon={DollarSign}
            label="Saldo Disponível"
            value={`R$ ${(user.valora_pay_balance || 0).toFixed(2)}`}
            onClick={() => setIsAuctionSelectionModalOpen(true)}
          />
        <StatCard
          icon={Users}
          label="Clientes Indicados"
          value={realMetrics.indicatedCount !== null ? realMetrics.indicatedCount : '...'}
          isLoading={realMetrics.indicatedCount === null}
        />
        <StatCard
          icon={TrendingUp}
          label="Arremates do Sistema de Alavancagem"
          value={realMetrics.networkBidsCount !== null ? realMetrics.networkBidsCount : '...'}
          isLoading={realMetrics.networkBidsCount === null}
        />
        <StatCard
            icon={BarChart}
            label="Comissões Geradas"
            value={`R$ ${(user.commission_balance || 0).toFixed(2)}`}
            onClick={() => setViewingCommissionsFor(user)}
          />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border-gray-300">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="meus-clientes">Meus Clientes ({myClients.length})</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="saques">Histórico de Saques</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <Card className="bg-white border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Seu Link de Indicação</CardTitle>
              <CardDescription className="text-gray-600">
                Compartilhe este link para indicar novos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="bg-gray-100 border-gray-300 text-gray-900 font-mono text-sm"
                />
                <Button onClick={copyToClipboard} className="bg-red-600 hover:bg-red-700">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <Alert className="bg-red-50 border-red-300">
                <Info className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-gray-700">
                  Quando alguém usar seu link, será automaticamente seu indicado!
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Como Funciona o Sistema</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Compartilhe seu Link</h4>
                  <p className="text-sm text-gray-600">Envie seu link de indicação para amigos e familiares.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Eles Se Cadastram</h4>
                  <p className="text-sm text-gray-600">Quando usam seu link, são automaticamente seus indicados.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Você Ganha 3% em R$</h4>
                  <p className="text-sm text-gray-600">A cada arremate deles, você recebe 3% em dinheiro real!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meus-clientes" className="space-y-6">
          <Card className="bg-white border-gray-300 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-gray-900">Clientes Indicados</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-100 border-gray-300 text-gray-900"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingClients ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                </div>
              ) : filteredClients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-300">
                      <TableHead className="text-gray-700">Nome</TableHead>
                      <TableHead className="text-gray-700">Email</TableHead>
                      <TableHead className="text-gray-700">Data de Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                        <TableRow key={client.id} className="border-gray-300">
                          <TableCell className="text-gray-900">{client.full_name}</TableCell>
                          <TableCell className="text-gray-600">{client.email}</TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(client.created_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Nenhum cliente indicado ainda</p>
                  <p className="text-sm mt-2">Compartilhe seu link para começar!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-6">
          <Card className="bg-white border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Extrato de Comissões</CardTitle>
              <CardDescription className="text-gray-600">
                Total acumulado: R$ {(user.commission_balance || 0).toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setViewingCommissionsFor(user)}
                className="bg-red-600 hover:bg-red-700"
              >
                Ver Detalhes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saques" className="space-y-6">
          <Card className="bg-white border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Histórico de Saques</CardTitle>
              <CardDescription className="text-gray-600">
                Acompanhe suas solicitações de saque
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWithdrawals ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                </div>
              ) : myWithdrawals.length > 0 ? (
                <div className="space-y-4">
                  {myWithdrawals.map(withdrawal => (
                    <Card key={withdrawal.id} className="bg-gray-50 border-gray-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="text-2xl font-bold text-red-600">
                                R$ {withdrawal.amount.toFixed(2)}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' :
                                withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800 border border-blue-400' :
                                withdrawal.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-400' :
                                'bg-red-100 text-red-800 border border-red-400'
                              }`}>
                                {withdrawal.status === 'pending' && '⏳ Aguardando'}
                                {withdrawal.status === 'approved' && '✅ Aprovado'}
                                {withdrawal.status === 'completed' && '✅ Concluído'}
                                {withdrawal.status === 'rejected' && '❌ Rejeitado'}
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <strong className="text-gray-900">Chave PIX:</strong> {withdrawal.pix_key}
                              </p>
                              <p>
                                <strong className="text-gray-900">Solicitado em:</strong> {new Date(withdrawal.created_date).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Nenhum saque solicitado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {viewingCommissionsFor && (
        <CommissionStatementModal
          licensee={viewingCommissionsFor}
          isOpen={true}
          onClose={() => setViewingCommissionsFor(null)}
        />
      )}
      {isAuctionSelectionModalOpen && (
        <AuctionSelectionModal
          isOpen={isAuctionSelectionModalOpen}
          onClose={() => setIsAuctionSelectionModalOpen(false)}
          onSelectAuction={handleAuctionSelect}
        />
      )}

      {/* Modal de Saque */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-300">
              <h3 className="text-2xl font-bold text-gray-900">💸 Solicitar Saque</h3>
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isProcessingWithdrawal}
              >
                <span className="text-gray-600">✕</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-300">
                <p className="text-sm text-gray-700 mb-1">Saldo Disponível para Saque:</p>
                <p className="text-3xl font-bold text-red-600">
                  R$ {(user?.valora_pay_balance || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <Label className="text-gray-700">Valor do Saque</Label>
                <Input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                  min="30"
                  className="bg-gray-100 border-gray-300 text-gray-900 text-lg"
                  disabled={isProcessingWithdrawal}
                />
                <p className="text-xs text-gray-600 mt-1">Valor mínimo: R$ 30,00</p>
              </div>

              <div>
                <Label className="text-gray-700">Tipo de Chave PIX</Label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900"
                  disabled={isProcessingWithdrawal}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Telefone</option>
                  <option value="RANDOM">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-700">Chave PIX</Label>
                <Input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave PIX"
                  className="bg-gray-100 border-gray-300 text-gray-900"
                  disabled={isProcessingWithdrawal}
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-300">
                <p className="text-sm text-blue-800">
                  ℹ️ O saque será processado em até 2 dias úteis após aprovação.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700"
                  disabled={isProcessingWithdrawal}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleWithdrawalSubmit}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isProcessingWithdrawal}
                >
                  {isProcessingWithdrawal ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Solicitar Saque'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes entrance-guardian {
          from {
            transform: translateY(200px) translateX(-50px) rotate(-15deg) scale(0.5);
            opacity: 0;
          }
          to {
            transform: translateY(12px) translateX(-4px) rotate(-15deg) scale(1);
            opacity: 0.65;
          }
        }

        @keyframes entrance-backback {
          from {
            transform: translateX(-300px) translateY(0) rotate(-10deg) scale(0.7);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(8px) rotate(-10deg) scale(1);
            opacity: 0.7;
          }
        }

        @keyframes entrance-back {
          from {
            transform: translateX(300px) translateY(0) rotate(-5deg) scale(0.7);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(4px) rotate(-5deg) scale(1);
            opacity: 0.8;
          }
        }

        @keyframes entrance-side {
          from {
            transform: translateX(400px) translateY(-100px) rotate(10deg) scale(0.5);
            opacity: 0;
          }
          to {
            transform: translateX(12px) translateY(0) rotate(10deg) scale(1);
            opacity: 0.9;
          }
        }

        @keyframes entrance-front {
          from {
            transform: translateY(-300px) rotate(180deg) scale(0.3);
            opacity: 0;
          }
          to {
            transform: translateY(0) rotate(2deg) scale(1);
            opacity: 1;
          }
        }

        .nota-entrance-guardian {
          animation: entrance-guardian 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both;
        }

        .nota-entrance-backback {
          animation: entrance-backback 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both;
        }

        .nota-entrance-back {
          animation: entrance-back 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s both;
        }

        .nota-entrance-side {
          animation: entrance-side 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.6s both;
        }

        .nota-entrance-front {
          animation: entrance-front 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s both;
        }

        .nota-stack-container {
          animation: float-notes 4s ease-in-out 3.5s infinite;
        }

        .nota-stack-guardian {
          animation: entrance-guardian 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both,
                     float-guardian 5.5s ease-in-out 3.5s infinite;
        }

        .nota-stack-backback {
          animation: entrance-backback 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both,
                     float-backback 5s ease-in-out 3.5s infinite;
        }

        .nota-stack-back {
          animation: entrance-back 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s both,
                     float-back 4.5s ease-in-out 3.5s infinite;
        }

        .nota-stack-front {
          animation: entrance-front 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s both,
                     float-front 4s ease-in-out 3.5s infinite;
        }

        .nota-stack-side {
          animation: entrance-side 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.6s both,
                     float-side 3.5s ease-in-out 3.5s infinite;
        }

        @keyframes float-notes {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes float-guardian {
          0%, 100% {
            transform: rotate(-15deg) translateY(3px) translateX(-4px);
          }
          50% {
            transform: rotate(-15deg) translateY(-3px) translateX(-4px);
          }
        }

        @keyframes float-backback {
          0%, 100% {
            transform: rotate(-10deg) translateY(2px);
          }
          50% {
            transform: rotate(-10deg) translateY(-4px);
          }
        }

        @keyframes float-back {
          0%, 100% {
            transform: rotate(-5deg) translateY(1px);
          }
          50% {
            transform: rotate(-5deg) translateY(-6px);
          }
        }

        @keyframes float-front {
          0%, 100% {
            transform: rotate(2deg) translateY(0);
          }
          50% {
            transform: rotate(2deg) translateY(-10px);
          }
        }

        @keyframes float-side {
          0%, 100% {
            transform: rotate(10deg) translateX(12px) translateY(0);
          }
          50% {
            transform: rotate(10deg) translateX(12px) translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
};

export default function LicensingSaiDeBaixoPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLicenseeRegisterModal, setShowLicenseeRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchWithRetryInLicensingPage = async (fetchFunction, maxRetries = 3, delayMs = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchFunction();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
          const user = JSON.parse(savedUserJSON);

          try {
            const usersFromDB = await fetchWithRetryInLicensingPage(
              () => AppUser.filter({ id: user.id }),
              3,
              1000
            );

            if (usersFromDB && usersFromDB.length > 0) {
              const freshUser = usersFromDB[0];
              setCurrentUser(freshUser);
              localStorage.setItem('currentUser', JSON.stringify(freshUser));
            } else {
              setCurrentUser(user);
            }
          } catch (networkError) {
            setCurrentUser(user);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleRegistrationSuccess = (user) => {
    setCurrentUser(user);
    setShowLicenseeRegisterModal(false);
    setShowLoginModal(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[5000]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-lg text-gray-900">Carregando...</p>
        </div>
      </div>
    );
  }

  const isLicensee = currentUser && (
    currentUser.role === 'licensee' ||
    (currentUser.role === 'admin' && currentUser.referral_code)
  );

  const isAdmin = currentUser?.role === 'admin';

  const getUserLevel = () => {
    if (!currentUser) return 'guest';
    
    const userLevels = Array.isArray(currentUser.career_levels) 
      ? currentUser.career_levels 
      : (currentUser.career_levels ? [currentUser.career_levels] : ['usuario']);
    
    const careerHierarchy = ['fundador', 'conselheiro', 'ceo', 'diretor', 'executivo', 'licenciado_catalogo', 'licenciado_aplicativo', 'usuario'];
    const highestLevel = careerHierarchy.find(level => userLevels.includes(level)) || 'usuario';
    
    return highestLevel;
  };

  const userLevel = getUserLevel();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-20 px-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10"></div>
          <div className="relative max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-3 mb-6 bg-red-50 px-6 py-3 rounded-full border border-red-300">
                <TrendingUp className="w-6 h-6 text-red-600" />
                <span className="text-red-600 font-semibold">Programa de Influenciadores</span>
              </div>
              
              {userLevel === 'guest' || userLevel === 'usuario' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                    Torne-se um Influenciador
                  </h1>
                  <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
                    Indique amigos e ganhe <strong className="text-red-600">3% em dinheiro real (R$)</strong> em cada arremate que eles fizerem!
                  </p>
                  <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
                    Construa um negócio sólido com o sistema de alavancagem do Sai de Baixo!
                  </p>
                </>
              ) : userLevel === 'licenciado_aplicativo' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                    Você já é um Influenciador!
                  </h1>
                  <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
                    Compartilhe seu link &rarr; Seus indicados arrematam &rarr; <strong className="text-red-600">Você ganha 3% em dinheiro real!</strong>
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                    Parabéns! Você é um Influenciador 🎉
                  </h1>
                  <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
                    Ganhe <strong className="text-red-600">comissões em dinheiro real (R$)</strong> + bônus do seu sistema de alavancagem!
                  </p>
                </>
              )}
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLicensee ? (
            <DashboardContent user={currentUser} isAdmin={isAdmin} />
          ) : (
            <LandingContent
              onRegisterClick={() => setShowLicenseeRegisterModal(true)}
              onLoginClick={() => setShowLoginModal(true)}
            />
          )}
        </div>

        <div className="py-20 px-6 bg-gray-100">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
              Construa Seu Sistema de Alavancagem
            </h2>
            <p className="text-gray-600 text-center mb-12">
              Veja como nossos influenciadores estão crescendo
            </p>
          </div>
        </div>

      </div>

      {showLicenseeRegisterModal && (
        <LicenseeRegistrationModal
          onClose={() => setShowLicenseeRegisterModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      )}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleRegistrationSuccess}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowLicenseeRegisterModal(true);
          }}
        />
      )}
    </>
  );
}