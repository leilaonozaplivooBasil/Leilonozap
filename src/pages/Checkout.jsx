import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { createPixPayment } from '@/functions/createPixPayment';
import { checkPixPayment } from '@/functions/checkPixPayment';

export default function CheckoutPage() {
    const [auction, setAuction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [pixData, setPixData] = useState(null);
    const [cardData, setCardData] = useState({
        number: '',
        holder: '',
        expiration: '',
        cvv: '',
        installments: 1
    });
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

                const urlParams = new URLSearchParams(window.location.search);
                const auctionId = urlParams.get('auction_id');

                if (!auctionId) {
                    alert('Leilão não encontrado');
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                const auctions = await base44.entities.Auction.filter({ id: auctionId });
                if (auctions.length === 0) {
                    alert('Leilão não encontrado');
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                setAuction(auctions[0]);
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao carregar dados');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handlePixPayment = async () => {
        setIsProcessing(true);
        try {
            const response = await createPixPayment({
                auction_id: auction.id,
                amount: auction.current_price,
                payer_email: currentUser.email,
                payer_name: currentUser.full_name
            });

            if (response.data.success) {
                setPixData(response.data);
                toast.success('QR Code PIX gerado!');
                
                // Iniciar polling para verificar pagamento
                startPixPolling(response.data.payment_id);
            } else {
                toast.error('Erro ao gerar PIX');
            }
        } catch (error) {
            console.error('Erro:', error);
            toast.error('Erro ao processar pagamento PIX');
        } finally {
            setIsProcessing(false);
        }
    };

    const startPixPolling = (paymentId) => {
        const interval = setInterval(async () => {
            try {
                const response = await checkPixPayment({ payment_id: paymentId });
                
                if (response.data.status === 'approved') {
                    clearInterval(interval);
                    toast.success('Pagamento confirmado!');
                    navigate(createPageUrl('PaymentSuccess') + `?auction_id=${auction.id}`);
                }
            } catch (error) {
                console.error('Erro ao verificar pagamento:', error);
            }
        }, 3000);

        // Limpar após 10 minutos
        setTimeout(() => clearInterval(interval), 600000);
    };

    const copyPixCode = () => {
        if (pixData?.qr_code_base64) {
            navigator.clipboard.writeText(pixData.qr_code_base64);
            toast.success('Código PIX copiado!');
        }
    };

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