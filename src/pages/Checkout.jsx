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
                const response = await createMPPreference({ auction_id: auctionId });
                if (response.data.success) {
                    setPreferenceId(response.data.preference_id);
                } else {
                    toast.error('Erro ao criar preferência de pagamento');
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
        if (!preferenceId) return;

        const loadMercadoPagoSDK = () => {
            // Verificar se já existe
            if (window.MercadoPago) {
                initializeMercadoPago();
                return;
            }

            // Carregar SDK
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => initializeMercadoPago();
            script.onerror = () => {
                toast.error('Erro ao carregar Mercado Pago');
            };
            document.body.appendChild(script);
        };

        const initializeMercadoPago = async () => {
            try {
                const publicKey = 'APP_USR-0cd3a441-3c36-4eda-9c25-e41c1b2b0fc7'; // Sua Public Key

                // Inicializar MP
                const mp = new window.MercadoPago(publicKey, {
                    locale: 'pt-BR'
                });

                mpInstanceRef.current = mp;

                // Criar Wallet Brick
                const bricksBuilder = mp.bricks();

                await bricksBuilder.create('wallet', 'walletBrick_container', {
                    initialization: {
                        preferenceId: preferenceId
                    },
                    customization: {
                        texts: {
                            valueProp: 'security_safety'
                        }
                    }
                });

                console.log('✅ Botão de pagamento renderizado');

            } catch (error) {
                console.error('Erro ao inicializar MP:', error);
                toast.error('Erro ao carregar botão de pagamento');
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
    }, [preferenceId]);

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

                            {!preferenceId && (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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