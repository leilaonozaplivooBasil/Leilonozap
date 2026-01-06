import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, QrCode, Copy, Clock, ChevronLeft } from 'lucide-react';
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
    const [step, setStep] = useState('address');
    const [isProcessing, setIsProcessing] = useState(false);
    
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
    }, []);

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
            
            if (currentUser.cpf && currentUser.address_zip_code && currentUser.address_number) {
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

        } catch (err) {
            console.error('Erro ao carregar checkout:', err);
            setError(err.message || 'Erro ao carregar página');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddressSubmit = async (e) => {
        e.preventDefault();
        
        console.log('🔥 SUBMIT ENDEREÇO');
        console.log('📦 FormData:', formData);
        
        // Validações
        if (!formData.cpf || formData.cpf.length < 11) {
            toast.error('CPF inválido');
            return;
        }
        
        if (!formData.phone) {
            toast.error('Telefone obrigatório');
            return;
        }
        
        if (!formData.address_zip_code) {
            toast.error('CEP obrigatório');
            return;
        }
        
        if (!formData.address_street) {
            toast.error('Rua obrigatória');
            return;
        }
        
        if (!formData.address_number) {
            toast.error('Número obrigatório');
            return;
        }
        
        if (!formData.address_neighborhood) {
            toast.error('Bairro obrigatório');
            return;
        }
        
        if (!formData.address_city) {
            toast.error('Cidade obrigatória');
            return;
        }
        
        if (!formData.address_state || formData.address_state.length !== 2) {
            toast.error('Estado inválido (use sigla: SP, RJ, etc)');
            return;
        }
        
        try {
            setIsProcessing(true);
            console.log('💾 Salvando no banco...');
            
            await base44.entities.AppUser.update(user.id, formData);
            
            const updatedUser = { ...user, ...formData };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            console.log('✅ Dados salvos!');
            toast.success('Endereço salvo!');
            
            console.log('🚀 Mudando para payment...');
            setStep('payment');
            
        } catch (err) {
            console.error('💥 Erro ao salvar:', err);
            toast.error(err.message || 'Erro ao salvar dados');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePixPayment = async () => {
        try {
            setIsProcessing(true);
            toast.info('Gerando QR Code PIX...');
            
            const response = await base44.functions.invoke('createMercadoPagoOrder', {
                order_id: orderId,
                payment_method: 'pix',
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
                setPayment(data);
                setStep('pix_qr');
                toast.success('QR Code gerado!');
                startPaymentPolling();
            } else {
                throw new Error(data?.error || 'Erro ao gerar PIX');
            }

        } catch (err) {
            console.error('Erro PIX:', err);
            toast.error(err.response?.data?.error || err.message || 'Erro ao processar PIX');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCardPayment = async (e) => {
        e.preventDefault();
        
        try {
            setIsProcessing(true);
            toast.info('Processando pagamento...');
            
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
                if (data.status === 'APPROVED') {
                    toast.success('Pagamento aprovado!');
                    navigate(`/PaymentSuccess?order_id=${orderId}`);
                } else if (data.status === 'PENDING' || data.status === 'IN_PROCESS') {
                    setPayment(data);
                    toast.info('Pagamento em análise...');
                    startPaymentPolling();
                } else {
                    throw new Error('Pagamento não foi aprovado');
                }
            } else {
                throw new Error(data?.error || 'Erro ao processar cartão');
            }

        } catch (err) {
            console.error('Erro cartão:', err);
            toast.error(err.response?.data?.error || err.message || 'Erro ao processar pagamento');
        } finally {
            setIsProcessing(false);
        }
    };

    const startPaymentPolling = () => {
        const interval = setInterval(async () => {
            try {
                const response = await base44.functions.invoke('checkPaymentStatus', {
                    order_id: orderId
                });

                const data = response?.data || response;

                if (data?.payment?.status === 'APPROVED') {
                    clearInterval(interval);
                    toast.success('Pagamento confirmado!');
                    setTimeout(() => {
                        navigate(`/PaymentSuccess?order_id=${orderId}`);
                    }, 1000);
                }
            } catch (err) {
                console.error('Erro polling:', err);
            }
        }, 3000);

        setTimeout(() => {
            clearInterval(interval);
            toast.warning('Ainda não recebemos confirmação. Verifique em "Meus Arremates".');
        }, 300000);
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
                    {/* RESUMO DO PEDIDO */}
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

                            <div className="border-t border-gray-700 pt-4">
                                <div className="flex justify-between text-xl font-bold text-green-400">
                                    <span>Total:</span>
                                    <span>R$ {amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* FORMULÁRIO DE ENDEREÇO */}
                    {step === 'address' && (
                        <Card className="bg-gray-800/60 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Dados para Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddressSubmit} className="space-y-4">
                                    <div>
                                        <Label className="text-gray-400">CPF *</Label>
                                        <Input
                                            type="text"
                                            value={formData.cpf}
                                            onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                                            placeholder="000.000.000-00"
                                            className="bg-gray-900/50 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label className="text-gray-400">Telefone *</Label>
                                        <Input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            placeholder="(00) 00000-0000"
                                            className="bg-gray-900/50 border-gray-700 text-white"
                                            required
                                        />
                                    </div>

                                    <div className="border-t border-gray-700 pt-4">
                                        <h4 className="text-white font-semibold mb-3">Endereço de Entrega</h4>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-gray-400">CEP *</Label>
                                                <Input
                                                    type="text"
                                                    value={formData.address_zip_code}
                                                    onChange={(e) => setFormData({...formData, address_zip_code: e.target.value})}
                                                    placeholder="00000-000"
                                                    className="bg-gray-900/50 border-gray-700 text-white"
                                                    required
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <Label className="text-gray-400">Rua *</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.address_street}
                                                        onChange={(e) => setFormData({...formData, address_street: e.target.value})}
                                                        className="bg-gray-900/50 border-gray-700 text-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-gray-400">Número *</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.address_number}
                                                        onChange={(e) => setFormData({...formData, address_number: e.target.value})}
                                                        className="bg-gray-900/50 border-gray-700 text-white"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <Label className="text-gray-400">Complemento</Label>
                                                <Input
                                                    type="text"
                                                    value={formData.address_complement}
                                                    onChange={(e) => setFormData({...formData, address_complement: e.target.value})}
                                                    placeholder="Apto, bloco, etc"
                                                    className="bg-gray-900/50 border-gray-700 text-white"
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label className="text-gray-400">Bairro *</Label>
                                                <Input
                                                    type="text"
                                                    value={formData.address_neighborhood}
                                                    onChange={(e) => setFormData({...formData, address_neighborhood: e.target.value})}
                                                    className="bg-gray-900/50 border-gray-700 text-white"
                                                    required
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-gray-400">Cidade *</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.address_city}
                                                        onChange={(e) => setFormData({...formData, address_city: e.target.value})}
                                                        className="bg-gray-900/50 border-gray-700 text-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-gray-400">Estado *</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.address_state}
                                                        onChange={(e) => setFormData({...formData, address_state: e.target.value.toUpperCase()})}
                                                        placeholder="SP"
                                                        maxLength={2}
                                                        className="bg-gray-900/50 border-gray-700 text-white uppercase"
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
                    )}

                    {/* ESCOLHA DE PAGAMENTO */}
                    {step === 'payment' && (
                        <Card className="bg-gray-800/60 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Método de Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <button
                                    onClick={handlePixPayment}
                                    disabled={isProcessing}
                                    className="w-full border-2 border-gray-600 hover:border-green-500 rounded-lg p-4 transition-all disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <QrCode className="w-8 h-8 text-green-400" />
                                        <div className="text-left">
                                            <p className="text-white font-semibold">PIX</p>
                                            <p className="text-xs text-gray-400">Aprovação instantânea</p>
                                        </div>
                                        {isProcessing && (
                                            <Loader2 className="w-5 h-5 text-green-400 ml-auto animate-spin" />
                                        )}
                                    </div>
                                </button>

                                <button
                                    onClick={() => setStep('card')}
                                    disabled={isProcessing}
                                    className="w-full border-2 border-gray-600 hover:border-blue-500 rounded-lg p-4 transition-all disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-8 h-8 text-blue-400" />
                                        <div className="text-left">
                                            <p className="text-white font-semibold">Cartão de Crédito</p>
                                            <p className="text-xs text-gray-400">Até 12x sem juros</p>
                                        </div>
                                    </div>
                                </button>

                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                        <p className="text-xs text-blue-300 font-semibold">Pagamento 100% Seguro</p>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Protegido pelo Mercado Pago
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* QR CODE PIX */}
                    {step === 'pix_qr' && payment?.qr_code && (
                        <Card className="bg-gray-800/60 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center justify-between">
                                    Pagar com PIX
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setStep('payment')}
                                        className="text-gray-400"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Voltar
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center space-y-4">
                                <Clock className="w-12 h-12 text-yellow-400 animate-pulse mx-auto" />
                                <p className="text-white font-semibold">Escaneie o QR Code</p>
                                <p className="text-sm text-gray-400">
                                    Use o app do seu banco para escanear
                                </p>
                                
                                {payment.qr_code_base64 && (
                                    <div className="bg-white p-4 rounded-lg inline-block">
                                        <img 
                                            src={`data:image/png;base64,${payment.qr_code_base64}`}
                                            alt="QR Code PIX"
                                            className="w-64 h-64"
                                        />
                                    </div>
                                )}
                                
                                <div className="bg-gray-900/50 rounded-lg p-4">
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
                                    ⏰ Aguardando pagamento...
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* FORMULÁRIO CARTÃO */}
                    {step === 'card' && (
                        <Card className="bg-gray-800/60 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center justify-between">
                                    Cartão de Crédito
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setStep('payment')}
                                        className="text-gray-400"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Voltar
                                    </Button>
                                </CardTitle>
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
                                            placeholder="NOME COMPLETO"
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
                                            `Pagar R$ ${amount.toFixed(2)}`
                                        )}
                                    </Button>
                                </form>
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