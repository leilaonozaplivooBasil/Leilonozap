import React, { useState, useEffect, useRef } from 'react';
import { fmtBR } from '@/lib/money';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  ShoppingCart,
  Copy,
  ArrowLeft,
  Check,
  Lock,
  CreditCard,
  QrCode,
  AlertCircle,
  Wallet,
  ChevronDown,
  User,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import PaymentErrorModal from '@/components/payment/PaymentErrorModal';
import { useCopiarPix } from '@/hooks/useCopiarPix';

const Auction = base44.entities.Auction;

export default function AuctionCheckoutModern() {
  const { copiado: pixCopiado, copiar: copiarPix } = useCopiarPix();
  const navigate = useNavigate();
  const location = useLocation();
  const [isWalletDeposit, setIsWalletDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositType, setDepositType] = useState(null); // 'digital_wallet' ou null
  const [returnTo, setReturnTo] = useState(null); // URL de origem para voltar após confirmação
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  const [auction, setAuction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Estado do popup de erro
  const [paymentError, setPaymentError] = useState({ show: false, title: '', description: '', details: null });
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [paymentType, setPaymentType] = useState('PIX');
  const isInvestidor = currentUser?.role === 'investidor';

  // Garante que investidor só pague com PIX
  React.useEffect(() => {
    if (isInvestidor && paymentType !== 'PIX') {
      setPaymentType('PIX');
    }
  }, [isInvestidor]);
  const [pixData, setPixData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('info'); // 'info', 'payment', 'success'
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const initialTimeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const autoSubmitTriggered = useRef(false);

  // Cartão de crédito
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Accordion states
  const [expandedSection, setExpandedSection] = useState('personal');

  // Validar seções
  const isPersonalComplete = firstName?.trim() && email?.trim() && phone?.trim() && cpf?.trim();
  const isAddressComplete = addressStreet?.trim() && addressNumber?.trim() && addressCity?.trim() && addressState?.trim() && addressZip?.trim();

  const searchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setAddressStreet(prev => data.logradouro || prev);
      setAddressNeighborhood(prev => data.bairro || prev);
      setAddressCity(prev => data.localidade || prev);
      setAddressState(prev => data.uf || prev);
      toast.success('Endereço preenchido automaticamente');
    } catch (e) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
    setAddressZip(v);
    if (v.replace(/\D/g, '').length === 8) searchCep(v);
  };

  // Validar CPF com check-sum (algoritmo simples)
  const validateCpf = (cpfStr) => {
    const cpf = cpfStr.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; // Rejeita CPF com todos os dígitos iguais

    // Valida primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let digit1 = (sum * 10) % 11;
    if (digit1 === 10) digit1 = 0;

    // Valida segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    let digit2 = (sum * 10) % 11;
    if (digit2 === 10) digit2 = 0;

    return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
  };

  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    const fields = [
      { value: firstName, key: 'firstName', name: 'Nome', section: 'personal' },
      { value: cpf, key: 'cpf', name: 'CPF', section: 'personal' },
      { value: email, key: 'email', name: 'Email', section: 'personal' },
      { value: phone, key: 'phone', name: 'Telefone', section: 'personal' },
      { value: addressStreet, key: 'addressStreet', name: 'Rua', section: 'address' },
      { value: addressNumber, key: 'addressNumber', name: 'Número', section: 'address' },
      { value: addressCity, key: 'addressCity', name: 'Cidade', section: 'address' },
      { value: addressState, key: 'addressState', name: 'Estado', section: 'address' },
      { value: addressZip, key: 'addressZip', name: 'CEP', section: 'address' }
    ];

    for (let field of fields) {
      if (!field.value?.trim()) {
        errors[field.key] = `${field.name} é obrigatório`;
      }
    }

    // Valida CPF com algoritmo de check-digit
    if (cpf?.trim() && !validateCpf(cpf)) {
      errors.cpf = 'CPF inválido. Verifique os dígitos e corrija.';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Abre a seção que contém o primeiro erro
      const firstErrorKey = Object.keys(errors)[0];
      const firstField = fields.find(f => f.key === firstErrorKey);
      if (firstField) {
        setExpandedSection(firstField.section);
      }

      const errorCount = Object.keys(errors).length;
      const firstError = Object.values(errors)[0];
      toast.error(errorCount > 1 ? `${errorCount} campos com erro. Corrija para continuar.` : firstError);
      return false;
    }

    return true;
  };

  const validateCardData = () => {
    if (paymentType !== 'CREDIT_CARD') return true;

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length !== 16) {
      toast.error('Cartão deve ter 16 dígitos');
      return false;
    }
    if (!cardMonth || !cardYear) {
      toast.error('Data de validade obrigatória');
      return false;
    }
    if (cardCvv.replace(/\D/g, '').length !== 3) {
      toast.error('CVV deve ter 3 dígitos');
      return false;
    }
    if (!cardHolder.trim()) {
      toast.error('Nome do titular obrigatório');
      return false;
    }
    return true;
  };

  const handleCreatePayment = async () => {
    // 🛡️ GUARD ANTI-DOUBLE-CLICK: Se já está processando, ignora cliques adicionais
    if (isProcessing) return;

    console.log('🔘 handleCreatePayment chamado', { auction: !!auction, auctionId: auction?.id, isProcessing });

    if (!validateForm()) {
      console.log('❌ validateForm falhou', formErrors);
      return;
    }
    if (!validateCardData()) {
      console.log('❌ validateCardData falhou');
      return;
    }
    if (!auction) {
      console.error('❌ auction é null!');
      toast.error('Pedido não encontrado. Volte e tente novamente.');
      return;
    }

    setIsProcessing(true);
    toast.loading('Processando pagamento...', { id: 'checkout-loading' });

    try {
      const amount = isWalletDeposit ? depositAmount : auction.current_price;
      const cardData = paymentType === 'CREDIT_CARD' ? {
        holderName: cardHolder.trim(),
        number: cardNumber.replace(/\D/g, ''),
        expiryMonth: parseInt(cardMonth),
        expiryYear: parseInt(cardYear),
        ccv: cardCvv.replace(/\D/g, ''),
        address: {
          zip_code: addressZip.replace(/\D/g, ''),
          number: addressNumber,
          complement: addressComplement
        }
      } : null;

      console.log('📤 Enviando para backend:', { auction_id: isWalletDeposit ? null : auction.id, amount, billing_type: paymentType });

      // Para depósito de capital de investidor, passa o auction_id real + flag especial
      const isInvestorCapital = depositType === 'investor_capital';

      // 🔒 PIX (qualquer depósito ou arremate) e Cartão passam pela mesma função
      // (createAsaasPayment), que já gera PIX via Mercado Pago em produção e credita
      // o saldo pelo webhook real (mpWebhook → catalog_sales → app_users.saldo_disponivel).
      // "createMercadoPagoDeposit" é uma função exclusiva do Base44 (não existe na Vercel/produção)
      // — chamá-la aqui quebrava o depósito fora do preview com erro "not_implemented".
      const paymentResponse = await base44.functions.invoke('createAsaasPayment', {
          auction_id: isInvestorCapital ? auction.id : (isWalletDeposit ? null : auction.id),
          buyer_id: currentUser?.id || null,
          buyer_name: firstName.trim(),
          buyer_email: email.trim(),
          buyer_cpf: cpf.trim(),
          buyer_phone: phone.trim(),
          amount: amount,
          billing_type: paymentType,
          description: isWalletDeposit
            ? (isInvestorCapital
              ? `Depósito de Capital — Lote de Investimento - R$ ${fmtBR(amount)}`
              : depositType === 'passaporte'
                ? `Passaporte de Lances NoZap - R$ ${fmtBR(amount)}`
                : depositType === 'digital_wallet'
                  ? `Depósito na Carteira Digital - R$ ${fmtBR(amount)}`
                  : `Depósito na Carteira de Comissões - R$ ${fmtBR(amount)}`)
            : `Arremate - ${auction.title}`,
          card_data: cardData,
          deposit_type: depositType,
          is_investor_capital: isInvestorCapital // flag para o backend reconhecer
        });

      console.log('📥 Resposta do backend:', paymentResponse);

      setIsProcessing(false);
      toast.dismiss('checkout-loading');

      const responseData = paymentResponse?.data || paymentResponse;

      if (responseData?.success === true) {
        setPixData(responseData);
        setStep('payment');
        toast.success(paymentType === 'PIX' ? '✅ PIX gerado!' : '✅ Cartão processado!');

        // Salva dados atualizados no AppUser (CPF, telefone, endereço)
        if (currentUser?.id) {
          const updateData = {
            cpf: cpf.trim(),
            phone: phone.trim(),
            address_street: addressStreet.trim(),
            address_number: addressNumber.trim(),
            address_complement: addressComplement.trim(),
            address_neighborhood: addressNeighborhood.trim(),
            address_city: addressCity.trim(),
            address_state: addressState.trim(),
            address_zip_code: addressZip.trim()
          };
          base44.entities.AppUser.update(currentUser.id, updateData).then(() => {
            const saved = localStorage.getItem('currentUser');
            if (saved) {
              const parsed = JSON.parse(saved);
              localStorage.setItem('currentUser', JSON.stringify({ ...parsed, ...updateData }));
            }
          }).catch(() => { });
        }
      } else {
        const errorDetails = responseData?.details || null;
        let errorDescription = responseData?.error || 'Erro desconhecido ao processar pagamento';
        if (Array.isArray(errorDetails) && errorDetails.length > 0 && errorDetails[0].description) {
          errorDescription = errorDetails[0].description;
        }
        console.error('❌ Erro na resposta:', errorDescription, errorDetails);
        setPaymentError({
          show: true,
          title: 'Erro ao Processar Pagamento',
          description: errorDescription,
          details: errorDetails
        });
      }
    } catch (error) {
      console.error('❌ Erro de rede/sistema:', error);
      setIsProcessing(false);
      toast.dismiss('checkout-loading');

      let errorTitle = 'Erro de Comunicação';
      let errorDesc = `Não foi possível conectar ao servidor de pagamento: ${error.message}`;
      let errorDets = null;

      try {
        const errData = error?.response?.data || error?.data;
        if (errData) {
          const details = errData.details;
          if (Array.isArray(details) && details.length > 0 && details[0].description) {
            errorTitle = 'Pagamento Recusado';
            errorDesc = details[0].description;
            errorDets = details;
          } else if (errData.error) {
            errorDesc = errData.error;
            errorDets = details || null;
          }
        }
      } catch (_) { }

      if (error.message?.includes('timeout')) {
        errorDesc = 'O servidor demorou para responder. Tente novamente em instantes.';
      }

      setPaymentError({
        show: true,
        title: errorTitle,
        description: errorDesc,
        details: errorDets
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (!savedUserJSON) {
          toast.error('Faça login para continuar');
          navigate(createPageUrl('Home'));
          return;
        }
        const savedUser = JSON.parse(savedUserJSON);
        setCurrentUser(savedUser);

        // Verifica se veio de AddFunds (depósito de carteira) ou CarteiraInvestidor (depósito de capital)
        const stateAmount = location.state?.amount;
        const stateDepositType = location.state?.depositType; // 'digital_wallet', 'investor_capital' ou null
        const stateAuctionId = location.state?.auctionId; // auction_id para depósito de investidor

        if (stateAmount) {
          setIsWalletDeposit(true);
          setDepositAmount(stateAmount);
          setDepositType(stateDepositType); // Armazena tipo de depósito
          setReturnTo(location.state?.returnTo || null);
          const isInvestorCapital = stateDepositType === 'investor_capital';
          setAuction({
            id: isInvestorCapital ? (stateAuctionId || 'investor-deposit') : (stateDepositType === 'digital_wallet' ? 'digital-wallet-deposit' : 'wallet-deposit'),
            title: isInvestorCapital ? 'Depósito de Capital — Lote de Investimento' : (stateDepositType === 'digital_wallet' ? 'Depósito na Carteira Digital' : 'Depósito de Saldo'),
            current_price: stateAmount,
            image_urls: []
          });
        } else {
          // Modo leilão - procura por auction_id na URL
          const urlParams = new URLSearchParams(window.location.search);
          const auctionId = urlParams.get('auction_id');

          if (!auctionId) {
            toast.error('Operação não encontrada');
            navigate(createPageUrl('Home'));
            return;
          }

          const auctions = await Auction.filter({ id: auctionId });
          if (auctions.length === 0) {
            toast.error('Leilão não encontrado');
            navigate(createPageUrl('MyWinnings'));
            return;
          }
          setAuction(auctions[0]);
        }

        setFirstName(savedUser.full_name || '');
        setEmail(savedUser.email || '');
        setPhone(savedUser.phone || '');
        setCpf(savedUser.cpf || '');
        setAddressStreet(savedUser.address_street || '');
        setAddressNumber(savedUser.address_number || '');
        setAddressComplement(savedUser.address_complement || '');
        setAddressNeighborhood(savedUser.address_neighborhood || '');
        setAddressCity(savedUser.address_city || '');
        setAddressState(savedUser.address_state || '');
        setAddressZip(savedUser.address_zip_code || '');
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [location.state]);

  // Auto-submit PIX para investidores vindos do MarketplaceLotes (pula formulário)
  const [autoSubmitReady, setAutoSubmitReady] = useState(false);

  useEffect(() => {
    if (autoSubmitTriggered.current) return;
    if (isLoading || !auction || !currentUser) return;
    if (!location.state?.autoSubmitPix) return;
    if (step !== 'info') return;

    const hasName = firstName?.trim();
    const hasEmail = email?.trim();
    const hasCpf = cpf?.trim();
    const hasPhone = phone?.trim();

    if (hasName && hasEmail && hasCpf && hasPhone) {
      autoSubmitTriggered.current = true;
      // Preenche endereço padrão se vazio para não travar validação
      if (!addressStreet?.trim()) setAddressStreet('A definir');
      if (!addressNumber?.trim()) setAddressNumber('0');
      if (!addressCity?.trim()) setAddressCity('A definir');
      if (!addressState?.trim()) setAddressState('SP');
      if (!addressZip?.trim()) setAddressZip('00000-000');
      setAutoSubmitReady(true);
    }
  }, [isLoading, auction, currentUser, step, firstName, email, cpf, phone]);

  useEffect(() => {
    if (autoSubmitReady && step === 'info' && !isProcessing) {
      setAutoSubmitReady(false);
      handleCreatePayment();
    }
  }, [autoSubmitReady, addressStreet, addressNumber, addressCity, addressState, addressZip]);

  // Polling para verificar confirmação do pagamento PIX (via backend para contornar RLS)
  useEffect(() => {
    if (step !== 'payment' || !pixData?.payment_id || paymentConfirmed) return;

    const checkPaymentStatus = async () => {
      try {
        const result = await base44.functions.invoke('checkPaymentStatus', {
          payment_id: pixData.payment_id
        });
        const data = result?.data || result;
        if (data?.found && data?.status === 'confirmed') {
          setPaymentConfirmed(true);
          toast.success('✅ Pagamento confirmado! Saldo adicionado.');
        } else if (data?.found && data?.status === 'failed') {
          setPaymentError({
            show: true,
            title: 'Pagamento Recusado',
            description: 'Seu pagamento foi recusado pelo gateway ASAAS. Verifique os dados e tente novamente.',
            details: null
          });
        }
      } catch (e) {
        // silencioso
      }
    };

    // Primeira checagem imediata após 3s
    initialTimeoutRef.current = setTimeout(checkPaymentStatus, 3000);
    intervalRef.current = setInterval(checkPaymentStatus, 5000);
    return () => {
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [step, pixData, paymentConfirmed]);

  // Após recarga confirmada, volta automaticamente para o leilão/loja de origem
  useEffect(() => {
    if (!paymentConfirmed || !isWalletDeposit) return;
    setRedirectCountdown(3);
    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          navigate(returnTo || createPageUrl('Home'), { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [paymentConfirmed, isWalletDeposit]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (!auction) return null;

  const isFormValid = firstName?.trim() && email?.trim() && phone?.trim() && cpf?.trim() &&
    addressStreet?.trim() && addressNumber?.trim() && addressCity?.trim() &&
    addressState?.trim() && addressZip?.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold">Finalizar Compra</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Lock className="w-4 h-4" />
            Transação 100% Segura
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 auto-rows-max lg:auto-rows-auto">
          {/* Coluna Principal - Formulário */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {step === 'info' && (
              <div className="space-y-4">
                {/* Dados Pessoais - Accordion */}
                <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'personal' ? null : 'personal')}
                    className="w-full p-0"
                  >
                    <CardHeader className="pb-4 cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                            {isPersonalComplete ? <Check className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-xl text-white">Dados Pessoais</CardTitle>
                            {isPersonalComplete && <p className="text-xs text-green-400">✓ Completo</p>}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'personal' ? 'rotate-180' : ''
                            }`}
                        />
                      </div>
                    </CardHeader>
                  </button>

                  {expandedSection === 'personal' && (
                    <CardContent className="space-y-4 pt-0">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Nome Completo
                        </label>
                        <Input
                          type="text"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            if (formErrors.firstName) setFormErrors(prev => ({ ...prev, firstName: undefined }));
                          }}
                          placeholder="Seu nome completo"
                          className={`bg-gray-800/50 text-white h-12 ${formErrors.firstName ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'}`}
                        />
                        {formErrors.firstName && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.firstName}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            CPF
                          </label>
                          <Input
                            type="text"
                            value={cpf}
                            onChange={(e) => {
                              setCpf(e.target.value);
                              if (formErrors.cpf) setFormErrors(prev => ({ ...prev, cpf: undefined }));
                            }}
                            placeholder="000.000.000-00"
                            className={`bg-gray-800/50 text-white h-12 ${formErrors.cpf ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'}`}
                          />
                          {formErrors.cpf && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {formErrors.cpf}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Telefone
                          </label>
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }));
                            }}
                            placeholder="(00) 00000-0000"
                            className={`bg-gray-800/50 text-white h-12 ${formErrors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'}`}
                          />
                          {formErrors.phone && (
                            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {formErrors.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                          }}
                          placeholder="seu@email.com"
                          className={`bg-gray-800/50 text-white h-12 ${formErrors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'}`}
                        />
                        {formErrors.email && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.email}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Endereço de Entrega - Accordion */}
                <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'address' ? null : 'address')}
                    className="w-full p-0"
                  >
                    <CardHeader className="pb-4 cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                            {isAddressComplete ? <Check className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-xl text-white">Endereço de Entrega</CardTitle>
                            {isAddressComplete && <p className="text-xs text-green-400">✓ Completo</p>}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'address' ? 'rotate-180' : ''
                            }`}
                        />
                      </div>
                    </CardHeader>
                  </button>

                  {expandedSection === 'address' && (
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            CEP
                          </label>
                          <Input
                            type="text"
                            value={addressZip}
                            onChange={handleCepChange}
                            placeholder="00000-000"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                            disabled={isLoadingCep}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Número
                          </label>
                          <Input
                            type="text"
                            value={addressNumber}
                            onChange={(e) => setAddressNumber(e.target.value)}
                            placeholder="123"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Endereço
                        </label>
                        <Input
                          type="text"
                          value={addressStreet}
                          onChange={(e) => setAddressStreet(e.target.value)}
                          placeholder="Rua ou Avenida"
                          className="bg-gray-800/50 border-gray-700 text-white h-12"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Bairro
                          </label>
                          <Input
                            type="text"
                            value={addressNeighborhood}
                            onChange={(e) => setAddressNeighborhood(e.target.value)}
                            placeholder="Bairro"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Complemento
                          </label>
                          <Input
                            type="text"
                            value={addressComplement}
                            onChange={(e) => setAddressComplement(e.target.value)}
                            placeholder="Apto, sala, etc"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Cidade
                          </label>
                          <Input
                            type="text"
                            value={addressCity}
                            onChange={(e) => setAddressCity(e.target.value)}
                            placeholder="Cidade"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            UF
                          </label>
                          <Input
                            type="text"
                            value={addressState}
                            onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                            placeholder="SP"
                            maxLength="2"
                            className="bg-gray-800/50 border-gray-700 text-white h-12 uppercase"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-blue-300 text-sm flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          Depois do pagamento, falaremos sobre o frete via WhatsApp
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Pagamento com Cartão de Crédito */}
                {paymentType === 'CREDIT_CARD' && (
                  <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-xl text-white">Dados do Cartão</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Nome do Titular
                        </label>
                        <Input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="NOME COMPLETO"
                          className="bg-gray-800/50 border-gray-700 text-white h-12 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Número do Cartão
                        </label>
                        <Input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 16);
                            if (v.length > 0) v = v.match(/.{1,4}/g).join(' ');
                            setCardNumber(v);
                          }}
                          placeholder="0000 0000 0000 0000"
                          maxLength="19"
                          className="bg-gray-800/50 border-gray-700 text-white h-12 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Mês
                          </label>
                          <Input
                            type="text"
                            value={cardMonth}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, '').slice(0, 2);
                              if (v && parseInt(v) > 12) v = '12';
                              setCardMonth(v);
                            }}
                            placeholder="MM"
                            maxLength="2"
                            className="bg-gray-800/50 border-gray-700 text-white h-12 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Ano
                          </label>
                          <Input
                            type="text"
                            value={cardYear}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setCardYear(v);
                            }}
                            placeholder="YYYY"
                            maxLength="4"
                            className="bg-gray-800/50 border-gray-700 text-white h-12 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            CVV
                          </label>
                          <Input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            placeholder="000"
                            maxLength="3"
                            className="bg-gray-800/50 border-gray-700 text-white h-12 text-center font-mono"
                          />
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-yellow-300 text-sm flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          Seus dados de cartão são criptografados e processados de forma segura pela ASAAS
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}


              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-6">
                <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl text-white">
                      {paymentConfirmed ? '✅ Pagamento Confirmado' : 'Pagamento Processado'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {paymentConfirmed ? (
                      <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50">
                          <Check className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Pagamento Recebido!</h3>
                        <p className="text-gray-300">
                          O valor de <span className="text-green-400 font-bold">R$ {fmtBR((isWalletDeposit ? depositAmount : auction.current_price))}</span> foi adicionado à sua conta no Leilão NoZap.
                        </p>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
                          <p className="text-green-300 font-semibold">🎉 Saldo creditado com sucesso!</p>
                          <p className="text-gray-400 text-sm">Seu saldo já está disponível para uso.</p>
                          {isWalletDeposit && redirectCountdown !== null && redirectCountdown > 0 && (
                            <p className="text-green-400 text-sm font-medium">
                              Voltando para {returnTo ? 'onde você estava' : 'a loja'} em {redirectCountdown}s...
                            </p>
                          )}
                        </div>
                        {isWalletDeposit ? (
                          <Button
                            onClick={() => navigate(returnTo || createPageUrl('Home'), { replace: true })}
                            className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                          >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            {returnTo ? 'Voltar Agora' : 'Voltar para a Loja'}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => navigate(createPageUrl('MyWinnings'))}
                            className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                          >
                            <Wallet className="w-5 h-5 mr-2" />
                            Ver Meus Arremates
                          </Button>
                        )}
                      </div>
                    ) : pixData && pixData.billing_type === 'PIX' ? (
                      <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50">
                          <QrCode className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Pague com PIX</h3>
                        <p className="text-gray-400">Escaneie o QR Code abaixo para pagar</p>

                        <div className="bg-white rounded-lg p-6 inline-block">
                          <img
                            src={pixData.pix_qr_code}
                            alt="QR Code PIX"
                            className="w-64 h-64"
                          />
                        </div>

                        <Button
                          onClick={() => copiarPix(pixData.pix_payload)}
                          className={`w-full h-12 text-white font-bold transition-colors ${pixCopiado ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'}`}
                        >
                          {pixCopiado ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {pixCopiado ? 'Código PIX copiado!' : 'Copiar Código PIX'}
                        </Button>

                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <p className="text-xs text-gray-300 mb-2">Ou copie e cole este código:</p>
                          <p className="text-xs text-white font-mono break-all">{pixData.pix_payload}</p>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Aguardando confirmação do pagamento...
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50">
                          <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Pagamento em Processamento</h3>
                        <p className="text-gray-400">Seu cartão está sendo processado</p>
                        <p className="text-sm text-gray-500">Você receberá uma confirmação em breve</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Coluna Lateral - Resumo do Pedido */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl lg:sticky lg:top-8 lg:h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <ShoppingCart className="w-5 h-5" />
                  Seu Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumo */}
                <div className="space-y-3 py-4 border-y border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Valor</span>
                    <span className="text-white">R$ {fmtBR((isWalletDeposit ? depositAmount : auction.current_price))}</span>
                  </div>
                  {!isWalletDeposit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Frete</span>
                      <span className="text-green-400">A combinar</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2">
                    <span className="text-white">Total</span>
                    <span className="text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                      R$ {fmtBR((isWalletDeposit ? depositAmount : auction.current_price))}
                    </span>
                  </div>
                </div>

                {/* Métodos de Pagamento */}
                {step === 'info' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-white">Forma de Pagamento</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                      <button
                        onClick={() => setPaymentType('PIX')}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${paymentType === 'PIX'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-green-500/50'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex-shrink-0 p-2 rounded-lg ${paymentType === 'PIX' ? 'bg-green-500/20 border border-green-400/30' : 'bg-gray-700/50 border border-gray-600'}`}>
                            <QrCode className={`w-4 h-4 ${paymentType === 'PIX' ? 'text-green-400' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-white">PIX</p>
                            <p className="text-xs text-gray-400">Aprovação imediata</p>
                          </div>
                        </div>
                      </button>
                      {!isInvestidor && (
                        <button
                          onClick={() => setPaymentType('CREDIT_CARD')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${paymentType === 'CREDIT_CARD'
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-gray-700 bg-gray-800/30 hover:border-green-500/50'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`flex-shrink-0 p-2 rounded-lg ${paymentType === 'CREDIT_CARD' ? 'bg-green-500/20 border border-green-400/30' : 'bg-gray-700/50 border border-gray-600'}`}>
                              <CreditCard className={`w-4 h-4 ${paymentType === 'CREDIT_CARD' ? 'text-green-400' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-white">Cartão de Crédito</p>
                              <p className="text-xs text-gray-400">Em até 12x</p>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        handleCreatePayment();
                      }}
                      disabled={isProcessing}
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base mt-4"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      )}
                      {isProcessing ? 'Processando...' : 'Continuar com Pagamento'}
                    </Button>

                    <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      Pagamento 100% seguro
                    </p>
                  </div>
                )}

                {step === 'payment' && (
                  isWalletDeposit ? (
                    <Button
                      onClick={() => navigate(returnTo || createPageUrl('Home'), { replace: true })}
                      className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-white font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {returnTo ? 'Voltar ao Leilão' : 'Voltar para a Loja'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate(createPageUrl('MyWinnings'))}
                      className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-white font-semibold"
                    >
                      Ver Meus Arremates
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Modal de Erro de Pagamento */}
      <PaymentErrorModal
        isOpen={paymentError.show}
        onClose={() => setPaymentError({ show: false, title: '', description: '', details: null })}
        errorTitle={paymentError.title}
        errorDescription={paymentError.description}
        errorDetails={paymentError.details}
      />
    </div>
  );
}