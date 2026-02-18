import React, { useState, useEffect } from 'react';
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
  Zap,
  AlertCircle,
  Image as ImageIcon,
  Wallet,
  ChevronDown,
  User,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const Auction = base44.entities.Auction;

export default function AuctionCheckoutModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isWalletDeposit, setIsWalletDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositType, setDepositType] = useState(null); // 'digital_wallet' ou null
  
  const [auction, setAuction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
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
  const [pixData, setPixData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('info'); // 'info', 'payment', 'success'
  
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

  const validateForm = () => {
    const fields = [
      { value: firstName, name: 'Nome' },
      { value: cpf, name: 'CPF' },
      { value: email, name: 'Email' },
      { value: phone, name: 'Telefone' },
      { value: addressStreet, name: 'Rua' },
      { value: addressNumber, name: 'Número' },
      { value: addressCity, name: 'Cidade' },
      { value: addressState, name: 'Estado' },
      { value: addressZip, name: 'CEP' }
    ];

    for (let field of fields) {
      if (!field.value?.trim()) {
        toast.error(`${field.name} é obrigatório`);
        return false;
      }
    }

    // Valida CPF com algoritmo de check-digit
    if (!validateCpf(cpf)) {
      toast.error('CPF inválido (verifique os dígitos)');
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
  if (!validateForm()) return;
  if (!validateCardData()) return;
  if (!auction) {
  toast.error('Pedido não encontrado');
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

  const paymentResponse = await base44.functions.invoke('createAsaasPayment', {
    auction_id: isWalletDeposit ? null : auction.id,
    buyer_name: firstName.trim(),
    buyer_email: email.trim(),
    buyer_cpf: cpf.trim(),
    buyer_phone: phone.trim(),
    amount: amount,
    billing_type: paymentType,
    description: isWalletDeposit 
      ? (depositType === 'digital_wallet' 
        ? `Depósito na Carteira Digital - R$ ${amount.toFixed(2)}` 
        : `Depósito na Carteira de Comissões - R$ ${amount.toFixed(2)}`)
      : `Arremate - ${auction.title}`,
    card_data: cardData,
    deposit_type: depositType // Passa flag para backend identificar tipo de depósito
  });

  console.log('📥 Resposta do backend:', paymentResponse);

  setIsProcessing(false);
  toast.dismiss('checkout-loading');

  // ✅ CORREÇÃO: Verificar a estrutura correta da resposta
  const responseData = paymentResponse?.data || paymentResponse;

  if (responseData?.success === true) {
    setPixData(responseData);
    setStep('payment');
    toast.success(paymentType === 'PIX' ? '✅ PIX gerado!' : '✅ Cartão processado!');
  } else {
    const errorMsg = responseData?.error || 'Erro desconhecido ao processar pagamento';
    console.error('❌ Erro na resposta:', errorMsg);
    toast.error(errorMsg);
  }
  } catch (error) {
  console.error('❌ Erro de rede/sistema:', error.message);
  setIsProcessing(false);
  toast.dismiss('checkout-loading');
  toast.error(`Erro: ${error.message}`);
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

        // Verifica se veio de AddFunds (depósito de carteira)
        const stateAmount = location.state?.amount;
        const stateDepositType = location.state?.depositType; // 'digital_wallet' ou null

        if (stateAmount) {
          setIsWalletDeposit(true);
          setDepositAmount(stateAmount);
          setDepositType(stateDepositType); // Armazena tipo de depósito
          setAuction({
            id: stateDepositType === 'digital_wallet' ? 'digital-wallet-deposit' : 'wallet-deposit',
            title: stateDepositType === 'digital_wallet' ? 'Depósito na Carteira Digital' : 'Depósito de Saldo',
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
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedSection === 'personal' ? 'rotate-180' : ''
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
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Seu nome completo"
                          className="bg-gray-800/50 border-gray-700 text-white h-12"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            CPF
                          </label>
                          <Input
                            type="text"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Telefone
                          </label>
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="bg-gray-800/50 border-gray-700 text-white h-12"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="bg-gray-800/50 border-gray-700 text-white h-12"
                        />
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
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedSection === 'address' ? 'rotate-180' : ''
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
                    <CardTitle className="text-xl">Pagamento Processado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {pixData && pixData.billing_type === 'PIX' ? (
                      <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50">
                          <QrCode className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold">Pague com PIX</h3>
                        <p className="text-gray-400">Escaneie o QR Code abaixo para pagar</p>
                        
                        <div className="bg-white rounded-lg p-6 inline-block">
                          <img 
                            src={pixData.pix_qr_code} 
                            alt="QR Code PIX" 
                            className="w-64 h-64"
                          />
                        </div>

                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(pixData.pix_payload);
                            toast.success('Código PIX copiado!');
                          }}
                          className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Código PIX
                        </Button>

                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                           <p className="text-xs text-gray-300 mb-2">Ou copie e cole este código:</p>
                           <p className="text-xs text-white font-mono break-all">{pixData.pix_payload}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50">
                          <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold">Pagamento em Processamento</h3>
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
                    <span className="text-white">R$ {(isWalletDeposit ? depositAmount : auction.current_price).toFixed(2)}</span>
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
                      R$ {(isWalletDeposit ? depositAmount : auction.current_price).toFixed(2)}
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
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          paymentType === 'PIX'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-green-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className={`w-4 h-4 ${paymentType === 'PIX' ? 'text-green-400' : 'text-gray-400'}`} />
                          <div>
                            <p className="font-semibold text-white">PIX</p>
                            <p className="text-xs text-gray-400">Aprovação imediata</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentType('CREDIT_CARD')}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          paymentType === 'CREDIT_CARD'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-green-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className={`w-4 h-4 ${paymentType === 'CREDIT_CARD' ? 'text-green-400' : 'text-gray-400'}`} />
                          <div>
                            <p className="font-semibold text-white">Cartão de Crédito</p>
                            <p className="text-xs text-gray-400">Em até 12x</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <Button
                      onClick={() => {
                        if (!isFormValid) {
                          toast.error('Preencha todos os campos obrigatórios');
                          // Expande a seção incompleta
                          if (!isPersonalComplete) setExpandedSection('personal');
                          else if (!isAddressComplete) setExpandedSection('address');
                          return;
                        }
                        handleCreatePayment();
                      }}
                      disabled={isProcessing}
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base mt-4"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      {isProcessing ? 'Processando...' : 'Continuar com Pagamento'}
                    </Button>

                    <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      Pagamento seguro via ASAAS
                    </p>
                  </div>
                )}

                {step === 'payment' && (
                  <Button
                    onClick={() => navigate(createPageUrl('MyWinnings'))}
                    className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-white font-semibold"
                  >
                    Ver Meus Arremates
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}