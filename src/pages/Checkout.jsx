import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { createMPPreference } from '@/functions/createMPPreference';

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
            } catch (error) {
                console.error('Erro:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handlePayment = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            const response = await createMPPreference({ auction_id: auction.id });

            if (response.data.success) {
                // Redirecionar para Checkout Pro do Mercado Pago
                window.location.href = response.data.init_point;
            } else {
                toast.error('Erro ao processar pagamento');
            }
        } catch (error) {
            console.error('Erro:', error);
            toast.error('Erro ao processar pagamento');
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
                            <CardTitle className="text-white">Método de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-400 text-sm">
                                Você será redirecionado para o checkout seguro do Mercado Pago, onde poderá escolher:
                            </p>
                            <ul className="text-gray-300 text-sm space-y-2">
                                <li>✓ Cartão de crédito (até 12x)</li>
                                <li>✓ Cartão de débito</li>
                                <li>✓ PIX</li>
                                <li>✓ Boleto bancário</li>
                            </ul>
                            <Button
                                onClick={handlePayment}
                                disabled={isProcessing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        Pagar com Mercado Pago
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-gray-500 text-center">
                                Pagamento processado de forma segura pelo Mercado Pago
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}