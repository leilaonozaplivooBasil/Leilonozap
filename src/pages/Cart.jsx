import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/format';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Truck,
  MapPin,
  Store,
  Trash2,
  Plus,
  Minus,
  Copy,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [coupon, setCoupon] = useState('');
  const [observation, setObservation] = useState('');
  const [paymentType, setPaymentType] = useState('PIX');
  const [pixData, setPixData] = useState(null);
  // Estados de cartão mantidos para compatibilidade com backend (não usados na UI)
  const cardNumber = '';
  const cardName = '';
  const cardExpiry = '';
  const cardCvv = '';
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [saldo, setSaldo] = useState(0);
  const [saldoOk, setSaldoOk] = useState(false);
  const [paymentDetected, setPaymentDetected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [createdSales, setCreatedSales] = useState([]);
  const [checkoutItems, setCheckoutItems] = useState([]); // Snapshot dos itens ao gerar PIX
  const pollingIntervalRef = useRef(null); // Ref para gerenciar o intervalo de polling

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    const loadUserData = async () => {
      const savedCart = localStorage.getItem('catalogCart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }

      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        // Tenta buscar dados mais completos do AppUser
        try {
          const appUsers = await base44.entities.AppUser.filter({ id: user.id });
          if (appUsers && appUsers.length > 0) {
            const fullUser = appUsers[0];
            setSaldo(Number(fullUser.commission_balance) || 0);
            setFormData(prev => ({
              ...prev,
              name: fullUser.full_name || user.full_name || '',
              phone: fullUser.phone || user.phone || '',
              email: fullUser.email || user.email || '',
              cpf: formatCpf(fullUser.cpf || user.cpf || ''),
              cep: fullUser.address_zip_code || user.address_zip_code || '',
              street: fullUser.address_street || user.address_street || '',
              number: fullUser.address_number || user.address_number || '',
              complement: fullUser.address_complement || user.address_complement || '',
              neighborhood: fullUser.address_neighborhood || user.address_neighborhood || '',
              city: fullUser.address_city || user.address_city || '',
              state: fullUser.address_state || user.address_state || ''
            }));
          } else {
            // Fallback para dados do localStorage
            setFormData(prev => ({
              ...prev,
              name: user.full_name || '',
              phone: user.phone || '',
              email: user.email || '',
              cpf: formatCpf(user.cpf || ''),
              cep: user.address_zip_code || '',
              street: user.address_street || '',
              number: user.address_number || '',
              complement: user.address_complement || '',
              neighborhood: user.address_neighborhood || '',
              city: user.address_city || '',
              state: user.address_state || ''
            }));
          }
        } catch (error) {
          console.debug('Erro ao buscar dados do AppUser:', error);
          // Fallback para dados do localStorage
          setFormData(prev => ({
            ...prev,
            name: user.full_name || '',
            phone: user.phone || '',
            email: user.email || '',
            cpf: formatCpf(user.cpf || ''),
            cep: user.address_zip_code || '',
            street: user.address_street || '',
            number: user.address_number || '',
            complement: user.address_complement || '',
            neighborhood: user.address_neighborhood || '',
            city: user.address_city || '',
            state: user.address_state || ''
          }));
        }
      }
    };

    loadUserData();
  }, []);

  // ⏱️ Contagem regressiva após detecção do pagamento
  useEffect(() => {
    if (!paymentDetected || countdown <= 0) return;
    if (countdown === 1) {
      const timer = setTimeout(() => {
        setCountdown(0);
        setPixConfirmed(true);
        toast.success('✅ Pagamento PIX Confirmado!', { duration: 3000 });
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [paymentDetected, countdown]);

  // 🔄 Polling para detectar confirmação de pagamento PIX
  useEffect(() => {
    // ⚠️ NÃO disparar se já confirmou, se não há PIX ou se não tem payment_id
    if (!pixData || pixData.billing_type !== 'PIX' || !pixData.payment_id || pixConfirmed || paymentDetected) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const paymentId = pixData.payment_id;

    // Função de checagem reutilizável
    const checkPayment = async () => {
      try {
        const result = await base44.functions.invoke('checkPaymentStatus', {
          payment_id: paymentId
        });
        const data = result?.data || result;
        if (data?.found && data?.status === 'confirmed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setPaymentDetected(true);
          setCountdown(5);
        }
      } catch (error) {
        console.debug('Polling error:', error.message);
      }
    };

    // Polling normal a cada 5s
    const interval = setInterval(checkPayment, 5000);
    pollingIntervalRef.current = interval;

    // 📱 MOBILE FIX: Quando o usuário volta do app do banco, o setInterval pode estar pausado.
    // visibilitychange dispara quando a aba volta ao foco — checa imediatamente.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkPayment();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Também checa no focus (fallback para alguns navegadores mobile)
    window.addEventListener('focus', checkPayment);

    return () => {
      clearInterval(interval);
      pollingIntervalRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkPayment);
    };
  }, [pixData, pixConfirmed, paymentDetected]);

  const updateCart = (newCart) => {
    setCartItems(newCart);
    localStorage.setItem('catalogCart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (productId) => {
    const newCart = cartItems.filter(item => item.id !== productId);
    updateCart(newCart);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    const newCart = cartItems.map(item => {
      if (item.id === productId) {
        const maxQty = item.availableStock || 999;
        if (newQuantity > maxQty) {
          toast.error(`Apenas ${maxQty} unidades disponíveis`);
          return { ...item, quantity: maxQty };
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price_catalog || item.selling_price_wholesale || 0;
      return total + (price * (item.quantity || 1));
    }, 0);
  };

  const searchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    setFormData(prev => ({ ...prev, cep: value }));
    if (value.replace(/\D/g, '').length === 8) {
      searchCep(value);
    }
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCpf = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  // Validação de CPF - simplificada (ASAAS faz validação final)
  const isValidCpf = (cpf) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCpf)) return false; // CPFs com todos dígitos iguais (ex: 111.111.111-11)
    return true; // ASAAS valida o CPF real
  };

  const handleCheckout = async () => {
    // Guard: usa isProcessing (state) como único bloqueio — desabilita o botão via disabled
    if (isProcessing) return;

    if (cartItems.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    // Validações — retorna antes de marcar isProcessing para não travar
    if (!formData.name.trim()) { toast.error('Preencha seu nome'); return; }
    if (!formData.phone.trim()) { toast.error('Preencha seu telefone'); return; }
    if (!formData.cpf.trim()) { toast.error('Preencha seu CPF'); return; }
    if (!isValidCpf(formData.cpf)) { toast.error('CPF inválido. Verifique os números digitados.'); return; }
    if (!formData.email.trim()) { toast.error('Preencha seu email'); return; }

    if (deliveryMethod === 'delivery') {
      if (!formData.cep.trim() || !formData.street.trim() || !formData.number.trim() || !formData.city.trim()) {
        toast.error('Preencha o endereço completo para entrega');
        return;
      }
    }

    // Cartão é coletado na página segura da Stripe — sem validação de cartão inline.

    const totalAmount = calculateSubtotal();
    if (totalAmount < 5) { toast.error('Valor mínimo para pagamento: R$ 5,00'); return; }

    // ✅ Todas validações passaram — agora bloqueia o botão
    setIsProcessing(true);
    toast.loading('Processando compra...', { id: 'checkout-loading' });

    // 🛡️ Re-ler currentUser FRESCO do localStorage no momento do clique
    // Evita stale state quando outra aba sobrescreve o localStorage
    let freshUser = currentUser;
    try {
      const freshJSON = localStorage.getItem('currentUser');
      if (freshJSON) {
        const parsed = JSON.parse(freshJSON);
        if (parsed?.id && parsed?.email) {
          freshUser = parsed;
          if (!currentUser || currentUser.id !== parsed.id) {
            setCurrentUser(parsed);
          }
        }
      }
    } catch (e) { /* usa currentUser existente */ }

    // Se não tem usuário logado, orienta a fazer login/cadastro
    if (!freshUser?.id) {
      toast.dismiss('checkout-loading');
      toast.error('Faça login para efetuar o pagamento. Ainda não tem conta? Cadastre-se agora, leva menos de 1 minuto!', { duration: 6000 });
      setIsProcessing(false);
      // Abre o modal de login do Layout
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }

    try {
      // ═══════════════════════════════════════════════════════════
      // PASSO 1: GERAR PIX/PAGAMENTO PRIMEIRO (igual AuctionCheckoutModern)
      // Chamada direta e imediata — sem operações pesadas antes
      // ═══════════════════════════════════════════════════════════
      const paymentPayload = {
        buyer_id: freshUser.id,
        buyer_name: formData.name.trim(),
        buyer_email: formData.email.trim(),
        buyer_cpf: formData.cpf.replace(/\D/g, ''),
        buyer_phone: formData.phone.replace(/\D/g, ''),
        amount: totalAmount,
        billing_type: paymentType,
        description: `Pedido - ${cartItems.length} item(s) da loja virtual`
      };

      if (paymentType === 'CREDIT_CARD') {
        const [expMonth, expYear] = cardExpiry.split('/');
        paymentPayload.card_data = {
          holderName: cardName.trim(),
          number: cardNumber.replace(/\s/g, ''),
          expiryMonth: expMonth,
          expiryYear: `20${expYear}`,
          ccv: cardCvv
        };
      }

      // Saldo de comissão (commission_balance) — redime comissão em produto da plataforma.
      // Validação de preço/estoque/saldo e baixa são ATÔMICAS no servidor (comprar_com_saldo).
      if (paymentType === 'SALDO') {
        const pay = await base44.functions.invoke('payWithBalance', {
          buyer_id: freshUser.id,
          buyer_name: formData.name.trim(),
          buyer_phone: formData.phone.replace(/\D/g, ''),
          buyer_address: deliveryMethod === 'delivery' ? `${formData.street}, ${formData.number} ${formData.complement || ''} - ${formData.neighborhood}, ${formData.city}/${formData.state}`.trim() : 'Retirada',
          buyer_cep: formData.cep.replace(/\D/g, ''),
          items: cartItems.map((it) => ({ product_id: it.id, quantity: it.quantity || 1 })),
          seller_id: sessionStorage.getItem('referralSellerId') || null,
        });
        toast.dismiss('checkout-loading');
        if (!pay?.success) {
          toast.error(pay?.error === 'Saldo insuficiente'
            ? `Saldo insuficiente. Você tem ${money(pay?.saldo || saldo)} e o pedido é ${money(pay?.total || totalAmount)}.`
            : 'Não foi possível pagar com saldo: ' + (pay?.error || 'tente novamente'));
          setIsProcessing(false);
          return;
        }
        // sucesso — limpa carrinho e mostra confirmação
        localStorage.setItem('catalogCart', '[]');
        setCartItems([]);
        setSaldo(Number(pay.novo_saldo) || 0);
        setCreatedSales([{ id: pay.sale_id }]);
        setSaldoOk(true);
        toast.success(`✅ Compra paga com saldo! Restam ${money(pay.novo_saldo)} na carteira.`, { duration: 5000 });
        return;
      }

      // Cartão via Stripe Checkout (página hospedada e segura) — redireciona pro pagamento
      if (paymentType === 'CREDIT_CARD') {
        const st = await base44.functions.invoke('createStripeCheckout', {
          items: cartItems.map((it) => ({ product_id: it.id, quantity: it.quantity || 1 })),
          buyer: { id: freshUser.id, name: formData.name.trim(), email: formData.email.trim(), cpf: formData.cpf.replace(/\D/g, '') },
          delivery_type: deliveryMethod,
          address: { street: formData.street, number: formData.number, complement: formData.complement, neighborhood: formData.neighborhood, city: formData.city, state: formData.state, zip: formData.cep },
          ref_code: sessionStorage.getItem('referralCode') || '',
        });
        toast.dismiss('checkout-loading');
        if (!st?.success || !st?.url) { toast.error('Erro ao iniciar pagamento: ' + (st?.error || 'tente novamente')); return; }
        window.location.href = st.url; // checkout hospedado da Stripe
        return;
      }

      // PIX via Mercado Pago — cria a venda + gera o PIX (valor validado no servidor, anti-fraude)
      if (paymentType === 'PIX') {
        const mp = await base44.functions.invoke('createMPPix', {
          items: cartItems.map((it) => ({ product_id: it.id, quantity: it.quantity || 1 })),
          buyer: { id: freshUser.id, name: formData.name.trim(), email: formData.email.trim(), cpf: formData.cpf.replace(/\D/g, '') },
          delivery_type: deliveryMethod,
          address: { street: formData.street, number: formData.number, complement: formData.complement, neighborhood: formData.neighborhood, city: formData.city, state: formData.state, zip: formData.cep },
          ref_code: sessionStorage.getItem('referralCode') || '',
        });
        toast.dismiss('checkout-loading');
        if (!mp?.success) { toast.error('Erro ao gerar PIX: ' + (mp?.error || 'tente novamente')); return; }
        setCreatedSales([{ id: mp.sale_id }]);
        setPixData({
          billing_type: 'PIX',
          payment_id: mp.payment_id,
          pix_qr_code: mp.qr_code_base64 ? `data:image/png;base64,${mp.qr_code_base64}` : null,
          pix_payload: mp.pix_code,
          sale_id: mp.sale_id,
          ticket_url: mp.ticket_url,
        });
        return; // createMPPix já criou a venda — não segue o fluxo antigo (ASAAS stub)
      }

      const paymentRaw = await base44.functions.invoke('createAsaasPayment', paymentPayload);
      const paymentResponse = paymentRaw?.data || paymentRaw;

      toast.dismiss('checkout-loading');

      if (!paymentResponse?.success) {
        // Erro no pagamento — mostra mensagem e sai
        const errorMsg = paymentResponse?.error || 'Erro na transação. Verifique seus dados.';
        const errorDetails = paymentResponse?.details;
        if (errorDetails && Array.isArray(errorDetails)) {
          const asaasError = errorDetails.map(e => e.description).join(', ');
          toast.error(asaasError.toLowerCase().includes('cpf')
            ? 'CPF inválido ou não encontrado. Verifique os dados.'
            : `Erro no pagamento: ${asaasError}`);
        } else {
          toast.error(`Erro: ${errorMsg}`);
        }
        return; // finally reseta isProcessing
      }

      // Verificar se cartão foi recusado imediatamente
      const isRejected = paymentResponse.asaas_status === 'REJECTED' || paymentResponse.asaas_status === 'FAILED';
      if (isRejected) {
        toast.error('Pagamento recusado pela operadora do cartão. Tente novamente ou use outro meio de pagamento.');
        return; // finally reseta isProcessing
      }

      // ═══════════════════════════════════════════════════════════
      // PASSO 2: PAGAMENTO GERADO COM SUCESSO — agora registra vendas
      // Isso acontece DEPOIS do PIX/pagamento estar garantido
      // ═══════════════════════════════════════════════════════════
      const referralCode = sessionStorage.getItem('referralCode');
      let licenseeId = 'site_official';
      let licenseeData = null;

      if (referralCode) {
        try {
          const licensees = await base44.entities.AppUser.filter({ referral_code: referralCode });
          if (licensees?.[0]) { licenseeData = licensees[0]; licenseeId = licenseeData.id; }
        } catch (e) { /* ignora — não bloqueia pagamento */ }
      }

      // Criar CatalogSales via bulkCreate (1 chamada, não N)
      const salesToCreate = cartItems.map(item => {
        const price = item.price_catalog || item.selling_price_wholesale || 0;
        return {
          product_id: item.id,
          product_title: item.description,
          product_image: item.image_urls?.[0] || '',
          sale_price: price,
          quantity: item.quantity || 1,
          total_amount: price * (item.quantity || 1),
          buyer_id: freshUser.id,
          buyer_name: formData.name,
          buyer_email: formData.email,
          buyer_phone: formData.phone,
          licensee_id: licenseeId,
          licensee_name: licenseeData?.full_name || null,
          licensee_plan: licenseeData?.primary_career_level || null,
          referred_by_code: referralCode || '',
          referral_code: referralCode || null,
          status: 'pending_payment',
          asaas_payment_id: paymentResponse.payment_id || null,
          delivery_type: deliveryMethod,
          address_street: formData.street,
          address_number: formData.number,
          address_complement: formData.complement,
          address_neighborhood: formData.neighborhood,
          address_city: formData.city,
          address_state: formData.state,
          address_zip_code: formData.cep
        };
      });

      let allCreatedSales = [];
      try {
        const createdSalesResult = await base44.entities.CatalogSale.bulkCreate(salesToCreate);
        allCreatedSales = createdSalesResult || [];
      } catch (e) {
        console.warn('CatalogSale.bulkCreate falhou, tentando individualmente:', e.message);
        for (const saleData of salesToCreate) {
          try {
            const sale = await base44.entities.CatalogSale.create(saleData);
            allCreatedSales.push(sale);
          } catch (createErr) {
            console.warn('Erro ao criar CatalogSale individual:', createErr.message);
          }
        }
      }
      setCreatedSales(allCreatedSales);

      // 🔗 VINCULAÇÃO CRÍTICA: Atualizar AsaasPayment com os IDs das CatalogSales
      // Sem isso, o webhook ASAAS não consegue encontrar quais vendas atualizar para 'paid'
      if (allCreatedSales.length > 0 && paymentResponse.payment_id) {
        const saleIds = allCreatedSales.map(s => s.id).filter(Boolean).join(',');
        if (saleIds) {
          try {
            await base44.functions.invoke('linkPaymentToCatalogSale', {
              payment_id: paymentResponse.payment_id,
              catalog_sale_ids: saleIds
            });
            console.log('✅ AsaasPayment vinculado às CatalogSales:', saleIds);
          } catch (linkErr) {
            console.warn('⚠️ Erro ao vincular (não-bloqueante):', linkErr.message);
          }
        }
      }

      // ═══════════════════════════════════════════════════════════
      // PASSO 3: EXIBIR RESULTADO — salvar snapshot e mostrar QR
      // ═══════════════════════════════════════════════════════════
      setCheckoutItems([...cartItems]);
      setPixData({ ...paymentResponse, billing_type: paymentType });
      toast.success(paymentType === 'PIX' ? '✅ PIX gerado!' : '✅ Pagamento processado!');

      // Limpa carrinho
      updateCart([]);

    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.dismiss('checkout-loading');
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de negociar sobre meu pedido da loja virtual.');
    window.open(`https://wa.me/5521999999999?text=${message}`, '_blank');
  };

  const states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('Catalog'))}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Finalizar Pedido</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Formulários */}
          <div className="space-y-4">

            {/* Seção 1 - Seus Dados */}
            <Card className="bg-gray-800 border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-white">Seus dados</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Nome</Label>
                  <Input
                    placeholder="Informe o seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Celular</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-md px-3 text-gray-300 text-sm h-11">
                        <span>BR</span>
                        <span>+55</span>
                      </div>
                      <Input
                        placeholder="Telefone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 flex-1 h-11"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">CPF</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                      maxLength={14}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Email</Label>
                  <Input
                    type="email"
                    placeholder="seu.email@provedor.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                  />
                </div>
              </div>
            </Card>

            {/* Seção 2 - Forma de Entrega */}
            <Card className="bg-gray-800 border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg font-semibold text-white">Como gostaria de receber o pedido</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Escolha a forma de entrega</Label>
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1.5 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="delivery" className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Entrega em domicílio
                        </div>
                      </SelectItem>
                      <SelectItem value="pickup" className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          Retirada na Loja
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deliveryMethod === 'pickup' && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Endereço para retirada:</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Estrada do Pontal, 6500 - Recreio dos Bandeirantes, Rio de Janeiro - RJ, 22790877
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">CEP</Label>
                        <Input
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={handleCepChange}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                          maxLength={9}
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Número</Label>
                        <Input
                          placeholder="Número"
                          value={formData.number}
                          onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300 text-sm">Endereço</Label>
                      <Input
                        placeholder="Nome da rua ou avenida"
                        value={formData.street}
                        onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">Bairro</Label>
                        <Input
                          placeholder="Bairro"
                          value={formData.neighborhood}
                          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Complemento</Label>
                        <Input
                          placeholder="Complemento"
                          value={formData.complement}
                          onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">Cidade</Label>
                        <Input
                          placeholder="Cidade"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Estado</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1.5 h-11">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                            {states.map(state => (
                              <SelectItem key={state} value={state} className="text-white hover:bg-gray-700">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Banner WhatsApp */}
                <div
                  onClick={openWhatsApp}
                  className="bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-600/30 rounded-lg p-4 cursor-pointer hover:from-green-600/30 transition-all"
                >
                  <p className="text-green-400 text-sm">
                    <span className="font-semibold">A gente adora negociar!</span>{' '}
                    <span className="text-green-300">
                      Chama no Zap que a gente conversa sobre tudo — inclusive o frete.
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Coluna Direita - Resumo do Pedido */}
          <div className="space-y-4">
            {/* Seu Pedido */}
            <Card className="bg-gray-800 border-gray-700 border-2 border-green-600/30 p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">🛒</span>
                Seu pedido
              </h2>

              {(pixData ? checkoutItems : cartItems).length === 0 ? (
                <p className="text-gray-400 text-center py-8">Seu carrinho está vazio</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {(pixData ? checkoutItems : cartItems).map((item) => {
                      const price = item.price_catalog || item.selling_price_wholesale || 0;
                      const imageUrl = item.image_urls?.[0] || 'https://via.placeholder.com/80';

                      return (
                        <div key={item.id} className="flex gap-4 p-4 bg-gray-700/40 rounded-xl border border-gray-600/50">
                          <img
                            src={imageUrl}
                            alt={item.description}
                            className="w-28 h-28 object-cover rounded-xl bg-gray-700"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="text-white font-medium line-clamp-2">
                                {item.description}
                              </h4>
                              <p className="text-green-400 font-bold text-lg mt-2">
                                R$ {price.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-gray-600 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                  className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-white text-base w-10 text-center font-bold">{item.quantity || 1}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                  className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-600 pt-6 mt-6 space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-400">Total de itens ({(pixData ? checkoutItems : cartItems).reduce((sum, item) => sum + (item.quantity || 1), 0)} itens)</span>
                      <span className="text-white font-medium">R$ {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-400">Valor do frete</span>
                      <span className="text-green-400 font-medium">A combinar</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-600">
                      <span className="text-white">Valor total</span>
                      <span className="text-green-400">R$ {calculateSubtotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Cupom e Observação lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aplicar Cupom */}
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-white font-medium mb-3">Aplicar cupom</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cupons em breve..."
                    disabled={true}
                    className="bg-gray-700 border-gray-600 text-gray-500 placeholder:text-gray-500 flex-1 h-10 opacity-60 cursor-not-allowed"
                  />
                  <Button
                    disabled={true}
                    className="bg-gray-700 border-gray-600 text-gray-500 h-10 opacity-60 cursor-not-allowed"
                  >
                    Em breve
                  </Button>
                </div>
              </Card>

              {/* Observação */}
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-white font-medium mb-3">Adicionar uma observação</h3>
                <textarea
                  placeholder="Observações sobre o pedido"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white placeholder:text-gray-500 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </Card>
            </div>

            {/* Forma de Pagamento — APENAS PIX */}
            {!pixData && cartItems.length > 0 && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                <h3 className="text-white font-medium mb-4">Forma de Pagamento</h3>

                {/* PIX (Mercado Pago) */}
                <button type="button" onClick={() => setPaymentType('PIX')}
                  className={`w-full text-left p-3 rounded-lg border-2 mb-3 transition-colors ${paymentType === 'PIX' ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'}`}>
                  <p className="text-white font-semibold">💚 PIX</p>
                  <p className="text-gray-400 text-xs">Aprovação imediata</p>
                </button>

                {/* Cartão de Crédito (Stripe) */}
                <button type="button" onClick={() => setPaymentType('CREDIT_CARD')}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${paymentType === 'CREDIT_CARD' ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'}`}>
                  <p className="text-white font-semibold">💳 Cartão de Crédito</p>
                  <p className="text-gray-400 text-xs">Pagamento seguro — até 12x</p>
                </button>

                {/* Saldo da carteira (comissões) — só aparece pra quem tem saldo */}
                {saldo > 0 && (
                  <button type="button" onClick={() => setPaymentType('SALDO')}
                    className={`w-full text-left p-3 rounded-lg border-2 mt-3 transition-colors ${paymentType === 'SALDO' ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'} ${calculateSubtotal() > saldo ? 'opacity-60' : ''}`}>
                    <p className="text-white font-semibold">👛 Saldo da carteira <span className="text-green-400">({money(saldo)})</span></p>
                    <p className="text-gray-400 text-xs">{calculateSubtotal() > saldo ? `Saldo insuficiente p/ este pedido (${money(calculateSubtotal())})` : 'Use suas comissões — aprovação na hora'}</p>
                  </button>
                )}
              </Card>
            )}

            {/* QR Code PIX ou Sucesso */}
            {pixData && pixData.billing_type === 'PIX' && !pixConfirmed && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                {/* ESTADO 1: Pagamento detectado — contagem regressiva */}
                {paymentDetected && countdown > 0 ? (
                  <div className="text-center py-6">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="6" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${(countdown / 5) * 264} 264`}
                          className="transition-all duration-1000 ease-linear"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-black text-green-400">{countdown}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                      <h3 className="text-xl font-bold text-green-400">Pagamento Identificado!</h3>
                    </div>
                    <p className="text-gray-300 text-sm">Estamos atualizando seu pedido...</p>
                    <div className="mt-4 bg-green-600/10 border border-green-500/30 rounded-lg p-3">
                      <p className="text-green-300 text-xs">Tudo certo! Sua compra está sendo processada com segurança.</p>
                    </div>
                  </div>
                ) : (
                  /* ESTADO 2: Aguardando pagamento — QR Code normal */
                  <>
                    <h3 className="text-lg font-bold text-green-400 text-center mb-4">💚 Pague com PIX</h3>

                    {/* Indicador de monitoramento */}
                    <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <p className="text-blue-400 text-xs">Monitorando pagamento em tempo real...</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 mb-4">
                      {pixData.pix_qr_code ? (
                        <img
                          src={pixData.pix_qr_code}
                          alt="QR Code PIX"
                          className="w-full max-w-[280px] mx-auto"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                          Carregando QR Code...
                        </div>
                      )}
                    </div>

                    {/* Aviso de expiração */}
                    <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                      <p className="text-yellow-400 text-xs text-center">
                        ⏰ Este código expira em 15 minutos
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.pix_payload);
                        toast.success('Código PIX copiado!');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold mb-3"
                    >
                      <Copy className="w-5 h-5 mr-2" />
                      Copiar Código PIX
                    </Button>
                    <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-400 mb-2">Código PIX (Copia e Cola):</p>
                      <p className="text-xs text-white font-mono break-all">{pixData.pix_payload}</p>
                    </div>

                    <Button
                      onClick={() => {
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        setPixData(null);
                        setPixConfirmed(false);
                        setPaymentDetected(false);
                        setCountdown(0);
                        setPaymentType('PIX');
                      }}
                      variant="outline"
                      className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 mb-2"
                    >
                      Alterar Forma de Pagamento
                    </Button>
                    <Button
                      onClick={() => navigate(createPageUrl('MyCatalogOrders') + '?filter=paid')}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      Ver Meus Pedidos
                    </Button>
                  </>
                )}
              </Card>
            )}

            {/* Sucesso PIX (igual ao cartão) */}
            {pixData && pixData.billing_type === 'PIX' && pixConfirmed && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                <h3 className="text-lg font-bold text-green-400 text-center mb-4">✅ Pagamento Confirmado</h3>
                <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30 mb-4">
                  <p className="text-green-400 text-center">Pagamento PIX confirmado com sucesso!</p>
                  <p className="text-gray-400 text-sm text-center mt-2">Seu pedido está sendo processado.</p>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl('MyCatalogOrders') + '?filter=paid')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Ver Meus Pedidos
                </Button>
              </Card>
            )}

            {/* Sucesso Saldo */}
            {saldoOk && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                <h3 className="text-lg font-bold text-green-400 text-center mb-4">✅ Compra Confirmada</h3>
                <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30 mb-4">
                  <p className="text-green-400 text-center">Pago com saldo da carteira!</p>
                  <p className="text-gray-400 text-sm text-center mt-2">Saldo restante: <span className="text-white font-semibold">{money(saldo)}</span></p>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl('MyCatalogOrders') + '?filter=paid')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Ver Meus Pedidos
                </Button>
              </Card>
            )}

            {/* Sucesso Cartão (mantido para compatibilidade caso existam pagamentos antigos) */}

            {/* Botão Pagar */}
            {!pixData && !saldoOk && (
              <Button
                onClick={handleCheckout}
                disabled={isProcessing || cartItems.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-bold rounded-full disabled:opacity-50 shadow-lg shadow-green-600/30"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {paymentType === 'CREDIT_CARD' ? 'PAGAR COM CARTÃO' : paymentType === 'SALDO' ? 'PAGAR COM SALDO' : 'GERAR PIX'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}