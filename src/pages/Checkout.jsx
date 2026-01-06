import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, QrCode, Copy, Clock } from 'lucide-react';
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
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handleSelectMethod = (method) => {
        setSelectedMethod(method);
    };

    const handleCreatePayment = async (method) => {
        try {
            setIsProcessing(true);
            
            const response = await base44.functions.invoke('createMercadoPagoOrder', {
                order_id: orderId,
                payment_method: method,
                installments: 1
            });

            const data = response?.data || response;

            if (data?.success) {
                setPayment(data);
                
                // Se for PIX, mostra QR code
                if (method === 'pix') {
                    toast.success('QR Code gerado! Escaneie para pagar');
                    startPaymentPolling();
                }
                
                // Se for cartão, redireciona para sucesso (após processar)
                if (data.status === 'APPROVED') {
                    navigate(`/payment/success?order_id=${orderId}`);
                }
            } else {
                toast.error('Erro ao criar pagamento');
            }

        } catch (err) {
            console.error('Erro ao criar pagamento:', err);
            toast.error(err.message || 'Erro ao processar pagamento');
        } finally {
            setIsProcessing(false);
        }
    };

    const startPaymentPolling = () => {
        const interval = setInterval(async () => {
            try {
                const statusResponse = await base44.functions.invoke('checkPaymentStatus', {
                    order_id: orderId
                });

                const statusData = statusResponse?.data || statusResponse;

                if (statusData?.payment?.status === 'APPROVED') {
                    clearInterval(interval);
                    navigate(`/payment/success?order_id=${orderId}`);
                }
            } catch (err) {
                console.error('Erro ao verificar status:', err);
            }
        }, 3000);

        // Para de verificar após 10 minutos
        setTimeout(() => clearInterval(interval), 600000);
    };

    const copyPixCode = () => {
        if (payment?.qr_code) {
            navigator.clipboard.writeText(payment.qr_code);
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
                            <CardTitle className="text-white">Escolha o Método de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {payment?.qr_code ? (
                                // Mostra QR Code do PIX
                                <div className="text-center py-4">
                                    <Clock className="w-12 h-12 text-yellow-400 animate-pulse mx-auto mb-4" />
                                    <p className="text-white font-semibold mb-2">Escaneie o QR Code</p>
                                    <p className="text-sm text-gray-400 mb-6">
                                        Use o app do seu banco para escanear e pagar
                                    </p>
                                    
                                    {payment.qr_code_base64 && (
                                        <div className="bg-white p-4 rounded-lg inline-block mb-4">
                                            <img 
                                                src={`data:image/png;base64,${payment.qr_code_base64}`}
                                                alt="QR Code PIX"
                                                className="w-64 h-64 mx-auto"
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                                        <p className="text-xs text-gray-400 mb-2">Ou copie o código:</p>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={payment.qr_code} 
                                                readOnly
                                                className="flex-1 bg-gray-800 text-white text-xs p-2 rounded border border-gray-700"
                                            />
                                            <Button onClick={copyPixCode} size="sm" variant="outline">
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-gray-500">
                                        ⏰ Aguardando pagamento... (verifica automaticamente)
                                    </p>
                                </div>
                            ) : payment?.status === 'APPROVED' ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                    <p className="text-white font-semibold mb-2">Pagamento Aprovado!</p>
                                    <Button onClick={() => navigate(`/payment/success?order_id=${orderId}`)}>
                                        Ver Pedido
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Seleção de Método */}
                                    <div className="space-y-3">
                                        {/* PIX */}
                                        <button
                                            onClick={() => handleSelectMethod('pix')}
                                            className={`w-full border-2 rounded-lg p-4 transition-all ${
                                                selectedMethod === 'pix'
                                                    ? 'border-green-500 bg-green-500/10'
                                                    : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <QrCode className="w-8 h-8 text-green-400" />
                                                <div className="text-left">
                                                    <p className="text-white font-semibold">PIX</p>
                                                    <p className="text-xs text-gray-400">Aprovação instantânea</p>
                                                </div>
                                                {selectedMethod === 'pix' && (
                                                    <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                                                )}
                                            </div>
                                        </button>

                                        {/* Cartão de Crédito */}
                                        <button
                                            onClick={() => handleSelectMethod('credit_card')}
                                            className={`w-full border-2 rounded-lg p-4 transition-all ${
                                                selectedMethod === 'credit_card'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="w-8 h-8 text-blue-400" />
                                                <div className="text-left">
                                                    <p className="text-white font-semibold">Cartão de Crédito</p>
                                                    <p className="text-xs text-gray-400">Até 12x sem juros</p>
                                                </div>
                                                {selectedMethod === 'credit_card' && (
                                                    <CheckCircle2 className="w-5 h-5 text-blue-400 ml-auto" />
                                                )}
                                            </div>
                                        </button>
                                    </div>

                                    <Button
                                        onClick={() => handleCreatePayment(selectedMethod)}
                                        disabled={!selectedMethod || isProcessing}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-6 text-lg"
                                    >
                                        {isProcessing ? (
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

                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                            <p className="text-xs text-blue-300 font-semibold">Pagamento 100% Seguro</p>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Seus dados são protegidos pelo Mercado Pago
                                        </p>
                                    </div>
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