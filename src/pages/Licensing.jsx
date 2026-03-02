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
import { resetAllBalances } from "@/functions/resetAllBalances";

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
import { Copy, Users, BarChart, DollarSign, Zap, Star, ShieldCheck, LogIn, Loader2, Search, TrendingUp, Info, RefreshCw, Link2, Trash2, AlertCircle, Smartphone, MessageCircle, X, Wallet, Clock, Package, GripVertical } from 'lucide-react';

import LicenseeRegistrationModal from '../components/licensing/LicenseeRegistrationModal';
import LoginModal from '../components/common/LoginModal';
import IndicatedUsersModal from '../components/admin/IndicatedUsersModal';
import CommissionStatementModal from '../components/admin/CommissionStatementModal';
import CareerPath from '../components/licensing/CareerPath';
import AuctionSelectionModal from '../components/licensing/AuctionSelectionModal';
import UserEditModal from '../components/admin/UserEditModal';
import UserPasswordModal from '../components/admin/UserPasswordModal';
import EarningsSimulator from '../components/licensing/EarningsSimulator';
import JourneyAnimation from '../components/licensing/JourneyAnimation';
import DraggableUserHierarchy from '../components/licensing/DraggableUserHierarchy';
import HierarchyTreeView from '../components/licensing/HierarchyTreeView';
import CatalogHome from '../components/lojista/CatalogHome';
import CatalogOrders from '../components/lojista/CatalogOrders';
import CatalogClients from '../components/lojista/CatalogClients';
import LicenseeCRM from '../components/licensee-crm/LicenseeCRM';
import CatalogTabComponent from '../components/licensing/CatalogTabComponent';
import LandingContent from '../components/licensing/LandingContent';
import NotaStackStyles from '../components/licensing/NotaStackStyles';
import WithdrawalModalComponent from '../components/licensing/WithdrawalModal';
const CatalogTab = CatalogTabComponent;
const StatCard = ({ icon: Icon, label, value, onClick, isLoading, isSaiDeBaixo }) => (
  <Card onClick={onClick} className={`bg-gray-800/50 border-gray-700/80 backdrop-blur-sm transition-all duration-300 ${onClick ? `cursor-pointer ${isSaiDeBaixo ? 'hover:border-red-500/60' : 'hover:border-green-500/60'} hover:bg-gray-700/50` : ''}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-400">{label}</CardTitle><Icon className="h-4 w-4 text-gray-400" /></CardHeader>
    <CardContent>{isLoading ? <Loader2 className="h-6 w-6 animate-spin text-gray-500" /> : <div className="text-2xl font-bold text-white">{value}</div>}</CardContent>
  </Card>
);

const fetchWithRetry = async (fetchFunction, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fetchFunction(); } catch (error) {
      if (attempt === maxRetries || !(error.message?.includes('Network') || error.message?.includes('Failed to fetch'))) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
    }
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientDocument, setRecipientDocument] = useState('');

  const [realMetrics, setRealMetrics] = useState({
    indicatedCount: null,
    networkBidsCount: null
  });

  const [myClients, setMyClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [pendingWithdrawalAmount, setPendingWithdrawalAmount] = useState(0);
  const [mySales, setMySales] = useState([]);
  const [myAuctions, setMyAuctions] = useState([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [myCatalogSales, setMyCatalogSales] = useState([]);

  // Comissões
  const [myCommissionRecords, setMyCommissionRecords] = useState([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false);

  // 🆕 REF PARA EVITAR MÚLTIPLAS CHAMADAS SIMULTÂNEAS
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';
  const referralLink = isSaiDeBaixo ?
  `https://leilaonozap.net${createPageUrl('SaiDeBaixo')}?ref=${user.referral_code}` :
  `https://leilaonozap.net${createPageUrl('Home')}?ref=${user.referral_code}`;

  const userLevels = Array.isArray(user.career_levels) ? user.career_levels : user.career_levels ? [user.career_levels] : ['usuario'];
  const primaryLevel = user.primary_career_level || userLevels[0] || 'usuario';

  const careerLevelsMap = {
    'usuario': 'Usuário',
    'licenciado_aplicativo': 'Influencer',
    'influencer': 'Influencer',
    'licenciado_catalogo': 'Licenciado Catálogo',
    'trainee': 'Trainee',
    'executivo': 'Executivo',
    'kit_start': 'Kit Start',
    'plano_lider': 'Plano Líder',
    'plano_lojista': 'Plano Lojista',
    'distribuidor': 'Distribuidor',
    'diretor': 'Diretor',
    'diretoria': 'Diretoria',
    'ceo': 'CEO',
    'conselheiro': 'Conselheiro',
    'fundador': 'Fundador'
  };

  const careerHierarchy = ['fundador', 'conselheiro', 'ceo', 'diretoria', 'diretor', 'executivo', 'licenciado_catalogo', 'influencer', 'usuario'];

  const highestLevel = careerHierarchy.find((level) => userLevels.includes(level)) || 'usuario';

  const shortName = user.display_first_name && user.display_last_name ?
  `${user.display_first_name} ${user.display_last_name}` :
  (() => {
    const nameParts = user.full_name.split(' ');
    return nameParts.length > 1 ?
    `${nameParts[0]} ${nameParts[nameParts.length - 1]}` :
    nameParts[0];
  })();

  const highestLevelName = careerLevelsMap[highestLevel];
  const primaryLevelName = careerLevelsMap[primaryLevel];
  const totalAvailable = ((user.commission_balance || 0) + (user.catalog_commission_balance || 0));

  const rolesText = highestLevel === primaryLevel ?
  highestLevelName :
  `${highestLevelName} e ${primaryLevelName}`;

  const valoraNotesDashboard = [
  { value: 200, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/83f8b9a48_200_front.jpg" },
  { value: 100, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/15d210cda_cdula-100-reais_anverso.jpg" },
  { value: 50, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/109de79bd_50_front.jpg" },
  { value: 20, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/81c45e110_20_front.jpg" },
  { value: 10, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/85f62789d_Anverso_da_cdula_de_10_reais.PNG" },
  { value: 5, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/8f25db571_5_front.jpg" },
  { value: 2, url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/90f9e2b2b_Anverso_da_cdula_de_dois_reais.PNG" }];


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
        const indicatedUserIds = indicatedUsers.map((u) => u.id).filter(Boolean);
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
            console.warn("Erro ao buscar arremates da rede:", error);
            networkBidsCount = user.network_bids_count || 0;
          }
        }
      }

      setRealMetrics({ indicatedCount, networkBidsCount });
      console.log(`✅ Métricas: ${indicatedCount} indicados, ${networkBidsCount} arremates`);

    } catch (error) {
      console.error("Falha ao buscar métricas:", error);
      // Usa valores do cache em caso de erro
      setRealMetrics({
        indicatedCount: user.indicated_clients_count || 0,
        networkBidsCount: user.network_bids_count || 0
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

  const fetchMyWithdrawals = useCallback(async () => {
    if (!user || !user.id || isLoadingWithdrawals) return;

    setIsLoadingWithdrawals(true);
    try {
      await delay(500);

      const withdrawals = await fetchWithRetry(
        () => base44.entities.WithdrawalRequest.filter({ influencer_id: user.id }, "-created_date", 100)
      );

      setMyWithdrawals(Array.isArray(withdrawals) ? withdrawals : []);

      // Calcula total de saques pendentes
      const pending = withdrawals.
      filter((w) => w.status === 'pending').
      reduce((sum, w) => sum + (w.amount || 0), 0);
      setPendingWithdrawalAmount(pending);
    } catch (error) {
      console.error("Erro ao buscar saques:", error);
      setMyWithdrawals([]);
      setPendingWithdrawalAmount(0);
      toast.error("Erro ao carregar histórico de saques.");
    } finally {
      setIsLoadingWithdrawals(false);
    }
  }, [user, isLoadingWithdrawals]);

  const fetchMySales = useCallback(async () => {
    if (!user || !user.id || isLoadingSales) return;

    setIsLoadingSales(true);
    try {
      // Buscar usuários indicados
      const referredUsers = await AppUser.filter({ referred_by_id: user.id });
      const referredIds = Array.isArray(referredUsers) ? referredUsers.map((u) => u.id).filter(Boolean) : [];

      console.log('📊 Usuários indicados:', referredIds.length);
      console.log('🔑 Meu código de referral:', user.referral_code);

      // Buscar arremates de leilão (ended OU sold) dos indicados
      const allAuctions = await Auction.list('-updated_date', 300);
      const wonAuctions = Array.isArray(allAuctions) ?
      allAuctions.filter((a) =>
      a.winner_id &&
      referredIds.includes(a.winner_id) && (
      a.status === 'sold' || a.status === 'ended')
      ) :
      [];

      console.log('🏆 Arremates encontrados:', wonAuctions.length);
      setMyAuctions(wonAuctions);

      // Buscar vendas do catálogo onde EU SOU O LICENCIADO (vendedor)
      try {
        const CatalogSale = base44.entities.CatalogSale;
        
        // ✅ ISOLAMENTO CRÍTICO: Filtrar NO SERVIDOR, não na UI
        // Busca apenas vendas onde licensee_id = meu ID (não código de referral)
        const catalogSales = Array.isArray(user.id) ? [] :
        await CatalogSale.filter(
          { licensee_id: user.id },
          '-created_date',
          300
        );

        console.log('✅ [ISOLAMENTO] Vendas catálogo do user_id:', user.id, '→', catalogSales.length, 'vendas');
        setMySales(Array.isArray(catalogSales) ? catalogSales : []);
        setMyCatalogSales(Array.isArray(catalogSales) ? catalogSales : []);
      } catch (catalogError) {
        console.error("Erro ao buscar vendas do catálogo:", catalogError);
        setMySales([]);
        setMyCatalogSales([]);
      }

    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      setMySales([]);
      setMyAuctions([]);
      toast.error("Erro ao carregar vendas.");
    } finally {
      setIsLoadingSales(false);
    }
  }, [user, isLoadingSales]);

  const fetchMyCommissionRecords = useCallback(async () => {
    if (!user || !user.id || isLoadingCommissions) return;
    setIsLoadingCommissions(true);
    try {
      await delay(500);
      const records = await base44.entities.CommissionRecord.filter({ user_id: user.id }, "-created_date", 200);
      setMyCommissionRecords(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error("Erro ao buscar comissões:", error);
      setMyCommissionRecords([]);
    } finally {
      setIsLoadingCommissions(false);
    }
  }, [user, isLoadingCommissions]);

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

      // 3️⃣ Aguarda mais 2s e busca saques
      await delay(2000);
      await fetchMyWithdrawals();

      // 4️⃣ Aguarda mais 2s e busca vendas
      await delay(2000);
      await fetchMySales();

      // 4.1️⃣ Aguarda mais 2s e busca comissões
      await delay(2000);
      await fetchMyCommissionRecords();

      // 5️⃣ Aguarda mais 3s e busca todos usuários (se admin)
      if (isAdmin) {
        await delay(3000);
        await loadAllUsers();
      }

      console.log("✅ Carregamento completo!");
    };

    // Carrega apenas uma vez quando o componente monta
    const initialTimeout = setTimeout(loadData, 1000);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, []); // Remove dependências para carregar apenas uma vez

  const getNoteStack = (balance) => {
    // 🆕 PILHA FIXA: R$ 200 sempre na frente, independente do saldo
    // Ordem: R$ 200 (frente) → R$ 100 → R$ 50 → R$ 20 → R$ 10 → R$ 5 → R$ 2 (guardião/fundo)
    
    const frontNote = valoraNotesDashboard.find(n => n.value === 200) || valoraNotesDashboard[0];
    const backNote = valoraNotesDashboard.find(n => n.value === 100) || valoraNotesDashboard[1];
    const backBackNote = valoraNotesDashboard.find(n => n.value === 50) || valoraNotesDashboard[2];
    const sideNote = valoraNotesDashboard.find(n => n.value === 20) || valoraNotesDashboard[3];
    const guardianNote = valoraNotesDashboard.find(n => n.value === 10) || valoraNotesDashboard[4];

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
            R$ ${totalAvailable.toFixed(2)}
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
        } catch (e) {}
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

  const handleResetAllBalances = async () => {
    const confirmReset = window.confirm(
      "⚠️ ATENÇÃO: ESTA AÇÃO IRÁ ZERAR TODOS OS SALDOS E COMISSÕES!\n\n" +
      "✅ Mantém: vínculos de indicação e contagem de clientes\n" +
      "❌ Zera: commission_balance, valora_pay_balance, network_bids_count\n\n" +
      "Deseja continuar?"
    );
    if (!confirmReset) return;

    setIsResetting(true);
    toast.info("Zerando saldos...");
    try {
      const response = await resetAllBalances();
      if (response?.data?.success) {
        toast.success(`✅ ${response.data.updated} usuários atualizados!`);
        await delay(3000);
        await fetchRealMetrics();
        await delay(3000);
        await loadAllUsers();
      } else {
        toast.error("Falha ao zerar saldos");
      }
    } catch (err) {
      toast.error("Erro ao zerar saldos: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleGrantCommission = async () => {
    if (!selectedLicenseeId || !commissionAmount || parseFloat(commissionAmount) <= 0) {
      toast.error("Selecione um licenciado e valor válido.");
      return;
    }

    setIsGranting(true);
    try {
      const licensee = allUsers.find((u) => u.id === selectedLicenseeId);
      if (!licensee) throw new Error("Licenciado não encontrado.");

      const amount = parseFloat(commissionAmount);

      if (isNaN(amount) || amount <= 0) {
        throw new Error("Valor inválido");
      }

      await AppUser.update(selectedLicenseeId, {
        commission_balance: (licensee.commission_balance || 0) + amount
      });

      toast.success(`R$ ${amount.toFixed(2)} creditados!`);
      setSelectedLicenseeId('');
      setCommissionAmount('');
      await delay(2000);
      await loadAllUsers();
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
      let updated = 0;
      for (const userId of selectedUsersToLink) {
        try {
          await AppUser.update(userId, { referred_by_id: selectedLicenseeForLink });
          updated++;
          await delay(500);
        } catch (error) {
          console.error(`Erro ao vincular ${userId}:`, error);
        }
      }

      if (updated > 0) {
        toast.info("Recalculando estatísticas...");
        await delay(2000);
        await handleForceSync();
        setSelectedLicenseeForLink('');
        setSelectedUsersToLink([]);
        toast.success(`${updated} usuário(s) vinculado(s)!`);
      } else {
        toast.error("Nenhum usuário foi vinculado");
      }
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
      allUsersToProcess.forEach((u) => {
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
    return myClients.filter((client) =>
    client.full_name && client.full_name.toLowerCase().includes(term) ||
    client.nickname && client.nickname.toLowerCase().includes(term) ||
    client.email && client.email.toLowerCase().includes(term)
    );
  }, [myClients, searchTerm]);

  const licensees = useMemo(() => {
    return allUsers.filter((u) => u.role === 'licensee' || u.role === 'admin' && u.referral_code);
  }, [allUsers]);

  const availableUsersToLink = useMemo(() => {
    return allUsers.filter((u) => {
      if (u.id === selectedLicenseeForLink) return false;
      return u.role === 'user' || u.role === 'licensee' || u.role === 'admin' && u.referral_code;
    });
  }, [allUsers, selectedLicenseeForLink]);

  const toggleUserSelection = (userId) => {
    setSelectedUsersToLink((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
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

  const handleWithdrawalSubmit = async (e) => {
    if (e) e.preventDefault();

    console.log('🔍 [SAQUE] Botão clicado!');
    console.log('📊 [SAQUE] Valor digitado:', withdrawalAmount);
    console.log('💰 [SAQUE] Saldo de comissão disponível:', user.commission_balance);

    const amount = parseFloat(withdrawalAmount);
    console.log('💵 [SAQUE] Valor convertido:', amount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      console.log('❌ [SAQUE] Valor inválido');
      toast.error('Valor inválido');
      return;
    }

    if (amount < 30) {
      console.log('❌ [SAQUE] Valor menor que mínimo');
      toast.error('Saque mínimo é de R$ 30,00');
      return;
    }

    if (amount > totalAvailable) {
      console.log('❌ [SAQUE] Saldo insuficiente');
      toast.error('Saldo indisponível');
      return;
    }

    if (!pixKey || pixKey.trim() === '') {
      console.log('❌ [SAQUE] Chave PIX não informada');
      toast.error('Informe a chave PIX');
      return;
    }

    console.log('✅ [SAQUE] Validações OK, processando...');
    console.log('📤 [SAQUE] Enviando:', { amount, pixKey, pixKeyType });

    setIsProcessingWithdrawal(true);

    try {
      console.log('📡 [VIGIA] Testando conexão com função requestWithdrawal...');

      const response = await base44.functions.invoke('requestWithdrawal', {
        amount,
        pix_key: pixKey,
        pix_key_type: pixKeyType
      });

      console.log('📥 [SAQUE] Resposta completa:', response);

      const data = response?.data;

      if (data?.success) {
        console.log('✅ [SAQUE] Sucesso!');
        toast.success(data.message || 'Saque solicitado com sucesso! Aguarde aprovação.');
        setShowWithdrawalModal(false);
        setWithdrawalAmount('');
        setPixKey('');

        await delay(2000);
        await fetchRealMetrics();
        await delay(1000);
        await fetchMyWithdrawals();
      } else {
        const errorMsg = data?.error || 'Erro ao solicitar saque';
        console.error('❌ [SAQUE] Erro da API:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('❌ [VIGIA DE ERRO] Erro capturado:', error);
      console.error('❌ [VIGIA DE ERRO] Status:', error.response?.status);
      console.error('❌ [VIGIA DE ERRO] Mensagem:', error.message);
      console.error('❌ [VIGIA DE ERRO] Stack:', error.stack);

      // 🔥 SISTEMA DE DIAGNÓSTICO AUTOMÁTICO
      if (error.response?.status === 404 || error.message?.includes('404')) {
        console.error('🚨 [VIGIA] DIAGNÓSTICO: Função requestWithdrawal NÃO EXISTE!');
        console.error('🚨 [VIGIA] CAUSA: A função não foi criada ou não está deployada.');
        console.error('🚨 [VIGIA] SOLUÇÃO:');
        console.error('   1. Verifique se functions/requestWithdrawal.js existe');
        console.error('   2. Deploy pode estar pendente');
        console.error('   3. Nome da função pode estar incorreto');

        toast.error('❌ ERRO 404: Função de saque não encontrada. Por favor, contate o suporte técnico.');

        // Cria registro de erro no banco
        try {
          await base44.entities.SystemLog.create({
            step: 'WITHDRAWAL_404_ERROR',
            status: 'error',
            message: 'Função requestWithdrawal retornou 404',
            component_name: 'LicensingPage',
            entity_id: user.id,
            payload: {
              error: error.message,
              status: error.response?.status,
              timestamp: new Date().toISOString()
            }
          });
        } catch {}

      } else if (error.message?.includes('Network')) {
        console.error('🚨 [VIGIA] DIAGNÓSTICO: Erro de rede/conexão');
        toast.error('❌ Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (error.response?.status === 401) {
        console.error('🚨 [VIGIA] DIAGNÓSTICO: Não autorizado');
        toast.error('❌ Sessão expirada. Faça login novamente.');
      } else if (error.response?.status === 500) {
        console.error('🚨 [VIGIA] DIAGNÓSTICO: Erro no servidor');
        toast.error('❌ Erro no servidor. Tente novamente em instantes.');
      } else {
        console.error('🚨 [VIGIA] DIAGNÓSTICO: Erro desconhecido');
        toast.error(`❌ Erro: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsProcessingWithdrawal(false);
      console.log('🏁 [SAQUE] Processo finalizado');
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">Painel de Alavancagem

          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            👋 <strong className="text-white">{shortName}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isAdmin &&
          <>
              <Button
              onClick={handleForceSync}
              disabled={isSyncing}
              variant="outline"
              className="bg-gray-700 border-green-500 text-green-400 hover:bg-gray-600"
              size="sm">

                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sincronizar
              </Button>
              <Button
              onClick={handleResetTestData}
              disabled={isResetting}
              variant="outline"
              className="bg-gray-700 border-red-500 text-red-400 hover:bg-gray-600"
              size="sm">

                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Reset Teste
              </Button>
              <Button
              onClick={handleResetAllBalances}
              disabled={isResetting}
              variant="outline"
              className="bg-gray-700 border-orange-500 text-orange-400 hover:bg-gray-600"
              size="sm">

                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Zerar Saldos
              </Button>
            </>
          }
        </div>
      </div>

      <Card ref={walletCardRef} className={`mb-8 bg-gradient-to-br backdrop-blur-sm overflow-hidden ${
      isSaiDeBaixo ?
      'from-red-900/30 to-red-800/20 border-red-500/30' :
      'from-green-900/30 to-green-800/20 border-green-500/30'}`
      }>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">Saldo Disponível</h3>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-bold text-white">
                  R$ {totalAvailable.toFixed(2)}
                </span>
              </div>

              {pendingWithdrawalAmount > 0 &&
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-400 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Saque em Processo: R$ {pendingWithdrawalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Aguardando aprovação
                  </p>
                </div>
              }
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => setIsAuctionSelectionModalOpen(true)}
                  className={`w-full sm:flex-1 text-sm sm:text-base ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>

                  <Zap className="w-4 h-4 mr-2" />
                  Usar em Leilões
                </Button>
                <Button
                  onClick={() => setShowWithdrawalModal(true)}
                  className="w-full sm:flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm sm:text-base">

                  <Wallet className="w-4 h-4 mr-2" />
                  Sacar
                </Button>
              </div>
            </div>
            
            <div className="relative w-64 h-40 flex items-center justify-center nota-stack-container">
              {guardianNote && guardianNote.url &&
              <img
                src={guardianNote.url}
                alt=""
                className="absolute w-60 h-36 rounded-lg shadow-2xl transform -rotate-15 translate-y-3 -translate-x-1 nota-stack-guardian nota-entrance-guardian"
                style={{ zIndex: 0, opacity: 0.65 }}
                onError={(e) => {e.target.style.display = 'none';}} />

              }
              
              {backBackNote && backBackNote.url &&
              <img
                src={backBackNote.url}
                alt=""
                className="absolute w-60 h-36 rounded-lg shadow-2xl transform -rotate-10 translate-y-2 nota-stack-backback nota-entrance-backback"
                style={{ zIndex: 1, opacity: 0.7 }}
                onError={(e) => {e.target.style.display = 'none';}} />

              }
              
              {backNote && backNote.url &&
              <img
                src={backNote.url}
                alt=""
                className="absolute w-60 h-36 rounded-lg shadow-2xl transform -rotate-5 translate-y-1 nota-stack-back nota-entrance-back"
                style={{ zIndex: 2, opacity: 0.8 }}
                onError={(e) => {e.target.style.display = 'none';}} />

              }
              
              {sideNote && sideNote.url &&
              <img
                src={sideNote.url}
                alt=""
                className="absolute w-60 h-36 rounded-lg shadow-2xl transform rotate-10 translate-x-3 nota-stack-side nota-entrance-side"
                style={{ zIndex: 3, opacity: 0.9 }}
                onError={(e) => {e.target.style.display = 'none';}} />

              }

              {frontNote && frontNote.url &&
              <img
                src={frontNote.url}
                alt=""
                className="absolute w-60 h-36 rounded-lg shadow-2xl transform rotate-2 nota-stack-front nota-entrance-front"
                style={{ zIndex: 4 }}
                onError={(e) => {e.target.style.display = 'none';}} />

              }
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Saldo Disponível"
          value={`R$ ${totalAvailable.toFixed(2)}`}
          onClick={() => setIsAuctionSelectionModalOpen(true)}
          isSaiDeBaixo={isSaiDeBaixo} />

        <StatCard
          icon={Users}
          label="Clientes Indicados"
          value={realMetrics.indicatedCount !== null ? realMetrics.indicatedCount : '...'}
          isLoading={realMetrics.indicatedCount === null}
          isSaiDeBaixo={isSaiDeBaixo} />

        <StatCard
          icon={TrendingUp}
          label="Arremates do Sistema de Alavancagem"
          value={realMetrics.networkBidsCount !== null ? realMetrics.networkBidsCount : '...'}
          isLoading={realMetrics.networkBidsCount === null}
          isSaiDeBaixo={isSaiDeBaixo} />

        <StatCard
          icon={BarChart}
          label="Total Comissões (App + Catálogo)"
          value={`R$ ${((user.commission_balance || 0) + (user.catalog_commission_balance || 0)).toFixed(2)}`}
          onClick={() => setViewingCommissionsFor(user)}
          isSaiDeBaixo={isSaiDeBaixo} />

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
         <TabsList className={`${isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'} flex-wrap h-auto gap-2 p-2`}>
           <TabsTrigger value="visao-geral" className="text-xs sm:text-sm whitespace-nowrap">Visão Geral</TabsTrigger>
           {userLevels.includes('licenciado_catalogo') && <TabsTrigger value="catalogo" className="text-xs sm:text-sm whitespace-nowrap">🛍️ Catálogo</TabsTrigger>}

           <TabsTrigger value="minhas-vendas" className="text-xs sm:text-sm whitespace-nowrap">Minhas Vendas</TabsTrigger>
           {['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'].some((l) => userLevels.includes(l)) && <TabsTrigger value="vendas-equipe" className="text-xs sm:text-sm whitespace-nowrap">Vendas Equipe</TabsTrigger>}
           {userLevels.includes('licenciado_catalogo') && <TabsTrigger value="pedidos" className="text-xs sm:text-sm whitespace-nowrap">📦 Pedidos</TabsTrigger>}
           <TabsTrigger value="meus-clientes" className="text-xs sm:text-sm whitespace-nowrap">👥 Clientes ({myClients.length})</TabsTrigger>
           <TabsTrigger value="comissoes" className="text-xs sm:text-sm whitespace-nowrap">💰 Comissões</TabsTrigger>
           <TabsTrigger value="plano-carreira" className="text-xs sm:text-sm whitespace-nowrap">🎯 Carreira</TabsTrigger>
           {isAdmin && <TabsTrigger value="admin" className="text-xs sm:text-sm whitespace-nowrap">Admin</TabsTrigger>}
         </TabsList>



        {/* ABA: MINHAS VENDAS */}
        <TabsContent value="minhas-vendas" className="space-y-6">
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Minhas Vendas</CardTitle>
              <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                Acompanhe suas vendas de leilão e catálogo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSales ?
              <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div> :

              <Tabs defaultValue="leilao" className="w-full">
                  <TabsList className={isSaiDeBaixo ? 'bg-gray-100 border-gray-300' : 'bg-gray-700 border-gray-600'}>
                    <TabsTrigger value="leilao">Leilão</TabsTrigger>
                    <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="leilao" className="mt-4">
                    {myAuctions.length === 0 ?
                  <p className={`text-center py-8 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                        Arremates dos indicados: 0
                      </p> :

                  <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Produto</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Arrematante</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Valor</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Comissão (3%)</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {myAuctions.map((auction) =>
                        <TableRow key={auction.id} className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-900 text-sm' : 'text-gray-300 text-sm'}>{auction.title}</TableCell>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{auction.winner_name}</TableCell>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-900 font-semibold' : 'text-white font-semibold'}>R$ {auction.current_price?.toFixed(2)}</TableCell>
                                <TableCell className="text-green-400 font-semibold">R$ {(auction.current_price * 0.03).toFixed(2)}</TableCell>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-600 text-sm' : 'text-gray-400 text-sm'}>
                                  {new Date(auction.updated_date).toLocaleDateString('pt-BR')}
                                </TableCell>
                              </TableRow>
                        )}
                          </TableBody>
                        </Table>
                      </div>
                  }
                  </TabsContent>

                  <TabsContent value="catalogo" className="mt-4">
                    {mySales.length === 0 ?
                  <p className={`text-center py-8 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                        Nenhuma venda do catálogo
                      </p> :

                  <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Produto</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Comprador</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Valor</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Sua Comissão</TableHead>
                              <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mySales.map((sale) =>
                        <TableRow key={sale.id} className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-900 text-sm' : 'text-gray-300 text-sm'}>{sale.product_title}</TableCell>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{sale.buyer_name}</TableCell>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-900 font-semibold' : 'text-white font-semibold'}>R$ {sale.sale_price?.toFixed(2)}</TableCell>
                                <TableCell className="text-green-400 font-semibold">R$ {sale.commission_licensee_amount?.toFixed(2)}</TableCell>
                                <TableCell className={isSaiDeBaixo ? 'text-gray-600 text-sm' : 'text-gray-400 text-sm'}>
                                  {new Date(sale.created_date).toLocaleDateString('pt-BR')}
                                </TableCell>
                              </TableRow>
                        )}
                          </TableBody>
                        </Table>
                      </div>
                  }
                  </TabsContent>
                </Tabs>
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: VENDAS DA EQUIPE - Apenas diretores+ */}
        {['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'].some((l) => userLevels.includes(l)) &&
        <TabsContent value="vendas-equipe" className="space-y-6">
            <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Vendas da Minha Equipe</CardTitle>
                <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                  Acompanhe as vendas dos seus licenciados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-center py-12 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                  <TrendingUp className="w-12 h-12 mx-auto opacity-50 mb-4" />
                  <p>Seu sistema de alavancagem está crescendo!</p>
                  <p className="text-sm mt-2">Bônus por carreira: {user.total_commissions_generated ? `R$ ${user.total_commissions_generated.toFixed(2)}` : 'R$ 0.00'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        }

        {/* ABA: PEDIDOS - Apenas licenciados de catálogo */}
        {userLevels.includes('licenciado_catalogo') &&
        <TabsContent value="pedidos" className="space-y-6">
            <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Pedidos do Catálogo</CardTitle>
                <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                  Acompanhe seus pedidos de venda direta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-center py-12 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                  <Package className="w-12 h-12 mx-auto opacity-50 mb-4" />
                  <p>Nenhum pedido ainda</p>
                  <p className="text-sm mt-2">Comece a vender pelo seu link do catálogo!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        }

        {/* ABA: CATÁLOGO - Produtos para vender + Dashboard */}
        {userLevels.includes('licenciado_catalogo') &&
        <TabsContent value="catalogo" className="space-y-6">
            <Tabs defaultValue="catalogo-home" className="w-full">
              <TabsList className={`${isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'} flex-wrap h-auto gap-2 p-2`}>
                <TabsTrigger value="catalogo-home" className="text-xs sm:text-sm">📊 Página Inicial</TabsTrigger>
                <TabsTrigger value="catalogo-pedidos" className="text-xs sm:text-sm">📦 Pedidos</TabsTrigger>
                <TabsTrigger value="catalogo-clientes" className="text-xs sm:text-sm">👥 Clientes</TabsTrigger>
                <TabsTrigger value="catalogo-produtos" className="text-xs sm:text-sm">🛍️ Produtos</TabsTrigger>
              </TabsList>

              <TabsContent value="catalogo-home" className="mt-6">
                {/* ✅ ISOLAMENTO: Passar APENAS vendas do usuário logado */}
                <CatalogHome currentStore={null} catalogSales={Array.isArray(myCatalogSales) ? myCatalogSales : []} />
              </TabsContent>

              <TabsContent value="catalogo-pedidos" className="mt-6">
                {/* ✅ ISOLAMENTO: Passar APENAS vendas do usuário logado */}
                <CatalogOrders catalogSales={Array.isArray(myCatalogSales) ? myCatalogSales : []} />
              </TabsContent>

              <TabsContent value="catalogo-clientes" className="mt-6">
                {/* ✅ ISOLAMENTO: Passar APENAS vendas do usuário logado */}
                <CatalogClients catalogSales={Array.isArray(myCatalogSales) ? myCatalogSales : []} />
              </TabsContent>

              <TabsContent value="catalogo-produtos" className="mt-6">
                <CatalogTab isSaiDeBaixo={isSaiDeBaixo} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        }

        {/* ABA: PLANO DE CARREIRA */}
        <TabsContent value="plano-carreira" className="space-y-6">
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Seu Plano de Carreira</CardTitle>
              <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                Veja sua evolução no sistema de alavancagem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CareerPath currentUser={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visao-geral" className="space-y-6">
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>🎯 Link Influencer (App) - 3% por arremate</CardTitle>
              <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                Ganhe 3% em R$ sobre cada arremate feito pelos seus indicados no App
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className={isSaiDeBaixo ? 'bg-gray-100 border-gray-300 text-gray-900 font-mono text-sm' : 'bg-gray-700 border-gray-600 text-white font-mono text-sm'} />

                <Button onClick={copyToClipboard} className="bg-green-600 hover:bg-green-700">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <Alert className={isSaiDeBaixo ? 'bg-green-50 border-green-300' : 'bg-green-900/20 border-green-500/30'}>
                <Info className={`w-4 h-4 ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`} />
                <AlertDescription className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>
                  <strong>App (3%):</strong> Você ganha 3% sobre cada arremate dos seus indicados no aplicativo.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {userLevels.includes('licenciado_catalogo') &&
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>🛍️ Link Licenciado (Catálogo) - 26% distribuídos</CardTitle>
                <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                  Você é o ÂNCORA da venda e recebe 13% + bônus da hierarquia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                  value={`https://leilaonozap.net/Catalog?ref=${user.referral_code}`}
                  readOnly
                  className={isSaiDeBaixo ? 'bg-gray-100 border-gray-300 text-gray-900 font-mono text-sm' : 'bg-gray-700 border-gray-600 text-white font-mono text-sm'} />

                  <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://leilaonozap.net/Catalog?ref=${user.referral_code}`);
                    toast.success('Link copiado!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700">

                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <Alert className={isSaiDeBaixo ? 'bg-blue-50 border-blue-300' : 'bg-blue-900/20 border-blue-500/30'}>
                  <Info className={`w-4 h-4 ${isSaiDeBaixo ? 'text-blue-600' : 'text-blue-400'}`} />
                  <AlertDescription className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>
                    <strong>Catálogo (26%):</strong> Como Licenciado Âncora, você recebe 13% + comissões dos seus outros cargos ativos na hierarquia.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          }

          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={`mb-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Seu Plano de Carreira</CardTitle>
              <div className="space-y-1">
                <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                  Nível atual: <strong className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>{highestLevelName}</strong>
                </CardDescription>
                <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                  ⭐ Função Principal: <strong className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>{primaryLevelName}</strong>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <CareerPath currentUser={user} />
            </CardContent>
          </Card>

          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Como Funciona o Sistema</CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500'}`}>
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Compartilhe seu Link</h4>
                  <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Envie seu link de indicação para amigos e familiares.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500'}`}>
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Eles Se Cadastram</h4>
                  <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Quando usam seu link, são automaticamente seus indicados.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500'}`}>
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Você Ganha Comissões em R$</h4>
                  <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>App: 3% por arremate | Catálogo: até 26% distribuídos na rede!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meus-clientes" className="space-y-6">
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Clientes Indicados</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={isSaiDeBaixo ? 'pl-10 bg-gray-100 border-gray-300 text-gray-900' : 'pl-10 bg-gray-700 border-gray-600 text-white'} />

                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingClients ?
              <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div> :
              filteredClients.length > 0 ?
              <Table>
                  <TableHeader>
                    <TableRow className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                      <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Nome</TableHead>
                      <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Email</TableHead>
                      <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Indicado Por</TableHead>
                      <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Data de Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                    const referrer = client.referred_by_id ?
                    allUsers.find((u) => u.id === client.referred_by_id) :
                    null;

                    return (
                      <TableRow key={client.id} className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                          <TableCell className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>{client.full_name}</TableCell>
                          <TableCell className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>{client.email}</TableCell>
                          <TableCell className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                            {referrer ?
                          <span className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>👤 {referrer.full_name}</span> :

                          <span className={isSaiDeBaixo ? 'text-gray-400' : 'text-gray-500'}>Sem indicação</span>
                          }
                          </TableCell>
                          <TableCell className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                            {new Date(client.created_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>);

                  })}
                  </TableBody>
                </Table> :

              <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Nenhum cliente indicado ainda</p>
                  <p className="text-sm mt-2">Compartilhe seu link para começar!</p>
                </div>
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-6">
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>💰 Extrato de Comissões</CardTitle>
              <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                Acompanhe seus ganhos por canal de venda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Saldo Total Disponível */}
              <div className={`p-5 rounded-xl border-2 ${isSaiDeBaixo ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>💵 Saldo Disponível para Saque</p>
                    <p className={`text-3xl font-bold ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`}>
                      R$ {(user.commission_balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <Wallet className={`w-10 h-10 ${isSaiDeBaixo ? 'text-green-500' : 'text-green-400'}`} />
                </div>
                <p className={`text-xs mt-2 ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>
                  Este é o valor que você pode sacar agora. Após saques, este valor diminui.
                </p>
              </div>

              {/* Explicação dos Canais */}
              <div className={`p-4 rounded-lg ${isSaiDeBaixo ? 'bg-gray-100' : 'bg-gray-700/50'}`}>
                <h4 className={`font-semibold mb-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>📊 Como funcionam suas comissões:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">📱</span>
                    <div>
                      <strong className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>App (3%):</strong>
                      <span className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}> Você ganha 3% sobre cada arremate feito pelos seus indicados no aplicativo.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">🛍️</span>
                    <div>
                      <strong className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Catálogo (26%):</strong>
                      <span className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}> 26% de cada venda é distribuído entre os cargos da hierarquia. Você recebe de acordo com seus cargos ativos.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards por Canal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card App */}
                <div className={`p-5 rounded-xl border-2 ${isSaiDeBaixo ? 'bg-green-50 border-green-300' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className={`font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>📱 App (Influencer)</p>
                      <p className={`text-xs ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>3% por arremate dos indicados</p>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`}>
                    R$ {Math.max(0, (user.total_commissions_generated || 0) - (user.catalog_total_commissions_generated || 0)).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>Total histórico gerado</p>
                  
                  <div className={`mt-3 pt-3 border-t ${isSaiDeBaixo ? 'border-green-200' : 'border-green-500/30'}`}>
                    <p className={`text-xs ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                      ✅ Compartilhe seu link do App<br/>
                      ✅ Quando seu indicado arremata, você ganha 3%
                    </p>
                  </div>
                </div>

                {/* Card Catálogo */}
                <div className={`p-5 rounded-xl border-2 ${isSaiDeBaixo ? 'bg-blue-50 border-blue-300' : 'bg-blue-900/20 border-blue-500/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className={`font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>🛍️ Catálogo (Licenciado)</p>
                      <p className={`text-xs ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>26% distribuídos na hierarquia</p>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-blue-600' : 'text-blue-400'}`}>
                    R$ {(user.catalog_total_commissions_generated || 0).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>Total histórico gerado</p>
                  
                  <div className={`mt-3 pt-3 border-t ${isSaiDeBaixo ? 'border-blue-200' : 'border-blue-500/30'}`}>
                    <p className={`text-xs ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                      ✅ Âncora: 13% direto<br/>
                      ✅ Cargos ativos: bônus extras
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão Ver Histórico */}
              <Button
                onClick={() => setViewingCommissionsFor(user)}
                className={`w-full ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'}`}
                size="lg">
                <BarChart className="w-5 h-5 mr-2" />
                Ver Histórico Detalhado por Venda
              </Button>

              {/* Histórico de Comissões */}
              <div className={`mt-6 rounded-xl border ${isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}`}>
                <div className="p-4 border-b border-gray-700/50">
                  <h4 className={`${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} font-semibold`}>Histórico de Comissões</h4>
                  <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} text-sm`}>Últimos lançamentos de App e Catálogo</p>
                </div>
                {isLoadingCommissions ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div>
                ) : myCommissionRecords.length === 0 ? (
                  <div className={`text-center py-10 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Nenhuma comissão encontrada.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Data</TableHead>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Canal</TableHead>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Cargo</TableHead>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Produto</TableHead>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700 text-right' : 'text-gray-400 text-right'}>%</TableHead>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700 text-right' : 'text-gray-400 text-right'}>Valor (R$)</TableHead>
                          <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myCommissionRecords.map((rec) => (
                          <TableRow key={rec.id} className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                            <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>
                              {new Date(rec.created_date).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>
                              {rec.sale_type === 'catalog' ? 'Catálogo' : 'App'}
                            </TableCell>
                            <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{rec.role}</TableCell>
                            <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{rec.product_title || '-'}</TableCell>
                            <TableCell className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-right text-sm`}>{(rec.percent || 0).toFixed(2)}%</TableCell>
                            <TableCell className="text-green-400 text-right font-semibold">R$ {(rec.amount || 0).toFixed(2)}</TableCell>
                            <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{rec.status || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saques" className="space-y-6">
          <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
            <CardHeader>
              <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Histórico de Saques</CardTitle>
              <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                Acompanhe suas solicitações de saque
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWithdrawals ?
              <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div> :
              myWithdrawals.length > 0 ?
              <div className="space-y-4">
                  {myWithdrawals.map((withdrawal) =>
                <Card key={withdrawal.id} className="bg-gray-700/50 border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="text-2xl font-bold text-green-400">
                                R$ {withdrawal.amount.toFixed(2)}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          withdrawal.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          withdrawal.status === 'processing' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'}`
                          }>
                                {withdrawal.status === 'pending' && '⏳ Aguardando Aprovação'}
                                {withdrawal.status === 'approved' && '✅ Aprovado'}
                                {withdrawal.status === 'processing' && '🔄 Processando'}
                                {withdrawal.status === 'completed' && '✅ Concluído'}
                                {withdrawal.status === 'rejected' && '❌ Rejeitado'}
                                {withdrawal.status === 'failed' && '❌ Falhou'}
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-gray-400">
                              <p>
                                <strong className="text-gray-300">Chave PIX:</strong> {withdrawal.pix_key} ({withdrawal.pix_key_type})
                              </p>
                              <p>
                                <strong className="text-gray-300">Solicitado em:</strong> {new Date(withdrawal.created_date).toLocaleString('pt-BR')}
                              </p>
                              {withdrawal.processed_date &&
                          <p className="text-green-400">
                                  <strong>Processado em:</strong> {new Date(withdrawal.processed_date).toLocaleString('pt-BR')}
                                </p>
                          }
                              {withdrawal.notes &&
                          <p className="text-gray-500 italic mt-2">
                                  Obs: {withdrawal.notes}
                                </p>
                          }
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                )}
                </div> :

              <div className="text-center py-12 text-gray-500">
                  <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Nenhum saque solicitado ainda</p>
                  <p className="text-sm mt-2">Use o botão "Sacar Dinheiro" para solicitar seu primeiro saque</p>
                </div>
              }
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin &&
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
                          {licensees.map((lic) => {
                            const licTotal = ((lic.commission_balance || 0) + (lic.catalog_commission_balance || 0));
                            return (
                              <SelectItem key={lic.id} value={lic.id}>
                                {lic.full_name} - R$ {licTotal.toFixed(2)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Valor da Comissão (R$)</Label>
                      <Input
                      type="number"
                      placeholder="100.00"
                      onChange={(e) => setCommissionAmount(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white" />

                    </div>
                    <Button
                    onClick={handleGrantCommission}
                    disabled={isGranting || !selectedLicenseeId || !commissionAmount}
                    className="w-full bg-green-600 hover:bg-green-700">

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
                          {licensees.map((lic) =>
                        <SelectItem key={lic.id} value={lic.id}>
                              {lic.full_name}
                            </SelectItem>
                        )}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedLicenseeForLink &&
                  <div className="max-h-64 overflow-y-auto bg-gray-700/30 rounded-lg p-4 space-y-2">
                        {availableUsersToLink.map((u) =>
                    <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded">
                            <Checkbox
                        checked={selectedUsersToLink.includes(u.id)}
                        onCheckedChange={() => toggleUserSelection(u.id)} />

                            <span className="text-white">{u.full_name}</span>
                            <span className="text-gray-400 text-sm ml-auto">{u.email}</span>
                          </div>
                    )}
                      </div>
                  }
                    <Button
                    onClick={handleOrganizeAlavancagem}
                    disabled={isLinking || !selectedLicenseeForLink || selectedUsersToLink.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700">

                      {isLinking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Vincular {selectedUsersToLink.length} Usuário(s)
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reorganizar" className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-semibold">Reorganizar Hierarquia</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <HierarchyTreeView 
                    users={allUsers} 
                    isLoading={isLoadingUsers}
                  />
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
                  className="w-full">

                    {isCleaningDuplicates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Limpar Duplicatas
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        }
      </Tabs>

      {viewingIndicationsFor &&
      <IndicatedUsersModal
        licensee={viewingIndicationsFor}
        isOpen={true}
        onClose={() => setViewingIndicationsFor(null)} />

      }
      {viewingCommissionsFor &&
      <CommissionStatementModal
        licensee={viewingCommissionsFor}
        isOpen={true}
        onClose={() => setViewingCommissionsFor(null)} />

      }
      {isAuctionSelectionModalOpen &&
      <AuctionSelectionModal
        isOpen={isAuctionSelectionModalOpen}
        onClose={() => setIsAuctionSelectionModalOpen(false)}
        onSelectAuction={handleAuctionSelect} />

      }
      {editingUser &&
      <UserEditModal
        user={editingUser}
        isOpen={true}
        onClose={() => setEditingUser(null)}
        onSuccess={handleUserUpdate}
        allUsers={allUsers} />

      }
      {changingPasswordUser &&
      <UserPasswordModal
        user={changingPasswordUser}
        isOpen={true}
        onClose={() => setChangingPasswordUser(null)}
        onSave={() => {
          setChangingPasswordUser(null);
          loadAllUsers();
        }} />

      }

      <WithdrawalModalComponent show={showWithdrawalModal} onClose={() => setShowWithdrawalModal(false)} totalAvailable={totalAvailable} withdrawalAmount={withdrawalAmount} setWithdrawalAmount={setWithdrawalAmount} pixKey={pixKey} setPixKey={setPixKey} pixKeyType={pixKeyType} setPixKeyType={setPixKeyType} isProcessing={isProcessingWithdrawal} onSubmit={handleWithdrawalSubmit} />
      <NotaStackStyles />
    </div>);

};

export default function LicensingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLicenseeRegisterModal, setShowLicenseeRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 🆕 DETECTA CONTEXTO SAI DE BAIXO
  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

  const fetchWithRetryInLicensingPage = async (fetchFunction, maxRetries = 3, delayMs = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchFunction();
      } catch (error) {
        console.warn(`Tentativa ${i + 1} (LicensingPage) falhou:`, error.message);
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
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
              () => AppUser.filter({ email: user.email }),
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

  const handleRegistrationSuccess = async (user) => {
    console.log("✅ Login/Cadastro bem-sucedido:", user.full_name);
    
    // Busca dados atualizados do usuário no banco para garantir que temos os career_levels corretos
    try {
      const freshUsers = await AppUser.filter({ email: user.email });
      if (freshUsers && freshUsers.length > 0) {
        const freshUser = freshUsers[0];
        localStorage.setItem('currentUser', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
        console.log("✅ Dados atualizados carregados:", freshUser.career_levels, freshUser.role);
      } else {
        setCurrentUser(user);
      }
    } catch (err) {
      console.warn("Não foi possível atualizar dados do usuário:", err);
      setCurrentUser(user);
    }
    
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
            }} />

          <p
            className="text-lg text-gray-300 tracking-wider"
            style={{
              animation: 'gentlePulseText 2.5s ease-in-out infinite'
            }}>

            Seja bem-vindo...
          </p>
        </div>
      </div>);

  }

  // QUALQUER usuário logado pode ver o dashboard de alavancagem
  // Todos são automaticamente influencers conforme regra de negócio
  const isLicensee = currentUser && currentUser.id;


  const isAdmin = currentUser?.role === 'admin';

  // DETECTAR NÍVEL DO USUÁRIO
  const getUserLevel = () => {
    if (!currentUser) return 'guest';

    // Usa o primary_career_level se disponível
    return currentUser.primary_career_level || 'usuario';
  };

  const userLevel = getUserLevel();

  // Mapear níveis para labels dinâmicos
  const getLevelLabel = (level) => {
    const labels = {
      'usuario': 'um Usuário',
      'influencer': 'um Influencer',
      'licenciado_catalogo': 'um Licenciado Catálogo',
      'trainee': 'um Trainee',
      'executivo': 'um Executivo',
      'kit_start': 'Kit Start',
      'plano_lider': 'Plano Líder',
      'plano_lojista': 'Plano Lojista',
      'distribuidor': 'um Distribuidor',
      'diretor': 'um Diretor',
      'diretoria': 'Diretoria',
      'ceo': 'CEO',
      'conselheiro': 'um Conselheiro',
      'fundador': 'um Fundador'
    };
    return labels[level] || 'um Influencer';
  };

  // Mensagens motivacionais por cargo
  const getMotivationalMessage = (level) => {
    const messages = {
      'influencer': 'Continue evoluindo! O próximo passo é se tornar Licenciado Catálogo e desbloquear ainda mais benefícios.',
      'licenciado_catalogo': 'Você já tem acesso ao catálogo! Cresça sua rede para alcançar os níveis Trainee e Executivo.',
      'trainee': 'Não sei se te dou parabéns ou pêsames, seja bem vindo a... SIFUDENCIA! Serão 6 meses de extremo desafio, porém se você se formar o céu é o limite. BOA SORTE!',
      'executivo': 'Ótimo trabalho! Os próximos níveis são Kit Start, Plano Líder e Plano Lojista.',
      'kit_start': 'Continue crescendo! Avance para Plano Líder e aumente suas comissões.',
      'plano_lider': 'Muito bem! Próximo objetivo: Plano Lojista e depois Distribuidor.',
      'plano_lojista': 'Impressionante! Você está perto de se tornar Distribuidor.',
      'distribuidor': 'Parabéns! Continue para alcançar Diretor e ingressar na liderança.',
      'diretor': 'Liderança conquistada! Próximos passos: Diretoria e CEO.',
      'diretoria': 'Você faz parte da alta direção! Avance para CEO.',
      'ceo': 'Excelente! Você está quase no topo. Próximo nível: Conselheiro.',
      'conselheiro': 'Incrível! Um passo do topo absoluto: Fundador.',
      'fundador': '🏆 Você alcançou o topo absoluto! Como Fundador, você está no nível máximo do sistema. Agora é hora de consolidar seu império e mentorar novos líderes!'
    };
    return messages[level] || 'Continue crescendo seu sistema de alavancagem e maximizando seus ganhos.';
  };

  return (
    <>
      <div className={`min-h-screen ${
      isSaiDeBaixo ?
      'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900' :
      'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white'}`
      }>
        {/* Hero Section */}
        <div className="relative overflow-hidden py-20 px-6">
          <div className={`absolute inset-0 bg-gradient-to-r ${
          isSaiDeBaixo ?
          'from-red-500/10 to-orange-500/10' :
          'from-green-500/10 to-blue-500/10'}`
          }></div>
          <div className="relative max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>

              <div className={`inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-full border ${
              isSaiDeBaixo ?
              'bg-red-500/10 border-red-500/30' :
              'bg-green-500/10 border-green-500/30'}`
              }>
                <TrendingUp className={`w-6 h-6 ${isSaiDeBaixo ? 'text-red-400' : 'text-green-400'}`} />
                <span className={`font-semibold ${isSaiDeBaixo ? 'text-red-400' : 'text-green-400'}`}>Programa de Influenciadores</span>
              </div>
              
              {/* TÍTULO DINÂMICO */}
              {userLevel === 'guest' || userLevel === 'usuario' ?
              <>
                  <h1 className={`text-3xl md:text-4xl font-bold mb-6 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    Torne-se um Influenciador
                  </h1>
                  <p className={`text-lg max-w-3xl mx-auto mb-8 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                    Indique amigos e ganhe <strong className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>3% em dinheiro real (R$)</strong> em cada arremate que eles fizerem!
                  </p>
                  <p className={`text-lg max-w-3xl mx-auto mb-8 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                    Construa um negócio sólido com o sistema de alavancagem {isSaiDeBaixo ? 'do Sai de Baixo' : 'da Leilão NoZap'}!
                  </p>
                </> :
              userLevel === 'influencer' ?
              <>
                  <h1 className={`text-3xl md:text-4xl font-bold mb-6 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    Você já é um Influenciador!
                  </h1>
                  <p className={`text-lg max-w-3xl mx-auto mb-8 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                    Compartilhe seu link &rarr; Seus indicados arrematam &rarr; <strong className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>Você ganha 3% em dinheiro real!</strong>
                  </p>
                  <p className={`text-lg max-w-3xl mx-auto mb-8 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                    Continue crescendo sua rede e <strong className={isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}>aumente seus ganhos</strong> com o sistema de alavancagem!
                  </p>
                </> :

              <>
                  <h1 className={`text-3xl md:text-4xl font-bold mb-6 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    Parabéns! Você é {getLevelLabel(userLevel)} 🎉
                  </h1>
                  <p className={`text-lg max-w-3xl mx-auto mb-8 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                    {getMotivationalMessage(userLevel)}
                  </p>
                  <p className={`text-lg max-w-3xl mx-auto mb-8 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                    Ganhe <strong className={isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}>comissões em dinheiro real (R$)</strong> + bônus do seu sistema de alavancagem!
                  </p>
                </>
              }

              {/* CARD DINÂMICO */}
              {isLicensee && userLevel === 'influencer' &&
              <div className="max-w-2xl mx-auto mt-8">
                  <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-2 border-blue-500/50">
                    <CardHeader>
                      <CardTitle className="text-blue-400">🚀 Quero Evoluir no Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a
                      href="https://wa.me/5521966629605?text=Olá,%20quero%20evoluir%20no%20sistema%20de%20alavancagem!"
                      target="_blank"
                      rel="noopener noreferrer">

                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Falar com Executivo no WhatsApp
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                </div>
              }

              {isLicensee && ['licenciado_catalogo', 'executivo', 'diretor', 'ceo', 'conselheiro', 'fundador'].includes(userLevel) &&
              <div className="max-w-2xl mx-auto mt-8">
                  <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 border-purple-500/50">
                    <CardHeader>
                      <CardTitle className="text-purple-400">👑 Suporte VIP</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a
                      href={`https://wa.me/5521966629605?text=Olá,%20sou%20${userLevel}%20e%20preciso%20de%20suporte!`}
                      target="_blank"
                      rel="noopener noreferrer">

                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Falar com Suporte Executivo
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                </div>
              }
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLicensee ?
          <DashboardContent user={currentUser} isAdmin={isAdmin} /> :

          <LandingContent
            onRegisterClick={() => setShowLicenseeRegisterModal(true)}
            onLoginClick={() => setShowLoginModal(true)} />

          }
        </div>

        <div className={`py-20 px-6 ${isSaiDeBaixo ? 'bg-gray-100/50' : 'bg-gray-800/50'}`}>
          <div className="max-w-6xl mx-auto">
            <h2 className={`text-4xl font-bold text-center mb-4 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
              Construa Seu Sistema de Alavancagem
            </h2>
            <p className={`text-center mb-12 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
              Veja como nossos influenciadores estão crescendo
            </p>
          </div>
        </div>

      </div>

      {showLicenseeRegisterModal &&
      <LicenseeRegistrationModal
        onClose={() => setShowLicenseeRegisterModal(false)}
        onSuccess={handleRegistrationSuccess} />

      }
      {showLoginModal &&
      <LoginModal
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleRegistrationSuccess}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowLicenseeRegisterModal(true);
        }} />

      }
      
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
    </>);

}