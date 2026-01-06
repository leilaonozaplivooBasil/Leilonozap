import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, QrCode } from 'lucide-react';
import { createMercadoPagoCheckout } from '@/functions/createMercadoPagoCheckout';

export default function CheckoutPage() {
    const [auction, setAuction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
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

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            const response = await createMercadoPagoCheckout({
                auction_id: auction.id,
                amount: auction.current_price,
                title: auction.title,
                description: `Arremate: ${auction.title}`
            });

            if (response.data.success) {
                // Redirecionar para o checkout do Mercado Pago
                window.location.href = response.data.init_point;
            } else {
                alert('Erro ao criar checkout');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao processar pagamento');
        } finally {
            setIsProcessing(false);
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
                        <div className="space-y-4">
                            <p className="text-gray-400">
                                Você será redirecionado para o Mercado Pago para concluir o pagamento de forma segura.
                            </p>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-gray-700/50 p-4 rounded-lg flex items-center gap-3">
                                    <QrCode className="w-8 h-8 text-green-400" />
                                    <div>
                                        <div className="font-semibold text-white">PIX</div>
                                        <div className="text-sm text-gray-400">Pagamento instantâneo</div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-700/50 p-4 rounded-lg flex items-center gap-3">
                                    <CreditCard className="w-8 h-8 text-blue-400" />
                                    <div>
                                        <div className="font-semibold text-white">Cartão de Crédito</div>
                                        <div className="text-sm text-gray-400">Parcelamento em até 12x</div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    'Continuar para Pagamento'
                                )}
                            </Button>

                            <p className="text-xs text-gray-500 text-center">
                                Ao continuar, você concorda com os termos e condições do Mercado Pago
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}