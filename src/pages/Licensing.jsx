import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Copy, Users, BarChart, DollarSign, Zap, Loader2, Search, TrendingUp, Info, RefreshCw, Link2, Trash2, AlertCircle, MessageCircle, X, Wallet, Clock, Package, GripVertical } from 'lucide-react';

import LicenseeRegistrationModal from '../components/licensing/LicenseeRegistrationModal';
import LoginModal from '../components/common/LoginModal';
import IndicatedUsersModal from '../components/admin/IndicatedUsersModal';
import CommissionStatementModal from '../components/admin/CommissionStatementModal';
import CareerPath from '../components/licensing/CareerPath';
import AuctionSelectionModal from '../components/licensing/AuctionSelectionModal';
import UserEditModal from '../components/admin/UserEditModal';
import UserPasswordModal from '../components/admin/UserPasswordModal';
import HierarchyTreeView from '../components/licensing/HierarchyTreeView';
import CatalogHome from '../components/lojista/CatalogHome';
import CatalogOrders from '../components/lojista/CatalogOrders';
import CatalogClients from '../components/lojista/CatalogClients';
import LicenseeCRM from '../components/licensee-crm/LicenseeCRM';
import CatalogTabComponent from '../components/licensing/CatalogTabComponent';
import CommissionsTab from '../components/licensing/CommissionsTab';
import LandingContent from '../components/licensing/LandingContent';
import LandingErrorBoundary from '../components/licensing/LandingErrorBoundary';
import WithdrawalModal from '../components/licensing/WithdrawalModal';
import WithdrawalsHistoryTab from '../components/licensing/WithdrawalsHistoryTab';
import MyClientsTab from '../components/licensing/MyClientsTab';
import HowItWorksCard from '../components/licensing/HowItWorksCard';
import SellerFormModal from '../components/sellers/SellerFormModal';
import SellersListPanel from '../components/sellers/SellersListPanel';
import DashboardTabsList from '../components/licensing/DashboardTabsList';

const Product = base44.entities.Product;
const StatCard = ({ icon: Icon, label, value, onClick, isLoading: isL, isSaiDeBaixo }) => (
  <Card
    onClick={onClick}
    className={`relative overflow-hidden bg-gradient-to-br from-gray-900 ${isSaiDeBaixo ? 'via-red-950/20' : 'via-emerald-950/20'} to-gray-900 border ${isSaiDeBaixo ? 'border-red-500/20' : 'border-emerald-500/20'} shadow-lg backdrop-blur-sm transition-all duration-300 ${onClick ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-xl ${isSaiDeBaixo ? 'hover:border-red-500/50 hover:shadow-red-900/20' : 'hover:border-emerald-500/50 hover:shadow-emerald-900/20'}` : ''}`}>
    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${isSaiDeBaixo ? 'via-red-500/70' : 'via-emerald-400/70'} to-transparent`} />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</CardTitle>
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg border ${isSaiDeBaixo ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
        <Icon className={`h-4 w-4 ${isSaiDeBaixo ? 'text-red-400' : 'text-emerald-400'}`} />
      </div>
    </CardHeader>
    <CardContent>
      {isL ? <Loader2 className="h-6 w-6 animate-spin text-gray-500" /> : <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{value}</div>}
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
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// 🆕 FUNÇÃO PARA ADICIONAR DELAY ENTRE CHAMADAS
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DashboardContent = ({ user, isAdmin }) => {
  const navigate = useNavigate();
  const walletCardRef = useRef(null);

  // 🛡️ FASE 4.6 — Lê ?tab=xxx APENAS na primeira render (links externos ainda
  // funcionam). Sem polling — a sidebar do Licenciado foi removida na FASE 4.6.
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      const VALID_TABS = ['visao-geral', 'catalogo', 'plano-carreira', 'admin'];
      return VALID_TABS.includes(t) ? t : 'visao-geral';
    } catch {
      return 'visao-geral';
    }
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

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

  // 🆕 Estado do cadastro de vendedores (Etapa 5)
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellersRefreshCounter, setSellersRefreshCounter] = useState(0);

  // 🎯 FASE 4.7.2 — Rotação de destaque das cédulas Valora
  // Índices: 0=guardian(R$10) · 1=backBack(R$50) · 2=back(R$100) · 3=side(R$20) · 4=front(R$200)
  // R$ 200 (índice 4) fica 10s em destaque (protagonismo). Demais ficam 5s cada.
  const [featuredNoteIndex, setFeaturedNoteIndex] = useState(4); // começa na R$ 200
  useEffect(() => {
    let timeoutId = null;
    let isPaused = false;

    const scheduleNext = () => {
      if (isPaused || timeoutId) return;
      // Usa functional setState pra ler o índice atual sem virar dependência
      setFeaturedNoteIndex((current) => {
        // Agenda a próxima troca com base no PRÓXIMO índice que vai assumir
        const nextIndex = (current + 1) % 5;
        const delayForNext = nextIndex === 4 ? 10000 : 5000; // R$ 200 = 10s
        timeoutId = setTimeout(() => {
          timeoutId = null;
          scheduleNext();
        }, delayForNext);
        return nextIndex;
      });
    };

    const startCycle = () => {
      if (isPaused || timeoutId) return;
      // Primeira troca: R$ 200 começa destacada, então após 10s troca pra R$ 10
      isPaused = false;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        scheduleNext();
      }, 10000);
    };

    const stopCycle = () => {
      isPaused = true;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    // Só começa a rotação após a entrada completa (~4.5s) pra não sobrepor com a queda escalonada
    const startTimeout = setTimeout(() => {
      isPaused = false;
      startCycle();
    }, 4500);

    // Pausa quando aba oculta, retoma ao voltar (protocolo multi-dispositivo)
    const handleVisibility = () => {
      if (document.hidden) stopCycle();
      else startCycle();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', startCycle);
    window.addEventListener('blur', stopCycle);
    return () => {
      clearTimeout(startTimeout);
      stopCycle();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', startCycle);
      window.removeEventListener('blur', stopCycle);
    };
  }, []);

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

  const careerLevelsMap = { 'usuario': 'Usuário', 'licenciado_aplicativo': 'Influencer', 'influencer': 'Influencer', 'licenciado_catalogo': 'Licenciado Loja Virtual', 'trainee': 'Trainee', 'executivo': 'Executivo', 'kit_start': 'Kit Start', 'plano_lider': 'Plano Líder', 'plano_lojista': 'Plano Lojista', 'distribuidor': 'Distribuidor', 'diretor': 'Diretor', 'diretoria': 'Diretoria', 'ceo': 'CEO', 'conselheiro': 'Conselheiro', 'fundador': 'Fundador' };

  const careerHierarchy = ['fundador', 'conselheiro', 'ceo', 'diretoria', 'diretor', 'executivo', 'licenciado_catalogo', 'influencer', 'usuario'];

  const highestLevel = careerHierarchy.find((level) => userLevels.includes(level)) || 'usuario';

  // 🆕 Só existe UM link de indicação ativo por vez: quem já avançou para
  // Licenciado (ou além, na carreira) ganha pela Loja Virtual, não mais pelo App.
  const hasAdvancedBeyondInfluencer = userLevels.some((l) =>
    ['licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 'distribuidor', 'diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'].includes(l)
  );

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
    { value: 200, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/83f8b9a48_200_front.jpg" },
    { value: 100, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/15d210cda_cdula-100-reais_anverso.jpg" },
    { value: 50, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/109de79bd_50_front.jpg" },
    { value: 20, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/81c45e110_20_front.jpg" },
    { value: 10, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/85f62789d_Anverso_da_cdula_de_10_reais.PNG" },
    { value: 5, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/8f25db571_5_front.jpg" },
    { value: 2, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/90f9e2b2b_Anverso_da_cdula_de_dois_reais.PNG" }];


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

      // Calcula total de saques pendentes (guarda contra resposta não-array)
      const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];
      const pending = safeWithdrawals
        .filter((w) => w.status === 'pending')
        .reduce((sum, w) => sum + (w.amount || 0), 0);
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

      // Buscar arremates de leilão (ended OU sold) dos indicados ignorando limitador obsoleto de 300 (Memory-safe)
      let wonAuctions = [];
      if (referredIds.length > 0) {
        try {
          // Buscando diretamente com $in para puxar o histórico ilimitado do afiliado
          const allAuctions = await Auction.filter({
            winner_id: { $in: referredIds }
          });

          wonAuctions = Array.isArray(allAuctions) ?
            allAuctions.filter(a => a.status === 'sold' || a.status === 'ended') :
            [];
        } catch (filterError) {
          console.error("Erro ao filtrar via $in, listando fallback", filterError);
        }
      }

      console.log('🏆 Arremates encontrados:', wonAuctions.length);
      setMyAuctions(wonAuctions);

      // Buscar vendas do catálogo onde EU SOU O LICENCIADO (vendedor) + vendas da rede que geraram minhas comissões
      try {
        const CatalogSale = base44.entities.CatalogSale;

        // ✅ ISOLAMENTO CRÍTICO: Filtrar NO SERVIDOR, não na UI
        // Busca vendas onde licensee_id = meu ID (minha loja direta)
        const ownSales = Array.isArray(user.id) ? [] :
          await CatalogSale.filter(
            { licensee_id: user.id },
            '-created_date',
            300
          );

        console.log('✅ [ISOLAMENTO] Vendas catálogo do user_id:', user.id, '→', ownSales.length, 'vendas');

        // 🆕 SINCRONIA: cargos diretor+ (fundador, conselheiro, ceo, etc) recebem
        // bônus de TODA a rede, não só da própria loja. Para o Relatório/Pedidos
        // baterem com o extrato de Comissões, incluímos também as vendas que
        // geraram registros de comissão para este usuário.
        const commissionRecords = await base44.entities.CommissionRecord.filter(
          { user_id: user.id, sale_type: 'catalog' },
          '-created_date',
          300
        );
        const ownSaleIds = new Set((Array.isArray(ownSales) ? ownSales : []).map((s) => s.id));
        const extraSaleIds = [...new Set(
          (Array.isArray(commissionRecords) ? commissionRecords : [])
            .map((r) => r.sale_id)
            .filter((id) => id && !ownSaleIds.has(id))
        )];

        let networkSales = [];
        if (extraSaleIds.length > 0) {
          try {
            networkSales = await CatalogSale.filter({ id: { $in: extraSaleIds } }, '-created_date', 300);
          } catch (networkError) {
            console.error("Erro ao buscar vendas da rede vinculadas às comissões:", networkError);
          }
        }

        const allSales = [...(Array.isArray(ownSales) ? ownSales : []), ...(Array.isArray(networkSales) ? networkSales : [])]
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        setMySales(allSales);
        setMyCatalogSales(allSales);
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

      const base44Client = (await import('@/api/base44Client')).base44;
      await base44Client.functions.invoke('updateUserNetwork', {
        target_user_id: selectedLicenseeId,
        update_data: {
          commission_balance: (licensee.commission_balance || 0) + amount
        }
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
          const base44Client = (await import('@/api/base44Client')).base44;
          await base44Client.functions.invoke('updateUserNetwork', {
            target_user_id: userId,
            update_data: { referred_by_id: selectedLicenseeForLink }
          });
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
      (client.full_name && client.full_name.toLowerCase().includes(term)) ||
      (client.nickname && client.nickname.toLowerCase().includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    );
  }, [myClients, searchTerm]);

  const licensees = useMemo(() => {
    return allUsers.filter((u) => u.role === 'licensee' || (u.role === 'admin' && u.referral_code));
  }, [allUsers]);

  const availableUsersToLink = useMemo(() => {
    return allUsers.filter((u) => {
      if (u.id === selectedLicenseeForLink) return false;
      return u.role === 'user' || u.role === 'licensee' || (u.role === 'admin' && u.referral_code);
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
        } catch { }

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

      <Card ref={walletCardRef} className={`mb-8 relative bg-gradient-to-br backdrop-blur-xl border-2 shadow-2xl ${isSaiDeBaixo ?
        'from-red-950/60 via-red-900/40 to-red-950/60 border-red-500/40 shadow-red-900/30' :
        'from-emerald-950/70 via-green-900/50 to-emerald-950/70 border-emerald-500/40 shadow-emerald-900/40'}`
      }>
        <CardContent className="p-6 md:px-12 md:py-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-20">
            <div className="w-full md:w-auto">
              <h3 className={`text-sm font-medium uppercase tracking-widest mb-1 ${isSaiDeBaixo ? 'text-red-300/80' : 'text-emerald-300/80'}`}>Saldo Disponível</h3>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]">
                  R$ {totalAvailable.toFixed(2)}
                </span>
              </div>

              <div className={`h-px bg-gradient-to-r from-transparent to-transparent my-4 max-w-[280px] ${isSaiDeBaixo ? 'via-red-500/30' : 'via-emerald-500/30'}`} />

              {pendingWithdrawalAmount > 0 &&
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-4 max-w-[280px]">
                  <p className="text-sm text-yellow-400 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Saque em Processo: R$ {pendingWithdrawalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Aguardando aprovação
                  </p>
                </div>
              }
              <div className="flex flex-col gap-2 max-w-[280px]">
                <Button
                  onClick={() => setIsAuctionSelectionModalOpen(true)}
                  className={`text-white font-semibold h-10 text-sm shadow-lg transition-all duration-300 hover:scale-[1.02] ${isSaiDeBaixo ?
                    'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20 hover:shadow-red-500/40' :
                    'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 shadow-green-500/20 hover:shadow-green-500/40'}`}>

                  <Zap className="w-4 h-4 mr-2" />
                  Usar em Leilões
                </Button>
                <Button
                  onClick={() => setShowWithdrawalModal(true)}
                  className={`bg-gray-800/60 border text-white font-medium h-10 text-sm transition-all duration-300 hover:bg-gray-700 hover:shadow-md ${isSaiDeBaixo ?
                    'border-gray-600/50 hover:border-red-500/50 hover:shadow-red-500/20' :
                    'border-gray-600/50 hover:border-emerald-500/50 hover:shadow-emerald-500/20'}`}>

                  <Wallet className="w-4 h-4 mr-2" />
                  Sacar
                </Button>
              </div>
            </div>

            <div className="relative w-56 h-36 flex items-center justify-center nota-stack-container">
              {guardianNote && guardianNote.url &&
                <img
                  src={guardianNote.url}
                  alt=""
                  className={`absolute w-48 h-28 rounded-lg shadow-2xl nota-transition nota-pos-guardian nota-entrance-guardian ${featuredNoteIndex === 0 ? 'nota-featured' : ''}`}
                  style={{ zIndex: featuredNoteIndex === 0 ? 10 : 0, opacity: featuredNoteIndex === 0 ? 1 : 0.80, backgroundColor: '#f7f3e9' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />

              }

              {backBackNote && backBackNote.url &&
                <img
                  src={backBackNote.url}
                  alt=""
                  className={`absolute w-48 h-28 rounded-lg shadow-2xl nota-transition nota-pos-backback nota-entrance-backback ${featuredNoteIndex === 1 ? 'nota-featured' : ''}`}
                  style={{ zIndex: featuredNoteIndex === 1 ? 10 : 1, opacity: featuredNoteIndex === 1 ? 1 : 0.82, backgroundColor: '#f7f3e9' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />

              }

              {backNote && backNote.url &&
                <img
                  src={backNote.url}
                  alt=""
                  className={`absolute w-48 h-28 rounded-lg shadow-2xl nota-transition nota-pos-back nota-entrance-back ${featuredNoteIndex === 2 ? 'nota-featured' : ''}`}
                  style={{ zIndex: featuredNoteIndex === 2 ? 10 : 2, opacity: featuredNoteIndex === 2 ? 1 : 0.85, backgroundColor: '#f7f3e9' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />

              }

              {sideNote && sideNote.url &&
                <img
                  src={sideNote.url}
                  alt=""
                  className={`absolute w-48 h-28 rounded-lg shadow-2xl nota-transition nota-pos-side nota-entrance-side ${featuredNoteIndex === 3 ? 'nota-featured' : ''}`}
                  style={{ zIndex: featuredNoteIndex === 3 ? 10 : 3, opacity: featuredNoteIndex === 3 ? 1 : 0.90, backgroundColor: '#f7f3e9' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />

              }

              {frontNote && frontNote.url &&
                <img
                  src={frontNote.url}
                  alt=""
                  className={`absolute w-48 h-28 rounded-lg shadow-2xl nota-transition nota-pos-front nota-entrance-front ${featuredNoteIndex === 4 ? 'nota-featured' : ''}`}
                  style={{ zIndex: featuredNoteIndex === 4 ? 10 : 4, opacity: featuredNoteIndex === 4 ? 1 : 0.92, backgroundColor: '#f7f3e9' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />

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
          label="Total Comissões (App + Loja Virtual)"
          value={`R$ ${((user.commission_balance || 0) + (user.catalog_commission_balance || 0)).toFixed(2)}`}
          onClick={() => setViewingCommissionsFor(user)}
          isSaiDeBaixo={isSaiDeBaixo} />

      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <DashboardTabsList
          isSaiDeBaixo={isSaiDeBaixo}
          userLevels={userLevels}
          isAdmin={isAdmin}
          myClientsCount={myClients.length}
        />



        {/* ABA: LOJA VIRTUAL - Dashboard, Pedidos, Clientes, Produtos e Vendedores */}
        {(userLevels.includes('licenciado_catalogo') || isAdmin) &&
          <TabsContent value="catalogo" className="space-y-6">
            <Tabs defaultValue="catalogo-produtos" className="w-full">
              <TabsList className={`${isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'} flex-wrap h-auto gap-2 p-2`}>
                <TabsTrigger value="catalogo-produtos" className="text-xs sm:text-sm">🛍️ Sua Loja Virtual</TabsTrigger>
                <TabsTrigger value="catalogo-home" className="text-xs sm:text-sm">📊 Relatório</TabsTrigger>
                <TabsTrigger value="catalogo-pedidos" className="text-xs sm:text-sm">📦 Pedidos</TabsTrigger>
                <TabsTrigger value="catalogo-clientes" className="text-xs sm:text-sm">👥 Clientes ({myClients.length})</TabsTrigger>
                <TabsTrigger value="catalogo-vendedores" className="text-xs sm:text-sm">🤝 Vendedores</TabsTrigger>
                <TabsTrigger value="catalogo-comissoes" className="text-xs sm:text-sm">💰 Comissões</TabsTrigger>
              </TabsList>

              <TabsContent value="catalogo-home" className="mt-6">
                {/* ✅ ISOLAMENTO: Passar APENAS vendas do usuário logado */}
                <CatalogHome currentStore={null} catalogSales={Array.isArray(myCatalogSales) ? myCatalogSales : []} user={user} />
              </TabsContent>

              <TabsContent value="catalogo-pedidos" className="mt-6">
                {/* ✅ ISOLAMENTO: Passar APENAS vendas do usuário logado */}
                <CatalogOrders catalogSales={Array.isArray(myCatalogSales) ? myCatalogSales : []} />
              </TabsContent>

              <TabsContent value="catalogo-clientes" className="mt-6">
                <MyClientsTab
                  isSaiDeBaixo={isSaiDeBaixo}
                  isLoadingClients={isLoadingClients}
                  filteredClients={filteredClients}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  allUsers={allUsers}
                />
              </TabsContent>

              <TabsContent value="catalogo-produtos" className="mt-6">
                <CatalogTabComponent isSaiDeBaixo={isSaiDeBaixo} user={user} />
              </TabsContent>

              <TabsContent value="catalogo-vendedores" className="mt-6">
                <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Meus Vendedores</CardTitle>
                        <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>Cadastre vendedores que vão vender pela sua rede (10% por venda).</CardDescription>
                      </div>
                      <Button onClick={() => setShowSellerModal(true)} className="bg-green-600 hover:bg-green-700 text-white min-h-[44px]">+ Cadastrar Vendedor</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SellersListPanel licenseeId={user.id} refreshKey={sellersRefreshCounter} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="catalogo-comissoes" className="mt-6">
                <Tabs defaultValue="extrato" className="w-full">
                  <TabsList className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
                    <TabsTrigger value="extrato">Extrato</TabsTrigger>
                    <TabsTrigger value="vendas">Vendas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="extrato" className="mt-4">
                    <CommissionsTab user={user} isSaiDeBaixo={isSaiDeBaixo} isLoadingCommissions={isLoadingCommissions} myCommissionRecords={myCommissionRecords} onViewHistory={() => setViewingCommissionsFor(user)} />
                  </TabsContent>

                  <TabsContent value="vendas" className="mt-4">
                    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
                      <CardHeader>
                        <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Minhas Vendas</CardTitle>
                        <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                          As vendas que geraram suas comissões
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
                              <TabsTrigger value="catalogo">Loja Virtual</TabsTrigger>
                              {['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'].some((l) => userLevels.includes(l)) && <TabsTrigger value="equipe">Equipe</TabsTrigger>}
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
                                  Nenhuma venda da loja virtual
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

                            {['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'].some((l) => userLevels.includes(l)) &&
                              <TabsContent value="equipe" className="mt-4">
                                <div className={`text-center py-12 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                                  <TrendingUp className="w-12 h-12 mx-auto opacity-50 mb-4" />
                                  <p>Seu sistema de alavancagem está crescendo!</p>
                                  <p className="text-sm mt-2">Bônus por carreira: {user.total_commissions_generated ? `R$ ${user.total_commissions_generated.toFixed(2)}` : 'R$ 0.00'}</p>
                                </div>
                              </TabsContent>
                            }
                          </Tabs>
                        }
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
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
          {hasAdvancedBeyondInfluencer ?
            <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>🛍️ Seu Link (Loja Virtual) - 26% distribuídos</CardTitle>
                <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                  Você é o ÂNCORA da venda e recebe 13% + bônus da hierarquia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={`https://leilaonozap.net/Loja-Virtual?ref=${user.referral_code}`}
                    readOnly
                    className={isSaiDeBaixo ? 'bg-gray-100 border-gray-300 text-gray-900 font-mono text-sm' : 'bg-gray-700 border-gray-600 text-white font-mono text-sm'} />

                  <Button onClick={() => { navigator.clipboard.writeText(`https://leilaonozap.net/Loja-Virtual?ref=${user.referral_code}`); toast.success('Link copiado!'); }} className="bg-blue-600 hover:bg-blue-700"><Copy className="w-4 h-4 mr-2" />Copiar</Button>
                  <a href={`https://leilaonozap.net/Loja-Virtual?ref=${user.referral_code}`} target="_blank" rel="noopener noreferrer"><Button type="button" className="bg-green-600 hover:bg-green-700"><Link2 className="w-4 h-4 mr-2" />Abrir</Button></a>
                </div>
                <Alert className={isSaiDeBaixo ? 'bg-blue-50 border-blue-300' : 'bg-blue-900/20 border-blue-500/30'}>
                  <Info className={`w-4 h-4 ${isSaiDeBaixo ? 'text-blue-600' : 'text-blue-400'}`} />
                  <AlertDescription className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}><strong>Loja Virtual (26%):</strong> Como Licenciado Âncora, você recebe 13% + comissões dos seus outros cargos ativos na hierarquia.</AlertDescription>
                </Alert>
              </CardContent>
            </Card> :

            <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>🎯 Seu Link (Influencer) - 3% por arremate</CardTitle>
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

                  <Button onClick={copyToClipboard} className="bg-green-600 hover:bg-green-700"><Copy className="w-4 h-4 mr-2" />Copiar</Button>
                  <a href={referralLink} target="_blank" rel="noopener noreferrer"><Button type="button" className="bg-blue-600 hover:bg-blue-700"><Link2 className="w-4 h-4 mr-2" />Abrir</Button></a>
                </div>
                <Alert className={isSaiDeBaixo ? 'bg-green-50 border-green-300' : 'bg-green-900/20 border-green-500/30'}>
                  <Info className={`w-4 h-4 ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`} />
                  <AlertDescription className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}><strong>App (3%):</strong> Você ganha 3% sobre cada arremate dos seus indicados no aplicativo.</AlertDescription>
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

          <HowItWorksCard isSaiDeBaixo={isSaiDeBaixo} />
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

      {/* Modal de Cadastro de Vendedor */}
      <SellerFormModal
        open={showSellerModal}
        onClose={() => setShowSellerModal(false)}
        onCreated={() => setSellersRefreshCounter((c) => c + 1)}
      />

      {/* Modal de Saque */}
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        totalAvailable={totalAvailable}
        withdrawalAmount={withdrawalAmount}
        setWithdrawalAmount={setWithdrawalAmount}
        pixKey={pixKey}
        setPixKey={setPixKey}
        pixKeyType={pixKeyType}
        setPixKeyType={setPixKeyType}
        isProcessingWithdrawal={isProcessingWithdrawal}
        onSubmit={handleWithdrawalSubmit}
      />

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
            src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
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
      'licenciado_catalogo': 'um Licenciado Loja Virtual',
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
      'influencer': 'Continue evoluindo! O próximo passo é se tornar Licenciado Loja Virtual e desbloquear ainda mais benefícios.',
      'licenciado_catalogo': 'Você já tem acesso à loja virtual! Cresça sua rede para alcançar os níveis Trainee e Executivo.',
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
      <div className={`min-h-screen ${isSaiDeBaixo ?
        'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900' :
        'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white'}`
      }>
        {/* 🛡️ FASE 4.5 — Hero pública SÓ para visitantes (isLicensee=false).
            Usuário logado (licenciado/admin) vai direto pro Dashboard, sem
            landing de recrutamento em cima. */}
        {!isLicensee && (
        <div className="relative overflow-hidden py-20 px-6">
          <div className={`absolute inset-0 bg-gradient-to-r ${isSaiDeBaixo ?
            'from-red-500/10 to-orange-500/10' :
            'from-green-500/10 to-blue-500/10'}`
          }></div>
          <div className="relative max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>

              <div className={`inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-full border ${isSaiDeBaixo ?
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
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLicensee ?
            <DashboardContent user={currentUser} isAdmin={isAdmin} /> :

            <LandingErrorBoundary>
              <LandingContent
                onRegisterClick={() => setShowLicenseeRegisterModal(true)}
                onLoginClick={() => setShowLoginModal(true)} />
            </LandingErrorBoundary>

          }
        </div>

        {/* 🛡️ FASE 4.5 — Rodapé motivacional também é copy pública. Só para visitantes. */}
        {!isLicensee && (
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
        )}

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

        /* ============================================================
           🛡️ FASE 4.7.2 — CÉDULAS VALORA DO SALDO DISPONÍVEL
           
           Refinamento final:
           • Cédulas caem do TOPO REAL da tela (translates 900–1200px)
           • Posições finais em "leque aberto" (menos embaralhado)
           • Opacidades secundárias elevadas (0.80–0.92) → sempre nítidas
           • Transição suave (0.6s) na troca de destaque
           • Stagger de entrada: 0/350/700/1050/1400ms
           • R$ 200 fica 10s em destaque (gerenciado no React state)
           ============================================================ */

        /* TRANSIÇÃO SUAVE — aplicada em TODAS as .nota-* para que
           opacity/zIndex mudem de forma animada quando o React troca o
           featuredNoteIndex a cada 5-10s. Não afeta os keyframes de
           entrada/float (que usam transform). */
        .nota-transition {
          transition: opacity 0.6s ease-out;
        }

        /* POSIÇÕES FINAIS EM LEQUE ABERTO — R$ 200 domina o centro,
           demais espalhadas no eixo X (menos sobreposição no meio). */

        /* Guardian (R$ 10) — extremo esquerdo, leve inclinação */
        .nota-pos-guardian {
          transform: translate(-46px, -5px) rotate(-14deg);
        }
        /* BackBack (R$ 50) — direita-baixo */
        .nota-pos-backback {
          transform: translate(42px, 11px) rotate(11deg);
        }
        /* Back (R$ 100) — esquerda-baixo, mais pra fora */
        .nota-pos-back {
          transform: translate(-30px, 14px) rotate(-6deg);
        }
        /* Side (R$ 20) — direita-cima */
        .nota-pos-side {
          transform: translate(35px, -11px) rotate(7deg);
        }
        /* Front (R$ 200) — CENTRALIZADA, quase reta, dominante */
        .nota-pos-front {
          transform: translate(0, 0) rotate(2deg);
        }

        /* ENTRADA: cada cédula vem de MUITO longe (topo real da tela),
           rotacionando forte, aterrissa suavemente na posição de leque.
           Duração 2.0–2.4s, stagger 0/350/700/1050/1400ms. */

        .nota-entrance-guardian {
          animation:
            notaEntranceGuardian 2.0s cubic-bezier(0.22, 1, 0.36, 1) 0ms both,
            notaFloatGuardian 3.4s ease-in-out infinite 3000ms;
          will-change: transform;
        }
        .nota-entrance-backback {
          animation:
            notaEntranceBackBack 2.1s cubic-bezier(0.22, 1, 0.36, 1) 350ms both,
            notaFloatBackBack 3.2s ease-in-out infinite 3200ms;
          will-change: transform;
        }
        .nota-entrance-back {
          animation:
            notaEntranceBack 2.2s cubic-bezier(0.22, 1, 0.36, 1) 700ms both,
            notaFloatBack 3.6s ease-in-out infinite 3400ms;
          will-change: transform;
        }
        .nota-entrance-side {
          animation:
            notaEntranceSide 2.0s cubic-bezier(0.22, 1, 0.36, 1) 1050ms both,
            notaFloatSide 3.0s ease-in-out infinite 3600ms;
          will-change: transform;
        }
        .nota-entrance-front {
          animation:
            notaEntranceFront 2.4s cubic-bezier(0.22, 1, 0.36, 1) 1400ms both,
            notaFloatFront 3.8s ease-in-out infinite 3800ms;
          will-change: transform;
        }

        /* Keyframes — cada cédula sai de um ponto distante (topo/cantos
           da viewport) e termina na sua posição final em leque.
           Opacity FINAL sincronizada com a opacity base do inline style. */

        @keyframes notaEntranceGuardian {
          0%   { transform: translate(-900px, -1000px) rotate(-60deg) scale(0.7); opacity: 0; }
          40%  { opacity: 0.80; }
          100% { transform: translate(-46px, -5px) rotate(-14deg) scale(1); opacity: 0.80; }
        }
        @keyframes notaEntranceBackBack {
          0%   { transform: translate(900px, 1000px) rotate(75deg) scale(0.7); opacity: 0; }
          40%  { opacity: 0.82; }
          100% { transform: translate(42px, 11px) rotate(11deg) scale(1); opacity: 0.82; }
        }
        @keyframes notaEntranceBack {
          0%   { transform: translate(-1200px, -800px) rotate(-40deg) scale(0.7); opacity: 0; }
          40%  { opacity: 0.85; }
          100% { transform: translate(-30px, 14px) rotate(-6deg) scale(1); opacity: 0.85; }
        }
        @keyframes notaEntranceSide {
          0%   { transform: translate(1100px, -1100px) rotate(65deg) scale(0.7); opacity: 0; }
          40%  { opacity: 0.90; }
          100% { transform: translate(35px, -11px) rotate(7deg) scale(1); opacity: 0.90; }
        }
        @keyframes notaEntranceFront {
          0%   { transform: translate(-200px, -1200px) rotate(-25deg) scale(0.7); opacity: 0; }
          40%  { opacity: 1; }
          100% { transform: translate(0, 0) rotate(2deg) scale(1); opacity: 1; }
        }

        /* Flutuação individualizada — respira em torno da posição de leque */

        @keyframes notaFloatGuardian {
          0%, 100% { transform: translate(-46px, -5px)  rotate(-14deg); }
          50%      { transform: translate(-46px, -11px) rotate(-14deg); }
        }
        @keyframes notaFloatBackBack {
          0%, 100% { transform: translate(42px, 11px) rotate(11deg); }
          50%      { transform: translate(42px, 5px)  rotate(11deg); }
        }
        @keyframes notaFloatBack {
          0%, 100% { transform: translate(-30px, 14px) rotate(-6deg); }
          50%      { transform: translate(-30px, 8px) rotate(-6deg); }
        }
        @keyframes notaFloatSide {
          0%, 100% { transform: translate(35px, -11px) rotate(7deg); }
          50%      { transform: translate(35px, -17px) rotate(7deg); }
        }
        @keyframes notaFloatFront {
          0%, 100% { transform: translate(0, 0)  rotate(2deg); }
          50%      { transform: translate(0, -5px) rotate(2deg); }
        }

        /* DESTAQUE: cédula em foco brilha e cresce sutilmente */
        .nota-featured {
          filter: drop-shadow(0 20px 40px rgba(29, 178, 74, 0.35)) brightness(1.05);
          animation-play-state: running !important;
          transform-origin: center center;
          zoom: 1.08;
        }
        /* Fallback pra browsers sem 'zoom' (Firefox) */
        @supports not (zoom: 1) {
          .nota-featured {
            outline: 2px solid rgba(29, 178, 74, 0.4);
            outline-offset: 4px;
          }
        }

        /* Acessibilidade */
        @media (prefers-reduced-motion: reduce) {
          .nota-entrance-guardian,
          .nota-entrance-backback,
          .nota-entrance-back,
          .nota-entrance-side,
          .nota-entrance-front {
            animation: none !important;
          }
          .nota-transition {
            transition: none !important;
          }
          .nota-featured {
            filter: none;
            zoom: 1;
            outline: none;
          }
        }
      `}</style>
    </>);

}