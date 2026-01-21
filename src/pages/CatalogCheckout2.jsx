import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { createMPPreference } from '@/functions/createMPPreference';

// 🔴 IMPORTANTE: Código Asaas mantido em standby - não remover
// Para reativar Asaas, trocar chamadas de createMPPreference por createAsaasOrder

const Product = base44.entities.Product;
const Auction = base44.entities.Auction;
const CatalogSale = base44.entities.CatalogSale;

export default function CatalogCheckout2() {
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [lastName, setLastName] = useState('');
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
            toast.error('Preencha o primeiro nome');
            return;
        }
        if (!lastName?.trim()) {
            toast.error('Preencha o sobrenome');
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
                    // Buscar usuário pelo referral_code
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

            // Fallback: site_official se não encontrar licensee
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

            // 🔒 PASSO 3: Criar preferência MP com catalog_sale_id vinculado
            console.log('📤 Enviando para Mercado Pago...');
            const response = await createMPPreference({
                product_id: product.is_auction ? null : product.id,
                auction_id: product.is_auction ? product.id : null,
                catalog_sale_id: product.is_auction ? null : sale.id,
                user_data: {
                    id: savedUser.id,
                    email: email.trim(),
                    full_name: savedUser.full_name,
                    phone: phone.trim(),
                    cpf: cpf.trim(),
                    last_name: lastName.trim(),
                    address_street: addressStreet.trim(),
                    address_number: addressNumber.trim(),
                    address_complement: addressComplement.trim(),
                    address_neighborhood: addressNeighborhood.trim(),
                    address_city: addressCity.trim(),
                    address_state: addressState.trim(),
                    address_zip_code: addressZip.trim()
                }
            });

            // Validar resposta de MP
            if (!response?.data?.success || !response?.data?.init_point) {
                console.error('❌ MP falhou');
                toast.dismiss('checkout-loading');
                toast.error(response?.data?.error || 'Erro ao processar pagamento');

                // Limpar sale órfã
                try {
                    await base44.entities.CatalogSale.delete(sale.id);
                    console.log('🧹 CatalogSale deletada');
                } catch (delErr) {
                    console.warn('⚠️ Erro ao limpar:', delErr.message);
                }
                return;
            }

            console.log('✅ Mercado Pago pronto');
            toast.dismiss('checkout-loading');
            toast.success('Redirecionando...');

            // 🔥 Redirecionar para checkout
            window.location.href = response.data.init_point;

        } catch (error) {
            console.error('❌ Erro:', error.message);
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
                setFirstName(savedUser.full_name ? savedUser.full_name.split(' ')[0] : '');
                setLastName(savedUser.full_name ? savedUser.full_name.split(' ').slice(1).join(' ') : '');
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

    // ❌ SDK do Mercado Pago REMOVIDO - agora fazemos redirecionamento direto

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
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Finalizar Pagamento</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resumo do Pedido */}
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-green-400">Resumo do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {product.image_urls && product.image_urls[0] && (
                                    <img 
                                        src={product.image_urls[0]} 
                                        alt={product.description}
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                )}
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{product.description}</h3>
                                    <p className="text-gray-400 mt-2">Estoque: {product.quantity || 0} un.</p>
                                </div>
                                <div className="border-t border-gray-700 pt-4">
                                    <div className="flex justify-between text-lg mb-2">
                                        <span className="text-gray-300">Preço Unitário:</span>
                                        <span className="text-white font-semibold">
                                            R$ {product.price_catalog?.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700 pt-2">
                                        <span className="text-green-400 font-semibold text-xl">Total:</span>
                                        <span className="text-2xl font-bold text-green-400">
                                            R$ {product.price_catalog?.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dados da Entrega */}
                     <Card className="bg-gray-800 border-gray-700">
                         <CardHeader>
                             <CardTitle className="text-green-400">Dados da Entrega</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             {/* Nome */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Primeiro Nome *
                                 </label>
                                 <input
                                     type="text"
                                     value={firstName}
                                     onChange={(e) => setFirstName(e.target.value)}
                                     placeholder="Digite seu primeiro nome"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Sobrenome */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Sobrenome *
                                 </label>
                                 <input
                                     type="text"
                                     value={lastName}
                                     onChange={(e) => setLastName(e.target.value)}
                                     placeholder="Digite seu sobrenome"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* CPF */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     CPF *
                                 </label>
                                 <input
                                     type="text"
                                     value={cpf}
                                     onChange={(e) => setCpf(e.target.value)}
                                     placeholder="000.000.000-00"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Email e Telefone */}
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         Email *
                                     </label>
                                     <input
                                         type="email"
                                         value={email}
                                         onChange={(e) => setEmail(e.target.value)}
                                         placeholder="seu@email.com"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         Telefone *
                                     </label>
                                     <input
                                         type="tel"
                                         value={phone}
                                         onChange={(e) => setPhone(e.target.value)}
                                         placeholder="(11) 99999-9999"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>
                             </div>

                             {/* Rua */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Rua *
                                 </label>
                                 <input
                                     type="text"
                                     value={addressStreet}
                                     onChange={(e) => setAddressStreet(e.target.value)}
                                     placeholder="Rua, Avenida, etc"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Número e Complemento */}
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         Número *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressNumber}
                                         onChange={(e) => setAddressNumber(e.target.value)}
                                         placeholder="123"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
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
                                         placeholder="Apto, Bloco, etc"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     />
                                 </div>
                             </div>

                             {/* Bairro */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Bairro
                                 </label>
                                 <input
                                     type="text"
                                     value={addressNeighborhood}
                                     onChange={(e) => setAddressNeighborhood(e.target.value)}
                                     placeholder="Digite o bairro"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                 />
                             </div>

                             {/* Cidade e UF */}
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         Cidade *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressCity}
                                         onChange={(e) => setAddressCity(e.target.value)}
                                         placeholder="São Paulo"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         UF *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressState}
                                         onChange={(e) => setAddressState(e.target.value)}
                                         placeholder="SP"
                                         maxLength="2"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 uppercase"
                                         required
                                     />
                                 </div>
                             </div>

                             {/* CEP */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     CEP *
                                 </label>
                                 <input
                                     type="text"
                                     value={addressZip}
                                     onChange={(e) => setAddressZip(e.target.value)}
                                     placeholder="00000-000"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             <p className="text-gray-400 text-sm">
                                 Escolha seu método de pagamento preferido:
                             </p>
                             <ul className="text-gray-300 text-sm space-y-2 mb-6">
                                 <li>✓ Cartão de crédito (até 12x)</li>
                                 <li>✓ Cartão de débito</li>
                                 <li>✓ PIX</li>
                                 <li>✓ Boleto bancário</li>
                             </ul>

                             <div className="space-y-3">
                                 <button
                                     onClick={handleCreatePreference}
                                     disabled={!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim() || !cpf?.trim() || !addressStreet?.trim() || !addressNumber?.trim() || !addressCity?.trim() || !addressState?.trim() || !addressZip?.trim()}
                                     className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                 >
                                     <ShoppingCart className="w-5 h-5" />
                                     Confirmar Compra
                                 </button>
                                 {(!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim() || !cpf?.trim() || !addressStreet?.trim() || !addressNumber?.trim() || !addressCity?.trim() || !addressState?.trim() || !addressZip?.trim()) && (
                                     <p className="text-xs text-yellow-400 text-center">
                                         Preencha todos os campos obrigatórios (*)
                                     </p>
                                 )}
                             </div>

                             <p className="text-xs text-gray-500 text-center mt-4">
                                Pagamento processado de forma segura pelo Mercado Pago
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}