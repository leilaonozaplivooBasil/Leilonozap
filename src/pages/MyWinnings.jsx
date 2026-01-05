import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { createAbacatePayPix } from '@/functions/createAbacatePayPix';
import { checkAbacatePayPix } from '@/functions/checkAbacatePayPix';
import { stripeCheckout } from '@/functions/stripeCheckout';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, CreditCard, Trophy, Package, Truck, CheckCircle, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

const statusConfigNozap = {
  awaiting_payment: { text: "Aguardando Pagamento", icon: CreditCard, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { text: "Pago", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  shipped: { text: "Enviado", icon: Truck, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  delivered: { text: "Entregue", icon: Package, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  canceled: { text: "Cancelado", icon: Package, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const statusConfigSaiDeBaixo = {
  awaiting_payment: { text: "Aguardando Pagamento", icon: CreditCard, color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  paid: { text: "Pago", icon: CheckCircle, color: "bg-green-100 text-green-700 border-green-300" },
  shipped: { text: "Enviado", icon: Truck, color: "bg-blue-100 text-blue-700 border-blue-300" },
  delivered: { text: "Entregue", icon: Package, color: "bg-purple-100 text-purple-700 border-purple-300" },
  canceled: { text: "Cancelado", icon: Package, color: "bg-red-100 text-red-700 border-red-300" },
};

const WonAuctionCard = ({ auction, onPayClick, onTrackClick, isSaiDeBaixo }) => {
    const statusConfig = isSaiDeBaixo ? statusConfigSaiDeBaixo : statusConfigNozap;
    const config = statusConfig[auction.order_status] || statusConfig.awaiting_payment;
    const mainImage = auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";

    return (
        <Card className={`${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800/60 border border-gray-700/80 text-white'} overflow-hidden flex flex-col`}>
            <CardHeader className="flex-row items-start gap-4 p-4">
                 <img src={mainImage} alt={auction.title} className={`w-24 h-24 object-cover rounded-lg ${isSaiDeBaixo ? 'border-2 border-gray-200' : 'border border-gray-700'}`} />
                 <div className="flex-grow">
                    <CardTitle className={`text-lg mb-1 line-clamp-2 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>{auction.title}</CardTitle>
                    <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Arrematado em: {new Date(auction.updated_date).toLocaleDateString('pt-BR')}</p>
                 </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex-grow">
                 <div className={`${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-700/50'} p-3 rounded-lg flex justify-between items-center`}>
                    <span className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Valor do Arremate:</span>
                    <span className={`font-bold text-xl ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>R$ {auction.current_price.toFixed(2)}</span>
                 </div>
            </CardContent>
            <CardFooter className={`${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900/50'} p-4 flex flex-col gap-3`}>
                <Badge className={`flex items-center gap-2 text-sm ${config.color} w-fit`}>
                    <config.icon className="w-4 h-4" />
                    {config.text}
                </Badge>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                    {auction.order_status === 'awaiting_payment' && (
                         <Button 
                            onClick={() => onPayClick(auction)}
                            className={`flex-1 ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20'}`}
                         >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagar Agora
                        </Button>
                    )}
                    <Button 
                        onClick={() => onTrackClick(auction)}
                        variant="outline"
                        className="flex-1 bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Acompanhar Pedido
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default function MyWinningsPage() {
    const [winnings, setWinnings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [pixFormData, setPixFormData] = useState({
        name: '',
        phone: '',
        email: '',
        cpf: ''
    });
    const [pixData, setPixData] = useState(null);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Detecta se está vindo de uma página Sai de Baixo
    const isSaiDeBaixo = location.state?.fromSaiDeBaixo || sessionStorage.getItem('saiDeBaixoContext') === 'true';

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUser = localStorage.getItem('currentUser');
                if (!savedUser) {
                    setIsLoading(false);
                    return;
                }
                const user = JSON.parse(savedUser);
                setCurrentUser(user);
                
                const allAuctions = await Auction.list("-updated_date", 500);
                const wonAuctions = allAuctions.filter(auction => 
                    auction.winner_id === user.id &&
                    (auction.status === 'sold' || auction.status === 'ended' || auction.status === 'processing') &&
                    !auction.is_investment_plan
                );
                setWinnings(wonAuctions);

            } catch (error) {
                console.error("Failed to load winnings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handlePayClick = (auction) => {
        setSelectedAuction(auction);
        setPaymentMethod(null);
        setPixData(null);
        setPixFormData({
            name: currentUser?.full_name || '',
            phone: currentUser?.phone || '',
            email: currentUser?.email || '',
            cpf: currentUser?.cpf || ''
        });
        setShowConfirmModal(true);
    };

    const handleTrackClick = (auction) => {
        const trackingPage = isSaiDeBaixo ? 'OrderTrackingSaiDeBaixo' : 'OrderTracking';
        navigate(createPageUrl(trackingPage) + `?auction_id=${auction.id}`);
    };

    const handleConfirmCard = async () => {
        if (!selectedAuction || !currentUser) return;

        setIsProcessing(true);
        try {
            toast.info("Criando sessão de pagamento...");

            const response = await stripeCheckout({
                auction_id: selectedAuction.id
            });

            console.log('📦 Resposta Stripe:', response);

            if (response?.success && response?.checkout_url) {
                window.location.href = response.checkout_url;
            } else {
                const errorMsg = response?.error || "Erro desconhecido ao criar checkout";
                console.error('❌ Erro Stripe:', errorMsg);
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error("❌ Exceção no checkout:", error);
            toast.error(`Erro: ${error.message || 'Falha na comunicação'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreatePixQRCode = async () => {
        if (!selectedAuction) return;

        const { name, phone, email, cpf } = pixFormData;
        if (!name || !phone || !email || !cpf) {
            toast.error("Preencha todos os campos");
            return;
        }

        setIsProcessing(true);
        try {
            toast.info("Gerando QR Code PIX...");

            const response = await createAbacatePayPix({
                auction_id: selectedAuction.id,
                user_name: name,
                user_email: email,
                user_phone: phone,
                user_cpf: cpf
            });

            console.log('📦 Resposta completa createAbacatePayPix:', response);
            console.log('📦 Tipo da resposta:', typeof response);
            console.log('📦 response.data:', response?.data);

            // ✅ CORREÇÃO: Tratamento robusto da resposta
            // A função retorna objeto com .data contendo os dados do PIX
            const pixResponseData = response?.data || response;
            
            if (!pixResponseData) {
                throw new Error('Resposta vazia do servidor');
            }

            console.log('📦 pixResponseData extraído:', pixResponseData);
            console.log('📦 pixResponseData.success:', pixResponseData.success);

            // Verifica se tem os dados essenciais do PIX
            const hasQRCode = pixResponseData.qr_code_base64;
            const hasPixCode = pixResponseData.pix_code;
            const hasBillingId = pixResponseData.billing_id;

            if (pixResponseData.success === true && hasQRCode && hasPixCode && hasBillingId) {
                console.log('✅ PIX gerado com sucesso - dados validados');
                
                setPixData({
                    billing_id: pixResponseData.billing_id,
                    qr_code_base64: pixResponseData.qr_code_base64,
                    pix_code: pixResponseData.pix_code,
                    expires_at: pixResponseData.expires_at,
                    amount: selectedAuction.current_price
                });
                
                toast.success("QR Code gerado com sucesso!");
                
                // Log de sucesso
                await base44.entities.SystemLog.create({
                    step: 'PIX_GENERATION_SUCCESS',
                    status: 'success',
                    message: 'PIX gerado com sucesso no frontend',
                    component_name: 'MyWinnings',
                    entity_id: selectedAuction.id,
                    payload: { 
                        auction_id: selectedAuction.id, 
                        billing_id: pixResponseData.billing_id,
                        has_qr_code: !!hasQRCode,
                        has_pix_code: !!hasPixCode
                    },
                    user_agent: navigator.userAgent,
                    url: window.location.href
                }).catch(() => {});
            } else {
                // Identifica qual dado está faltando
                const missingData = [];
                if (!pixResponseData.success) missingData.push('success=false');
                if (!hasQRCode) missingData.push('qr_code_base64');
                if (!hasPixCode) missingData.push('pix_code');
                if (!hasBillingId) missingData.push('billing_id');

                const errorMsg = `Dados incompletos do PIX: ${missingData.join(', ')}`;
                console.error('❌ Resposta com dados faltando:', errorMsg);
                console.error('❌ Dados recebidos:', pixResponseData);
                
                toast.error("Erro ao gerar QR Code: dados incompletos");

                // Log detalhado do erro
                await base44.entities.SystemLog.create({
                    step: 'PIX_GENERATION_FRONTEND_ERROR',
                    status: 'error',
                    message: 'Falha ao gerar PIX no frontend - dados incompletos',
                    component_name: 'MyWinnings',
                    error_details: { 
                        missing_fields: missingData,
                        response_data: pixResponseData,
                        full_response: response
                    },
                    payload: { auction_id: selectedAuction.id, name, email },
                    user_agent: navigator.userAgent,
                    url: window.location.href
                }).catch(() => {});
            }
        } catch (error) {
            console.error("❌ Exceção ao gerar PIX:", error);
            toast.error(`Erro ao gerar QR Code: ${error.message}`);

            // Log da exceção no SystemLog
            await base44.entities.SystemLog.create({
                step: 'PIX_GENERATION_API_EXCEPTION',
                status: 'error',
                message: error.message || 'Exceção durante chamada de API',
                component_name: 'MyWinnings',
                error_details: {
                    stack: error.stack,
                    name: error.name
                },
                payload: { auction_id: selectedAuction.id },
                user_agent: navigator.userAgent,
                url: window.location.href
            }).catch(() => {});
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-white' : 'bg-gray-900'} flex items-center justify-center`}><Loader2 className={`w-12 h-12 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-500'} animate-spin`} /></div>;
    }

    if (!currentUser) {
        return (
             <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-white' : 'bg-gray-900'} flex flex-col items-center justify-center text-center p-4`}>
                <Trophy className={`w-16 h-16 ${isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'} mb-4`} />
                <h1 className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} mb-2`}>Faça Login Para Ver Seus Arremates</h1>
                <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} mb-6`}>Você precisa estar conectado para acessar seu histórico de vitórias.</p>
                <Link to={createPageUrl(isSaiDeBaixo ? "SaiDeBaixo" : "Home")}>
                    <Button className={isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : ''}>Voltar para os Leilões</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-gradient-to-br from-gray-50 to-gray-100' : 'bg-gray-900'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} p-4 sm:p-6 lg:p-8`}>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                        <Trophy className={`w-8 h-8 ${isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}`} />
                        Meus Arremates
                    </h1>
                    <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} mt-2`}>Aqui estão todos os produtos que você venceu nos leilões.</p>
                </div>



                {winnings.length === 0 ? (
                    <div className={`text-center py-16 ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800/50'} rounded-2xl`}>
                        <ShoppingBag className={`w-16 h-16 mx-auto ${isSaiDeBaixo ? 'text-gray-400' : 'text-gray-500'} mb-4`} />
                        <h2 className={`text-xl font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} mb-2`}>Você ainda não arrematou nada</h2>
                        <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} mb-6`}>Participe de um leilão e dê seu lance para começar a sua coleção!</p>
                        <Link to={createPageUrl(isSaiDeBaixo ? "SaiDeBaixo" : "Home")}>
                            <Button className={isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>Ver Leilões Ativos</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {winnings.map(auction => (
                            <WonAuctionCard 
                                key={auction.id} 
                                auction={auction} 
                                onPayClick={handlePayClick}
                                onTrackClick={handleTrackClick}
                                isSaiDeBaixo={isSaiDeBaixo} 
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Confirmação de Pagamento */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-900 border-gray-700 text-white'}>
                    <DialogHeader>
                        <DialogTitle className="text-xl">Escolha a forma de pagamento</DialogTitle>
                        <DialogDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                            Selecione como deseja pagar seu produto
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAuction && !paymentMethod && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4">
                                <img 
                                    src={selectedAuction.image_urls?.[0]} 
                                    alt={selectedAuction.title}
                                    className={`w-20 h-20 object-cover rounded-lg ${isSaiDeBaixo ? 'border-2 border-gray-200' : 'border border-gray-700'}`}
                                />
                                <div>
                                    <h3 className={`font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>{selectedAuction.title}</h3>
                                    <p className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
                                        R$ {selectedAuction.current_price?.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                               <Button
                                   onClick={() => setPaymentMethod('mercadopago')}
                                   className={`h-24 flex flex-col gap-2 ${isSaiDeBaixo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                               >
                                   <span className="text-3xl">💙</span>
                                   <span className="font-bold text-sm">Mercado Pago</span>
                                   <span className="text-[10px] opacity-80">PIX, Cartão, Boleto</span>
                               </Button>

                               <Button
                                   onClick={() => setPaymentMethod('card')}
                                   className={`h-24 flex flex-col gap-2 ${isSaiDeBaixo ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                               >
                                   <span className="text-3xl">💳</span>
                                   <span className="font-bold text-sm">Cartão Int.</span>
                               </Button>

                               <Button
                                   onClick={() => setPaymentMethod('pix')}
                                   className={`h-24 flex flex-col gap-2 col-span-2 ${isSaiDeBaixo ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}
                               >
                                   <span className="text-3xl">📱</span>
                                   <span className="font-bold">PIX Direto</span>
                               </Button>
                            </div>
                        </div>
                    )}

                    {selectedAuction && paymentMethod === 'mercadopago' && (
                        <div className="space-y-4 py-4">
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                                <p className="text-sm text-blue-300 text-center">
                                    💙 Você será redirecionado para o Mercado Pago para finalizar o pagamento com segurança
                                </p>
                            </div>
                            <Button
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        toast.info("Redirecionando para o Mercado Pago...");
                                        
                                        const response = await base44.functions.invoke('mercadopagoCheckout', {
                                            auction_id: selectedAuction.id,
                                            user_id: currentUser.id
                                        });

                                        console.log('📦 Resposta completa:', response);
                                        console.log('📦 response.data:', response?.data);
                                        console.log('📦 response.data.init_point:', response?.data?.init_point);

                                        // ✅ CORREÇÃO: A resposta vem em response.data
                                        const checkoutData = response?.data;

                                        if (checkoutData?.init_point) {
                                            console.log('✅ Redirecionando para:', checkoutData.init_point);
                                            window.location.href = checkoutData.init_point;
                                        } else {
                                            const errorMsg = checkoutData?.error || "Erro: init_point não retornado";
                                            console.error('❌ Erro Mercado Pago:', errorMsg);
                                            console.error('❌ Dados recebidos:', checkoutData);
                                            toast.error(errorMsg);
                                        }
                                    } catch (error) {
                                        console.error('❌ Exceção:', error);
                                        toast.error("Erro ao processar: " + error.message);
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                className="w-full h-16 bg-blue-500 hover:bg-blue-600 text-lg font-bold"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>💙 Ir para Mercado Pago</>
                                )}
                            </Button>
                        </div>
                    )}

                    {selectedAuction && paymentMethod === 'card' && (
                        <div className="space-y-4 py-4">
                            <Button
                                onClick={handleConfirmCard}
                                disabled={isProcessing}
                                className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-lg font-bold"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>💳 Pagar com Cartão Internacional</>
                                )}
                            </Button>
                        </div>
                    )}

                    {selectedAuction && paymentMethod === 'pix' && !pixData && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-3">
                                <div>
                                    <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Nome Completo</Label>
                                    <Input
                                        value={pixFormData.name}
                                        onChange={(e) => setPixFormData({...pixFormData, name: e.target.value})}
                                        placeholder="João Silva"
                                        className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600 text-white'}
                                    />
                                </div>

                                <div>
                                    <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Telefone</Label>
                                    <Input
                                        value={pixFormData.phone}
                                        onChange={(e) => setPixFormData({...pixFormData, phone: e.target.value})}
                                        placeholder="(11) 99999-9999"
                                        className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600 text-white'}
                                    />
                                </div>

                                <div>
                                    <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>E-mail</Label>
                                    <Input
                                        value={pixFormData.email}
                                        onChange={(e) => setPixFormData({...pixFormData, email: e.target.value})}
                                        placeholder="joao@email.com"
                                        type="email"
                                        className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600 text-white'}
                                    />
                                </div>

                                <div>
                                    <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>CPF</Label>
                                    <Input
                                        value={pixFormData.cpf}
                                        onChange={(e) => setPixFormData({...pixFormData, cpf: e.target.value})}
                                        placeholder="000.000.000-00"
                                        className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600 text-white'}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleCreatePixQRCode}
                                disabled={isProcessing}
                                className="w-full h-16 bg-green-600 hover:bg-green-700 text-lg font-bold"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>📱 Gerar QR Code PIX</>
                                )}
                            </Button>
                        </div>
                    )}

                    {selectedAuction && paymentMethod === 'pix' && pixData && !paymentConfirmed && (
                        <div className="space-y-4 py-4">
                            <div className={`${isSaiDeBaixo ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-500/30'} border-2 rounded-lg p-4 text-center`}>
                                <img 
                                    src={pixData.qr_code_base64} 
                                    alt="QR Code PIX" 
                                    className="w-64 h-64 mx-auto mb-4 rounded-lg"
                                />
                                <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} mb-2`}>Ou copie o código PIX:</p>
                                <div className="flex gap-2">
                                    <Input
                                        value={pixData.pix_code}
                                        readOnly
                                        className={`text-xs ${isSaiDeBaixo ? 'bg-white' : 'bg-gray-800'}`}
                                    />
                                    <Button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData.pix_code);
                                            toast.success("Código copiado!");
                                        }}
                                        size="icon"
                                        variant="outline"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className={`text-lg font-bold mt-4 ${isSaiDeBaixo ? 'text-green-700' : 'text-green-400'}`}>
                                    R$ {pixData.amount.toFixed(2)}
                                </p>
                            </div>

                            <Button
                                onClick={async () => {
                                    setIsCheckingPayment(true);
                                    try {
                                        toast.info("Verificando pagamento...");
                                        
                                        const response = await checkAbacatePayPix({
                                            billing_id: pixData.billing_id,
                                            auction_id: selectedAuction.id
                                        });

                                        console.log('🔍 Resposta da verificação:', response);

                                        if (response?.data?.is_paid || response?.is_paid) {
                                            setPaymentConfirmed(true);
                                            toast.success("✅ Pagamento confirmado! Atualizando...");
                                            
                                            // Recarregar a lista de arremates
                                            setTimeout(() => {
                                                window.location.reload();
                                            }, 2000);
                                        } else {
                                            toast.info("⏳ Pagamento ainda não identificado. Aguarde alguns instantes e tente novamente.");
                                        }
                                    } catch (error) {
                                        console.error('❌ Erro ao verificar:', error);
                                        toast.error("Erro ao verificar pagamento: " + error.message);
                                    } finally {
                                        setIsCheckingPayment(false);
                                    }
                                }}
                                disabled={isCheckingPayment}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold"
                            >
                                {isCheckingPayment ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>✅ Já efetuei o pagamento</>
                                )}
                            </Button>
                        </div>
                    )}

                    {selectedAuction && paymentConfirmed && (
                        <div className="py-8 text-center">
                            <div className={`${isSaiDeBaixo ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg p-8`}>
                                <div className="text-6xl mb-4">🎉</div>
                                <h3 className={`text-2xl font-bold mb-2 ${isSaiDeBaixo ? 'text-green-700' : 'text-green-400'}`}>
                                    Seu pedido foi pago!
                                </h3>
                                <p className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                                    Aguarde o processamento do seu pedido.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowConfirmModal(false);
                                setPaymentMethod(null);
                                setPixData(null);
                                setPaymentConfirmed(false);
                            }}
                            disabled={isProcessing}
                            className="w-full bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900"
                        >
                            {paymentMethod ? 'Voltar' : 'Cancelar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}