import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingCart, Copy } from 'lucide-react';
import { toast } from 'sonner';

const Product = base44.entities.Product;
const Auction = base44.entities.Auction;
const CatalogSale = base44.entities.CatalogSale;

export default function CatalogCheckout2() {
    const [product, setProduct] = useState(null);
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
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const navigate = useNavigate();

    const searchCep = async (cep) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        setIsLoadingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (data.erro) { toast.error('CEP não encontrado'); return; }
            setAddressStreet(prev => data.logradouro || prev);
            setAddressNeighborhood(prev => data.bairro || prev);
            setAddressCity(prev => data.localidade || prev);
            setAddressState(prev => data.uf || prev);
            toast.success('Endereço preenchido pelo CEP');
        } catch (e) {
            toast.error('Erro ao buscar CEP');
        } finally {
            setIsLoadingCep(false);
        }
    };

    const handleCepChange = (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 8) v = v.slice(0,8);
        if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
        setAddressZip(v);
        if (v.replace(/\D/g,'').length === 8) searchCep(v);
    };

    const handleCreatePreference = async () => {
        // Validações básicas
        if (!firstName?.trim()) {
            toast.error('Preencha o nome');
            return;
        }
        if (!cpf?.trim()) {
            toast.error('CPF é obrigatório');
            return;
        }
        if (!email?.trim()) {
            toast.error('Email é obrigatório');
            return;
        }
        if (!phone?.trim()) {
            toast.error('Telefone é obrigatório');
            return;
        }
        if (!addressStreet?.trim()) {
            toast.error('Rua é obrigatória');
            return;
        }
        if (!addressNumber?.trim()) {
            toast.error('Número é obrigatório');
            return;
        }
        if (!addressCity?.trim()) {
            toast.error('Cidade é obrigatória');
            return;
        }
        if (!addressState?.trim()) {
            toast.error('Estado é obrigatório');
            return;
        }
        if (!addressZip?.trim()) {
            toast.error('CEP é obrigatório');
            return;
        }

        if (!product) {
            toast.error('Produto não encontrado');
            return;
        }

        console.log('✅ Validações OK, processando...');
        setIsProcessing(true);
        toast.loading('Processando compra...', { id: 'checkout-loading' });

        let sale = null;
        try {
            const savedUserJSON = localStorage.getItem('currentUser');
            const savedUser = JSON.parse(savedUserJSON);
            const referralCode = sessionStorage.getItem('referralCode');

            // 🔒 PASSO 1: Resolver licensee_id (ID real, não string)
            let licenseeId = null;
            let licenseeData = null;

            if (referralCode) {
                try {
                    const AppUser = base44.entities.AppUser;
                    const licensees = await AppUser.filter({ referral_code: referralCode });
                    if (licensees && licensees.length > 0) {
                        licenseeData = licensees[0];
                        licenseeId = licenseeData.id;
                        console.log(`✅ Licensee encontrado: ${licenseeData.full_name} (${licenseeId})`);
                    } else {
                        console.warn(`⚠️ Nenhum licensee encontrado para código: ${referralCode}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao buscar licensee:', e.message);
                }
            }

            if (!licenseeId) {
                licenseeId = 'site_official';
                console.log('📍 Usando site_official como padrão');
            }

            // 🔒 PASSO 2: Criar CatalogSale com licensee_id correto
            console.log('🔄 Criando venda com licensee_id:', licenseeId);
            sale = await CatalogSale.create({
                product_id: product.id,
                product_title: product.description,
                product_image: product.image_urls?.[0] || '',
                sale_price: product.price_catalog,
                total_amount: product.price_catalog,
                buyer_id: savedUser.id,
                buyer_name: savedUser.full_name,
                buyer_email: email.trim(),
                buyer_phone: phone.trim(),
                licensee_id: licenseeId,
                licensee_name: licenseeData?.full_name || null,
                licensee_plan: licenseeData?.primary_career_level || null,
                referred_by_code: referralCode || '',
                referral_code: referralCode || null,
                status: 'pending_payment'
            });

            console.log(`🛍️ CatalogSale criada com ID: ${sale.id} | Licensee: ${licenseeId}`);

            // 📊 Registrar rastreamento inicial
            try {
                await base44.functions.invoke('trackPaymentFlow', {
                    payment_id: `checkout_${sale.id}`,
                    product_id: product.id,
                    buyer_id: savedUser.id,
                    licensee_id: licenseeId,
                    referral_code: referralCode || null,
                    catalog_sale_id: sale.id,
                    amount: product.price_catalog,
                    status: 'pending',
                    stage: 'sale_created',
                    event: 'catalog_sale_created'
                });
            } catch (trackErr) {
                console.warn('⚠️ Erro ao registrar rastreamento:', trackErr.message);
            }

            // 🔒 PASSO 3: ASAAS - Criar pagamento
            console.log('📤 Criando pagamento ASAAS...');
            
            const paymentPayload = {
                catalog_sale_id: sale.id,
                buyer_name: firstName.trim(),
                buyer_email: email.trim(),
                buyer_cpf: cpf.trim(),
                buyer_phone: phone.trim(),
                amount: product.price_catalog,
                billing_type: paymentType,
                description: `Catálogo - ${product.description}`
            };

            // Se for cartão, adicionar dados do cartão
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
            
            const paymentResponse = await base44.functions.invoke('createAsaasPayment', paymentPayload);

            setIsProcessing(false);
            toast.dismiss('checkout-loading');

            if (paymentResponse?.data?.success) {
                setPixData({...paymentResponse.data, billing_type: paymentType});
                toast.success(paymentType === 'PIX' ? '✅ PIX gerado!' : '✅ Pagamento processado!');
                
                // Registrar tracking
                try {
                    await base44.functions.invoke('trackPaymentFlow', {
                        payment_id: paymentResponse.data.payment_id,
                        product_id: product.id,
                        buyer_id: savedUser.id,
                        licensee_id: licenseeId,
                        referral_code: referralCode || null,
                        catalog_sale_id: sale.id,
                        amount: product.price_catalog,
                        status: 'pending',
                        stage: 'asaas_payment_created',
                        event: 'asaas_payment_created'
                    });
                } catch (trackErr) {
                    console.warn('⚠️ Erro ao registrar tracking:', trackErr.message);
                }
            } else {
                toast.error('Erro ao criar pagamento');
                throw new Error(paymentResponse?.data?.error || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro:', error.message);
            setIsProcessing(false);
            toast.dismiss('checkout-loading');
            toast.error('Erro ao processar compra');

            // Limpar sale em caso de erro
            if (sale?.id) {
                try {
                    await base44.entities.CatalogSale.delete(sale.id);
                    console.log('🧹 CatalogSale deletada após erro');
                } catch (delErr) {
                    console.warn('⚠️ Erro ao limpar:', delErr.message);
                }
            }
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUserJSON = localStorage.getItem('currentUser');
                if (!savedUserJSON) {
                    toast.error('Faça login para continuar');
                    navigate(createPageUrl('Catalog'));
                    return;
                }
                const savedUser = JSON.parse(savedUserJSON);
                setCurrentUser(savedUser);

                const urlParams = new URLSearchParams(window.location.search);
                const productId = urlParams.get('product_id');
                const auctionId = urlParams.get('auction_id');

                if (!productId && !auctionId) {
                    toast.error('Produto não encontrado');
                    navigate(createPageUrl('Catalog'));
                    return;
                }

                let productData;
                if (auctionId) {
                    // Carregar leilão
                    const auctions = await Auction.filter({ id: auctionId });
                    if (auctions.length === 0) {
                        toast.error('Leilão não encontrado');
                        navigate(createPageUrl('MyWinnings'));
                        return;
                    }
                    const auction = auctions[0];
                    // Converter auction para formato de produto para compatibilidade
                    productData = {
                        id: auction.id,
                        description: auction.title,
                        image_urls: auction.image_urls,
                        price_catalog: auction.current_price,
                        quantity: 1,
                        is_auction: true
                    };
                } else {
                    // Carregar produto do catálogo
                    const products = await Product.filter({ id: productId });
                    if (products.length === 0) {
                        toast.error('Produto não encontrado');
                        navigate(createPageUrl('Catalog'));
                        return;
                    }
                    productData = products[0];
                }

                setProduct(productData);
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
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white">Finalizar Pedido</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* CARD ESQUERDO - SEUS DADOS */}
                    <div className="space-y-6">
                        {/* Card 1 - Seus dados */}
                        <Card className="bg-gray-800/90 border-gray-700">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                                    Seus dados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                
                                {/* Nome */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Nome
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Informe o seu nome"
                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                    />
                                </div>

                                {/* Celular e CPF */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Celular
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Telefone"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            CPF
                                        </label>
                                        <input
                                            type="text"
                                            value={cpf}
                                            onChange={(e) => setCpf(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu_email@provedor.com"
                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2 - Como gostaria de receber o pedido */}
                        <Card className="bg-gray-800/90 border-gray-700">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                                    Como gostaria de receber o pedido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                
                                {/* Escolha forma de entrega */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Escolha a forma de entrega
                                    </label>
                                    <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
                                        <option>🏠 Entrega em domicílio</option>
                                    </select>
                                </div>

                                {/* CEP e Número */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            CEP
                                        </label>
                                        <input
                                            type="text"
                                            value={addressZip}
                                            onChange={handleCepChange}
                                            placeholder="00000-000"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Número
                                        </label>
                                        <input
                                            type="text"
                                            value={addressNumber}
                                            onChange={(e) => setAddressNumber(e.target.value)}
                                            placeholder="Número"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                {/* Endereço */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Endereço
                                    </label>
                                    <input
                                        type="text"
                                        value={addressStreet}
                                        onChange={(e) => setAddressStreet(e.target.value)}
                                        placeholder="Nome da rua ou avenida"
                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                    />
                                </div>

                                {/* Bairro e Complemento */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Bairro
                                        </label>
                                        <input
                                            type="text"
                                            value={addressNeighborhood}
                                            onChange={(e) => setAddressNeighborhood(e.target.value)}
                                            placeholder="Bairro"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Complemento
                                        </label>
                                        <input
                                            type="text"
                                            value={addressComplement}
                                            onChange={(e) => setAddressComplement(e.target.value)}
                                            placeholder="Complemento"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                {/* Cidade e UF */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Cidade
                                        </label>
                                        <input
                                            type="text"
                                            value={addressCity}
                                            onChange={(e) => setAddressCity(e.target.value)}
                                            placeholder="Cidade"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Estado
                                        </label>
                                        <input
                                            type="text"
                                            value={addressState}
                                            onChange={(e) => setAddressState(e.target.value)}
                                            placeholder="UF"
                                            maxLength="2"
                                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Mensagem do frete */}
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4">
                                    <p className="text-green-400 text-sm">
                                        A gente adora negociar! Chama no Zap que a gente conversa sobre tudo — inclusive o frete.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CARD DIREITO - SEU PEDIDO */}
                    <Card className="bg-gray-800/90 border-gray-700 h-fit">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">✓</span>
                                Seu pedido
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Produto */}
                            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                                <div className="flex items-center gap-4">
                                    {product.image_urls && product.image_urls[0] && (
                                        <img 
                                            src={product.image_urls[0]} 
                                            alt={product.description}
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">{product.description}</h3>
                                        <p className="text-green-400 text-lg font-bold">
                                            R$ {product.price_catalog?.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo de valores */}
                            <div className="space-y-3 pt-4 border-t border-gray-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Total de itens (1 itens)</span>
                                    <span className="text-white font-semibold">R$ {product.price_catalog?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Valor do frete</span>
                                    <span className="text-green-400 font-semibold">A combinar</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-gray-700">
                                    <span className="text-white font-bold text-base">Valor total</span>
                                    <span className="text-green-400 font-bold text-xl">R$ {product.price_catalog?.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Cupom e Observação */}
                            <div className="space-y-3 pt-4 border-t border-gray-700">
                                <div>
                                    <p className="text-gray-400 text-sm mb-2">Aplicar cupom</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Insira o cupom aqui"
                                            className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
                                            disabled
                                        />
                                        <button 
                                            className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg text-sm font-semibold cursor-not-allowed"
                                            disabled
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-gray-400 text-sm mb-2">Adicionar uma observação</p>
                                    <textarea
                                        placeholder="Observações sobre o pedido"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
                                    />
                                </div>
                            </div>

                            {/* Forma de Pagamento */}
                            {!pixData && (
                                <div className="pt-4 border-t border-gray-700">
                                    <p className="text-gray-300 text-sm font-medium mb-3">Forma de Pagamento</p>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentType('PIX')}
                                            className={`p-3 rounded-lg border-2 transition-all ${
                                                paymentType === 'PIX'
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
                                            className={`p-3 rounded-lg border-2 transition-all ${
                                                paymentType === 'CREDIT_CARD'
                                                    ? 'border-green-500 bg-green-500/10'
                                                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                                            }`}
                                        >
                                            <p className="text-white font-semibold">Cartão</p>
                                            <p className="text-gray-400 text-xs">Crédito</p>
                                        </button>
                                    </div>

                                    {/* Campos do Cartão - apenas se CREDIT_CARD */}
                                    {paymentType === 'CREDIT_CARD' && (
                                        <div className="space-y-3 mb-4 pb-4 border-b border-gray-700">
                                            <p className="text-sm text-gray-400 font-medium">Dados do Cartão</p>
                                            <input
                                                type="text"
                                                placeholder="Número do cartão"
                                                value={cardNumber}
                                                onChange={(e) => {
                                                    let v = e.target.value.replace(/\D/g, '');
                                                    if (v.length > 16) v = v.slice(0, 16);
                                                    v = v.match(/.{1,4}/g)?.join(' ') || v;
                                                    setCardNumber(v);
                                                }}
                                                maxLength="19"
                                                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="MM/AA"
                                                    value={cardExpiry}
                                                    onChange={(e) => {
                                                        let v = e.target.value.replace(/\D/g, '');
                                                        if (v.length > 4) v = v.slice(0, 4);
                                                        if (v.length >= 2) v = `${v.slice(0,2)}/${v.slice(2,4)}`;
                                                        setCardExpiry(v);
                                                    }}
                                                    maxLength="5"
                                                    className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="CVV"
                                                    value={cardCvv}
                                                    onChange={(e) => {
                                                        let v = e.target.value.replace(/\D/g, '');
                                                        if (v.length > 4) v = v.slice(0, 4);
                                                        setCardCvv(v);
                                                    }}
                                                    maxLength="4"
                                                    className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Nome impresso no cartão"
                                                value={cardName}
                                                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                            />
                                        </div>
                                    )}

                                    {/* Botão Pagar */}
                                    <button
                                        onClick={handleCreatePreference}
                                        disabled={
                                            isProcessing || 
                                            !firstName?.trim() || 
                                            !email?.trim() || 
                                            !phone?.trim() || 
                                            !cpf?.trim() || 
                                            !addressStreet?.trim() || 
                                            !addressNumber?.trim() || 
                                            !addressCity?.trim() || 
                                            !addressState?.trim() || 
                                            !addressZip?.trim() ||
                                            (paymentType === 'CREDIT_CARD' && (!cardNumber?.trim() || !cardName?.trim() || !cardExpiry?.trim() || !cardCvv?.trim()))
                                        }
                                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-5 h-5" />
                                                {paymentType === 'PIX' ? 'GERAR PIX' : 'PAGAR COM CARTÃO'}
                                            </>
                                        )}
                                    </button>
                                    
                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Pagamento processado de forma segura via ASAAS
                                    </p>
                                </div>
                            )}

                            {/* QR Code PIX */}
                            {pixData && pixData.billing_type === 'PIX' && (
                                <div className="space-y-4 pt-4 border-t border-gray-700">
                                    <h3 className="text-lg font-bold text-green-400 text-center">💚 Pague com PIX</h3>
                                    <div className="bg-white rounded-lg p-4">
                                        <img 
                                            src={pixData.pix_qr_code} 
                                            alt="QR Code PIX" 
                                            className="w-full max-w-[280px] mx-auto"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData.pix_payload);
                                            toast.success('Código PIX copiado!');
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <Copy className="w-5 h-5" />
                                        Copiar Código PIX
                                    </button>
                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                        <p className="text-xs text-gray-400 mb-2">Código PIX (Copia e Cola):</p>
                                        <p className="text-xs text-white font-mono break-all">{pixData.pix_payload}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setPixData(null);
                                            setPaymentType('PIX');
                                        }}
                                        className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 rounded-lg border border-gray-500"
                                    >
                                        Alterar Forma de Pagamento
                                    </button>
                                    <button
                                        onClick={() => navigate(createPageUrl('MyCatalogOrders'))}
                                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg"
                                    >
                                        Ver Meus Pedidos
                                    </button>
                                </div>
                            )}

                            {/* Sucesso Cartão */}
                            {pixData && pixData.billing_type === 'CREDIT_CARD' && (
                                <div className="space-y-4 pt-4 border-t border-gray-700">
                                    <h3 className="text-lg font-bold text-green-400 text-center">✅ Pagamento Processado</h3>
                                    <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30">
                                        <p className="text-green-400 text-center">Cartão de crédito processado com sucesso!</p>
                                        <p className="text-gray-400 text-sm text-center mt-2">Aguarde a confirmação.</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(createPageUrl('MyCatalogOrders'))}
                                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg"
                                    >
                                        Ver Meus Pedidos
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}