import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getPDVData } from '@/functions/getPDVData';
import { pdvAction } from '@/functions/pdvAction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Search, ShoppingCart, Trash2, Plus, Minus,
  ArrowLeft, Package, TrendingUp, Clock, Printer, X, Calendar, FileText, BarChart3
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import DailyRanking from '@/components/pdv/DailyRanking';
import VendedoresDoDia from '@/components/pdv/VendedoresDoDia';
import DailyReportPDF from '@/components/pdv/DailyReportPDF';
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Helper para obter credenciais do admin AppUser para bypassa RLS
const getAdminCredentials = () => {
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      return { app_user_email: user.email, app_user_id: user.id };
    }
  } catch (e) { }
  return {};
};

export default function PDV() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [selectedBank, setSelectedBank] = useState('santander');
  const [boletoData, setBoletoData] = useState({ cliente: '', documento: '', parcelas: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [commissionType, setCommissionType] = useState('percentage');
  const [commissionValue, setCommissionValue] = useState(0);
  const [selectedLicenciante, setSelectedLicenciante] = useState(null);
  const [comissaoLicenciante, setComissaoLicenciante] = useState(0);
  const [tipoComissaoLicenciante, setTipoComissaoLicenciante] = useState('percentage');
  const [autoFilledLicenciante, setAutoFilledLicenciante] = useState(false);
  const [sellerStats, setSellerStats] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [taxSettings, setTaxSettings] = useState(null);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [cashSessions, setCashSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionSales, setSessionSales] = useState([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [currentCashRegister, setCurrentCashRegister] = useState(null);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [showCloseCashModal, setShowCloseCashModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [editSaleData, setEditSaleData] = useState({});
  const [showEditCommissionModal, setShowEditCommissionModal] = useState(false);
  const [editingCommissionSale, setEditingCommissionSale] = useState(null);
  const [editCommissionData, setEditCommissionData] = useState({ commission_amount: 0, commission_type: 'fixed', commission_value: 0 });
  const [searchSale, setSearchSale] = useState('');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [sellersDataForPDF, setSellersDataForPDF] = useState([]);
  const [walletDeposits, setWalletDeposits] = useState([]); // 🆕 Estado para depósitos
  const [dashBankFilter, setDashBankFilter] = useState('todos'); // 🆕 Filtro banco no Dashboard
  const navigate = useNavigate();

  const generateOrderCode = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    return `PED-${date}-${time}`;
  };

  const generateCodesForOldSales = async () => {
    if (!confirm('Gerar códigos para todas as vendas antigas sem código?')) return;

    setIsGeneratingCodes(true);
    try {
      const { data } = await base44.functions.invoke('generateOrderCodes', {});
      alert(`${data.message}\n\nAtualizadas: ${data.updated}\nJá tinham código: ${data.skipped}`);
      await loadAllSales();
      await loadTodaySales();
    } catch (error) {
      console.error('Erro ao gerar códigos:', error);
      alert('❌ Erro ao gerar códigos');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      if (user.role !== 'admin') {
        alert("❌ Acesso negado! Apenas administradores.");
        navigate(createPageUrl('Home'));
      }
    }
    loadProducts();
    loadTaxSettings();
    loadCurrentCashRegister(); // Agora já carrega as vendas automaticamente
    loadSellers();
    loadSalesHistory(); // Carrega histórico de sessões
  }, [navigate]);

  useEffect(() => {
    loadSalesHistory();
    loadAllSales();
  }, []);

  // Sync em tempo real do caixa entre dispositivos
  useEffect(() => {
    const unsubscribe = base44.entities.CashRegister.subscribe((event) => {
      console.log('🔄 CashRegister atualizado em outro dispositivo:', event.type);
      // Recarrega o estado do caixa quando qualquer mudança acontecer
      loadCurrentCashRegister();
      loadSalesHistory();
    });

    return () => unsubscribe();
  }, []);

  const loadAllSales = async () => {
    try {
      const response = await getPDVData({ ...getAdminCredentials(), action: 'sales' });
      const sales = response?.data?.allSales || [];
      const deposits = response?.data?.walletDeposits || [];

      setAllSales(sales);
      // Armazena depósitos no estado global ou processa junto
      setWalletDeposits(deposits);

      // Carrega dados de vendedores para o PDF
      await loadSellersDataForPDF(sales, deposits);
    } catch (error) {
      console.error('Erro ao carregar todas as vendas:', error);
    }
  };

  const loadSellersDataForPDF = async (sales, deposits = []) => {
    try {
      const saleIds = sales.map(s => s.id);
      if (saleIds.length === 0) {
        setSellersDataForPDF([]);
        return;
      }

      const commResponse = await getPDVData({ ...getAdminCredentials(), action: 'commissions' });
      const allCommissions = commResponse?.data?.commissions || [];
      const commissionsForSales = allCommissions.filter(c => saleIds.includes(c.sale_id));

      // Agrupa por venda
      const saleCommissionsMap = {};
      commissionsForSales.forEach(c => {
        if (!saleCommissionsMap[c.sale_id]) {
          saleCommissionsMap[c.sale_id] = [];
        }
        saleCommissionsMap[c.sale_id].push(c);
      });

      // Agrupa por vendedor
      const sellerMap = {};
      const processedSales = new Set();

      commissionsForSales.forEach(commission => {
        if (commission.seller_role === 'licenciante') return;

        const sale = sales.find(s => s.id === commission.sale_id);
        if (!sale) return;

        processedSales.add(sale.id);

        const sellerId = commission.seller_id;
        if (!sellerMap[sellerId]) {
          sellerMap[sellerId] = {
            seller_id: sellerId,
            seller_name: commission.seller_name,
            total_commission: 0,
            sales_count: 0,
            sales: []
          };
        }

        sellerMap[sellerId].total_commission += commission.commission_amount || 0;

        if (!sellerMap[sellerId].sales.find(s => s.id === sale.id)) {
          sellerMap[sellerId].sales.push({
            ...sale,
            seller_commission: commission.commission_amount,
            all_commissions: saleCommissionsMap[sale.id] || []
          });
          sellerMap[sellerId].sales_count += 1;
        }
      });

      setSellersDataForPDF(Object.values(sellerMap));
    } catch (error) {
      console.error('Erro ao carregar dados para PDF:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await getPDVData({ ...getAdminCredentials(), action: 'products' });
      const inStock = response?.data?.products || [];
      setProducts(inStock);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadTodaySales = useCallback(async () => {
    try {
      if (!currentCashRegister) {
        setTodaySales([]);
        return;
      }

      console.log('🔄 Recarregando vendas do caixa atual...');

      const response = await pdvAction({
        ...getAdminCredentials(),
        action: 'getSessionSales',
        opening_time: currentCashRegister.opening_time,
        closing_time: null
      });
      const salesInSession = response?.data?.sales || [];

      console.log(`✅ ${salesInSession.length} vendas no caixa atual`);
      setTodaySales(salesInSession);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  }, [currentCashRegister]);

  const loadTaxSettings = async () => {
    try {
      const response = await getPDVData({ ...getAdminCredentials(), action: 'taxSettings' });
      if (response?.data?.taxSettings) {
        setTaxSettings(response.data.taxSettings);
      } else {
        // Cria configuração padrão se não existir
        const defaultSettings = {
          icms_rate: 18,
          pis_rate: 0.65,
          cofins_rate: 3,
          irpj_rate: 8,
          csll_rate: 2.88,
          iss_rate: 0,
          profit_presumption_rate: 32,
          is_active: true
        };
        const createResp = await pdvAction({ ...getAdminCredentials(), action: 'createTaxSettings', settings_data: defaultSettings });
        setTaxSettings(createResp?.data?.taxSettings || defaultSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar impostos:', error);
    }
  };

  const loadSalesHistory = async () => {
    try {
      console.log('🔍 Carregando sessões de caixa...');

      const response = await getPDVData({ ...getAdminCredentials(), action: 'cashSessions' });
      const closedSessions = response?.data?.cashSessions || [];
      console.log('✅ Total de sessões:', closedSessions.length);

      setCashSessions(closedSessions);
    } catch (error) {
      console.error('❌ Erro ao carregar sessões:', error);
    }
  };

  const loadSessionSales = async (session) => {
    try {
      const response = await pdvAction({
        ...getAdminCredentials(),
        action: 'getSessionSales',
        opening_time: session.opening_time,
        closing_time: session.closing_time
      });
      const salesInSession = response?.data?.sales || [];

      // Recalcula totais reais a partir das vendas encontradas
      // (corrige sessões que foram salvas com totais zerados)
      const recalculated = {
        total_pix: 0,
        total_cash: 0,
        total_debit: 0,
        total_credit: 0,
        total_boleto: 0,
        transactions_count: salesInSession.length,
        total_sales: 0
      };

      salesInSession.forEach(sale => {
        const amount = sale.total_amount || 0;
        recalculated.total_sales += amount;
        if (sale.payment_method === 'PIX') recalculated.total_pix += amount;
        else if (sale.payment_method === 'DINHEIRO') recalculated.total_cash += amount;
        else if (sale.payment_method === 'CARTÃO DÉBITO') recalculated.total_debit += amount;
        else if (sale.payment_method === 'CARTÃO CRÉDITO') recalculated.total_credit += amount;
        else if (sale.payment_method === 'BOLETO PARCELADO') recalculated.total_boleto += amount;
      });

      // Usa totais recalculados se os salvos estiverem zerados
      const enrichedSession = {
        ...session,
        total_sales: (session.total_sales || 0) > 0 ? session.total_sales : recalculated.total_sales,
        total_pix: (session.total_pix || 0) > 0 ? session.total_pix : recalculated.total_pix,
        total_cash: (session.total_cash || 0) > 0 ? session.total_cash : recalculated.total_cash,
        total_debit: (session.total_debit || 0) > 0 ? session.total_debit : recalculated.total_debit,
        total_credit: (session.total_credit || 0) > 0 ? session.total_credit : recalculated.total_credit,
        total_boleto: (session.total_boleto || 0) > 0 ? session.total_boleto : recalculated.total_boleto,
        transactions_count: (session.transactions_count || 0) > 0 ? session.transactions_count : recalculated.transactions_count,
      };

      setSessionSales(salesInSession);
      setSelectedSession(enrichedSession);
      setShowSessionModal(true);
    } catch (error) {
      console.error('❌ Erro ao carregar vendas da sessão:', error);
    }
  };

  const printSessionStatement = () => {
    if (!selectedSession || sessionSales.length === 0) return;

    const statement = `
EXTRATO DE CAIXA
================================
Operador: ${selectedSession.operator_name}
Abertura: ${new Date(selectedSession.opening_time).toLocaleString('pt-BR')}
Fechamento: ${selectedSession.closing_time ? new Date(selectedSession.closing_time).toLocaleString('pt-BR') : '-'}

VENDAS:
${sessionSales.map(sale => `
${new Date(sale.sale_datetime).toLocaleTimeString('pt-BR')} - ${sale.product_description}
Qtd: ${sale.quantity_sold} x R$ ${sale.unit_price.toFixed(2)} = R$ ${sale.total_amount.toFixed(2)}
Pagamento: ${sale.payment_method}
`).join('\n')}

--------------------------------
RESUMO:
PIX: R$ ${selectedSession.total_pix?.toFixed(2) || '0.00'}
Dinheiro: R$ ${selectedSession.total_cash?.toFixed(2) || '0.00'}
Débito: R$ ${selectedSession.total_debit?.toFixed(2) || '0.00'}
Crédito: R$ ${selectedSession.total_credit?.toFixed(2) || '0.00'}
Boleto: R$ ${selectedSession.total_boleto?.toFixed(2) || '0.00'}

TOTAL: R$ ${selectedSession.total_sales?.toFixed(2) || '0.00'}
Transações: ${selectedSession.transactions_count || 0}
================================
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`<pre style="font-family: monospace; font-size: 11px; padding: 20px;">${statement}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  const loadCurrentCashRegister = async () => {
    try {
      const response = await getPDVData({ ...getAdminCredentials(), action: 'cashRegister' });
      const register = response?.data?.currentCashRegister;

      if (register) {
        setCurrentCashRegister(register);
        console.log('✅ Caixa aberto:', register);

        // Carrega vendas deste caixa específico
        const salesResp = await pdvAction({
          ...getAdminCredentials(),
          action: 'getSessionSales',
          opening_time: register.opening_time,
          closing_time: null
        });
        const salesInSession = salesResp?.data?.sales || [];

        console.log(`✅ ${salesInSession.length} vendas carregadas do caixa atual`);
        setTodaySales(salesInSession);
      } else {
        setCurrentCashRegister(null);
        setTodaySales([]);
      }
    } catch (error) {
      console.error('Erro ao carregar caixa:', error);
    }
  };

  const loadSellers = async () => {
    try {
      const response = await getPDVData({ ...getAdminCredentials(), action: 'sellers' });
      setSellers(response?.data?.sellers || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  // 🆕 Função para auto-preencher licenciante quando vendedor é selecionado
  const handleSellerChange = async (sellerId) => {
    setSelectedSeller(sellerId);

    if (!sellerId) {
      setSelectedLicenciante(null);
      setComissaoLicenciante(0);
      setAutoFilledLicenciante(false);
      return;
    }

    // Busca dados do vendedor selecionado
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller) return;

    // Define comissão padrão do licenciado
    if (seller.default_commission_percentage) {
      setCommissionValue(seller.default_commission_percentage);
    }

    // Auto-preenche licenciante se existir
    if (seller.referred_by_id) {
      const licenciante = sellers.find(s => s.id === seller.referred_by_id);
      if (licenciante) {
        setSelectedLicenciante(seller.referred_by_id);

        // Define comissão padrão do licenciante
        if (seller.default_licenciante_commission_percentage) {
          setComissaoLicenciante(seller.default_licenciante_commission_percentage);
        } else {
          setComissaoLicenciante(0);
        }

        setAutoFilledLicenciante(true);
        console.log(`✅ Licenciante auto-preenchido: ${licenciante.name}`);
      }
    } else {
      setSelectedLicenciante(null);
      setComissaoLicenciante(0);
      setAutoFilledLicenciante(false);
    }
  };

  const loadSellerStats = async () => {
    try {
      const resp = await getPDVData({ ...getAdminCredentials(), action: 'sales' });
      const allSales = resp?.data?.allSales || [];

      const sellerMap = {};
      allSales.forEach(sale => {
        if (!sale.seller_id) return;

        if (!sellerMap[sale.seller_id]) {
          sellerMap[sale.seller_id] = {
            seller_id: sale.seller_id,
            seller_name: sale.seller_name || 'Vendedor',
            total_sales: 0,
            total_commission: 0,
            sales_count: 0,
            sales: []
          };
        }

        sellerMap[sale.seller_id].total_sales += sale.total_amount || 0;
        sellerMap[sale.seller_id].total_commission += sale.commission_amount || 0;
        sellerMap[sale.seller_id].sales_count += 1;
        sellerMap[sale.seller_id].sales.push(sale);
      });

      const stats = Object.values(sellerMap).sort((a, b) => b.total_commission - a.total_commission);
      setSellerStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de vendedores:', error);
    }
  };

  const getBrasiliaTime = () => {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  };

  const openCashRegister = async () => {
    try {
      const response = await pdvAction({
        ...getAdminCredentials(),
        action: 'openCashRegister',
        operator_name: currentUser?.full_name || 'Admin',
        opening_balance: parseFloat(openingBalance) || 0
      });

      setCurrentCashRegister(response?.data?.cashRegister);
      setShowOpenCashModal(false);
      setOpeningBalance(0);
      alert('✅ Caixa aberto com sucesso!');
      setTimeout(() => loadTodaySales(), 500);
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      alert('❌ Erro ao abrir caixa');
    }
  };

  const closeCashRegister = async () => {
    if (!currentCashRegister) return;

    try {
      // Busca vendas da sessão do BACKEND para garantir dados corretos
      let salesForClose = todaySales;
      try {
        const freshSalesResp = await pdvAction({
          ...getAdminCredentials(),
          action: 'getSessionSales',
          opening_time: currentCashRegister.opening_time,
          closing_time: null
        });
        const freshSales = freshSalesResp?.data?.sales || [];
        if (freshSales.length > 0 || todaySales.length === 0) {
          salesForClose = freshSales;
        }
      } catch (e) {
        console.warn('⚠️ Fallback: usando todaySales local para fechar caixa');
      }

      // Calcula totais a partir dos dados do backend
      const totals = {
        total_pix: 0,
        total_cash: 0,
        total_debit: 0,
        total_credit: 0,
        total_boleto: 0,
        transactions_count: salesForClose.length
      };

      salesForClose.forEach(sale => {
        const amount = sale.total_amount || 0;
        if (sale.payment_method === 'PIX') totals.total_pix += amount;
        else if (sale.payment_method === 'DINHEIRO') totals.total_cash += amount;
        else if (sale.payment_method === 'CARTÃO DÉBITO') totals.total_debit += amount;
        else if (sale.payment_method === 'CARTÃO CRÉDITO') totals.total_credit += amount;
        else if (sale.payment_method === 'BOLETO PARCELADO') totals.total_boleto += amount;
      });

      const total_sales = totals.total_pix + totals.total_cash + totals.total_debit + totals.total_credit + totals.total_boleto;

      await pdvAction({
        ...getAdminCredentials(),
        action: 'closeCashRegister',
        register_id: currentCashRegister.id,
        closing_balance: parseFloat(closingBalance) || 0,
        notes: closingNotes,
        totals: { total_sales, ...totals }
      });

      setCurrentCashRegister(null);
      setTodaySales([]);
      setShowCloseCashModal(false);
      setClosingBalance(0);
      setClosingNotes('');
      alert('✅ Caixa fechado com sucesso!');
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      alert('❌ Erro ao fechar caixa');
    }
  };

  const filteredProducts = products.filter(p =>
    !searchTerm ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.lot && p.lot.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, { product, quantity: 1, customPrice: product.selling_price_retail }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.quantity) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const updatePrice = (productId, newPrice) => {
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, customPrice: newPrice }
        : item
    ));
  };

  const cartTotal = cart.reduce((sum, item) =>
    sum + ((item.customPrice || item.product.selling_price_retail) * item.quantity), 0
  );

  // Cálculo de impostos "por dentro" (preço já inclui impostos)
  const calculateTaxes = (totalValue) => {
    if (!taxSettings || !taxSettings.is_active) {
      return {
        icms: 0,
        pis: 0,
        cofins: 0,
        irpj: 0,
        csll: 0,
        iss: 0,
        total: 0,
        netValue: totalValue
      };
    }

    // Cálculo "por dentro" - o preço cheio já inclui os impostos
    const icms = (totalValue * taxSettings.icms_rate) / 100;
    const pis = (totalValue * taxSettings.pis_rate) / 100;
    const cofins = (totalValue * taxSettings.cofins_rate) / 100;
    const iss = (totalValue * taxSettings.iss_rate) / 100;

    // IRPJ e CSLL calculados sobre a presunção de lucro
    const presumedProfit = (totalValue * taxSettings.profit_presumption_rate) / 100;
    const irpj = (presumedProfit * taxSettings.irpj_rate) / 100;
    const csll = (presumedProfit * taxSettings.csll_rate) / 100;

    const totalTaxes = icms + pis + cofins + irpj + csll + iss;
    const netValue = totalValue - totalTaxes;

    return {
      icms,
      pis,
      cofins,
      irpj,
      csll,
      iss,
      total: totalTaxes,
      netValue,
      presumedProfit
    };
  };

  const taxes = calculateTaxes(cartTotal);

  // Calcula comissão do licenciado (vendedor principal)
  const commissionLicenciado = React.useMemo(() => {
    if (!selectedSeller || commissionValue === 0) return 0;
    return commissionType === 'percentage'
      ? (cartTotal * commissionValue) / 100
      : commissionValue;
  }, [selectedSeller, commissionType, commissionValue, cartTotal]);

  // Calcula comissão do licenciante (segundo vendedor)
  const commissionLicencianteCalc = React.useMemo(() => {
    if (!selectedLicenciante || comissaoLicenciante === 0) return 0;
    return tipoComissaoLicenciante === 'percentage'
      ? (cartTotal * comissaoLicenciante) / 100
      : comissaoLicenciante;
  }, [selectedLicenciante, tipoComissaoLicenciante, comissaoLicenciante, cartTotal]);

  // Total de comissões
  const totalCommission = commissionLicenciado + commissionLicencianteCalc;

  // Calcula valor líquido (total - impostos - comissão)
  const netAmount = cartTotal - taxes.total - totalCommission;

  const finalizeSale = async () => {
    if (cart.length === 0) {
      alert('❌ Carrinho vazio!');
      return;
    }

    if (!currentCashRegister) {
      alert('❌ Caixa não está aberto! Abra o caixa primeiro.');
      return;
    }

    const confirmMsg = paymentMethod === 'BOLETO PARCELADO'
      ? `Confirmar venda de R$ ${cartTotal.toFixed(2)} via BOLETO PARCELADO?\n\nCliente: ${boletoData.cliente}\nDoc: ${boletoData.documento}\nParcelas: ${boletoData.parcelas}x de R$ ${(cartTotal / boletoData.parcelas).toFixed(2)}`
      : `Confirmar venda de R$ ${cartTotal.toFixed(2)} via ${paymentMethod}?`;

    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const saleDate = new Date().toISOString().split('T')[0];
      const saleDatetime = new Date().toISOString();

      for (const item of cart) {
        const product = item.product;
        const qtdVendida = item.quantity;
        const newQuantity = product.quantity - qtdVendida;
        const precoUnitario = item.customPrice || product.selling_price_retail;
        const valorVenda = precoUnitario * qtdVendida;

        // 🔥 CÁLCULO CORRETO DO CUSTO UNITÁRIO
        const quantidadeTotal = product.quantity + (product.quantity_sold || 0);
        const custoUnitario = quantidadeTotal > 0 ? (product.cost_price || 0) / quantidadeTotal : 0;

        // Atualiza valores acumulados
        const novoSoldAmount = (product.sold_amount || 0) + valorVenda;
        const novaQuantidadeVendida = (product.quantity_sold || 0) + qtdVendida;
        const novoLucroTotal = novoSoldAmount - (custoUnitario * novaQuantidadeVendida);

        // Calcula comissões do item
        const comissaoLicenciadoItem = selectedSeller && commissionValue > 0
          ? (commissionType === 'percentage'
            ? (valorVenda * commissionValue) / 100
            : commissionValue)
          : 0;

        const comissaoLicencianteItem = selectedLicenciante && comissaoLicenciante > 0
          ? (tipoComissaoLicenciante === 'percentage'
            ? (valorVenda * comissaoLicenciante) / 100
            : comissaoLicenciante)
          : 0;

        const totalItemCommission = comissaoLicenciadoItem + comissaoLicencianteItem;

        // Calcula impostos proporcionais para este item
        const itemTaxes = calculateTaxes(valorVenda);
        const itemNetAmount = valorVenda - itemTaxes.total - totalItemCommission;

        // 🆕 REGISTRA A VENDA NA ENTIDADE SALE
        const orderCode = generateOrderCode();

        const sellerData = selectedSeller ? sellers.find(s => s.id === selectedSeller) : null;

        const saleResp = await pdvAction({
          ...getAdminCredentials(), action: 'createSale', sale_data: {
            order_code: orderCode,
            product_id: product.id,
            product_description: product.description,
            product_lot: product.lot || 'N/A',
            quantity_sold: qtdVendida,
            unit_price: precoUnitario,
            total_amount: valorVenda,
            total_taxes: itemTaxes.total,
            net_amount: itemNetAmount,
            payment_method: paymentMethod,
            sale_date: saleDate,
            sale_datetime: saleDatetime,
            operator_name: currentUser?.full_name || 'Admin',
            seller_id: selectedSeller || null,
            seller_name: sellerData?.name || null,
            commission_type: commissionType,
            commission_value: commissionValue,
            commission_amount: totalItemCommission,
            boleto_cliente: paymentMethod === 'BOLETO PARCELADO' ? boletoData.cliente : null,
            boleto_documento: paymentMethod === 'BOLETO PARCELADO' ? boletoData.documento : null,
            boleto_parcelas: paymentMethod === 'BOLETO PARCELADO' ? boletoData.parcelas : null,
            receiving_bank: selectedBank
          }
        });

        const saleRecord = saleResp?.data?.sale;

        // 🆕 Registra comissão do licenciado
        if (selectedSeller && comissaoLicenciadoItem > 0 && saleRecord) {
          await pdvAction({
            ...getAdminCredentials(), action: 'createSaleCommission', commission_data: {
              sale_id: saleRecord.id,
              seller_id: selectedSeller,
              seller_name: sellerData?.name || 'Vendedor',
              commission_type: commissionType,
              commission_value: commissionValue,
              commission_amount: comissaoLicenciadoItem,
              seller_role: 'licenciado'
            }
          });

          console.log(`✅ Comissão licenciado: ${sellerData?.name} - R$ ${comissaoLicenciadoItem.toFixed(2)}`);
        }

        // 🆕 Registra comissão do licenciante
        if (selectedLicenciante && comissaoLicencianteItem > 0 && saleRecord) {
          const licencianteData = sellers.find(s => s.id === selectedLicenciante);
          await pdvAction({
            ...getAdminCredentials(), action: 'createSaleCommission', commission_data: {
              sale_id: saleRecord.id,
              seller_id: selectedLicenciante,
              seller_name: licencianteData?.name || 'Licenciante',
              commission_type: tipoComissaoLicenciante,
              commission_value: comissaoLicenciante,
              commission_amount: comissaoLicencianteItem,
              seller_role: 'licenciante'
            }
          });

          console.log(`✅ Comissão licenciante: ${licencianteData?.name} - R$ ${comissaoLicencianteItem.toFixed(2)}`);
        }

        // Atualiza produto
        await pdvAction({
          ...getAdminCredentials(), action: 'updateProduct', product_id: product.id, product_data: {
            quantity: newQuantity,
            quantity_sold: novaQuantidadeVendida,
            status: newQuantity > 0 ? 'ESTOQUE' : `VENDIDO ${paymentMethod}`,
            sold_amount: novoSoldAmount,
            profit: novoLucroTotal
          }
        });

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const successMsg = paymentMethod === 'BOLETO PARCELADO'
        ? `✅ Venda finalizada!\n\nTotal: R$ ${cartTotal.toFixed(2)}\nCliente: ${boletoData.cliente}\n${boletoData.parcelas}x de R$ ${(cartTotal / boletoData.parcelas).toFixed(2)}`
        : `✅ Venda finalizada! Total: R$ ${cartTotal.toFixed(2)}`;

      alert(successMsg);

      // Limpa TODOS os caches
      sessionStorage.removeItem('products_cache');
      sessionStorage.removeItem('products_cache_time');
      sessionStorage.removeItem('sales_cache');

      setCart([]);
      setBoletoData({ cliente: '', documento: '', parcelas: 1 });
      setSelectedBank('santander');
      setSelectedSeller(null);
      setCommissionValue(0);
      setSelectedLicenciante(null);
      setComissaoLicenciante(0);

      // Recarrega tudo com delay para garantir sincronização
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProducts();
      await loadTodaySales();
      await loadSalesHistory();
      await loadAllSales();
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      alert('❌ Erro ao finalizar venda');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    const boletoInfo = paymentMethod === 'BOLETO PARCELADO' ? `
Cliente: ${boletoData.cliente}
Documento: ${boletoData.documento}
Parcelas: ${boletoData.parcelas}x de R$ ${(cartTotal / boletoData.parcelas).toFixed(2)}
` : '';

    const sellerInfo = selectedSeller ? `
VENDEDOR: ${sellers.find(s => s.id === selectedSeller)?.name || 'Vendedor'}
Comissão: ${commissionType === 'percentage' ? commissionValue + '%' : 'R$ ' + commissionValue.toFixed(2)} = R$ ${totalCommission.toFixed(2)}
` : '';

    const taxInfo = taxSettings && taxSettings.is_active ? `
IMPOSTOS (Lucro Presumido):
ICMS (${taxSettings.icms_rate}%): R$ ${taxes.icms.toFixed(2)}
PIS (${taxSettings.pis_rate}%): R$ ${taxes.pis.toFixed(2)}
COFINS (${taxSettings.cofins_rate}%): R$ ${taxes.cofins.toFixed(2)}
IRPJ (${taxSettings.irpj_rate}%): R$ ${taxes.irpj.toFixed(2)}
CSLL (${taxSettings.csll_rate}%): R$ ${taxes.csll.toFixed(2)}
${taxSettings.iss_rate > 0 ? `ISS (${taxSettings.iss_rate}%): R$ ${taxes.iss.toFixed(2)}\n` : ''}
Total Impostos: R$ ${taxes.total.toFixed(2)}
` : '';

    const commissionInfo = totalCommission > 0 ? `
COMISSÃO:
Valor da Comissão: R$ ${totalCommission.toFixed(2)}
` : '';

    const totalDeductions = (taxInfo ? taxes.total : 0) + (commissionInfo ? totalCommission : 0);
    const deductionsInfo = totalDeductions > 0 ? `
DESCONTOS:
${taxInfo ? `  Impostos: -R$ ${taxes.total.toFixed(2)}\n` : ''}${commissionInfo ? `  Comissão: -R$ ${totalCommission.toFixed(2)}\n` : ''}  TOTAL DESCONTOS: -R$ ${totalDeductions.toFixed(2)}
` : '';

    const receipt = `
LEILÃO NOZAP - PDV
================================
Data: ${new Date().toLocaleString('pt-BR')}
Operador: ${currentUser?.full_name || 'Admin'}

PRODUTOS:
      ${cart.map(item => `
      ${item.product.description}
      Qtd: ${item.quantity} x R$ ${(item.customPrice || item.product.selling_price_retail).toFixed(2)}
      Total: R$ ${((item.customPrice || item.product.selling_price_retail) * item.quantity).toFixed(2)}
      `).join('\n')}

--------------------------------
${taxInfo}${taxInfo && commissionInfo ? '--------------------------------\n' : ''}${commissionInfo}--------------------------------
TOTAL: R$ ${cartTotal.toFixed(2)}
${deductionsInfo}VALOR LÍQUIDO: R$ ${netAmount.toFixed(2)}

Pagamento: ${paymentMethod}
${boletoInfo}================================
    `;

    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(`<pre style="font-family: monospace; font-size: 12px;">${receipt}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  const todayTotal = todaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const todayCount = todaySales.reduce((sum, sale) => sum + (sale.quantity_sold || 0), 0);

  const exportSalesReport = () => {
    if (salesHistory.length === 0) {
      alert('Nenhuma venda encontrada para esta data');
      return;
    }

    const headers = ['Data', 'Horário', 'Produto', 'Lote', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Pagamento', 'Operador'];
    const rows = salesHistory.map(sale => [
      new Date(sale.sale_datetime).toLocaleDateString('pt-BR'),
      new Date(sale.sale_datetime).toLocaleTimeString('pt-BR'),
      sale.product_description,
      sale.product_lot,
      sale.quantity_sold,
      `R$ ${sale.unit_price.toFixed(2)}`,
      `R$ ${sale.total_amount.toFixed(2)}`,
      sale.payment_method,
      sale.operator_name
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✅ ${salesHistory.length} vendas exportadas!`);
  };

  const totalSalesForDate = salesHistory.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setEditSaleData({
      quantity_sold: sale.quantity_sold,
      unit_price: sale.unit_price,
      payment_method: sale.payment_method,
      boleto_cliente: sale.boleto_cliente || '',
      boleto_documento: sale.boleto_documento || '',
      boleto_parcelas: sale.boleto_parcelas || 1
    });
    setShowEditSaleModal(true);
  };

  const handleEditCommission = (sale) => {
    setEditingCommissionSale(sale);
    setEditCommissionData({
      commission_amount: sale.commission_amount || 0,
      commission_type: sale.commission_type || 'fixed',
      commission_value: sale.commission_value || 0
    });
    setShowEditCommissionModal(true);
  };

  const saveEditedCommission = async () => {
    if (!editingCommissionSale) return;

    try {
      await pdvAction({
        ...getAdminCredentials(), action: 'updateSale', sale_id: editingCommissionSale.id, sale_data: {
          commission_amount: parseFloat(editCommissionData.commission_amount),
          commission_type: editCommissionData.commission_type,
          commission_value: parseFloat(editCommissionData.commission_value)
        }
      });

      alert('✅ Comissão atualizada com sucesso!');
      setShowEditCommissionModal(false);
      setEditingCommissionSale(null);
      await loadAllSales();
    } catch (error) {
      console.error('Erro ao editar comissão:', error);
      alert('❌ Erro ao editar comissão');
    }
  };

  const saveEditedSale = async () => {
    if (!editingSale) return;

    try {
      const newTotalAmount = editSaleData.quantity_sold * editSaleData.unit_price;
      const itemTaxes = calculateTaxes(newTotalAmount);

      await pdvAction({
        ...getAdminCredentials(), action: 'updateSale', sale_id: editingSale.id, sale_data: {
          quantity_sold: parseInt(editSaleData.quantity_sold),
          unit_price: parseFloat(editSaleData.unit_price),
          total_amount: newTotalAmount,
          total_taxes: itemTaxes.total,
          net_amount: newTotalAmount - itemTaxes.total,
          payment_method: editSaleData.payment_method,
          boleto_cliente: editSaleData.payment_method === 'BOLETO PARCELADO' ? editSaleData.boleto_cliente : null,
          boleto_documento: editSaleData.payment_method === 'BOLETO PARCELADO' ? editSaleData.boleto_documento : null,
          boleto_parcelas: editSaleData.payment_method === 'BOLETO PARCELADO' ? editSaleData.boleto_parcelas : null
        }
      });

      alert('✅ Venda atualizada com sucesso!');
      setShowEditSaleModal(false);
      setEditingSale(null);
      await loadTodaySales();
      await loadAllSales();
    } catch (error) {
      console.error('Erro ao editar venda:', error);
      alert('❌ Erro ao editar venda');
    }
  };

  const cancelSale = async (sale) => {
    if (!confirm(`⚠️ Cancelar venda de ${sale.product_description}?\n\nIsso reverterá:\n- Quantidade ao estoque\n- Comissões\n- Impostos registrados`)) return;

    try {
      // 2️⃣ Busca o produto original (Product tem RLS read: null, então funciona)
      const prodResp = await getPDVData({ ...getAdminCredentials(), action: 'products' });
      const allProds = prodResp?.data?.products || [];
      const targetProduct = allProds.find(p => p.id === sale.product_id);

      if (!targetProduct) {
        alert('❌ Produto não encontrado');
        return;
      }

      // 3️⃣ Restaura o estoque
      const restoredQuantity = (targetProduct.quantity || 0) + (sale.quantity_sold || 0);
      const restoredSoldAmount = Math.max(0, (targetProduct.sold_amount || 0) - (sale.total_amount || 0));
      const restoredProfit = restoredSoldAmount - ((targetProduct.cost_price || 0) * ((targetProduct.quantity_sold || 0) - (sale.quantity_sold || 0)));

      await pdvAction({
        ...getAdminCredentials(), action: 'updateProduct', product_id: sale.product_id, product_data: {
          quantity: restoredQuantity,
          quantity_sold: Math.max(0, (targetProduct.quantity_sold || 0) - (sale.quantity_sold || 0)),
          status: 'ESTOQUE',
          sold_amount: restoredSoldAmount,
          profit: restoredProfit
        }
      });

      // 4️⃣ Deleta a venda e comissões
      await pdvAction({ ...getAdminCredentials(), action: 'deleteSale', sale_id: sale.id });

      alert('✅ Venda cancelada! Produto retornou ao estoque e comissões foram revertidas.');
      await loadTodaySales();
      await loadAllSales();
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      alert('❌ Erro ao cancelar venda');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER VERDE NOZAP */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("ProductManagement"))}
              className="text-white hover:bg-green-800/50 px-2 sm:px-4"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold">💰 PDV</h1>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm opacity-90">Operador: {currentUser?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-3 sm:p-6">

        {/* STATUS DO CAIXA */}
        <Card className={`mb-4 sm:mb-6 ${currentCashRegister ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${currentCashRegister ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {currentCashRegister ? '🟢 Caixa Aberto' : '🔴 Caixa Fechado'}
                  </p>
                  {currentCashRegister && (
                    <p className="text-sm text-gray-600">
                      Aberto às {new Date(currentCashRegister.opening_time).toLocaleTimeString('pt-BR')} por {currentCashRegister.operator_name}
                    </p>
                  )}
                  {!currentCashRegister && (
                    <p className="text-xs text-gray-600 mt-1">
                      Abra o caixa manualmente para iniciar as vendas
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!currentCashRegister ? (
                  <Button
                    onClick={() => setShowOpenCashModal(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Abrir Caixa
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowCloseCashModal(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Fechar Caixa
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BARRA DE BUSCA */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Pesquisar produto, código de barras, lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RESUMO DO DIA - TEMA NOZAP */}
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Vendas Hoje</p>
                        <p className="text-2xl font-bold text-white">{todaySales.length}</p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-blue-500/50">
                <p className="font-semibold text-blue-400 mb-2">📊 Vendas Hoje</p>
                <p className="text-sm text-gray-300">Total de transações realizadas no caixa atual.</p>
                <p className="text-xs text-gray-400 mt-2">Cada venda representa uma transação completa registrada no sistema.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Produtos Vendidos</p>
                        <p className="text-2xl font-bold text-white">{todayCount}</p>
                      </div>
                      <Package className="w-8 h-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-purple-500/50">
                <p className="font-semibold text-purple-400 mb-2">📦 Produtos Vendidos</p>
                <p className="text-sm text-gray-300">Quantidade total de unidades vendidas no caixa atual.</p>
                <p className="text-xs text-gray-400 mt-2">Soma de todas as quantidades de produtos vendidos nas transações de hoje.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Faturamento Hoje</p>
                        <p className="text-2xl font-bold text-green-400">
                          R$ {todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-green-500/50">
                <p className="font-semibold text-green-400 mb-2">💰 Faturamento Hoje</p>
                <p className="text-sm text-gray-300">Valor total de todas as vendas realizadas no caixa atual.</p>
                <div className="text-xs text-gray-400 mt-2 space-y-1">
                  <p>• PIX: R$ {todaySales.filter(s => s.payment_method === 'PIX').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
                  <p>• Dinheiro: R$ {todaySales.filter(s => s.payment_method === 'DINHEIRO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
                  <p>• Cartões: R$ {todaySales.filter(s => s.payment_method === 'CARTÃO DÉBITO' || s.payment_method === 'CARTÃO CRÉDITO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
                  <p>• Boleto: R$ {todaySales.filter(s => s.payment_method === 'BOLETO PARCELADO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}</p>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help hover:bg-gray-700/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">A Receber (Boleto)</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          R$ {todaySales
                            .filter(s => s.payment_method === 'BOLETO PARCELADO')
                            .reduce((sum, s) => sum + (s.total_amount || 0), 0)
                            .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-yellow-500/50">
                <p className="font-semibold text-yellow-400 mb-2">📄 A Receber (Boleto Parcelado)</p>
                <p className="text-sm text-gray-300">Total de vendas parceladas via boleto pendentes de recebimento.</p>
                <div className="text-xs text-gray-400 mt-2">
                  <p>• {todaySales.filter(s => s.payment_method === 'BOLETO PARCELADO').length} vendas parceladas</p>
                  <p>• Valores a receber conforme vencimento das parcelas</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* TABS - TEMA NOZAP */}
        <Tabs defaultValue="pdv" className="mb-4 sm:mb-6">
          <TabsList className="bg-white border border-gray-200 w-full flex overflow-x-auto">
            <TabsTrigger value="pdv" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-700 flex-1 text-xs sm:text-sm whitespace-nowrap">
              🛒 Vendas
            </TabsTrigger>
            <TabsTrigger value="extrato" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 flex-1 text-xs sm:text-sm whitespace-nowrap">
              📊 Extrato
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700 flex-1 text-xs sm:text-sm whitespace-nowrap">
              📈 Dashboard
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-700 flex-1 text-xs sm:text-sm whitespace-nowrap">
              👥 Vendedores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdv" className="mt-6">
            {!currentCashRegister && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center mb-6">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-red-900 mb-2">Caixa Fechado</h3>
                <p className="text-red-700 mb-4">Abra o caixa para iniciar as vendas</p>
                <Button
                  onClick={() => setShowOpenCashModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Abrir Caixa Agora
                </Button>
              </div>
            )}

            {/* ÁREA PRINCIPAL - LAYOUT HORIZONTAL */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${!currentCashRegister ? 'opacity-50 pointer-events-none' : ''}`}>

              {/* LISTA DE PRODUTOS - FUNDO BRANCO */}
              <div className="lg:col-span-2">
                <Card className="bg-white border-gray-200 shadow-lg">
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-gray-900 text-lg">Lista de Produtos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="text-sm text-gray-700">
                            <th className="text-left p-3 font-semibold">Código/SKU</th>
                            <th className="text-left p-3 font-semibold">Produto</th>
                            <th className="text-center p-3 font-semibold">Estoque</th>
                            <th className="text-right p-3 font-semibold">Preço</th>
                            <th className="text-center p-3 font-semibold">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map((product, index) => (
                            <tr
                              key={product.id}
                              className={`border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                              onClick={() => addToCart(product)}
                            >
                              <td className="p-3 text-sm text-gray-900 font-medium">{product.lot || 'N/A'}</td>
                              <td className="p-3 text-sm text-gray-900">{product.description}</td>
                              <td className="p-3 text-center">
                                <Badge className="bg-blue-100 text-blue-800 border-0">
                                  {product.quantity}
                                </Badge>
                              </td>
                              <td className="p-3 text-right text-green-600 font-bold">
                                R$ {product.selling_price_retail?.toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product);
                                  }}
                                  disabled={!currentCashRegister}
                                  className="bg-green-600 hover:bg-green-700 h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredProducts.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum produto encontrado</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* CARRINHO - FUNDO BRANCO */}
              <div>
                <Card className="bg-white border-gray-200 shadow-lg sticky top-6">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-900 flex items-center gap-2 text-lg">
                        <ShoppingCart className="w-5 h-5" />
                        Carrinho ({cart.length})
                      </CardTitle>
                      {cart.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCart([])}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">

                    {/* VENDEDORES E COMISSÕES */}
                    {cart.length > 0 && (
                      <div className="space-y-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-bold text-gray-900 mb-2">👥 Vendedores e Comissões</h3>

                        {/* LICENCIADO (Vendedor Principal) */}
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Licenciado (Vendedor)</p>
                          <div className="space-y-2">
                            <div>
                              <label className="text-gray-700 text-xs mb-1 block font-medium">Vendedor</label>
                              <select
                                value={selectedSeller || ''}
                                onChange={(e) => handleSellerChange(e.target.value || null)}
                                className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm"
                              >
                                <option value="">Sem vendedor</option>
                                {sellers.map(seller => (
                                  <option key={seller.id} value={seller.id}>
                                    {seller.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {selectedSeller && (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-gray-700 text-xs mb-1 block font-medium">Tipo</label>
                                    <select
                                      value={commissionType}
                                      onChange={(e) => setCommissionType(e.target.value)}
                                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm"
                                    >
                                      <option value="percentage">%</option>
                                      <option value="fixed">R$</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-gray-700 text-xs mb-1 block font-medium">Valor</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={commissionValue}
                                      onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                                      className="bg-white text-gray-900 border-gray-300 h-9"
                                      placeholder={commissionType === 'percentage' ? '10' : '50.00'}
                                    />
                                  </div>
                                </div>
                                {commissionValue > 0 && (
                                  <div className="bg-green-100 rounded p-2 text-xs font-bold text-green-900">
                                    💰 Comissão Licenciado: R$ {commissionLicenciado.toFixed(2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* LICENCIANTE (Segundo Vendedor) */}
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-purple-700">Licenciante (Indicador)</p>
                            {autoFilledLicenciante && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                ✓ Auto
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-gray-700 text-xs mb-1 block font-medium">Licenciante</label>
                              <select
                                value={selectedLicenciante || ''}
                                onChange={(e) => setSelectedLicenciante(e.target.value || null)}
                                className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm"
                              >
                                <option value="">Sem licenciante</option>
                                {sellers.filter(s => s.id !== selectedSeller).map(seller => (
                                  <option key={seller.id} value={seller.id}>
                                    {seller.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {selectedLicenciante && (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-gray-700 text-xs mb-1 block font-medium">Tipo</label>
                                    <select
                                      value={tipoComissaoLicenciante}
                                      onChange={(e) => setTipoComissaoLicenciante(e.target.value)}
                                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm"
                                    >
                                      <option value="percentage">%</option>
                                      <option value="fixed">R$</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-gray-700 text-xs mb-1 block font-medium">Valor</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={comissaoLicenciante}
                                      onChange={(e) => setComissaoLicenciante(parseFloat(e.target.value) || 0)}
                                      className="bg-white text-gray-900 border-gray-300 h-9"
                                      placeholder={tipoComissaoLicenciante === 'percentage' ? '5' : '25.00'}
                                    />
                                  </div>
                                </div>
                                {comissaoLicenciante > 0 && (
                                  <div className="bg-purple-100 rounded p-2 text-xs font-bold text-purple-900">
                                    💰 Comissão Licenciante: R$ {commissionLicencianteCalc.toFixed(2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* TOTAL DE COMISSÕES */}
                        {totalCommission > 0 && (
                          <div className="bg-orange-100 rounded p-2 text-sm font-bold text-orange-900">
                            💰 Total Comissões: R$ {totalCommission.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ITENS DO CARRINHO - FUNDO BRANCO */}
                    <div className="max-h-[250px] overflow-y-auto border border-gray-200 rounded">
                      {cart.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-xs text-gray-700">
                              <th className="text-left p-2">Produto</th>
                              <th className="text-center p-2">Qtd</th>
                              <th className="text-right p-2">Valor</th>
                              <th className="text-right p-2">Total</th>
                              <th className="text-center p-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {cart.map(item => (
                              <tr key={item.product.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-2 text-gray-900 text-xs">{item.product.description}</td>
                                <td className="p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => updateQuantity(item.product.id, -1)}
                                      className="text-gray-600 hover:text-gray-900 p-1"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-gray-900 font-bold w-6 text-center">{item.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(item.product.id, 1)}
                                      className="text-gray-600 hover:text-gray-900 p-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.customPrice || item.product.selling_price_retail}
                                    onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                                    className="h-7 text-xs text-right w-20 bg-white border-gray-300 text-gray-900"
                                  />
                                </td>
                                <td className="p-2 text-right text-green-600 font-bold text-xs">
                                  R$ {((item.customPrice || item.product.selling_price_retail) * item.quantity).toFixed(2)}
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFromCart(item.product.id)}
                                    className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Carrinho vazio</p>
                        </div>
                      )}
                    </div>

                    {/* FORMA DE PAGAMENTO */}
                    {cart.length > 0 && (
                      <>
                        <div>
                          <label className="text-gray-700 text-sm mb-2 block font-medium">Forma de Pagamento</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => {
                              setPaymentMethod(e.target.value);
                              if (e.target.value !== 'BOLETO PARCELADO') {
                                setBoletoData({ cliente: '', documento: '', parcelas: 1 });
                              }
                            }}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option>PIX</option>
                            <option>DINHEIRO</option>
                            <option>CARTÃO DÉBITO</option>
                            <option>CARTÃO CRÉDITO</option>
                            <option>BOLETO PARCELADO</option>
                          </select>
                        </div>

                        {/* BANCO DESTINO */}
                        <div>
                          <label className="text-gray-700 text-sm mb-2 block font-medium">🏦 Banco Destino</label>
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="santander">🔴 Santander (Venda de Produtos Físicos)</option>
                            <option value="itau">🟠 Itaú (Venda de Licenciados)</option>
                            <option value="nubank">🟣 Nubank (Parceiros de Compras)</option>
                          </select>
                        </div>

                        {/* CAMPOS BOLETO */}
                        {paymentMethod === 'BOLETO PARCELADO' && (
                          <div className="space-y-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div>
                              <label className="text-gray-700 text-xs mb-1 block">Nome do Cliente</label>
                              <Input
                                value={boletoData.cliente}
                                onChange={(e) => setBoletoData({ ...boletoData, cliente: e.target.value })}
                                className="h-9"
                                placeholder="Nome completo"
                              />
                            </div>
                            <div>
                              <label className="text-gray-700 text-xs mb-1 block">Documento (CPF/RG)</label>
                              <Input
                                value={boletoData.documento}
                                onChange={(e) => setBoletoData({ ...boletoData, documento: e.target.value })}
                                className="h-9"
                                placeholder="000.000.000-00"
                              />
                            </div>
                            <div>
                              <label className="text-gray-700 text-xs mb-1 block">Número de Parcelas</label>
                              <Input
                                type="number"
                                min="1"
                                value={boletoData.parcelas}
                                onChange={(e) => setBoletoData({ ...boletoData, parcelas: parseInt(e.target.value) || 1 })}
                                className="h-9"
                                placeholder="1"
                              />
                            </div>
                            <div className="bg-blue-100 rounded p-2 text-xs text-blue-900 font-medium">
                              💰 Valor da parcela: R$ {(cartTotal / boletoData.parcelas).toFixed(2)}
                            </div>
                          </div>
                        )}

                        {/* TOTAL */}
                        <div className="border-t border-gray-200 pt-3">
                          {taxSettings && taxSettings.is_active && showTaxDetails && (
                            <div className="bg-gray-50 rounded p-2 mb-2 space-y-1 text-xs">
                              <div className="flex justify-between text-gray-600">
                                <span>ICMS ({taxSettings.icms_rate}%):</span>
                                <span className="text-red-600">-R$ {taxes.icms.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>PIS ({taxSettings.pis_rate}%):</span>
                                <span className="text-red-600">-R$ {taxes.pis.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>COFINS ({taxSettings.cofins_rate}%):</span>
                                <span className="text-red-600">-R$ {taxes.cofins.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>IRPJ ({taxSettings.irpj_rate}%):</span>
                                <span className="text-red-600">-R$ {taxes.irpj.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>CSLL ({taxSettings.csll_rate}%):</span>
                                <span className="text-red-600">-R$ {taxes.csll.toFixed(2)}</span>
                              </div>
                              {taxSettings.iss_rate > 0 && (
                                <div className="flex justify-between text-gray-600">
                                  <span>ISS ({taxSettings.iss_rate}%):</span>
                                  <span className="text-red-600">-R$ {taxes.iss.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                                <span>Total Impostos:</span>
                                <span className="text-red-600">-R$ {taxes.total.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-green-600 pt-1 border-t border-gray-200">
                                <span>Valor Líquido:</span>
                                <span>R$ {taxes.netValue.toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          {taxSettings && taxSettings.is_active && (
                            <button
                              onClick={() => setShowTaxDetails(!showTaxDetails)}
                              className="text-xs text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
                            >
                              {showTaxDetails ? '▼' : '▶'} {showTaxDetails ? 'Ocultar' : 'Ver'} impostos
                            </button>
                          )}

                          <div className="space-y-2">
                            <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700 font-medium text-sm">TOTAL:</span>
                                <span className="text-gray-900 text-xl font-bold">
                                  R$ {cartTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {(taxes.total > 0 || totalCommission > 0) && (
                              <>
                                <div className="text-xs space-y-1 px-1">
                                  {taxes.total > 0 && (
                                    <div className="flex justify-between text-red-600">
                                      <span>(-) Impostos:</span>
                                      <span className="font-semibold">-R$ {taxes.total.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {totalCommission > 0 && (
                                    <div className="flex justify-between text-orange-600">
                                      <span>(-) Comissão:</span>
                                      <span className="font-semibold">-R$ {totalCommission.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-600">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-900 font-semibold text-sm">VALOR LÍQUIDO:</span>
                                    <span className="text-green-600 text-2xl font-bold">
                                      R$ {netAmount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}

                            {taxes.total === 0 && totalCommission === 0 && (
                              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-600">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-900 font-semibold text-lg">TOTAL:</span>
                                  <span className="text-green-600 text-3xl font-bold">
                                    R$ {cartTotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BOTÕES */}
                        <div className="space-y-2">
                          <Button
                            onClick={finalizeSale}
                            disabled={isProcessing}
                            className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-bold"
                          >
                            {isProcessing ? (
                              <>
                                <Clock className="w-5 h-5 mr-2 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-5 h-5 mr-2" />
                                Finalizar Venda
                              </>
                            )}
                          </Button>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={printReceipt}
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              Imprimir
                            </Button>
                            <Button
                              onClick={() => setCart([])}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="extrato">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    Extrato por Sessões de Caixa
                  </CardTitle>
                  <Button
                    onClick={async () => {
                      if (!confirm('Recalcular totais de todas as sessões com valores zerados?')) return;
                      let fixed = 0;
                      for (const session of cashSessions) {
                        if ((session.total_sales || 0) === 0 && session.closing_time) {
                          try {
                            await pdvAction({
                              ...getAdminCredentials(),
                              action: 'fixSessionTotals',
                              register_id: session.id,
                              opening_time: session.opening_time,
                              closing_time: session.closing_time
                            });
                            fixed++;
                          } catch (e) {
                            console.error('Erro ao corrigir sessão:', session.id, e);
                          }
                        }
                      }
                      alert(`✅ ${fixed} sessões corrigidas!`);
                      await loadSalesHistory();
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-xs"
                  >
                    🔧 Corrigir Totais Zerados
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cashSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma sessão de caixa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cashSessions.map((session) => {
                      // Calcula totais a partir das vendas reais se os salvos estiverem zerados
                      const sessionTotalSales = session.total_sales || 0;
                      const sessionTransactions = session.transactions_count || 0;

                      return (
                        <div
                          key={session.id}
                          onClick={() => loadSessionSales(session)}
                          className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-700/50 cursor-pointer transition-all border border-gray-700 hover:border-gray-600"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                <div>
                                  <p className="text-white font-semibold text-sm sm:text-base">
                                    {new Date(session.opening_time).toLocaleDateString('pt-BR')}
                                  </p>
                                  <p className="text-gray-400 text-xs">
                                    {new Date(session.opening_time).toLocaleTimeString('pt-BR')} - {' '}
                                    {session.closing_time ? new Date(session.closing_time).toLocaleTimeString('pt-BR') : 'Aberto'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                <span className="text-gray-400">
                                  👤 {session.operator_name}
                                </span>
                                <span className="text-gray-400">
                                  📦 {sessionTransactions} vendas
                                </span>
                                {sessionTotalSales === 0 && (
                                  <span className="text-yellow-400 text-xs">
                                    ⚠️ Clique para ver totais reais
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-green-400 font-bold text-lg sm:text-2xl">
                                {sessionTotalSales > 0 
                                  ? `R$ ${sessionTotalSales.toFixed(2)}`
                                  : 'Clique para ver'
                                }
                              </p>
                              <p className="text-xs text-gray-500">Receita total</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* RESUMO GERAL */}
              <div className="space-y-4">
                {/* FILTRO BANCO DESTINO */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <p className="text-gray-300 text-sm font-medium whitespace-nowrap">🏦 Filtrar por Banco:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'todos', label: 'Todos', color: 'bg-gray-600 hover:bg-gray-500' },
                          { value: 'santander', label: '🔴 Santander', color: 'bg-red-700 hover:bg-red-600' },
                          { value: 'itau', label: '🟠 Itaú', color: 'bg-orange-700 hover:bg-orange-600' },
                          { value: 'nubank', label: '🟣 Nubank', color: 'bg-purple-700 hover:bg-purple-600' },
                        ].map(bank => (
                          <Button
                            key={bank.value}
                            size="sm"
                            onClick={() => setDashBankFilter(bank.value)}
                            className={`text-xs text-white ${
                              dashBankFilter === bank.value
                                ? 'ring-2 ring-white ' + bank.color
                                : bank.color + ' opacity-60'
                            }`}
                          >
                            {bank.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CARDS POR BANCO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
                  <Card className="bg-gray-800 border-2 border-red-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-red-400 text-xs mb-1">🔴 Santander</p>
                          <p className="text-xs text-gray-400 mb-2">Produtos Físicos</p>
                          <p className="text-2xl font-bold text-white">
                            R$ {allSales.filter(s => s.receiving_bank === 'santander').reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {allSales.filter(s => s.receiving_bank === 'santander').length} vendas
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-red-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-2 border-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-400 text-xs mb-1">🟠 Itaú</p>
                          <p className="text-xs text-gray-400 mb-2">Licenciados</p>
                          <p className="text-2xl font-bold text-white">
                            R$ {allSales.filter(s => s.receiving_bank === 'itau').reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {allSales.filter(s => s.receiving_bank === 'itau').length} vendas
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-orange-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-2 border-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-400 text-xs mb-1">🟣 Nubank</p>
                          <p className="text-xs text-gray-400 mb-2">Parceiros</p>
                          <p className="text-2xl font-bold text-white">
                            R$ {allSales.filter(s => s.receiving_bank === 'nubank').reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {allSales.filter(s => s.receiving_bank === 'nubank').length} vendas
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-purple-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* CARDS DE RESUMO GERAL */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
                  {(() => {
                    const dashSales = ['santander', 'itau', 'nubank'].includes(dashBankFilter)
                      ? allSales.filter(s => s.receiving_bank === dashBankFilter)
                      : allSales;
                    return (
                      <>
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-400 text-xs mb-1">Total de Produtos</p>
                                <p className="text-2xl font-bold text-white">
                                  {products.reduce((sum, p) => sum + (p.quantity || 0) + (p.quantity_sold || 0), 0)}
                                </p>
                              </div>
                              <Package className="w-8 h-8 text-blue-400" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-400 text-xs mb-1">Produtos Vendidos</p>
                                <p className="text-2xl font-bold text-white">
                                  {dashSales.reduce((sum, s) => sum + (s.quantity_sold || 0), 0)}
                                </p>
                              </div>
                              <ShoppingCart className="w-8 h-8 text-green-400" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-400 text-xs mb-1">Faturamento Total</p>
                                <p className="text-2xl font-bold text-green-400">
                                  R$ {dashSales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
                                </p>
                              </div>
                              <DollarSign className="w-8 h-8 text-green-400" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-400 text-xs mb-1">Impostos + Comissões</p>
                                <p className="text-2xl font-bold text-red-400">
                                  R$ {dashSales.reduce((sum, s) => sum + (s.total_taxes || 0) + (s.commission_amount || 0), 0).toFixed(2)}
                                </p>
                              </div>
                              <TrendingUp className="w-8 h-8 text-red-400" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-400 text-xs mb-1">Lucro Líquido</p>
                                <p className="text-2xl font-bold text-purple-400">
                                  R$ {dashSales.reduce((sum, s) => sum + (s.net_amount || 0), 0).toFixed(2)}
                                </p>
                              </div>
                              <TrendingUp className="w-8 h-8 text-purple-400" />
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* TODAS AS VENDAS INDIVIDUAIS */}
              <Card className="bg-gray-800 border-gray-700 mb-6">
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                      {['santander', 'itau', 'nubank'].includes(dashBankFilter)
                        ? `Vendas - ${dashBankFilter === 'santander' ? '🔴 Santander' : dashBankFilter === 'itau' ? '🟠 Itaú' : '🟣 Nubank'}`
                        : `Todas as Vendas`
                      } ({(['santander', 'itau', 'nubank'].includes(dashBankFilter) ? allSales.filter(s => s.receiving_bank === dashBankFilter) : allSales).length})
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por código ou produto..."
                          value={searchSale}
                          onChange={(e) => setSearchSale(e.target.value)}
                          className="pl-10 bg-gray-900 text-white border-gray-700 h-9"
                        />
                      </div>
                      <Button
                        onClick={generateCodesForOldSales}
                        disabled={isGeneratingCodes}
                        className="bg-purple-600 hover:bg-purple-700 h-9 whitespace-nowrap"
                      >
                        {isGeneratingCodes ? '⏳ Gerando...' : '🔢 Gerar Códigos'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900 sticky top-0">
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="text-left p-3">Código</th>
                          <th className="text-left p-3">Data/Hora</th>
                          <th className="text-left p-3">Produto</th>
                          <th className="text-center p-3">Qtd</th>
                          <th className="text-right p-3">Preço Unit.</th>
                          <th className="text-right p-3">Total</th>
                          <th className="text-center p-3">Pagamento</th>
                          <th className="text-center p-3">Banco</th>
                          <th className="text-center p-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((['santander', 'itau', 'nubank'].includes(dashBankFilter)
                          ? allSales.filter(s => s.receiving_bank === dashBankFilter)
                          : allSales
                        ))
                          .filter(sale =>
                            !searchSale ||
                            sale.order_code?.toLowerCase().includes(searchSale.toLowerCase()) ||
                            sale.product_description?.toLowerCase().includes(searchSale.toLowerCase())
                          )
                          .map((sale) => (
                            <tr key={sale.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-gray-300">
                              <td className="p-3">
                                <code className="bg-gray-900 px-2 py-1 rounded text-xs text-blue-400 font-mono">
                                  {sale.order_code || 'N/A'}
                                </code>
                              </td>
                              <td className="p-3 text-xs">
                                {new Date(sale.sale_datetime).toLocaleString('pt-BR')}
                              </td>
                              <td className="p-3">{sale.product_description}</td>
                              <td className="text-center p-3 text-blue-400 font-semibold">
                                {sale.quantity_sold}
                              </td>
                              <td className="text-right p-3 text-white">
                                R$ {sale.unit_price.toFixed(2)}
                              </td>
                              <td className="text-right p-3 text-green-400 font-bold">
                                R$ {sale.total_amount.toFixed(2)}
                              </td>
                              <td className="text-center p-3">
                                <Badge className={`text-xs ${sale.payment_method === 'PIX' ? 'bg-green-600' :
                                  sale.payment_method === 'DINHEIRO' ? 'bg-blue-600' :
                                    sale.payment_method === 'CARTÃO DÉBITO' ? 'bg-purple-600' :
                                      sale.payment_method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' :
                                        'bg-yellow-600'
                                  }`}>
                                  {sale.payment_method}
                                </Badge>
                              </td>
                              <td className="text-center p-3">
                                <Badge className={`text-xs ${
                                  sale.receiving_bank === 'santander' ? 'bg-red-700' :
                                  sale.receiving_bank === 'itau' ? 'bg-orange-700' :
                                  sale.receiving_bank === 'nubank' ? 'bg-purple-700' :
                                  'bg-gray-600'
                                }`}>
                                  {sale.receiving_bank === 'santander' ? '🔴 Sant.' :
                                   sale.receiving_bank === 'itau' ? '🟠 Itaú' :
                                   sale.receiving_bank === 'nubank' ? '🟣 Nubank' :
                                   sale.receiving_bank || 'N/A'}
                                </Badge>
                              </td>
                              <td className="text-center p-3">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleEditSale(sale)}
                                    className="bg-blue-600 hover:bg-blue-700 h-7 px-2"
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => cancelSale(sale)}
                                    className="bg-red-600 hover:bg-red-700 h-7 px-2"
                                  >
                                    ✕
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* TODOS OS PRODUTOS VENDIDOS */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Todos os Produtos Vendidos ({(() => {
                      const productMap = {};
                      allSales.forEach(sale => {
                        if (!productMap[sale.product_id]) {
                          productMap[sale.product_id] = {
                            id: sale.product_id,
                            description: sale.product_description,
                            quantity_sold: 0,
                            total_amount: 0,
                            net_amount: 0
                          };
                        }
                        productMap[sale.product_id].quantity_sold += sale.quantity_sold || 0;
                        productMap[sale.product_id].total_amount += sale.total_amount || 0;
                        productMap[sale.product_id].net_amount += sale.net_amount || 0;
                      });
                      return Object.keys(productMap).length;
                    })()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="text-left p-3">#</th>
                          <th className="text-left p-3">Produto</th>
                          <th className="text-center p-3">Qtd Vendida</th>
                          <th className="text-left p-3">Formas de Pagamento</th>
                          <th className="text-right p-3">Faturamento</th>
                          <th className="text-right p-3">Lucro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const productMap = {};
                          allSales.forEach(sale => {
                            if (!productMap[sale.product_id]) {
                              productMap[sale.product_id] = {
                                id: sale.product_id,
                                description: sale.product_description,
                                quantity_sold: 0,
                                total_amount: 0,
                                net_amount: 0,
                                payment_methods: {}
                              };
                            }
                            productMap[sale.product_id].quantity_sold += sale.quantity_sold || 0;
                            productMap[sale.product_id].total_amount += sale.total_amount || 0;
                            productMap[sale.product_id].net_amount += sale.net_amount || 0;

                            // Conta formas de pagamento
                            const method = sale.payment_method;
                            if (!productMap[sale.product_id].payment_methods[method]) {
                              productMap[sale.product_id].payment_methods[method] = 0;
                            }
                            productMap[sale.product_id].payment_methods[method] += sale.quantity_sold || 0;
                          });

                          return Object.values(productMap)
                            .sort((a, b) => b.quantity_sold - a.quantity_sold)
                            .map((product, index) => (
                              <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-gray-300">
                                <td className="p-3 text-center">
                                  <span className={`font-bold ${index === 0 ? 'text-yellow-400 text-lg' :
                                    index === 1 ? 'text-gray-300 text-lg' :
                                      index === 2 ? 'text-orange-400 text-lg' :
                                        'text-gray-500'
                                    }`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                  </span>
                                </td>
                                <td className="p-3">{product.description}</td>
                                <td className="text-center p-3 text-blue-400 font-semibold">
                                  {product.quantity_sold}
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(product.payment_methods).map(([method, qty]) => (
                                      <Badge key={method} className={`text-xs ${method === 'PIX' ? 'bg-green-600' :
                                        method === 'DINHEIRO' ? 'bg-blue-600' :
                                          method === 'CARTÃO DÉBITO' ? 'bg-purple-600' :
                                            method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' :
                                              'bg-yellow-600'
                                        }`}>
                                        {method} ({qty})
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="text-right p-3 text-green-400 font-bold">
                                  R$ {product.total_amount.toFixed(2)}
                                </td>
                                <td className="text-right p-3 text-purple-400 font-bold">
                                  R$ {product.net_amount.toFixed(2)}
                                </td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                    {allSales.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma venda registrada ainda</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* GRÁFICO DE FATURAMENTO POR FORMA DE PAGAMENTO */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Faturamento por Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'PIX',
                            value: products.filter(p => p.status === 'VENDIDO PIX').reduce((sum, p) => sum + (p.sold_amount || 0), 0)
                          },
                          {
                            name: 'DINHEIRO',
                            value: products.filter(p => p.status === 'VENDIDO DINHEIRO').reduce((sum, p) => sum + (p.sold_amount || 0), 0)
                          }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'PIX', color: '#22c55e' },
                          { name: 'DINHEIRO', color: '#3b82f6' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendedores">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    Relatório de Vendedores
                  </CardTitle>
                  <Button
                    onClick={loadAllSales}
                    className="bg-orange-600 hover:bg-orange-700 text-xs sm:text-sm"
                  >
                    🔄 Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allSales.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>Nenhuma venda registrada para exibir relatório</p>
                  </div>
                ) : (
                  <>
                    <DailyRanking allSales={allSales} />
                    <div className="space-y-6">
                      {(() => {
                        // Agrupa vendas por dia
                        const salesByDay = {};
                        allSales.forEach(sale => {
                          const date = new Date(sale.sale_datetime).toLocaleDateString('pt-BR');
                          if (!salesByDay[date]) {
                            salesByDay[date] = [];
                          }
                          salesByDay[date].push(sale);
                        });

                        // Ordena datas decrescente (mais recentes primeiro)
                        const sortedDates = Object.keys(salesByDay).sort((a, b) => {
                          const dateA = new Date(a.split('/').reverse().join('-'));
                          const dateB = new Date(b.split('/').reverse().join('-'));
                          return dateB - dateA;
                        });

                        return sortedDates.map((date) => {
                          const daySales = salesByDay[date];
                          const dayTotal = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                          const dayCount = daySales.length;

                          // Filtra dados de vendedores apenas deste dia
                          const sellersForDay = sellersDataForPDF
                            .map(seller => {
                              // Filtra vendas apenas deste dia específico
                              const salesThisDay = seller.sales.filter(sale =>
                                new Date(sale.sale_datetime).toLocaleDateString('pt-BR') === date
                              );

                              // Só retorna vendedor se ele tiver vendas neste dia
                              if (salesThisDay.length === 0) return null;

                              // Recalcula comissão total apenas para as vendas deste dia
                              const totalCommissionThisDay = salesThisDay.reduce((sum, sale) =>
                                sum + (sale.seller_commission || 0), 0
                              );

                              return {
                                ...seller,
                                sales: salesThisDay,
                                sales_count: salesThisDay.length,
                                total_commission: totalCommissionThisDay
                              };
                            })
                            .filter(Boolean); // Remove vendedores sem vendas no dia

                          return (
                            <div key={date} className="bg-gray-900/50 rounded-lg p-5 border border-gray-700">
                              {/* HEADER DO DIA */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                  <div>
                                    <h3 className="text-white font-bold text-sm sm:text-lg">{date}</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm">{dayCount} vendas</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <DailyReportPDF
                                    daySales={daySales}
                                    date={date}
                                    sellersData={sellersForDay}
                                  />
                                  <div className="text-right">
                                    <p className="text-green-400 font-bold text-lg sm:text-2xl">
                                      R$ {dayTotal.toFixed(2)}
                                    </p>
                                    <p className="text-gray-500 text-xs">Total do dia</p>
                                  </div>
                                </div>
                              </div>

                              {/* VENDEDORES DO DIA - AGORA BUSCA DA ENTIDADE SaleCommission */}
                              <VendedoresDoDia daySales={daySales} date={date} />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL ABRIR CAIXA */}
        {showOpenCashModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-white border-gray-200 max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-gray-900">💰 Abrir Caixa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">
                    Saldo Inicial em Dinheiro (Troco)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valor em dinheiro disponível no caixa para troco
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={openCashRegister}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Abrir Caixa
                  </Button>
                  <Button
                    onClick={() => {
                      setShowOpenCashModal(false);
                      setOpeningBalance(0);
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL DETALHES DA SESSÃO */}
        {showSessionModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="bg-white border-gray-200 max-w-4xl w-full my-8">
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Detalhes da Sessão de Caixa
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={printSessionStatement}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      onClick={() => setShowSessionModal(false)}
                      variant="ghost"
                      className="text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* INFORMAÇÕES DA SESSÃO */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">📅 Data:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedSession.opening_time).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">🕐 Abertura:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedSession.opening_time).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">🕐 Fechamento:</span>
                    <span className="font-medium text-gray-900">
                      {selectedSession.closing_time ? new Date(selectedSession.closing_time).toLocaleTimeString('pt-BR') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">👤 Operador:</span>
                    <span className="font-medium text-gray-900">{selectedSession.operator_name}</span>
                  </div>
                </div>

                {/* RESUMO FINANCEIRO */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700 mb-1">💳 PIX</p>
                    <p className="text-lg font-bold text-green-900">
                      R$ {(selectedSession.total_pix || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 mb-1">💵 Dinheiro</p>
                    <p className="text-lg font-bold text-blue-900">
                      R$ {(selectedSession.total_cash || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <p className="text-xs text-purple-700 mb-1">💳 Débito</p>
                    <p className="text-lg font-bold text-purple-900">
                      R$ {(selectedSession.total_debit || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-orange-700 mb-1">💳 Crédito</p>
                    <p className="text-lg font-bold text-orange-900">
                      R$ {(selectedSession.total_credit || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-700 mb-1">📄 Boleto</p>
                    <p className="text-lg font-bold text-yellow-900">
                      R$ {(selectedSession.total_boleto || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">💰 TOTAL</p>
                    <p className="text-lg font-bold text-green-400">
                      R$ {(selectedSession.total_sales || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* LISTA DE VENDAS */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">
                    Vendas ({sessionSales.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-xs text-gray-700">
                          <th className="text-left p-2">Horário</th>
                          <th className="text-left p-2">Produto</th>
                          <th className="text-center p-2">Qtd</th>
                          <th className="text-right p-2">Valor Unit.</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-center p-2">Pagamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionSales.map((sale) => (
                          <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 text-gray-600">
                              {new Date(sale.sale_datetime).toLocaleTimeString('pt-BR')}
                            </td>
                            <td className="p-2 text-gray-900">{sale.product_description}</td>
                            <td className="text-center p-2 text-blue-600 font-semibold">
                              {sale.quantity_sold}
                            </td>
                            <td className="text-right p-2 text-gray-900">
                              R$ {sale.unit_price.toFixed(2)}
                            </td>
                            <td className="text-right p-2 text-green-600 font-bold">
                              R$ {sale.total_amount.toFixed(2)}
                            </td>
                            <td className="text-center p-2">
                              <Badge className={
                                sale.payment_method === 'PIX' ? 'bg-green-600' :
                                  sale.payment_method === 'DINHEIRO' ? 'bg-blue-600' :
                                    sale.payment_method === 'CARTÃO DÉBITO' ? 'bg-purple-600' :
                                      sale.payment_method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' :
                                        'bg-yellow-600'
                              }>
                                {sale.payment_method}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSession.notes && (
                  <div className="mt-4 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-700 mb-1">📝 Observações:</p>
                    <p className="text-sm text-yellow-900">{selectedSession.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}



        {/* MODAL EDITAR COMISSÃO */}
        {showEditCommissionModal && editingCommissionSale && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-white border-gray-200 max-w-lg w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    Editar Comissão do Vendedor
                  </CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowEditCommissionModal(false);
                      setEditingCommissionSale(null);
                    }}
                    className="text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Vendedor:</strong> {editingCommissionSale.seller_name || 'Sem vendedor'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Produto:</strong> {editingCommissionSale.product_description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(editingCommissionSale.sale_datetime).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">Tipo de Comissão</label>
                  <select
                    value={editCommissionData.commission_type}
                    onChange={(e) => setEditCommissionData({ ...editCommissionData, commission_type: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">
                    {editCommissionData.commission_type === 'percentage' ? 'Porcentagem (%)' : 'Valor (R$)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editCommissionData.commission_value}
                    onChange={(e) => setEditCommissionData({ ...editCommissionData, commission_value: parseFloat(e.target.value) || 0 })}
                    className="bg-white text-gray-900 border-gray-300"
                    placeholder={editCommissionData.commission_type === 'percentage' ? '10' : '50.00'}
                  />
                </div>

                {editCommissionData.commission_value > 0 && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-gray-700 font-medium">Valor da Comissão:</p>
                    <p className="text-2xl font-bold text-orange-600">
                      R$ {editCommissionData.commission_type === 'percentage'
                        ? ((editingCommissionSale.total_amount * editCommissionData.commission_value) / 100).toFixed(2)
                        : editCommissionData.commission_value.toFixed(2)
                      }
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={saveEditedCommission}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Salvar Comissão
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEditCommissionModal(false);
                      setEditingCommissionSale(null);
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL EDITAR VENDA */}
        {showEditSaleModal && editingSale && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-white border-gray-200 max-w-lg w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">✏️ Editar Venda</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowEditSaleModal(false);
                      setEditingSale(null);
                    }}
                    className="text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Produto:</strong> {editingSale.product_description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(editingSale.sale_datetime).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">Quantidade</label>
                  <Input
                    type="number"
                    min="1"
                    value={editSaleData.quantity_sold}
                    onChange={(e) => setEditSaleData({ ...editSaleData, quantity_sold: e.target.value })}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">Preço Unitário</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editSaleData.unit_price}
                    onChange={(e) => setEditSaleData({ ...editSaleData, unit_price: e.target.value })}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">Forma de Pagamento</label>
                  <select
                    value={editSaleData.payment_method}
                    onChange={(e) => setEditSaleData({ ...editSaleData, payment_method: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5"
                  >
                    <option>PIX</option>
                    <option>DINHEIRO</option>
                    <option>CARTÃO DÉBITO</option>
                    <option>CARTÃO CRÉDITO</option>
                    <option>BOLETO PARCELADO</option>
                  </select>
                </div>

                {editSaleData.payment_method === 'BOLETO PARCELADO' && (
                  <div className="space-y-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div>
                      <label className="text-gray-700 text-xs mb-1 block">Nome do Cliente</label>
                      <Input
                        value={editSaleData.boleto_cliente}
                        onChange={(e) => setEditSaleData({ ...editSaleData, boleto_cliente: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 text-xs mb-1 block">Documento</label>
                      <Input
                        value={editSaleData.boleto_documento}
                        onChange={(e) => setEditSaleData({ ...editSaleData, boleto_documento: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 text-xs mb-1 block">Parcelas</label>
                      <Input
                        type="number"
                        min="1"
                        value={editSaleData.boleto_parcelas}
                        onChange={(e) => setEditSaleData({ ...editSaleData, boleto_parcelas: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Novo Total:</span>
                    <span className="text-green-600 font-bold text-xl">
                      R$ {(editSaleData.quantity_sold * editSaleData.unit_price).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveEditedSale}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Salvar Alterações
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEditSaleModal(false);
                      setEditingSale(null);
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL FECHAR CAIXA */}
        {showCloseCashModal && currentCashRegister && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-white border-gray-200 max-w-2xl w-full">
              <CardHeader>
                <CardTitle className="text-gray-900">🔒 Fechar Caixa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* RESUMO DO CAIXA */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 mb-3">Resumo do Caixa</h3>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Abertura:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(currentCashRegister.opening_time).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Operador:</span>
                    <span className="font-medium text-gray-900">{currentCashRegister.operator_name}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saldo Inicial:</span>
                    <span className="font-medium text-gray-900">
                      R$ {currentCashRegister.opening_balance.toFixed(2)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">💳 PIX:</span>
                      <span className="font-medium text-green-600">
                        R$ {allSales
                          .filter(s => {
                            const saleTime = new Date(s.sale_datetime).getTime();
                            const openTime = new Date(currentCashRegister.opening_time).getTime();
                            return saleTime >= openTime && s.payment_method === 'PIX';
                          })
                          .reduce((sum, s) => sum + s.total_amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">💵 Dinheiro:</span>
                      <span className="font-medium text-green-600">
                        R$ {allSales
                          .filter(s => {
                            const saleTime = new Date(s.sale_datetime).getTime();
                            const openTime = new Date(currentCashRegister.opening_time).getTime();
                            return saleTime >= openTime && s.payment_method === 'DINHEIRO';
                          })
                          .reduce((sum, s) => sum + s.total_amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">💳 Cartões:</span>
                      <span className="font-medium text-green-600">
                        R$ {allSales
                          .filter(s => {
                            const saleTime = new Date(s.sale_datetime).getTime();
                            const openTime = new Date(currentCashRegister.opening_time).getTime();
                            return saleTime >= openTime &&
                              (s.payment_method === 'CARTÃO DÉBITO' || s.payment_method === 'CARTÃO CRÉDITO');
                          })
                          .reduce((sum, s) => sum + s.total_amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    {/* 🆕 DEPÓSITOS DE CARTEIRA (Entradas) */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">🏦 Depósitos (Carteira):</span>
                      <span className="font-medium text-blue-600">
                        R$ {walletDeposits
                          .filter(d => {
                            const depositTime = new Date(d.created_date).getTime();
                            const openTime = new Date(currentCashRegister.opening_time).getTime();
                            return depositTime >= openTime;
                          })
                          .reduce((sum, d) => sum + d.amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-bold text-base">
                      <span className="text-gray-900">Total em Caixa:</span>
                      <span className="text-green-600">
                        R$ {(
                          allSales
                            .filter(s => {
                              const saleTime = new Date(s.sale_datetime).getTime();
                              const openTime = new Date(currentCashRegister.opening_time).getTime();
                              return saleTime >= openTime;
                            })
                            .reduce((sum, s) => sum + s.total_amount, 0)
                          +
                          walletDeposits
                            .filter(d => {
                              const depositTime = new Date(d.created_date).getTime();
                              const openTime = new Date(currentCashRegister.opening_time).getTime();
                              return depositTime >= openTime;
                            })
                            .reduce((sum, d) => sum + d.amount, 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">
                    Saldo Final em Dinheiro (Contagem Real)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Conte o dinheiro no caixa e informe o valor total
                  </p>
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">
                    Observações
                  </label>
                  <Textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="bg-white text-gray-900 border-gray-300"
                    placeholder="Alguma observação sobre o fechamento..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={closeCashRegister}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Fechar Caixa
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCloseCashModal(false);
                      setClosingBalance(0);
                      setClosingNotes('');
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}