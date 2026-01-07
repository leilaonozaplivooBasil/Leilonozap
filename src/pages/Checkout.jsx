import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { createPixPayment } from '@/functions/createPixPayment';
import { checkPixPayment } from '@/functions/checkPixPayment';
import { processCardPayment } from '@/functions/processCardPayment';
import { getMPPublicKey } from '@/functions/getMPPublicKey';
import { checkOrderStatus } from '@/functions/checkOrderStatus';

export default function CheckoutPage() {
    const [auction, setAuction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [pixData, setPixData] = useState(null);
    const [pixOrderId, setPixOrderId] = useState(null);
    const [mpLoaded, setMpLoaded] = useState(false);
    const [mpPublicKey, setMpPublicKey] = useState(null);
    const brickControllerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUser = localStorage.getItem('currentUser');
                if (!savedUser) {
                    alert('Faça login para continuar');
                    navigate(createPageUrl('Home'));
                    return;
                }

                setCurrentUser(JSON.parse(savedUser));

                const auctionId = new URLSearchParams(window.location.search).get('auction_id');
                if (!auctionId) {
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                const auctions = await base44.entities.Auction.filter({ id: auctionId });
                if (!auctions.length) {
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                setAuction(auctions[0]);

                const { data } = await getMPPublicKey();
                setMpPublicKey(data.public_key);

                if (!window.MercadoPago) {
                    const script = document.createElement('script');
                    script.src = 'https://sdk.mercadopago.com/js/v2';
                    script.onload = () => setMpLoaded(true);
                    document.body.appendChild(script);
                } else {
                    setMpLoaded(true);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
        return () => brickControllerRef.current?.unmount();
    }, []);

    const copyPixCode = () => {
        if (pixData?.qr_code) {
            navigator.clipboard.writeText(pixData.qr_code);
            toast.success('Código PIX copiado');
        }
    };

    const startPixPolling = (orderId) => {
        const interval = setInterval(async () => {
            const res = await checkOrderStatus({ order_id: orderId });
            if (res.data?.state === 'approved') {
                clearInterval(interval);
                toast.success('Pagamento confirmado!');
                navigate(createPageUrl('PaymentSuccess') + `?auction_id=${auction.id}`);
            }
        }, 5000);

        setTimeout(() => clearInterval(interval), 600000);
    };

    const handlePixPayment = async () => {
        setIsProcessing(true);
        try {
            const res = await createPixPayment({
                auction_id: auction.id,
                amount: auction.current_price
            });

            if (res.data.success) {
                setPixData(res.data);
                setPixOrderId(res.data.order_id);
                startPixPolling(res.data.order_id);
            } else {
                toast.error(res.data.error || 'Erro ao gerar PIX');
            }
        } catch (error) {
            console.error('Erro PIX:', error);
            toast.error('Erro ao processar PIX');
        } finally {
            setIsProcessing(false);
        }
    };

    const initCardBrick = async () => {
        if (brickControllerRef.current || !mpPublicKey) return;

        const mp = new window.MercadoPago(mpPublicKey, { locale: 'pt-BR' });
        const bricks = mp.bricks();

        const controller = await bricks.create(
            'cardPayment',
            'cardPaymentBrick_container',
            {
                initialization: { amount: auction.current_price },
                callbacks: {
                    onReady: () => {
                        console.log('✅ Card Brick ready');
                    },
                    onSubmit: async (formData) => {
                        if (isProcessing) return;
                        setIsProcessing(true);

                        try {
                            const res = await processCardPayment({
                                auction_id: auction.id,
                                ...formData
                            });

                            if (res.data?.state === 'approved') {
                                navigate(createPageUrl('PaymentSuccess') + `?auction_id=${auction.id}`);
                            } else {
                                toast.error(res.data?.error || 'Pagamento não aprovado');
                            }
                        } catch (error) {
                            console.error('Card payment error:', error);
                            toast.error('Erro ao processar pagamento');
                        } finally {
                            setIsProcessing(false);
                        }
                    },
                    onError: (error) => {
                        console.error('Brick error:', error);
                        toast.error('Erro no formulário de pagamento');
                    }
                }
            }
        );

        brickControllerRef.current = controller;
    };

    useEffect(() => {
        if (paymentMethod === 'card' && mpLoaded && auction) {
            initCardBrick();
        }
    }, [paymentMethod, mpLoaded, auction]);

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
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Finalizar Pagamento</h1>

                <Card className="bg-gray-800 border-gray-700 mb-6">
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

                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">Método de Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!paymentMethod ? (
                            <div className="space-y-4">
                                <p className="text-gray-400 mb-4">
                                    Escolha a forma de pagamento:
                                </p>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => setPaymentMethod('pix')}
                                        className="bg-gray-700/50 hover:bg-gray-700 p-4 rounded-lg flex items-center gap-3 transition-colors"
                                    >
                                        <QrCode className="w-8 h-8 text-green-400" />
                                        <div className="text-left">
                                            <div className="font-semibold text-white">PIX</div>
                                            <div className="text-sm text-gray-400">Pagamento instantâneo</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className="bg-gray-700/50 hover:bg-gray-700 p-4 rounded-lg flex items-center gap-3 transition-colors"
                                    >
                                        <CreditCard className="w-8 h-8 text-blue-400" />
                                        <div className="text-left">
                                            <div className="font-semibold text-white">Cartão de Crédito</div>
                                            <div className="text-sm text-gray-400">Parcelamento em até 12x</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ) : paymentMethod === 'pix' && !pixData ? (
                            <div className="space-y-4">
                                <Button
                                    onClick={() => setPaymentMethod(null)}
                                    variant="ghost"
                                    className="text-gray-400 hover:text-white mb-4"
                                >
                                    ← Voltar
                                </Button>

                                <Button
                                    onClick={handlePixPayment}
                                    disabled={isProcessing}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Gerando QR Code...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="w-5 h-5 mr-2" />
                                            Gerar QR Code PIX
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : paymentMethod === 'pix' && pixData ? (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="bg-white p-4 rounded-lg inline-block mb-4">
                                        <img 
                                            src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                            alt="QR Code PIX"
                                            className="w-64 h-64"
                                        />
                                    </div>
                                    
                                    <p className="text-gray-300 mb-4">
                                        Escaneie o QR Code com seu app de banco ou copie o código abaixo:
                                    </p>

                                    <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
                                        <p className="text-xs text-gray-400 break-all mb-2">
                                            {pixData.qr_code}
                                        </p>
                                        <Button
                                            onClick={copyPixCode}
                                            variant="outline"
                                            className="w-full border-gray-600 text-white hover:bg-gray-700"
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copiar Código PIX
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Aguardando pagamento...</span>
                                    </div>
                                </div>
                            </div>
                        ) : paymentMethod === 'card' ? (
                            <div className="space-y-4">
                                <Button
                                    onClick={() => {
                                        setPaymentMethod(null);
                                        if (brickControllerRef.current) {
                                            brickControllerRef.current.unmount();
                                        }
                                    }}
                                    variant="ghost"
                                    className="text-gray-400 hover:text-white mb-4"
                                >
                                    ← Voltar
                                </Button>

                                {!mpLoaded ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                        <p>Carregando SDK Mercado Pago...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div 
                                            id="cardPaymentBrick_container" 
                                            className="w-full bg-white rounded-lg"
                                            style={{ minHeight: '500px' }}
                                        ></div>

                                        {isProcessing && (
                                            <div className="flex items-center justify-center gap-2 text-blue-400 mt-4">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm">Processando pagamento...</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : null}

                        <p className="text-xs text-gray-500 text-center mt-4">
                            Pagamento processado via Mercado Pago
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}