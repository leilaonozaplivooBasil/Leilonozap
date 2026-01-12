import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createMPPreference } from '@/functions/createMPPreference';

export default function CheckoutPage() {
    const [auction, setAuction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [preferenceId, setPreferenceId] = useState(null);
    const [publicKey, setPublicKey] = useState(null);
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
    const walletContainerRef = useRef(null);
    const mpInstanceRef = useRef(null);
    const navigate = useNavigate();

    const handleCreatePreference = async () => {
        if (!lastName || lastName.trim() === '') {
            toast.error('Por favor, preencha seu sobrenome');
            return;
        }

        if (!phone || phone.trim() === '') {
            toast.error('Telefone é obrigatório para pagamento');
            return;
        }

        if (!cpf || cpf.trim() === '') {
            toast.error('CPF é obrigatório para pagamento');
            return;
        }

        if (!addressStreet || addressStreet.trim() === '') {
            toast.error('Endereço é obrigatório para entrega');
            return;
        }

        if (!addressNumber || addressNumber.trim() === '') {
            toast.error('Número do endereço é obrigatório');
            return;
        }

        if (!addressCity || addressCity.trim() === '') {
            toast.error('Cidade é obrigatória');
            return;
        }

        if (!addressState || addressState.trim() === '') {
            toast.error('Estado é obrigatório');
            return;
        }

        if (!addressZip || addressZip.trim() === '') {
            toast.error('CEP é obrigatório');
            return;
        }

        if (!auction) {
            toast.error('Leilão não encontrado');
            return;
        }

        try {
            const savedUserJSON = localStorage.getItem('currentUser');
            const savedUser = JSON.parse(savedUserJSON);

            const auctionId = auction.id;
            console.log('🔄 Criando preferência MP para auction:', auctionId);
            const response = await createMPPreference({ 
                auction_id: auctionId,
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
            console.log('📦 Resposta completa MP:', JSON.stringify(response, null, 2));
            
            if (response?.data?.success) {
                console.log('✅ Preference ID:', response.data.preference_id);
                console.log('✅ Public Key:', response.data.public_key);
                
                if (!response.data.preference_id) {
                    toast.error('Erro: Preference ID não retornado');
                    return;
                }
                
                if (!response.data.public_key) {
                    toast.error('Erro: Public Key não retornada');
                    return;
                }
                
                setPreferenceId(response.data.preference_id);
                setPublicKey(response.data.public_key);
            } else {
                console.error('❌ Erro na resposta:', response);
                toast.error(response?.data?.error || 'Erro ao criar preferência de pagamento');
            }

        } catch (error) {
            console.error('Erro:', error);
            toast.error('Erro ao criar preferência de pagamento');
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

                if (!auctionId) {
                    toast.error('Leilão não encontrado');
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                const auctions = await base44.entities.Auction.filter({ id: auctionId });
                if (auctions.length === 0) {
                    toast.error('Leilão não encontrado');
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                setAuction(auctions[0]);
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

    // Carregar SDK do Mercado Pago e renderizar botão
    useEffect(() => {
        console.log('🔍 [SDK Effect] Estado atual:', { 
            preferenceId: preferenceId ? 'SIM' : 'NÃO', 
            publicKey: publicKey ? 'SIM' : 'NÃO',
            prefValue: preferenceId,
            keyValue: publicKey
        });
        
        if (!preferenceId || !publicKey) {
            console.log('⏳ Aguardando preferenceId e publicKey...');
            return;
        }

        console.log('🚀 Iniciando carregamento do SDK MP');

        const loadMercadoPagoSDK = () => {
            // Verificar se já existe
            if (window.MercadoPago) {
                console.log('✅ SDK já carregado, inicializando...');
                initializeMercadoPago();
                return;
            }

            console.log('📥 Carregando SDK do Mercado Pago...');
            
            // Carregar SDK com timeout
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            
            let sdkTimeout = setTimeout(() => {
                console.error('❌ SDK timeout após 15s');
                toast.error('SDK demorou muito para carregar. Verifique conexão.');
            }, 15000);
            
            script.onload = () => {
                clearTimeout(sdkTimeout);
                console.log('✅ SDK carregado com sucesso');
                initializeMercadoPago();
            };
            script.onerror = (error) => {
                clearTimeout(sdkTimeout);
                console.error('❌ Erro ao carregar SDK:', error);
                toast.error('Erro ao carregar SDK. Tente novamente.');
            };
            document.body.appendChild(script);
        };

        const initializeMercadoPago = async () => {
            try {
                console.log('🔧 Inicializando Mercado Pago SDK...');
                console.log('🔑 Public Key:', publicKey);
                console.log('🎫 Preference ID:', preferenceId);
                
                // Verificar se container existe
                const container = document.getElementById('walletBrick_container');
                if (!container) {
                    throw new Error('Container walletBrick_container não encontrado');
                }
                console.log('✅ Container encontrado');

                // Limpar container antes de renderizar
                container.innerHTML = '';
                
                // Inicializar MP com public key recebida do backend
                const mp = new window.MercadoPago(publicKey.trim(), {
                    locale: 'pt-BR'
                });

                mpInstanceRef.current = mp;
                console.log('✅ SDK MP inicializado');

                // Criar Wallet Brick
                const bricksBuilder = mp.bricks();
                console.log('🧱 Criando Wallet Brick...');

                const brick = await bricksBuilder.create('wallet', 'walletBrick_container', {
                    initialization: {
                        preferenceId: preferenceId.trim()
                    },
                    customization: {
                        texts: {
                            valueProp: 'security_safety'
                        }
                    }
                });

                console.log('✅ Wallet Brick criado:', brick);
                console.log('✅ Botão de pagamento renderizado com sucesso!');

            } catch (error) {
                console.error('❌ Erro detalhado ao inicializar MP:', error);
                console.error('Tipo do erro:', error.name);
                console.error('Mensagem:', error.message);
                console.error('Stack:', error.stack);
                
                // Mostrar erro mais detalhado
                if (error.message.includes('public_key')) {
                    toast.error('Chave pública inválida. Verifique as credenciais do Mercado Pago.');
                } else if (error.message.includes('preference')) {
                    toast.error('Erro ao carregar preferência de pagamento.');
                } else {
                    toast.error(`Erro: ${error.message}`);
                }
            }
        };

        loadMercadoPagoSDK();

        // Cleanup
        return () => {
            if (mpInstanceRef.current) {
                const container = document.getElementById('walletBrick_container');
                if (container) {
                    container.innerHTML = '';
                }
            }
        };
    }, [preferenceId, publicKey]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            </div>
        );
    }

    if (!auction) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Finalizar Pagamento</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resumo do Pedido */}
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Resumo do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {auction.image_urls && auction.image_urls[0] && (
                                    <img 
                                        src={auction.image_urls[0]} 
                                        alt={auction.title}
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                )}
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{auction.title}</h3>
                                    <p className="text-gray-400 mt-2">{auction.description}</p>
                                </div>
                                <div className="border-t border-gray-700 pt-4">
                                    <div className="flex justify-between text-lg">
                                        <span className="text-gray-300">Valor do Arremate:</span>
                                        <span className="text-green-400 font-bold">
                                            R$ {auction.current_price.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Método de Pagamento */}
                     <Card className="bg-gray-800 border-gray-700">
                         <CardHeader>
                             <CardTitle className="text-white">Finalizar Pagamento</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             {/* Campo Nome */}
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

                             {/* Campo Sobrenome */}
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

                             {/* Campo Email */}
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

                             {/* Campo Telefone */}
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

                             {/* Campo CPF */}
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

                             {/* SEÇÃO DE ENDEREÇO */}
                             <div className="border-t border-gray-600 pt-4 mt-4">
                                 <h3 className="text-lg font-semibold text-white mb-4">Endereço de Entrega *</h3>

                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         Logradouro *
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

                                 <div className="grid grid-cols-2 gap-3 mt-3">
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

                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2 mt-3">
                                         Bairro *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressNeighborhood}
                                         onChange={(e) => setAddressNeighborhood(e.target.value)}
                                         placeholder="Digite o bairro"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>

                                 <div className="grid grid-cols-2 gap-3 mt-3">
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
                                             Estado *
                                         </label>
                                         <input
                                             type="text"
                                             value={addressState}
                                             onChange={(e) => setAddressState(e.target.value)}
                                             placeholder="SP"
                                             maxLength="2"
                                             className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                             required
                                         />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2 mt-3">
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

                             {/* Container para o Wallet Brick do Mercado Pago */}
                             <div 
                                 id="walletBrick_container" 
                                 ref={walletContainerRef}
                                 style={{ minHeight: '400px', width: '100%' }}
                                 className="flex items-center justify-center"
                             ></div>

                             {(!preferenceId || !publicKey) && (
                                 <div className="space-y-3">
                                     <button
                                         onClick={handleCreatePreference}
                                         disabled={!firstName || firstName.trim() === '' || !lastName || lastName.trim() === '' || !email || email.trim() === '' || !phone || phone.trim() === '' || !cpf || cpf.trim() === '' || !addressStreet || addressStreet.trim() === '' || !addressNumber || addressNumber.trim() === '' || !addressCity || addressCity.trim() === '' || !addressState || addressState.trim() === '' || !addressZip || addressZip.trim() === ''}
                                         className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                         >
                                         {preferenceId ? (
                                             <>
                                                 <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                                                 Carregando opções de pagamento...
                                             </>
                                         ) : (
                                             'Continuar com Pagamento'
                                         )}
                                     </button>
                                     {(!firstName || firstName.trim() === '' || !lastName || lastName.trim() === '' || !email || email.trim() === '' || !phone || phone.trim() === '' || !cpf || cpf.trim() === '' || !addressStreet || addressStreet.trim() === '' || !addressNumber || addressNumber.trim() === '' || !addressCity || addressCity.trim() === '' || !addressState || addressState.trim() === '' || !addressZip || addressZip.trim() === '') && (
                                     <p className="text-xs text-yellow-400">Preencha todos os campos obrigatórios</p>
                                     )}
                                 </div>
                             )}

                             {preferenceId && publicKey && (
                                 <div className="text-xs text-gray-500 mt-2">
                                     <p>Debug: Preference ID carregado</p>
                                     <p>Debug: Public Key carregado</p>
                                 </div>
                             )}

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