import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getMPPublicKey } from '@/functions/getMPPublicKey';
import { createMPPayment } from '@/functions/createMPPayment';

export default function CheckoutPage() {
    const [auction, setAuction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [mpPublicKey, setMpPublicKey] = useState(null);
    const [brickReady, setBrickReady] = useState(false);
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

                // Buscar public key
                const pkResponse = await getMPPublicKey();
                if (pkResponse.data?.public_key) {
                    setMpPublicKey(pkResponse.data.public_key);
                }

                // Carregar SDK do Mercado Pago
                if (!window.MercadoPago) {
                    const script = document.createElement('script');
                    script.src = 'https://sdk.mercadopago.com/js/v2';
                    script.onload = () => setBrickReady(true);
                    script.onerror = () => toast.error('Erro ao carregar SDK de pagamento');
                    document.body.appendChild(script);
                } else {
                    setBrickReady(true);
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

    useEffect(() => {
        if (!brickReady || !mpPublicKey || !auction) return;

        const initPaymentBrick = async () => {
            try {
                const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
                const bricksBuilder = mp.bricks();

                const renderPaymentBrick = async () => {
                    const settings = {
                        initialization: {
                            amount: auction.current_price
                        },
                        customization: {
                            visual: {
                                style: {
                                    theme: 'dark'
                                }
                            }
                        },
                        callbacks: {
                            onReady: () => {
                                console.log('Payment Brick pronto');
                            },
                            onSubmit: async ({ selectedPaymentMethod, formData }) => {
                                console.log('Processando pagamento:', selectedPaymentMethod, formData);
                                
                                try {
                                    const response = await createMPPayment({
                                        auction_id: auction.id,
                                        payment_data: formData
                                    });

                                    if (response.data.success) {
                                        const { status } = response.data;
                                        
                                        if (status === 'approved') {
                                            toast.success('Pagamento aprovado!');
                                            navigate(createPageUrl('PaymentSuccess') + `?auction_id=${auction.id}`);
                                        } else if (status === 'pending') {
                                            toast.success('Pagamento em análise. Aguarde a confirmação.');
                                            navigate(createPageUrl('MyWinnings'));
                                        } else {
                                            toast.error('Pagamento recusado');
                                        }
                                    } else {
                                        toast.error(response.data.error || 'Erro ao processar pagamento');
                                    }
                                } catch (error) {
                                    console.error('Erro:', error);
                                    toast.error('Erro ao processar pagamento');
                                }
                            },
                            onError: (error) => {
                                console.error('Erro no Brick:', error);
                                toast.error('Erro no formulário de pagamento');
                            }
                        }
                    };

                    await bricksBuilder.create('payment', 'paymentBrick_container', settings);
                };

                renderPaymentBrick();
            } catch (error) {
                console.error('Erro ao criar Payment Brick:', error);
                toast.error('Erro ao carregar formulário de pagamento');
            }
        };

        initPaymentBrick();
    }, [brickReady, mpPublicKey, auction]);

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

                    {/* Payment Brick */}
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Método de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!brickReady || !mpPublicKey ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <p>Carregando métodos de pagamento...</p>
                                </div>
                            ) : (
                                <div id="paymentBrick_container"></div>
                            )}
                            <p className="text-xs text-gray-500 text-center mt-4">
                                Pagamento processado via Mercado Pago
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}