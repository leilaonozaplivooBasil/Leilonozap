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
    const walletContainerRef = useRef(null);
    const mpInstanceRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUser = localStorage.getItem('currentUser');
                if (!savedUser) {
                    toast.error('Faça login para continuar');
                    navigate(createPageUrl('Home'));
                    return;
                }
                setCurrentUser(JSON.parse(savedUser));

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

                // Criar preferência de pagamento
                console.log('🔄 Criando preferência MP para auction:', auctionId);
                const response = await createMPPreference({ auction_id: auctionId });
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
                toast.error('Erro ao carregar dados');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Carregar SDK do Mercado Pago e renderizar botão
    useEffect(() => {
        console.log('🔍 Verificando dados MP:', { preferenceId, publicKey });
        
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
            
            // Carregar SDK
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => {
                console.log('✅ SDK carregado com sucesso');
                initializeMercadoPago();
            };
            script.onerror = (error) => {
                console.error('❌ Erro ao carregar SDK:', error);
                toast.error('Erro ao carregar SDK do Mercado Pago. Verifique sua conexão.');
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
                            <div id="walletBrick_container" ref={walletContainerRef}></div>

                            {(!preferenceId || !publicKey) && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    <p className="text-sm text-gray-400">Carregando opções de pagamento...</p>
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