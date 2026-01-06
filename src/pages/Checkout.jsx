import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    
    const [isLoading, setIsLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [payment, setPayment] = useState(null);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCheckout();
    }, [orderId]);

    const loadCheckout = async () => {
        try {
            setIsLoading(true);
            
            if (!orderId) {
                setError('ID do pedido não informado');
                return;
            }
            
            const savedUser = localStorage.getItem('currentUser');
            if (!savedUser) {
                navigate('/');
                return;
            }
            
            const currentUser = JSON.parse(savedUser);
            setUser(currentUser);

            // Busca pedido
            const auctions = await base44.entities.Auction.filter({ id: orderId });
            
            if (!auctions || auctions.length === 0) {
                setError('Pedido não encontrado');
                return;
            }
            
            const auction = auctions[0];
            
            if (auction.winner_id !== currentUser.id) {
                setError('Você não é o vencedor deste leilão');
                return;
            }
            
            setOrder(auction);

            // Verifica se já existe pagamento
            try {
                const statusResponse = await base44.functions.invoke('checkPaymentStatus', {
                    order_id: orderId
                });

                const statusData = statusResponse?.data || statusResponse;

                if (statusData?.payment) {
                    setPayment(statusData.payment);
                    
                    if (statusData.payment.status === 'APPROVED') {
                        navigate(`/payment/success?order_id=${orderId}`);
                        return;
                    }
                }
            } catch (statusErr) {
                console.log('Nenhum pagamento anterior encontrado');
            }

        } catch (err) {
            console.error('Erro ao carregar checkout:', err);
            setError(err.message || 'Erro ao carregar página');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePayment = async () => {
        try {
            setIsLoading(true);
            
            const response = await base44.functions.invoke('createMercadoPagoOrder', {
                order_id: orderId
            });

            const data = response?.data || response;

            if (data?.init_point) {
                // Redireciona para checkout do Mercado Pago
                window.location.href = data.init_point;
            } else {
                toast.error('Erro ao criar pagamento');
                setIsLoading(false);
            }

        } catch (err) {
            console.error('Erro ao criar pagamento:', err);
            toast.error(err.message || 'Erro ao processar pagamento');
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-gray-800 border-red-500/30">
                    <CardHeader>
                        <CardTitle className="text-center text-red-400 flex items-center justify-center gap-2">
                            <AlertCircle className="w-6 h-6" />
                            Erro
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-gray-300 mb-6">{error}</p>
                        <Button onClick={() => navigate('/')} variant="outline">
                            Voltar para Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!order) return null;

    const amount = order.current_price || order.starting_price;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Finalizar Pagamento
                    </h1>
                    <p className="text-gray-400">Complete sua compra de forma segura</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Resumo do Pedido */}
                    <Card className="bg-gray-800/60 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Resumo do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.image_urls?.[0] && (
                                <img 
                                    src={order.image_urls[0]} 
                                    alt={order.title}
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                            )}
                            
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {order.title}
                                </h3>
                                {order.description && (
                                    <p className="text-sm text-gray-400 line-clamp-3">
                                        {order.description}
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-gray-700 pt-4 space-y-2">
                                <div className="flex justify-between text-gray-300">
                                    <span>Valor do Lance:</span>
                                    <span className="font-semibold">R$ {amount.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex justify-between text-xl font-bold text-green-400 pt-2 border-t border-gray-700">
                                    <span>Total:</span>
                                    <span>R$ {amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Método de Pagamento */}
                    <Card className="bg-gray-800/60 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {payment && payment.status === 'PENDING' ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
                                    <p className="text-white font-semibold mb-2">Pagamento Pendente</p>
                                    <p className="text-sm text-gray-400">
                                        Aguardando confirmação do Mercado Pago
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/30 rounded-lg p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-white p-2 rounded">
                                                <img 
                                                    src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadopago/logo__large@2x.png"
                                                    alt="Mercado Pago"
                                                    className="h-6"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">Mercado Pago</p>
                                                <p className="text-xs text-gray-400">Pagamento seguro</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-sm text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                <span>PIX instantâneo</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-blue-400" />
                                                <span>Cartão de crédito até 12x</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                <span>Compra protegida</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleCreatePayment}
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-6 text-lg"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                Pagar R$ {amount.toFixed(2)}
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-xs text-center text-gray-400">
                                        Ao clicar em pagar, você será redirecionado para o checkout seguro do Mercado Pago
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-8 text-center">
                    <Button 
                        onClick={() => navigate('/MyWinnings')}
                        variant="ghost"
                        className="text-gray-400 hover:text-white"
                    >
                        Voltar para Meus Arremates
                    </Button>
                </div>
            </div>
        </div>
    );
}