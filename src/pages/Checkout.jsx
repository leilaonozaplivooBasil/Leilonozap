import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, QrCode, Copy, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const [step, setStep] = useState('address');
    const [formData, setFormData] = useState({
        cpf: '',
        phone: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zip_code: ''
    });
    const [cardData, setCardData] = useState({
        number: '',
        holder_name: '',
        expiration_month: '',
        expiration_year: '',
        cvv: '',
        installments: 1
    });

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
            
            setFormData({
                cpf: currentUser.cpf || '',
                phone: currentUser.phone || '',
                address_street: currentUser.address_street || '',
                address_number: currentUser.address_number || '',
                address_complement: currentUser.address_complement || '',
                address_neighborhood: currentUser.address_neighborhood || '',
                address_city: currentUser.address_city || '',
                address_state: currentUser.address_state || '',
                address_zip_code: currentUser.address_zip_code || ''
            });
            
            if (currentUser.cpf && currentUser.address_zip_code) {
                setStep('payment');
            }

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

    const handleAddressSubmit = async (e) => {
        e.preventDefault();
        
        console.log('🔥 SUBMIT INICIADO');
        console.log('📋 FormData:', formData);
        console.log('👤 User ID:', user?.id);
        
        if (!formData.cpf || !formData.phone || !formData.address_zip_code || !formData.address_street || !formData.address_city || !formData.address_state) {
            console.error('❌ Campos obrigatórios faltando');
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }
        
        if (!formData.address_number) {
            console.error('❌ Número obrigatório');
            toast.error('Número do endereço é obrigatório');
            return;
        }
        
        try {
            console.log('⏳ Processando...');
            setIsProcessing(true);
            
            console.log('💾 Atualizando AppUser...');
            await base44.entities.AppUser.update(user.id, formData);
            console.log('✅ AppUser atualizado!');
            
            const updatedUser = { ...user, ...formData };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            console.log('🎉 Avançando para pagamento!');
            toast.success('Dados salvos!');
            setStep('payment');
            
        } catch (err) {
            console.error('💥 ERRO CRÍTICO:', err);
            console.error('💥 Erro completo:', JSON.stringify(err, null, 2));
            toast.error(err.message || 'Erro ao salvar dados');
        } finally {
            console.log('🏁 Finalizando...');
            setIsProcessing(false);
        }
    };

    const handleSelectMethod = (method) => {
        setSelectedMethod(method);
        
        if (method === 'pix') {
            handleCreatePixPayment();
        }
        if (method === 'credit_card') {
            setStep('card');
        }
    };

    const handleCreatePixPayment = async () => {
        try {
            console.log('🔥 INICIANDO PIX');
            setIsProcessing(true);
            
            console.log('📦 Payload:', {
                order_id: orderId,
                payment_method: 'pix',
                installments: 1,
                payer_data: {
                    cpf: user.cpf,
                    phone: user.phone,
                    address: {
                        street: user.address_street,
                        number: user.address_number,
                        complement: user.address_complement,
                        neighborhood: user.address_neighborhood,
                        city: user.address_city,
                        state: user.address_state,
                        zip_code: user.address_zip_code
                    }
                }
            });
            
            const response = await base44.functions.invoke('createMercadoPagoOrder', {
                order_id: orderId,
                payment_method: 'pix',
                installments: 1,
                payer_data: {
                    cpf: user.cpf,
                    phone: user.phone,
                    address: {
                        street: user.address_street,
                        number: user.address_number,
                        complement: user.address_complement,
                        neighborhood: user.address_neighborhood,
                        city: user.address_city,
                        state: user.address_state,
                        zip_code: user.address_zip_code
                    }
                }
            });

            console.log('📨 Resposta completa:', response);
            console.log('📨 Tipo da resposta:', typeof response);

            const data = response?.data || response;
            console.log('📊 Data extraído:', data);

            if (data?.success) {
                console.log('✅ Sucesso! QR Code:', data.qr_code ? 'presente' : 'ausente');
                setPayment(data);
                toast.success('QR Code gerado! Escaneie para pagar');
                startPaymentPolling();
            } else {
                console.error('❌ Falha:', data);
                toast.error(data?.error || 'Erro ao gerar PIX');
            }

        } catch (err) {
            console.error('💥 ERRO:', err);
            console.error('💥 Erro completo:', JSON.stringify(err, null, 2));
            toast.error(err.message || 'Erro ao processar PIX');
        } finally {
            console.log('🏁 Finalizando PIX');
            setIsProcessing(false);
        }
    };

    const handleCardPayment = async (e) => {
        e.preventDefault();
        
        try {
            setIsProcessing(true);
            
            if (!cardData.number || !cardData.holder_name || !cardData.expiration_month || !cardData.expiration_year || !cardData.cvv) {
                toast.error('Preencha todos os dados do cartão');
                return;
            }
            
            const response = await base44.functions.invoke('createMercadoPagoOrder', {
                order_id: orderId,
                payment_method: 'credit_card',
                installments: parseInt(cardData.installments),
                card_data: {
                    number: cardData.number.replace(/\s/g, ''),
                    holder_name: cardData.holder_name,
                    expiration_month: cardData.expiration_month,
                    expiration_year: cardData.expiration_year,
                    security_code: cardData.cvv
                },
                payer_data: {
                    cpf: user.cpf,
                    phone: user.phone,
                    address: {
                        street: user.address_street,
                        number: user.address_number,
                        complement: user.address_complement,
                        neighborhood: user.address_neighborhood,
                        city: user.address_city,
                        state: user.address_state,
                        zip_code: user.address_zip_code
                    }
                }
            });

            const data = response?.data || response;

            if (data?.success) {
                if (data.status === 'APPROVED' || data.status === 'approved') {
                    navigate(`/payment/success?order_id=${orderId}`);
                } else {
                    setPayment(data);
                    toast.info('Pagamento em processamento...');
                    startPaymentPolling();
                }
            } else {
                toast.error('Erro ao processar cartão');
            }

        } catch (err) {
            console.error('Erro ao processar cartão:', err);
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
                    <Card className={`bg-gray-800/60 border-gray-700 ${step === 'payment' ? 'md:col-span-1' : 'md:col-span-2'}`}>
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

                    {step === 'address' ? (
                        <Card className="bg-gray-800/60 border-gray-700 md:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-white">Dados para Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddressSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="text-sm text-gray-400 mb-1 block">CPF *</label>
                                            <input
                                                type="text"
                                                value={formData.cpf}
                                                onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                                                placeholder="000.000.000-00"
                                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-sm text-gray-400 mb-1 block">Telefone *</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                placeholder="(00) 00000-0000"
                                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-700 pt-4">
                                        <h4 className="text-white font-semibold mb-3">Endereço de Entrega</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm text-gray-400 mb-1 block">CEP *</label>
                                                <input
                                                    type="text"
                                                    value={formData.address_zip_code}
                                                    onChange={(e) => setFormData({...formData, address_zip_code: e.target.value})}
                                                    placeholder="00000-000"
                                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <label className="text-sm text-gray-400 mb-1 block">Rua *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.address_street}
                                                        onChange={(e) => setFormData({...formData, address_street: e.target.value})}
                                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm text-gray-400 mb-1 block">Número *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.address_number}
                                                        onChange={(e) => setFormData({...formData, address_number: e.target.value})}
                                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm text-gray-400 mb-1 block">Complemento</label>
                                                <input
                                                    type="text"
                                                    value={formData.address_complement}
                                                    onChange={(e) => setFormData({...formData, address_complement: e.target.value})}
                                                    placeholder="Apto, bloco, etc"
                                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-gray-400 mb-1 block">Bairro *</label>
                                                <input
                                                    type="text"
                                                    value={formData.address_neighborhood}
                                                    onChange={(e) => setFormData({...formData, address_neighborhood: e.target.value})}
                                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                    required
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-sm text-gray-400 mb-1 block">Cidade *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.address_city}
                                                        onChange={(e) => setFormData({...formData, address_city: e.target.value})}
                                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm text-gray-400 mb-1 block">Estado *</label>
                                                    <input
                                                        type="text"
                                                        value={formData.address_state}
                                                        onChange={(e) => setFormData({...formData, address_state: e.target.value})}
                                                        placeholder="SP"
                                                        maxLength={2}
                                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white uppercase"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-6 text-lg"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Continuar para Pagamento'
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : step === 'card' ? (
                        <Card className="bg-gray-800/60 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Dados do Cartão</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCardPayment} className="space-y-4">
                                    <div>
                                        <Label className="text-gray-400">Número do Cartão</Label>
                                        <Input
                                            type="text"
                                            value={cardData.number}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                                                setCardData({...cardData, number: value});
                                            }}
                                            placeholder="0000 0000 0000 0000"
                                            maxLength={19}
                                            className="bg-gray-900/50 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label className="text-gray-400">Nome no Cartão</Label>
                                        <Input
                                            type="text"
                                            value={cardData.holder_name}
                                            onChange={(e) => setCardData({...cardData, holder_name: e.target.value.toUpperCase()})}
                                            placeholder="NOME COMO NO CARTÃO"
                                            className="bg-gray-900/50 border-gray-700 text-white uppercase"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <Label className="text-gray-400">Mês</Label>
                                            <Input
                                                type="text"
                                                value={cardData.expiration_month}
                                                onChange={(e) => setCardData({...cardData, expiration_month: e.target.value})}
                                                placeholder="MM"
                                                maxLength={2}
                                                className="bg-gray-900/50 border-gray-700 text-white"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-400">Ano</Label>
                                            <Input
                                                type="text"
                                                value={cardData.expiration_year}
                                                onChange={(e) => setCardData({...cardData, expiration_year: e.target.value})}
                                                placeholder="AA"
                                                maxLength={2}
                                                className="bg-gray-900/50 border-gray-700 text-white"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-400">CVV</Label>
                                            <Input
                                                type="text"
                                                value={cardData.cvv}
                                                onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                                                placeholder="000"
                                                maxLength={4}
                                                className="bg-gray-900/50 border-gray-700 text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label className="text-gray-400">Parcelas</Label>
                                        <Select 
                                            value={cardData.installments.toString()} 
                                            onValueChange={(value) => setCardData({...cardData, installments: parseInt(value)})}
                                        >
                                            <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-700">
                                                {[...Array(12)].map((_, i) => {
                                                    const installment = i + 1;
                                                    const installmentAmount = amount / installment;
                                                    return (
                                                        <SelectItem key={installment} value={installment.toString()} className="text-white">
                                                            {installment}x de R$ {installmentAmount.toFixed(2)} {installment === 1 ? '(à vista)' : 'sem juros'}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <Button
                                            type="submit"
                                            disabled={isProcessing}
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
                                        
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setStep('payment');
                                                setSelectedMethod(null);
                                            }}
                                            variant="ghost"
                                            className="w-full text-gray-400 hover:text-white"
                                        >
                                            Voltar
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-gray-800/60 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Escolha o Método de Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                            
                            {payment?.qr_code ? (
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
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleSelectMethod('pix')}
                                            disabled={isProcessing}
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
                                                {selectedMethod === 'pix' && isProcessing && (
                                                    <Loader2 className="w-5 h-5 text-green-400 ml-auto animate-spin" />
                                                )}
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleSelectMethod('credit_card')}
                                            disabled={isProcessing}
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
                                            </div>
                                        </button>
                                    </div>

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
                    )}
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