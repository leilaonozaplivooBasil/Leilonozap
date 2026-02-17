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
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

const Auction = base44.entities.Auction;

export default function AuctionCheckoutModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isWalletDeposit, setIsWalletDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  
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
    return true;
  };

  const handleCreatePayment = async () => {
    if (!validateForm()) return;
    if (!auction) {
      toast.error('Pedido não encontrado');
      return;
    }

    setIsProcessing(true);
    toast.loading('Processando pagamento...', { id: 'checkout-loading' });

    try {
      const amount = isWalletDeposit ? depositAmount : auction.current_price;
      const paymentResponse = await base44.functions.invoke('createAsaasPayment', {
        auction_id: isWalletDeposit ? null : auction.id,
        user_id: currentUser.id,
        buyer_name: firstName.trim(),
        buyer_email: email.trim(),
        buyer_cpf: cpf.trim(),
        buyer_phone: phone.trim(),
        amount: amount,
        billing_type: paymentType,
        description: isWalletDeposit ? `Depósito de R$ ${amount.toFixed(2)} na carteira` : `Arremate - ${auction.title}`,
        payment_type: isWalletDeposit ? "wallet_deposit" : "auction"
      });

      setIsProcessing(false);
      toast.dismiss('checkout-loading');

      if (paymentResponse?.data?.success) {
        setPixData({ ...paymentResponse.data, billing_type: paymentType });
        setStep('payment');
        toast.success(paymentType === 'PIX' ? '✅ PIX gerado!' : '✅ Processando...');
      } else {
        toast.error('Erro ao criar pagamento');
        throw new Error(paymentResponse?.data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro:', error.message);
      setIsProcessing(false);
      toast.dismiss('checkout-loading');
      toast.error('Erro ao processar pagamento');
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

        const urlParams = new URLSearchParams(window.location.search);
        const auctionId = urlParams.get('auction_id');

        // Se tem auction_id, carrega leilão; senão é depósito de carteira
        if (auctionId) {
          const auctions = await Auction.filter({ id: auctionId });
          if (auctions.length === 0) {
            toast.error('Leilão não encontrado');
            navigate(createPageUrl('MyWinnings'));
            return;
          }
          setAuction(auctions[0]);
        } else {
          // Modo depósito - cria um "auction" fictício com dados da carteira
          setAuction({
            id: 'wallet-deposit',
            title: 'Depósito de Saldo',
            current_price: 0, // Será atualizado se necessário
            image_urls: []
          });
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
  }, []);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Formulário */}
          <div className="lg:col-span-2">
            {step === 'info' && (
              <div className="space-y-6">
                {/* Dados Pessoais */}
                <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <CardTitle className="text-xl">Dados Pessoais</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">
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
                </Card>

                {/* Endereço de Entrega */}
                <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <CardTitle className="text-xl">Endereço de Entrega</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                </Card>
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
                          <p className="text-xs text-gray-400 mb-2">Ou copie e cole este código:</p>
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
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl sticky top-8 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="w-5 h-5" />
                  Seu Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Produto */}
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 rounded-lg p-4 border border-gray-700/50">
                  <div className="space-y-3">
                    {auction.image_urls && auction.image_urls[0] ? (
                      <img
                        src={auction.image_urls[0]}
                        alt={auction.title}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-700/50 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-white line-clamp-2 mb-2">
                        {auction.title}
                      </h4>
                      <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                        R$ {auction.current_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div className="space-y-3 py-4 border-y border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">R$ {auction.current_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Frete</span>
                    <span className="text-green-400">A combinar</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2">
                    <span>Total</span>
                    <span className="text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                      R$ {auction.current_price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Métodos de Pagamento */}
                {step === 'info' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-300">Forma de Pagamento</p>
                    <div className="grid grid-cols-1 gap-2">
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
                      onClick={handleCreatePayment}
                      disabled={isProcessing || !isFormValid}
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base"
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