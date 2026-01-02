import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { forceSyncStats } from "@/functions/forceSyncStats";
import { resetTestData } from "@/functions/resetTestData";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Users, BarChart, DollarSign, Zap, Star, ShieldCheck, LogIn, Loader2, Search, TrendingUp, Info, RefreshCw, Link2, Trash2, AlertCircle, Smartphone, MessageCircle } from 'lucide-react';

import LicenseeRegistrationModal from '../components/licensing/LicenseeRegistrationModal';
import LoginModal from '../components/common/LoginModal';
import IndicatedUsersModal from '../components/admin/IndicatedUsersModal';
import CommissionStatementModal from '../components/admin/CommissionStatementModal';
import CareerPath from '../components/licensing/CareerPath';
import AuctionSelectionModal from '../components/licensing/AuctionSelectionModal';
import UserEditModal from '../components/admin/UserEditModal';
import UserPasswordModal from '../components/admin/UserPasswordModal';
import ValoraNotesGallery from '../components/licensing/ValoraNotesGallery';
import JourneyAnimation from '../components/licensing/JourneyAnimation';

const StatCard = ({ icon: Icon, label, value, onClick, isLoading }) => (
    <Card
        onClick={onClick}
        className={`bg-gray-800/50 border-gray-700/80 backdrop-blur-sm transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-green-500/60 hover:bg-gray-700/50' : ''}`}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{label}</CardTitle>
            <Icon className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
                <div className="text-2xl font-bold text-white">{value}</div>
            )}
        </CardContent>
    </Card>
);

// 🆕 FUNÇÃO AUXILIAR PARA RETRY COM EXPONENTIAL BACKOFF
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
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Tentativa ${attempt} falhou: ${error.message}, aguardando ${delay}ms antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// 🆕 FUNÇÃO PARA ADICIONAR DELAY ENTRE CHAMADAS
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const LandingContent = ({ onRegisterClick, onLoginClick }) => {
    const [hoveredBenefit, setHoveredBenefit] = React.useState(null);
    const cardsRef = React.useRef(null);

    const handleRegisterClick = () => {
        onRegisterClick();
    };

    const scrollToCards = () => {
        cardsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    const benefits = [
        { 
            icon: DollarSign, 
            text: "Ganhos Recorrentes",
            description: "Receba comissões toda vez que seus indicados arrematarem produtos. Quanto mais eles compram, mais você ganha!"
        },
        { 
            icon: Zap, 
            text: "Créditos Valora Pay",
            description: "Acumule V$ (Valora Pay) para usar em leilões e arrematar produtos incríveis. Sua moeda exclusiva dentro da plataforma!"
        },
        { 
            icon: BarChart, 
            text: "Dashboard em Tempo Real",
            description: "Acompanhe suas comissões, indicados e performance ao vivo. Transparência total sobre seus ganhos!"
        },
        { 
            icon: ShieldCheck, 
            text: "Plano de Carreira",
            description: "Cresça de Licenciado Aplicativo até Diretor. Quanto mais você evolui, maiores são as recompensas!"
        },
    ];

    return (
        <>
            <div className="text-center">
                <div className="mb-12">
                    <div className="inline-flex flex-col items-center gap-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-700 hover:border-green-500/50 transition-all duration-300">
                        <p className="text-gray-400 text-sm font-medium">
                            Já tem uma conta?
                        </p>
                        <button
                            onClick={onLoginClick}
                            className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <LogIn className="w-5 h-5" />
                            </div>
                            <span>Entrar na Minha Conta</span>
                        </button>
                        <p className="text-gray-500 text-xs">
                            Acesse seu painel de licenciado
                        </p>
                    </div>
                </div>

                <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <button
                            onClick={scrollToCards}
                            className="px-4 bg-gray-900 text-gray-500 text-sm font-medium hover:text-green-400 transition-colors cursor-pointer"
                        >
                            Ou cadastre-se agora
                        </button>
                    </div>
                </div>
            </div>

            <JourneyAnimation />

            <div className="mb-16 mt-20">
              <ValoraNotesGallery />
            </div>

            <div ref={cardsRef} className="mt-16 max-w-2xl mx-auto">
                <Card className="bg-gray-800/80 backdrop-blur-sm border-2 border-green-500/50 shadow-xl hover:shadow-green-500/30 hover:border-green-400 transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                                <Smartphone className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <div className="text-green-400 font-bold">Sistema de Indicação</div>
                                <div className="text-sm text-gray-400 font-normal">Aplicativo Leilão NoZap</div>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-gray-200 text-base leading-relaxed">
                            Indique novos clientes para o <strong className="text-white">aplicativo Leilão NoZap</strong> e receba <strong className="text-green-400">3% em Valora Pay (V$)</strong> sobre CADA arremate que eles fizerem. Ganhos passivos e recorrentes.
                        </p>
                        
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-2">
                            <p className="text-green-400 font-semibold flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Benefícios do Sistema de Indicação:
                            </p>
                            <ul className="space-y-1 text-sm text-gray-300">
                                <li>✅ Link de indicação exclusivo</li>
                                <li>✅ 3% em V$ de cada arremate dos indicados</li>
                                <li>✅ Ganhos recorrentes e passivos</li>
                                <li>✅ Dashboard com estatísticas em tempo real</li>
                                <li>✅ Plano de carreira para crescimento</li>
                            </ul>
                        </div>

                        <div className="pt-2">
                            <Button
                                size="lg"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-6 rounded-lg shadow-lg hover:shadow-green-500/50 transition-all"
                                onClick={handleRegisterClick}
                            >
                                <Smartphone className="w-5 h-5 mr-2" />
                                Quero meu link de indicação agora!
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-20">
                <h2 className="text-3xl font-bold text-white mb-4 text-center">Seus Benefícios Como Licenciado</h2>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {benefits.map((item, index) => (
                        <div 
                            key={item.text} 
                            className="flex flex-col items-center group"
                            onMouseEnter={() => setHoveredBenefit(index)}
                            onMouseLeave={() => setHoveredBenefit(null)}
                        >
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-800 border-2 border-green-500/30 mb-4 transform group-hover:scale-110 group-hover:border-green-400 transition-all shadow-lg cursor-pointer">
                                <item.icon className="h-10 w-10 text-green-400" />
                            </div>
                            <p className="font-semibold text-white text-base">{item.text}</p>
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
                        <div className="bg-gray-800 border-2 border-green-500/50 rounded-2xl p-6 shadow-2xl max-w-sm mx-4"
                             style={{ 
                                 boxShadow: '0 0 60px rgba(34, 197, 94, 0.4), 0 20px 80px rgba(0,0,0,0.8)'
                             }}
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-500/20 rounded-xl flex-shrink-0 border border-green-500/30">
                                    {React.createElement(benefits[hoveredBenefit].icon, {
                                        className: "w-8 h-8 text-green-400"
                                    })}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg mb-2">
                                        {benefits[hoveredBenefit].text}
                                    </h4>
                                    <p className="text-gray-300 text-sm leading-relaxed">
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
  const [viewingIndicationsFor, setViewingIndicationsFor] = useState(null);
  const [viewingCommissionsFor, setViewingCommissionsFor] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedLicenseeId, setSelectedLicenseeId] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [selectedLicenseeForLink, setSelectedLicenseeForLink] = useState('');
  const [selectedUsersToLink, setSelectedUsersToLink] = useState([]);
  const [isLinking, setIsLinking] = useState(false);

  const [realMetrics, setRealMetrics] = useState({
    indicatedCount: null,
    networkBidsCount: null,
  });

  const [myClients, setMyClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // 🆕 REF PARA EVITAR MÚLTIPLAS CHAMADAS SIMULTÂNEAS
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const referralLink = `${window.location.origin}${createPageUrl('Home')}?ref=${user.referral_code}`;

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
  
  const rolesText = highestLevel === primaryLevel 
    ? highestLevelName 
    : `${highestLevelName} e ${primaryLevelName}`;

  const valoraNotesDashboard = [
    { value: 1, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/92dfe7c21_17cee75b0_90515FAF-DF1E-4B38-88A2-0DB1650A0338.png" },
    { value: 2, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/2caf4c091_D19AF866-7F01-4359-B34C-6E1E49BB5B662.png" },
    { value: 5, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/51d72aa1d_C92CFAFF-FF7B-450A-9148-2B1B09CE77A512.png" },
    { value: 20, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/940575a06_7E0EC402-D37F-4C7E-A9AF-9CBAFAEC67B5.png" },
    { value: 100, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/35cd22e8d_22E71172-1469-40C1-91F5-52FB1CEB81B7.png" },
    { value: 200, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/5af62ec46_560AB3F0-BC1C-455F-9909-8366C699B0A3.png" },
    { value: 500, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/e743cb8f9_A098D677-881A-4913-9F73-1B09CE77A512.png" },
    { value: 1000, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/3f149d7ea_9F6550BF-035D-4171-85DA-960040528E39.png" }
  ];

  // 🔥 NOVA FUNÇÃO COM PROTEÇÃO CONTRA RATE LIMIT
  const fetchRealMetrics = useCallback(async () => {
    if (!user || !user.id) return;

    // Evita múltiplas chamadas simultâneas
    if (isFetchingRef.current) {
      console.log("⏸️ Já existe uma busca em andamento (métricas), aguardando...");
      return;
    }

    // Evita chamadas muito frequentes (mínimo 15s entre chamadas)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    if (timeSinceLastFetch < 15000 && lastFetchTimeRef.current !== 0) {
      console.log(`⏸️ Aguardando ${15000 - timeSinceLastFetch}ms antes de buscar métricas novamente...`);
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      console.log(`🔍 Calculando métricas para ${user.full_name}...`);

      // Busca indicados com retry
      const indicatedUsers = await fetchWithRetry(
        () => AppUser.filter({ referred_by_id: user.id })
      );
      
      const indicatedCount = Array.isArray(indicatedUsers) ? indicatedUsers.length : 0;

      // Aguarda 500ms antes da próxima chamada
      await delay(500);

      let networkBidsCount = 0;
      if (indicatedCount > 0 && Array.isArray(indicatedUsers)) {
        const indicatedUserIds = indicatedUsers.map(u => u.id).filter(Boolean);
        if (indicatedUserIds.length > 0) {
          const wonAuctions = await fetchWithRetry(
            () => Auction.filter({
              status: { $in: ["ended", "sold"] },
              winner_id: { $in: indicatedUserIds }
            })
          );
          networkBidsCount = Array.isArray(wonAuctions) ? wonAuctions.length : 0;
        }
      }

      setRealMetrics({ indicatedCount, networkBidsCount });
      console.log(`✅ Métricas: ${indicatedCount} indicados, ${networkBidsCount} arremates`);

    } catch (error) {
      console.error("Falha ao buscar métricas:", error);
      // Usa valores do cache em caso de erro
      setRealMetrics({
        indicatedCount: user.indicated_clients_count || 0,
        networkBidsCount: user.network_bids_count || 0,
      });
      toast.error("Erro ao carregar métricas. Tente recarregar a página.");
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

  const fetchMyClients = useCallback(async () => {
    if (!user || !user.id || isLoadingClients) return;

    setIsLoadingClients(true);
    try {
      await delay(500); // Delay antes de buscar
      
      const clients = await fetchWithRetry(
        () => AppUser.filter({ referred_by_id: user.id }, "-created_date", 200)
      );
      
      setMyClients(Array.isArray(clients) ? clients : []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      setMyClients([]);
      toast.error("Erro ao carregar clientes. Tente recarregar a página.");
    } finally {
      setIsLoadingClients(false);
    }
  }, [user, isLoadingClients]);

  const loadAllUsers = useCallback(async () => {
    if (isLoadingUsers) return;
    
    setIsLoadingUsers(true);
    try {
      await delay(1000); // Delay maior para admin
      
      const users = await fetchWithRetry(
        () => AppUser.list("-updated_date", 1000)
      );
      
      setAllUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários. Tente novamente em alguns instantes.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isLoadingUsers]);

  // 🔥 CARREGAMENTO SEQUENCIAL COM DELAYS LONGOS
  useEffect(() => {
    const loadData = async () => {
      console.log("📊 Iniciando carregamento de dados...");
      
      // 1️⃣ Busca métricas
      await fetchRealMetrics();
      
      // 2️⃣ Aguarda 3s e busca clientes
      await delay(3000);
      await fetchMyClients();
      
      // 3️⃣ Aguarda mais 3s e busca todos usuários (se admin)
      if (isAdmin) {
        await delay(3000);
        await loadAllUsers();
      }
      
      console.log("✅ Carregamento completo!");
    };

    // Delay inicial de 1s antes de começar
    const initialTimeout = setTimeout(loadData, 1000);

    // ⏰ INTERVALO: 10 minutos
    const interval = setInterval(() => {
      console.log("🔄 Atualizando dados (intervalo de 10min)...");
      loadData();
    }, 600000); // 10 minutos

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [fetchRealMetrics, fetchMyClients, loadAllUsers, isAdmin]);

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

    setTimeout(() => {
        const walletCard = walletCardRef.current;

        if (!walletCard) {
            navigate(createPageUrl(`AuctionRoom?id=${auctionId}&useBalance=true`));
            return;
        }

        const rect = walletCard.getBoundingClientRect();

        const coin = document.createElement('div');
        coin.style.cssText = `
        position: fixed;
        z-index: 99999;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        transform: translate(-50%, -50%) scale(1);
        pointer-events: none;
      `;

        coin.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          padding: 18px 28px;
          border-radius: 999px;
          border: 3px solid #1DB24A;
          box-shadow: 0 0 40px rgba(29,178,74,0.8), 0 0 80px rgba(16,185,129,0.6);
        ">
          <img
            src="${frontNote.url}"
            style="
              width: 55px;
              height: 55px;
              border-radius: 50%;
              filter: drop-shadow(0 0 20px rgba(29,178,74,0.9));
            "
          />
          <span style="
            color: white;
            font-weight: 900;
            font-size: 22px;
            text-shadow: 0 0 20px #1DB24A, 0 2px 8px rgba(0,0,0,0.8);
            letter-spacing: 1px;
          ">
            V$ ${(user.valora_pay_balance || 0).toFixed(2)}
          </span>
        </div>
      `;

        document.body.appendChild(coin);

        setTimeout(() => {
            coin.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            coin.style.transform = 'translate(-50%, -50%) scale(1.5)';
        }, 50);

        setTimeout(() => {
            coin.style.transition = 'all 1s ease-in-out';
            coin.style.left = 'calc(100% - 80px)';
            coin.style.top = '80px';
            coin.style.transform = 'translate(-50%, -50%) scale(0.3)';
            coin.style.opacity = '0.3';
        }, 600);

        setTimeout(() => {
            coin.style.transition = 'all 0.3s ease-out';
            coin.style.opacity = '0';
        }, 1400);

        setTimeout(() => {
            try {
                document.body.removeChild(coin);
            } catch (e) { }
            navigate(createPageUrl(`AuctionRoom?id=${auctionId}&useBalance=true`));
        }, 1800);

    }, 100);
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    toast.info("Sincronizando...");
    try {
      const response = await forceSyncStats();
      if (response.status === 200) {
        toast.success("Estatísticas sincronizadas!");
        await delay(3000);
        await fetchRealMetrics();
        await delay(3000);
        await loadAllUsers();
      }
    } catch (err) {
      toast.error("Erro na sincronização: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetTestData = async () => {
    const confirmReset = window.confirm(
      "⚠️ ATENÇÃO: ESTA AÇÃO IRÁ ZERAR TODOS OS DADOS DE TESTE!\n\nDeseja continuar?"
    );
    if (!confirmReset) return;

    setIsResetting(true);
    toast.info("Resetando dados...");
    try {
      const response = await resetTestData();
      if (response.status === 200) {
        toast.success("Dados zerados com sucesso!");
        await delay(3000);
        await fetchRealMetrics();
        await delay(3000);
        await loadAllUsers();
      }
    } catch (err) {
      toast.error("Erro no reset: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleGrantCommission = async () => {
    if (!selectedLicenseeId || !commissionAmount || parseFloat(commissionAmount) <= 0) {
      toast.error("Seleccione um licenciado e valor válido.");
      return;
    }

    setIsGranting(true);
    try {
      const licensee = allUsers.find(u => u.id === selectedLicenseeId);
      if (!licensee) throw new Error("Licenciado não encontrado.");

      const amount = parseFloat(commissionAmount);
      await AppUser.update(selectedLicenseeId, {
        commission_balance: (licensee.commission_balance || 0) + amount,
        valora_pay_balance: (licensee.valora_pay_balance || 0) + amount
      });

      toast.success(`V$ ${amount.toFixed(2)} creditados!`);
      await loadAllUsers();
      setSelectedLicenseeId('');
      setCommissionAmount('');
    } catch (error) {
      toast.error("Erro ao conceder comissão: " + error.message);
    } finally {
      setIsGranting(false);
    }
  };

  const handleOrganizeAlavancagem = async () => {
    if (!selectedLicenseeForLink || selectedUsersToLink.length === 0) {
      toast.error("Selecione um licenciado e usuários.");
      return;
    }

    const confirmLink = window.confirm(`Vincular ${selectedUsersToLink.length} usuário(s)?`);
    if (!confirmLink) return;

    setIsLinking(true);
    try {
      for (const userId of selectedUsersToLink) {
        await AppUser.update(userId, { referred_by_id: selectedLicenseeForLink });
      }
      toast.info("Recalculando estatísticas...");
      await handleForceSync();
      setSelectedLicenseeForLink('');
      setSelectedUsersToLink([]);
      toast.success(`${selectedUsersToLink.length} usuário(s) vinculado(s)!`);
    } catch (error) {
      toast.error("Erro ao vincular: " + error.message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleCleanDuplicates = async () => {
    const confirmClean = window.confirm(
      "⚠️ Remover cadastros duplicados?\n\nEsta ação é irreversível e removerá todos os usuários com o mesmo e-mail, exceto o mais recente."
    );
    if (!confirmClean) return;

    setIsCleaningDuplicates(true);
    toast.info("Buscando duplicatas...");
    try {
      const allUsersToProcess = await AppUser.list("-created_date", 1000);
      if (!Array.isArray(allUsersToProcess)) throw new Error("Falha ao buscar usuários.");

      const emailMap = {};
      allUsersToProcess.forEach(u => {
        if (!u.email) return;
        const email = u.email.toLowerCase().trim();
        if (!emailMap[email]) emailMap[email] = [];
        emailMap[email].push(u);
      });

      let duplicatesRemoved = 0;
      for (const [email, users] of Object.entries(emailMap)) {
        if (users.length > 1) {
          users.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          const [keepUser, ...deleteUsers] = users;

          for (const userToDelete of deleteUsers) {
            try {
              await AppUser.delete(userToDelete.id);
              duplicatesRemoved++;
            } catch (e) {
              console.error("Erro ao excluir duplicata:", e);
              toast.error(`Falha ao excluir usuário ${userToDelete.id}`);
            }
          }
        }
      }

      toast.success(`${duplicatesRemoved} duplicatas removidas!`);
      await loadAllUsers();
    } catch (error) {
      toast.error("Erro ao limpar duplicatas: " + error.message);
    } finally {
      setIsCleaningDuplicates(false);
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

  const licensees = useMemo(() => {
    return allUsers.filter(u => u.role === 'licensee' || (u.role === 'admin' && u.referral_code));
  }, [allUsers]);

  const availableUsersToLink = useMemo(() => {
    return allUsers.filter(u => {
      if (u.id === selectedLicenseeForLink) return false;
      return u.role === 'user' || u.role === 'licensee' || (u.role === 'admin' && u.referral_code);
    });
  }, [allUsers, selectedLicenseeForLink]);

  const toggleUserSelection = (userId) => {
    setSelectedUsersToLink(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleUserUpdate = async () => {
    setEditingUser(null);
    // Chamadas sequenciais com delay para evitar rate limit
    await delay(2000);
    await fetchRealMetrics();
    await delay(3000);
    await fetchMyClients();
    if (isAdmin) {
      await delay(3000);
      await loadAllUsers();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Painel do Licenciado</h1>
          <p className="text-gray-400">
            Seja bem-vindo, <strong className="text-white">{shortName}</strong>! 
            Meu <strong className="text-green-400">{rolesText}</strong> da Leilão NoZap 👋
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <Button
                onClick={handleForceSync}
                disabled={isSyncing}
                variant="outline"
                className="border-green-500 text-green-400"
                size="sm"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sincronizar
              </Button>
              <Button
                onClick={handleResetTestData}
                disabled={isResetting}
                variant="outline"
                className="border-red-500 text-red-400"
                size="sm"
              >
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Reset
              </Button>
            </>
          )}
        </div>
      </div>

      <Card ref={walletCardRef} className="mb-8 bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">Sua Carteira Valora Pay</h3>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-5xl font-bold text-white">
                  V$ ${(user.valora_pay_balance || 0).toFixed(2)}
                </span>
              </div>
              <Button
                onClick={() => setIsAuctionSelectionModalOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Usar Saldo em Leilões
              </Button>
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
          label="Saldo Valora Pay"
          value={`V$ ${(user.valora_pay_balance || 0).toFixed(2)}`}
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
          value={`V$ ${(user.commission_balance || 0).toFixed(2)}`}
          onClick={() => setViewingCommissionsFor(user)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="meus-clientes">Meus Clientes ({myClients.length})</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Seu Link de Indicação</CardTitle>
              <CardDescription className="text-gray-400">
                Compartilhe este link para indicar novos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
                <Button onClick={copyToClipboard} className="bg-green-600 hover:bg-green-700">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <Alert className="bg-green-900/20 border-green-500/30">
                <Info className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-gray-300">
                  Quando alguém usar seu link, será automaticamente seu indicado!
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white mb-3">Seu Plano de Carreira</CardTitle>
              <div className="space-y-1">
                <CardDescription className="text-gray-400">
                  Nível atual: <strong className="text-white">{highestLevelName}</strong>
                </CardDescription>
                <CardDescription className="text-gray-400">
                  ⭐ Função Principal: <strong className="text-green-400">{primaryLevelName}</strong>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <CareerPath currentUser={user} />
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Como Funciona o Sistema</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Compartilhe seu Link</h4>
                  <p className="text-sm text-gray-400">Envie seu link de indicação para amigos e familiares.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Eles Se Cadastram</h4>
                  <p className="text-sm text-gray-400">Quando usam seu link, são automaticamente seus indicados.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Você Ganha 3%</h4>
                  <p className="text-sm text-gray-400">A cada arremate deles, você recebe 3% em Valora Pay!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meus-clientes" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Clientes Indicados</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingClients ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div>
              ) : filteredClients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Nome</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Indicado Por</TableHead>
                      <TableHead className="text-gray-400">Data de Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => {
                      const referrer = client.referred_by_id 
                        ? allUsers.find(u => u.id === client.referred_by_id) 
                        : null;
                      
                      return (
                        <TableRow key={client.id} className="border-gray-700">
                          <TableCell className="text-white">{client.full_name}</TableCell>
                          <TableCell className="text-gray-400">{client.email}</TableCell>
                          <TableCell className="text-gray-400">
                            {referrer ? (
                              <span className="text-green-400">👤 {referrer.full_name}</span>
                            ) : (
                              <span className="text-gray-500">Sem indicação</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400">
                            {new Date(client.created_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Extrato de Comissões</CardTitle>
              <CardDescription className="text-gray-400">
                Total acumulado: V$ ${(user.commission_balance || 0).toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setViewingCommissionsFor(user)}
                className="bg-green-600 hover:bg-green-700"
              >
                Ver Detalhes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="grant" className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-white font-semibold">Conceder Comissões</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Selecionar Licenciado</Label>
                      <Select value={selectedLicenseeId} onValueChange={setSelectedLicenseeId}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Escolha um licenciado" />
                        </SelectTrigger>
                        <SelectContent>
                          {licensees.map(lic => (
                            <SelectItem key={lic.id} value={lic.id}>
                              {lic.full_name} - V$ ${(lic.valora_pay_balance || 0).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Valor da Comissão (V$)</Label>
                      <Input
                        type="number"
                        placeholder="100.00"
                        onChange={(e) => setCommissionAmount(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <Button
                      onClick={handleGrantCommission}
                      disabled={isGranting || !selectedLicenseeId || !commissionAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isGranting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Conceder Comissão
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="link" className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-semibold">Organizar Alavancagem</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Vincular a qual licenciado?</Label>
                      <Select value={selectedLicenseeForLink} onValueChange={setSelectedLicenseeForLink}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Escolha um licenciado" />
                        </SelectTrigger>
                        <SelectContent>
                          {licensees.map(lic => (
                            <SelectItem key={lic.id} value={lic.id}>
                              {lic.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedLicenseeForLink && (
                      <div className="max-h-64 overflow-y-auto bg-gray-700/30 rounded-lg p-4 space-y-2">
                        {availableUsersToLink.map(u => (
                          <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded">
                            <Checkbox
                              checked={selectedUsersToLink.includes(u.id)}
                              onCheckedChange={() => toggleUserSelection(u.id)}
                            />
                            <span className="text-white">{u.full_name}</span>
                            <span className="text-gray-400 text-sm ml-auto">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={handleOrganizeAlavancagem}
                      disabled={isLinking || !selectedLicenseeForLink || selectedUsersToLink.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isLinking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Vincular {selectedUsersToLink.length} Usuário(s)
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="clean" className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-400" />
                    <span className="text-white font-semibold">Limpar Duplicatas</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <Alert className="bg-red-900/20 border-red-500/30 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-gray-300">
                      Remove usuários com emails duplicados, mantendo apenas o mais recente.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={handleCleanDuplicates}
                    disabled={isCleaningDuplicates}
                    variant="destructive"
                    className="w-full"
                  >
                    {isCleaningDuplicates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Limpar Duplicatas
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        )}
      </Tabs>

      {viewingIndicationsFor && (
        <IndicatedUsersModal
          licensee={viewingIndicationsFor}
          isOpen={true}
          onClose={() => setViewingIndicationsFor(null)}
        />
      )}
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
      {editingUser && (
        <UserEditModal
          user={editingUser}
          isOpen={true}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdate}
        />
      )}
      {changingPasswordUser && (
        <UserPasswordModal
          user={changingPasswordUser}
          isOpen={true}
          onClose={() => setChangingPasswordUser(null)}
          onSave={() => {
            setChangingPasswordUser(null);
            loadAllUsers();
          }}
        />
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

export default function LicensingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLicenseeRegisterModal, setShowLicenseeRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchWithRetryInLicensingPage = async (fetchFunction, maxRetries = 3, delayMs = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchFunction();
      } catch (error) {
        console.warn(`Tentativa ${i + 1} (LicensingPage) falhou:`, error.message);
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
        console.error("❌ Erro ao buscar usuário:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    const interval = setInterval(() => {
      fetchUser();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.logAIAction) {
      window.logAIAction({
        type: 'success',
        title: 'Página de Licenciamento Carregada',
        description: 'Usuário acessou a página de sistema de alavancagem',
        details: { timestamp: new Date().toISOString() }
      });
    }
  }, []);

  const handleRegistrationSuccess = (user) => {
    console.log("✅ Login/Cadastro bem-sucedido:", user.full_name);
    setCurrentUser(user);
    setShowLicenseeRegisterModal(false);
    setShowLoginModal(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[5000]" style={{ minHeight: '100vh', opacity: 1, visibility: 'visible' }}>
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
            alt="PROTEÇÃO MASTER"
            className="w-20 h-20 mx-auto mb-6 rounded-full"
            style={{
              animation: 'logoGrowSpin 3s ease-in-out infinite',
              filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))',
              opacity: 1,
              visibility: 'visible',
              willChange: 'transform'
            }}
          />
          <p
            className="text-lg text-gray-300 tracking-wider"
            style={{
              animation: 'gentlePulseText 2.5s ease-in-out infinite'
            }}
          >
            Seja bem-vindo...
          </p>
        </div>
      </div>
    );
  }

  const isLicensee = currentUser && (
    currentUser.role === 'licensee' ||
    (currentUser.role === 'admin' && currentUser.referral_code)
  );

  const isAdmin = currentUser?.role === 'admin';

  // DETECTAR NÍVEL DO USUÁRIO
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-20 px-6">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10"></div>
          <div className="relative max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-3 mb-6 bg-green-500/10 px-6 py-3 rounded-full border border-green-500/30">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-semibold">Sistema de Alavancagem Profissional</span>
              </div>
              
              {/* TÍTULO DINÂMICO */}
              {userLevel === 'guest' || userLevel === 'usuario' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                    Torne-se um Licenciado Aplicativo
                  </h1>
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8">
                    Indique clientes para o app e ganhe <strong className="text-green-400">3% em Valora Pay (V$)</strong> em cada arremate deles!
                  </p>
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8">
                    Depois evolua para <strong className="text-purple-400">Licenciado Catálogo</strong> e ganhe <strong className="text-yellow-400">13% a 20% em DINHEIRO REAL (R$)</strong>!
                  </p>
                </>
              ) : userLevel === 'licenciado_aplicativo' ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                    Você já é um licenciado aplicativo.
                  </h1>
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8">
                    Compartilhe seu link &rarr; Seus indicados arrematam &rarr; <strong className="text-green-400">Você ganha 3% em Valora Pay!</strong>
                  </p>
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8">
                    Evolua para <strong className="text-purple-400">Licenciado Catálogo</strong>: ganhe <strong className="text-yellow-400">13% a 20% em DINHEIRO REAL (R$)</strong> vendendo produtos premium!
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                    Parabéns! Você é {userLevel === 'licenciado_catalogo' ? 'Licenciado Catálogo' : 'um líder'} 🎉
                  </h1>
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8">
                    Você já evoluiu no sistema! Continue crescendo seu sistema de alavancagem e maximizando seus ganhos.
                  </p>
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-8">
                    Ganhe <strong className="text-yellow-400">13% a 20% em DINHEIRO REAL (R$)</strong> + comissões do seu sistema de alavancagem!
                  </p>
                </>
              )}

              {/* CARD DINÂMICO */}
              {isLicensee && userLevel === 'licenciado_aplicativo' && (
                <div className="max-w-2xl mx-auto mt-8">
                  <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-2 border-blue-500/50">
                    <CardHeader>
                      <CardTitle className="text-blue-400">🚀 Quero Evoluir no Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a 
                        href="https://wa.me/5521979228336?text=Olá,%20quero%20evoluir%20no%20sistema%20de%20alavancagem!" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Falar com Executivo no WhatsApp
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                </div>
              )}

              {isLicensee && ['licenciado_catalogo', 'executivo', 'diretor', 'ceo', 'conselheiro', 'fundador'].includes(userLevel) && (
                <div className="max-w-2xl mx-auto mt-8">
                  <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 border-purple-500/50">
                    <CardHeader>
                      <CardTitle className="text-purple-400">👑 Suporte VIP</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a 
                        href={`https://wa.me/5521979228336?text=Olá,%20sou%20${userLevel}%20e%20preciso%20de%20suporte!`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Falar com Suporte Executivo
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                </div>
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

        <div className="py-20 px-6 bg-gray-800/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4">
              Construa Seu Sistema de Alavancagem
            </h2>
            <p className="text-gray-400 text-center mb-12">
              Veja como nossos licenciados estão crescendo
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
      
      <style>{`
        @keyframes logoGrowSpin {
          0% {
            transform: scale(0.8) rotate(0deg);
            filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.2));
          }
          25% {
            transform: scale(1.1) rotate(90deg);
            filter: drop-shadow(0 0 15px rgba(34, 197, 94, 0.7));
          }
          50% {
            transform: scale(1) rotate(180deg);
            filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.5));
          }
          75% {
            transform: scale(1.1) rotate(270deg);
            filter: drop-shadow(0 0 15px rgba(34, 197, 94, 0.7));
          }
          100% {
            transform: scale(0.8) rotate(360deg);
            filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.2));
          }
        }

        @keyframes gentlePulseText {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
    </>
  );
}