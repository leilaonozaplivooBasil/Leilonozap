import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
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
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PDV() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [boletoData, setBoletoData] = useState({ cliente: '', documento: '', parcelas: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [commissionType, setCommissionType] = useState('percentage');
  const [commissionValue, setCommissionValue] = useState(0);
  const [selectedLicenciante, setSelectedLicenciante] = useState(null);
  const [comissaoLicenciante, setComissaoLicenciante] = useState(0);
  const [tipoComissaoLicenciante, setTipoComissaoLicenciante] = useState('percentage');
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
  const [timeUntilClose, setTimeUntilClose] = useState('');
  const [searchSale, setSearchSale] = useState('');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
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

  // Timer automático para abrir/fechar caixa
  useEffect(() => {
    const checkAutoSchedule = async () => {
      const brasiliaTime = getBrasiliaTime();
      const hour = brasiliaTime.getHours();
      const minute = brasiliaTime.getMinutes();

      // Fechar às 20h
      if (hour === 20 && minute === 0 && currentCashRegister) {
        console.log('⏰ Fechando caixa automaticamente às 20h');
        await closeCashRegister(true);
      }

      // Abrir às 6h
      if (hour === 6 && minute === 0 && !currentCashRegister) {
        console.log('⏰ Abrindo caixa automaticamente às 6h');
        await openCashRegister(true);
      }
    };

    const interval = setInterval(checkAutoSchedule, 60000); // Verifica a cada minuto
    return () => clearInterval(interval);
  }, [currentCashRegister]);

  // Contador regressivo
  useEffect(() => {
    const updateCountdown = () => {
      if (!currentCashRegister) {
        setTimeUntilClose('');
        return;
      }

      const brasiliaTime = getBrasiliaTime();
      const now = brasiliaTime.getTime();
      
      // Calcula o horário de fechamento (20h de hoje)
      const closeTime = new Date(brasiliaTime);
      closeTime.setHours(20, 0, 0, 0);
      
      // Se já passou das 20h, considera amanhã
      if (brasiliaTime.getHours() >= 20) {
        closeTime.setDate(closeTime.getDate() + 1);
      }

      const diff = closeTime.getTime() - now;
      
      if (diff <= 0) {
        setTimeUntilClose('Fechando...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilClose(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentCashRegister]);

  const loadAllSales = async () => {
    try {
      const sales = await base44.entities.Sale.list('-sale_datetime', 5000);
      setAllSales(sales);
    } catch (error) {
      console.error('Erro ao carregar todas as vendas:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.filter({ status: 'ESTOQUE' });
      const inStock = allProducts.filter(p => p.quantity > 0);
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
      
      // Busca vendas do período do caixa aberto (SEM CACHE)
      const allSales = await base44.entities.Sale.list('-sale_datetime', 1000);
      const salesInSession = allSales.filter(sale => {
        const saleTime = new Date(sale.sale_datetime).getTime();
        const openTime = new Date(currentCashRegister.opening_time).getTime();
        return saleTime >= openTime;
      });
      
      console.log(`✅ ${salesInSession.length} vendas no caixa atual`);
      setTodaySales(salesInSession);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  }, [currentCashRegister]);

  const loadTaxSettings = async () => {
    try {
      const settings = await base44.entities.TaxSettings.list();
      if (settings && settings.length > 0) {
        setTaxSettings(settings[0]);
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
        const created = await base44.entities.TaxSettings.create(defaultSettings);
        setTaxSettings(created);
      }
    } catch (error) {
      console.error('Erro ao carregar impostos:', error);
    }
  };

  const loadSalesHistory = async () => {
    try {
      console.log('🔍 Carregando sessões de caixa...');
      
      // Busca todas as sessões de caixa fechadas
      const allSessions = await base44.entities.CashRegister.list('-closing_time', 500);
      const closedSessions = allSessions.filter(s => s.status === 'closed');
      console.log('✅ Total de sessões:', closedSessions.length);
      
      setCashSessions(closedSessions);
    } catch (error) {
      console.error('❌ Erro ao carregar sessões:', error);
    }
  };

  const loadSessionSales = async (session) => {
    try {
      const allSales = await base44.entities.Sale.list('-sale_datetime', 2000);
      const salesInSession = allSales.filter(sale => {
        const saleTime = new Date(sale.sale_datetime).getTime();
        const openTime = new Date(session.opening_time).getTime();
        const closeTime = session.closing_time ? new Date(session.closing_time).getTime() : Date.now();
        return saleTime >= openTime && saleTime <= closeTime;
      });
      
      setSessionSales(salesInSession);
      setSelectedSession(session);
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
      const openRegisters = await base44.entities.CashRegister.filter({ status: 'open' });
      if (openRegisters.length > 0) {
        const register = openRegisters[0];
        setCurrentCashRegister(register);
        console.log('✅ Caixa aberto:', register);
        
        // Carrega vendas deste caixa específico
        const allSales = await base44.entities.Sale.list('-sale_datetime', 1000);
        const salesInSession = allSales.filter(sale => {
          const saleTime = new Date(sale.sale_datetime).getTime();
          const openTime = new Date(register.opening_time).getTime();
          return saleTime >= openTime;
        });
        
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
      const allSellers = await base44.entities.Seller.filter({ is_active: true });
      setSellers(allSellers);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadSellerStats = async () => {
    try {
      const allSales = await base44.entities.Sale.list('-sale_datetime', 2000);
      
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

  const openCashRegister = async (isAutomatic = false) => {
    try {
      const newRegister = await base44.entities.CashRegister.create({
        status: 'open',
        operator_name: isAutomatic ? 'Sistema (Automático)' : (currentUser?.full_name || 'Admin'),
        opening_time: new Date().toISOString(),
        opening_balance: parseFloat(openingBalance) || 0,
        total_sales: 0,
        total_pix: 0,
        total_cash: 0,
        total_debit: 0,
        total_credit: 0,
        total_boleto: 0,
        transactions_count: 0
      });
      
      setCurrentCashRegister(newRegister);
      setShowOpenCashModal(false);
      setOpeningBalance(0);
      
      if (!isAutomatic) {
        alert('✅ Caixa aberto com sucesso!');
      }
      
      setTimeout(() => loadTodaySales(), 500);
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      if (!isAutomatic) {
        alert('❌ Erro ao abrir caixa');
      }
    }
  };

  const closeCashRegister = async (isAutomatic = false) => {
    if (!currentCashRegister) return;
    
    try {
      // Calcula totais do caixa atual
      const cashSales = await base44.entities.Sale.filter({});
      const salesInSession = cashSales.filter(sale => {
        const saleTime = new Date(sale.sale_datetime).getTime();
        const openTime = new Date(currentCashRegister.opening_time).getTime();
        return saleTime >= openTime;
      });

      const totals = {
        total_pix: 0,
        total_cash: 0,
        total_debit: 0,
        total_credit: 0,
        total_boleto: 0,
        transactions_count: salesInSession.length
      };

      salesInSession.forEach(sale => {
        const amount = sale.total_amount || 0;
        if (sale.payment_method === 'PIX') totals.total_pix += amount;
        else if (sale.payment_method === 'DINHEIRO') totals.total_cash += amount;
        else if (sale.payment_method === 'CARTÃO DÉBITO') totals.total_debit += amount;
        else if (sale.payment_method === 'CARTÃO CRÉDITO') totals.total_credit += amount;
        else if (sale.payment_method === 'BOLETO PARCELADO') totals.total_boleto += amount;
      });

      const total_sales = Object.values(totals).reduce((sum, val) => 
        typeof val === 'number' ? sum + val : sum, 0
      );

      const notes = isAutomatic 
        ? 'Fechamento automático às 20h' 
        : closingNotes;

      await base44.entities.CashRegister.update(currentCashRegister.id, {
        status: 'closed',
        closing_time: new Date().toISOString(),
        closing_balance: parseFloat(closingBalance) || 0,
        total_sales,
        ...totals,
        notes
      });

      setCurrentCashRegister(null);
      setTodaySales([]);
      setShowCloseCashModal(false);
      setClosingBalance(0);
      setClosingNotes('');
      
      if (!isAutomatic) {
        alert('✅ Caixa fechado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      if (!isAutomatic) {
        alert('❌ Erro ao fechar caixa');
      }
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
        
        const saleRecord = await base44.entities.Sale.create({
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
          boleto_parcelas: paymentMethod === 'BOLETO PARCELADO' ? boletoData.parcelas : null
        });

        // 🆕 Registra comissão do licenciado
        if (selectedSeller && comissaoLicenciadoItem > 0) {
          await base44.entities.SaleCommission.create({
            sale_id: saleRecord.id,
            seller_id: selectedSeller,
            seller_name: sellerData?.name || 'Vendedor',
            commission_type: commissionType,
            commission_value: commissionValue,
            commission_amount: comissaoLicenciadoItem,
            seller_role: 'licenciado'
          });
          
          console.log(`✅ Comissão licenciado: ${sellerData?.name} - R$ ${comissaoLicenciadoItem.toFixed(2)}`);
        }

        // 🆕 Registra comissão do licenciante
        if (selectedLicenciante && comissaoLicencianteItem > 0) {
          const licencianteData = sellers.find(s => s.id === selectedLicenciante);
          await base44.entities.SaleCommission.create({
            sale_id: saleRecord.id,
            seller_id: selectedLicenciante,
            seller_name: licencianteData?.name || 'Licenciante',
            commission_type: tipoComissaoLicenciante,
            commission_value: comissaoLicenciante,
            commission_amount: comissaoLicencianteItem,
            seller_role: 'licenciante'
          });
          
          console.log(`✅ Comissão licenciante: ${licencianteData?.name} - R$ ${comissaoLicencianteItem.toFixed(2)}`);
        }

        // Atualiza produto
        await base44.entities.Product.update(product.id, {
          quantity: newQuantity,
          quantity_sold: novaQuantidadeVendida,
          status: newQuantity > 0 ? 'ESTOQUE' : `VENDIDO ${paymentMethod}`,
          sold_amount: novoSoldAmount,
          profit: novoLucroTotal
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
      await base44.entities.Sale.update(editingCommissionSale.id, {
        commission_amount: parseFloat(editCommissionData.commission_amount),
        commission_type: editCommissionData.commission_type,
        commission_value: parseFloat(editCommissionData.commission_value)
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
      
      await base44.entities.Sale.update(editingSale.id, {
        quantity_sold: parseInt(editSaleData.quantity_sold),
        unit_price: parseFloat(editSaleData.unit_price),
        total_amount: newTotalAmount,
        total_taxes: itemTaxes.total,
        net_amount: newTotalAmount - itemTaxes.total,
        payment_method: editSaleData.payment_method,
        boleto_cliente: editSaleData.payment_method === 'BOLETO PARCELADO' ? editSaleData.boleto_cliente : null,
        boleto_documento: editSaleData.payment_method === 'BOLETO PARCELADO' ? editSaleData.boleto_documento : null,
        boleto_parcelas: editSaleData.payment_method === 'BOLETO PARCELADO' ? editSaleData.boleto_parcelas : null
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
      // Busca o produto original
      const product = await base44.entities.Product.list();
      const targetProduct = product.find(p => p.id === sale.product_id);
      
      if (!targetProduct) {
        alert('❌ Produto não encontrado');
        return;
      }

      // Restaura o estoque
      const restoredQuantity = (targetProduct.quantity || 0) + (sale.quantity_sold || 0);
      const restoredSoldAmount = Math.max(0, (targetProduct.sold_amount || 0) - (sale.total_amount || 0));
      const restoredProfit = restoredSoldAmount - ((targetProduct.cost_price || 0) * ((targetProduct.quantity_sold || 0) - (sale.quantity_sold || 0)));

      await base44.entities.Product.update(sale.product_id, {
        quantity: restoredQuantity,
        quantity_sold: Math.max(0, (targetProduct.quantity_sold || 0) - (sale.quantity_sold || 0)),
        status: 'ESTOQUE',
        sold_amount: restoredSoldAmount,
        profit: restoredProfit
      });

      // Delete a venda
      await base44.entities.Sale.delete(sale.id);

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
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("ProductManagement"))}
              className="text-white hover:bg-green-800/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">💰 PDV - Ponto de Venda</h1>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Operador: {currentUser?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">

        {/* STATUS DO CAIXA */}
        <Card className={`mb-6 ${currentCashRegister ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${currentCashRegister ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {currentCashRegister ? '🟢 Caixa Aberto' : '🔴 Caixa Fechado'}
                  </p>
                  {currentCashRegister && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Aberto às {new Date(currentCashRegister.opening_time).toLocaleTimeString('pt-BR')} por {currentCashRegister.operator_name}
                      </p>
                      {timeUntilClose && (
                        <p className="text-xs text-orange-600 font-semibold">
                          ⏰ Fecha automaticamente em: {timeUntilClose}
                        </p>
                      )}
                    </div>
                  )}
                  {!currentCashRegister && (
                    <p className="text-xs text-gray-600 mt-1">
                      Abre automaticamente às 06:00 • Fecha às 20:00
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
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        <Tabs defaultValue="pdv" className="mb-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="pdv" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-700">
              🛒 Vendas
            </TabsTrigger>
            <TabsTrigger value="extrato" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700">
              📊 Extrato
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700">
              📈 Dashboard
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-700">
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
                            onChange={(e) => setSelectedSeller(e.target.value || null)}
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
                      <p className="text-xs font-semibold text-purple-700 mb-2">Licenciante (Indicador)</p>
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

                    {/* CAMPOS BOLETO */}
                    {paymentMethod === 'BOLETO PARCELADO' && (
                      <div className="space-y-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div>
                          <label className="text-gray-700 text-xs mb-1 block">Nome do Cliente</label>
                          <Input
                            value={boletoData.cliente}
                            onChange={(e) => setBoletoData({...boletoData, cliente: e.target.value})}
                            className="h-9"
                            placeholder="Nome completo"
                          />
                        </div>
                        <div>
                          <label className="text-gray-700 text-xs mb-1 block">Documento (CPF/RG)</label>
                          <Input
                            value={boletoData.documento}
                            onChange={(e) => setBoletoData({...boletoData, documento: e.target.value})}
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
                            onChange={(e) => setBoletoData({...boletoData, parcelas: parseInt(e.target.value) || 1})}
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
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Extrato por Sessões de Caixa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cashSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma sessão de caixa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cashSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => loadSessionSales(session)}
                        className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-700/50 cursor-pointer transition-all border border-gray-700 hover:border-gray-600"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Clock className="w-5 h-5 text-blue-400" />
                              <div>
                                <p className="text-white font-semibold">
                                  {new Date(session.opening_time).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {new Date(session.opening_time).toLocaleTimeString('pt-BR')} - {' '}
                                  {session.closing_time ? new Date(session.closing_time).toLocaleTimeString('pt-BR') : 'Aberto'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-400">
                                👤 {session.operator_name}
                              </span>
                              <span className="text-gray-400">
                                📦 {session.transactions_count || 0} vendas
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-2xl">
                              R$ {(session.total_sales || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">Receita total</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* RESUMO GERAL */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                          {allSales.reduce((sum, s) => sum + (s.quantity_sold || 0), 0)}
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
                          R$ {allSales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
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
                          R$ {(allSales.reduce((sum, s) => sum + (s.total_taxes || 0) + (s.commission_amount || 0), 0)).toFixed(2)}
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
                          R$ {allSales.reduce((sum, s) => sum + (s.net_amount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* TODAS AS VENDAS INDIVIDUAIS */}
              <Card className="bg-gray-800 border-gray-700 mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Todas as Vendas ({allSales.length})
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative w-64">
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
                          <th className="text-center p-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSales
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
                              <Badge className={`text-xs ${
                                sale.payment_method === 'PIX' ? 'bg-green-600' :
                                sale.payment_method === 'DINHEIRO' ? 'bg-blue-600' :
                                sale.payment_method === 'CARTÃO DÉBITO' ? 'bg-purple-600' :
                                sale.payment_method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' :
                                'bg-yellow-600'
                              }`}>
                                {sale.payment_method}
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
                                  <span className={`font-bold ${
                                    index === 0 ? 'text-yellow-400 text-lg' : 
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
                                      <Badge key={method} className={`text-xs ${
                                        method === 'PIX' ? 'bg-green-600' :
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Relatório de Vendedores - Diário
                  </CardTitle>
                  <Button
                    onClick={loadAllSales}
                    className="bg-orange-600 hover:bg-orange-700"
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

                        return (
                          <div key={date} className="bg-gray-900/50 rounded-lg p-5 border border-gray-700">
                            {/* HEADER DO DIA */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                <div>
                                  <h3 className="text-white font-bold text-lg">{date}</h3>
                                  <p className="text-gray-400 text-sm">{dayCount} vendas realizadas</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-bold text-2xl">
                                  R$ {dayTotal.toFixed(2)}
                                </p>
                                <p className="text-gray-500 text-xs">Total do dia</p>
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
                    onChange={(e) => setEditCommissionData({...editCommissionData, commission_type: e.target.value})}
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
                    onChange={(e) => setEditCommissionData({...editCommissionData, commission_value: parseFloat(e.target.value) || 0})}
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
                    onChange={(e) => setEditSaleData({...editSaleData, quantity_sold: e.target.value})}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">Preço Unitário</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editSaleData.unit_price}
                    onChange={(e) => setEditSaleData({...editSaleData, unit_price: e.target.value})}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm mb-2 block font-medium">Forma de Pagamento</label>
                  <select
                    value={editSaleData.payment_method}
                    onChange={(e) => setEditSaleData({...editSaleData, payment_method: e.target.value})}
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
                        onChange={(e) => setEditSaleData({...editSaleData, boleto_cliente: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 text-xs mb-1 block">Documento</label>
                      <Input
                        value={editSaleData.boleto_documento}
                        onChange={(e) => setEditSaleData({...editSaleData, boleto_documento: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 text-xs mb-1 block">Parcelas</label>
                      <Input
                        type="number"
                        min="1"
                        value={editSaleData.boleto_parcelas}
                        onChange={(e) => setEditSaleData({...editSaleData, boleto_parcelas: e.target.value})}
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
                        R$ {salesHistory
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
                        R$ {salesHistory
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
                        R$ {salesHistory
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
                  </div>

                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-bold text-base">
                      <span className="text-gray-900">Total Vendido:</span>
                      <span className="text-green-600">
                        R$ {salesHistory
                          .filter(s => {
                            const saleTime = new Date(s.sale_datetime).getTime();
                            const openTime = new Date(currentCashRegister.opening_time).getTime();
                            return saleTime >= openTime;
                          })
                          .reduce((sum, s) => sum + s.total_amount, 0)
                          .toFixed(2)}
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