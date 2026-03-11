import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
  CreditCard
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
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [createdSales, setCreatedSales] = useState([]);

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

  // 🔄 Real-time + Polling para detectar confirmação de pagamento PIX
  useEffect(() => {
    if (!pixData || pixData.billing_type !== 'PIX' || !createdSales || createdSales.length === 0 || pixConfirmed) return;

    const saleId = createdSales[0].id;
    let hasConfirmed = false;
    const startTime = Date.now();
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos (expiração do PIX)

    // 1️⃣ Real-time subscription
    const unsubscribe = base44.entities.CatalogSale.subscribe((event) => {
      if (event.type === 'update' && event.id === saleId && event.data?.status === 'paid' && !hasConfirmed) {
        hasConfirmed = true;
        console.log('✅ PIX confirmado via real-time:', saleId);
        toast.success('✅ Pagamento PIX Confirmado!', { duration: 3000 });
        setPixConfirmed(true);
      }
    });

    // 2️⃣ Polling de fallback com timeout
    const interval = setInterval(async () => {
      if (hasConfirmed) {
        clearInterval(interval);
        return;
      }

      // Verificar timeout (15 min)
      if (Date.now() - startTime > TIMEOUT_MS) {
        clearInterval(interval);
        toast.warning('⏰ PIX expirado. Gere um novo código.', { duration: 5000 });
        return;
      }

      try {
        const sales = await base44.entities.CatalogSale.filter({ id: saleId });
        if (sales && sales[0]?.status === 'paid') {
          hasConfirmed = true;
          clearInterval(interval);
          console.log('✅ PIX confirmado via polling:', saleId);
          toast.success('✅ Pagamento PIX Confirmado!', { duration: 3000 });
          setPixConfirmed(true);
        }
      } catch (error) {
        console.debug('Polling error:', error.message);
      }
    }, 5000); // Aumentado para 5s (menos requisições)

    setPollingInterval(interval);

    return () => {
      unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [pixData, createdSales, pixConfirmed]);

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
    if (cartItems.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    // Validações
    if (!formData.name.trim()) {
      toast.error('Preencha seu nome');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Preencha seu telefone');
      return;
    }
    if (!formData.cpf.trim()) {
      toast.error('Preencha seu CPF');
      return;
    }
    if (!isValidCpf(formData.cpf)) {
      toast.error('CPF inválido. Verifique os números digitados.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Preencha seu email');
      return;
    }
    if (!currentUser || !currentUser.id) {
      toast.error('Você precisa estar logado para finalizar a compra');
      return;
    }

    if (deliveryMethod === 'delivery') {
      if (!formData.cep.trim() || !formData.street.trim() || !formData.number.trim() || !formData.city.trim()) {
        toast.error('Preencha o endereço completo para entrega');
        return;
      }
    }

    if (paymentType === 'CREDIT_CARD') {
      if (!cardNumber?.trim() || !cardName?.trim() || !cardExpiry?.trim() || !cardCvv?.trim()) {
        toast.error('Preencha todos os dados do cartão');
        return;
      }
    }

    const totalAmount = calculateSubtotal();

    if (totalAmount < 5) {
      toast.error('Valor mínimo para pagamento: R$ 5,00');
      return;
    }

    setIsProcessing(true);
    toast.loading('Processando compra...', { id: 'checkout-loading' });

    const salesBatch = [];

    try {
      const referralCode = sessionStorage.getItem('referralCode');

      // Resolver licensee
      let licenseeId = 'site_official';
      let licenseeData = null;

      if (referralCode) {
        try {
          const licensees = await base44.entities.AppUser.filter({ referral_code: referralCode });
          if (licensees && licensees.length > 0) {
            licenseeData = licensees[0];
            licenseeId = licenseeData.id;
          }
        } catch (e) {
          console.warn('Erro ao buscar licensee:', e.message);
        }
      }

      // Criar CatalogSale para cada produto
      for (const item of cartItems) {
        const price = item.price_catalog || item.selling_price_wholesale || 0;
        const sale = await base44.entities.CatalogSale.create({
          product_id: item.id,
          product_title: item.description,
          product_image: item.image_urls?.[0] || '',
          sale_price: price,
          quantity: item.quantity || 1,
          total_amount: price * (item.quantity || 1),
          buyer_id: currentUser.id,
          buyer_name: formData.name,
          buyer_email: formData.email,
          buyer_phone: formData.phone,
          licensee_id: licenseeId,
          licensee_name: licenseeData?.full_name || null,
          licensee_plan: licenseeData?.primary_career_level || null,
          referred_by_code: referralCode || '',
          referral_code: referralCode || null,
          status: 'pending_payment',
          delivery_type: deliveryMethod,
          address_street: formData.street,
          address_number: formData.number,
          address_complement: formData.complement,
          address_neighborhood: formData.neighborhood,
          address_city: formData.city,
          address_state: formData.state,
          address_zip_code: formData.cep
        });
        salesBatch.push(sale);
      }

      setCreatedSales(salesBatch);

      // Criar pagamento ASAAS único para todo o carrinho
      // 🔒 Envia TODOS os IDs separados por vírgula no campo existente (sem mudar schema)
      const paymentPayload = {
        catalog_sale_id: salesBatch.map(s => s.id).join(','),
        buyer_name: formData.name.trim(),
        buyer_email: formData.email.trim(),
        buyer_cpf: formData.cpf.replace(/\D/g, ''),
        buyer_phone: formData.phone.replace(/\D/g, ''),
        amount: totalAmount,
        billing_type: paymentType,
        description: `Pedido - ${cartItems.length} item(s) do catálogo`
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

      const { data: paymentResponse } = await base44.functions.invoke('createAsaasPayment', paymentPayload);

      setIsProcessing(false);
      toast.dismiss('checkout-loading');

      if (paymentResponse?.success) {
        // 🛡 BLOQUEIO ANTI-FRUSTRAÇÃO: Evitar esvaziar carrinho se o cartão foi recusado imediatamente
        const isRejected = paymentResponse.asaas_status === 'REJECTED' || paymentResponse.asaas_status === 'FAILED';

        if (isRejected) {
          toast.error('Pagamento recusado pela operadora do cartão. Tente novamente ou use outro meio de pagamento.');
          setIsProcessing(false);

          // Limpar as vendas de lote pré-geradas para não travar o estoque ou comissionamento
          for (const sale of salesBatch) {
            try {
              await base44.entities.CatalogSale.delete(sale.id);
            } catch (e) {
              console.warn('Erro ao limpar venda recusada:', e.message);
            }
          }
          setCreatedSales([]);
          return;
        }

        setPixData({ ...paymentResponse, billing_type: paymentType });
        toast.success(paymentType === 'PIX' ? '✅ PIX gerado!' : '✅ Pagamento processado!');

        // Limpa carrinho apenas se o pagamento foi criado E não foi rejeitado
        updateCart([]);
      } else {
        const errorMsg = paymentResponse?.error || 'Erro na transação. Verifique seus dados.';
        const errorDetails = paymentResponse?.details;

        if (errorDetails && Array.isArray(errorDetails)) {
          const asaasError = errorDetails.map(e => e.description).join(', ');
          // Mensagem amigável para CPF inválido
          if (asaasError.toLowerCase().includes('cpf')) {
            toast.error('CPF inválido ou não encontrado. Verifique os dados.');
          } else {
            toast.error(`Erro no pagamento: ${asaasError}`);
          }
        } else {
          toast.error(`Erro: ${errorMsg}`);
        }

        // Limpar vendas criadas em caso de erro
        for (const sale of salesBatch) {
          try {
            await base44.entities.CatalogSale.delete(sale.id);
          } catch (e) {
            console.warn('Erro ao limpar venda:', e.message);
          }
        }
        setCreatedSales([]); // Limpar estado
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      setIsProcessing(false);
      toast.dismiss('checkout-loading');
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);

      // Limpar vendas em caso de erro
      for (const sale of salesBatch) {
        try {
          await base44.entities.CatalogSale.delete(sale.id);
        } catch (e) {
          console.warn('Erro ao limpar:', e.message);
        }
      }
      setCreatedSales([]); // Limpar estado
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de negociar sobre meu pedido do catálogo.');
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

              {cartItems.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Seu carrinho está vazio</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {cartItems.map((item) => {
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
                      <span className="text-gray-400">Total de itens ({cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)} itens)</span>
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

            {/* Forma de Pagamento */}
            {!pixData && cartItems.length > 0 && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                <h3 className="text-white font-medium mb-4">Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setPaymentType('PIX')}
                    className={`p-3 rounded-lg border-2 transition-all ${paymentType === 'PIX'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                  >
                    <p className="text-white font-semibold">PIX</p>
                    <p className="text-gray-400 text-xs">Aprovação imediata</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('CREDIT_CARD')}
                    className={`p-3 rounded-lg border-2 transition-all ${paymentType === 'CREDIT_CARD'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                  >
                    <p className="text-white font-semibold">Cartão</p>
                    <p className="text-gray-400 text-xs">Crédito</p>
                  </button>
                </div>

                {/* Campos do Cartão */}
                {paymentType === 'CREDIT_CARD' && (
                  <div className="space-y-3 pb-4 border-b border-gray-700">
                    <p className="text-sm text-gray-400 font-medium">Dados do Cartão</p>
                    <Input
                      type="text"
                      placeholder="Número do cartão"
                      value={cardNumber}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 16) v = v.slice(0, 16);
                        v = v.match(/.{1,4}/g)?.join(' ') || v;
                        setCardNumber(v);
                      }}
                      maxLength={19}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 4) v = v.slice(0, 4);
                          if (v.length >= 2) v = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
                          setCardExpiry(v);
                        }}
                        maxLength={5}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                      />
                      <Input
                        type="text"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 4) v = v.slice(0, 4);
                          setCardCvv(v);
                        }}
                        maxLength={4}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <Input
                      type="text"
                      placeholder="Nome impresso no cartão"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                )}
              </Card>
            )}

            {/* QR Code PIX ou Sucesso */}
            {pixData && pixData.billing_type === 'PIX' && !pixConfirmed && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                <h3 className="text-lg font-bold text-green-400 text-center mb-4">💚 Pague com PIX</h3>

                {/* Indicador de monitoramento */}
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-blue-400 text-xs">Monitorando pagamento em tempo real...</p>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <img
                    src={pixData.pix_qr_code}
                    alt="QR Code PIX"
                    className="w-full max-w-[280px] mx-auto"
                  />
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
                    if (pollingInterval) clearInterval(pollingInterval);
                    setPixData(null);
                    setPixConfirmed(false);
                    setPaymentType('PIX');
                  }}
                  variant="outline"
                  className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 mb-2"
                >
                  Alterar Forma de Pagamento
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('MyCatalogOrders'))}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Ver Meus Pedidos
                </Button>
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
                  onClick={() => navigate(createPageUrl('MyCatalogOrders'))}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Ver Meus Pedidos
                </Button>
              </Card>
            )}

            {/* Sucesso Cartão */}
            {pixData && pixData.billing_type === 'CREDIT_CARD' && (
              <Card className="bg-gray-800 border-gray-700 p-5">
                <h3 className="text-lg font-bold text-green-400 text-center mb-4">✅ Pagamento Processado</h3>
                <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30 mb-4">
                  <p className="text-green-400 text-center">Cartão de crédito processado com sucesso!</p>
                  <p className="text-gray-400 text-sm text-center mt-2">Aguarde a confirmação.</p>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl('MyCatalogOrders'))}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Ver Meus Pedidos
                </Button>
              </Card>
            )}

            {/* Botão Pagar */}
            {!pixData && (
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
                    <CreditCard className="w-5 h-5 mr-2" />
                    {paymentType === 'PIX' ? 'GERAR PIX' : 'PAGAR COM CARTÃO'}
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