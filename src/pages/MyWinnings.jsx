import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';


const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, CreditCard, Trophy, Package, Truck, CheckCircle, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { toast } from 'sonner';


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

const WonAuctionCard = ({ auction, onTrackClick, onPayClick, isSaiDeBaixo }) => {
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
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    
    const addDebugLog = (message, type = 'info') => {
        const log = { message, type, time: new Date().toLocaleTimeString() };
        setDebugLogs(prev => [...prev, log]);
        console.log(message);
    };

    const isSaiDeBaixo = false;

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



    const handleTrackClick = (auction) => {
        const trackingPage = isSaiDeBaixo ? 'OrderTrackingSaiDeBaixo' : 'OrderTracking';
        navigate(createPageUrl(trackingPage) + `?auction_id=${auction.id}`);
    };

    const handlePayClick = (auction) => {
        toast.info('Sistema de pagamento em desenvolvimento');
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
        <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-gradient-to-br from-gray-50 to-gray-100' : 'bg-gray-900'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} p-3 sm:p-4 md:p-6 lg:p-8`}>
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 sm:mb-8">
                    <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                        <Trophy className={`w-6 h-6 sm:w-8 sm:h-8 ${isSaiDeBaixo ? 'text-red-600' : 'text-yellow-400'}`} />
                        Meus Arremates
                    </h1>
                    <p className={`text-sm sm:text-base ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} mt-2`}>
                      Produtos que você arrematou
                    </p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {winnings.map(auction => (
                            <WonAuctionCard 
                                key={auction.id} 
                                auction={auction} 
                                onTrackClick={handleTrackClick}
                                onPayClick={handlePayClick}
                                isSaiDeBaixo={false}
                                isProcessing={isProcessing}
                            />
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
}