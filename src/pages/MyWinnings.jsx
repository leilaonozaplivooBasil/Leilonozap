import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';


const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, CreditCard, Trophy, Package, Truck, CheckCircle, Eye, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';



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

const WonAuctionCard = ({ auction, onTrackClick, isSaiDeBaixo }) => {
    const statusConfig = isSaiDeBaixo ? statusConfigSaiDeBaixo : statusConfigNozap;
    const config = statusConfig[auction.order_status] || statusConfig.paid;
    const mainImage = auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";

    return (
        <Card className="group bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 overflow-hidden hover:border-green-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(34,197,94,0.12)]">
            {/* Imagem em destaque - MAIOR */}
            <div className="relative h-64 overflow-hidden bg-gray-900">
                <img 
                    src={mainImage} 
                    alt={auction.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/20 to-transparent" />
            </div>

            <CardContent className="p-4 space-y-3">
                {/* Título e Data - COMPACTO */}
                <div>
                    <h3 className="text-white font-bold text-base line-clamp-2 mb-1 group-hover:text-green-400 transition-colors">
                        {auction.title}
                    </h3>
                    <p className="text-gray-500 text-xs flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {new Date(auction.updated_date).toLocaleDateString('pt-BR')}
                    </p>
                </div>

                {/* Valor em Destaque - COMPACTO */}
                <div className="bg-gradient-to-br from-green-600/10 to-green-700/5 border border-green-500/20 rounded-lg p-3">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Valor do Arremate</p>
                    <p className="text-green-400 text-xl font-black">R$ {auction.current_price.toFixed(2)}</p>
                </div>

                {/* Botão de Ação - Apenas Acompanhar */}
                <Button 
                    onClick={() => onTrackClick(auction)}
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
                >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Acompanhar Pedido
                </Button>
            </CardContent>
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
    const [walletBalance, setWalletBalance] = useState(0);

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
                
                // Busca saldo da carteira digital
                const digitalWallets = await base44.entities.DigitalWallet.filter({ user_id: user.id });
                if (digitalWallets && digitalWallets.length > 0) {
                    setWalletBalance(digitalWallets[0].balance || 0);
                }
                
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
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Redesenhado */}
                <div className="mb-8 sm:mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-2xl shadow-lg shadow-yellow-500/25">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Meus Arremates
                            </h1>
                            <p className="text-gray-400 text-sm sm:text-base mt-1">
                                Produtos que você conquistou nos leilões
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card da Carteira - Design Dark Clean */}
                <Card className="relative overflow-hidden bg-gray-800/80 backdrop-blur-sm border-gray-700/50 mb-6 sm:mb-8 shadow-lg">
                    <CardContent className="relative p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            {/* Lado Esquerdo: Ícone + Info */}
                            <div className="flex items-center gap-4 flex-1">
                                {/* Ícone da Carteira */}
                                <div className="bg-green-500/20 backdrop-blur-xl p-4 rounded-2xl border border-green-500/30 shrink-0">
                                    <Wallet className="w-8 h-8 text-green-400" />
                                </div>

                                {/* Info da Carteira */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        <p className="text-gray-400 text-xs uppercase tracking-widest font-medium">Carteira Digital</p>
                                    </div>
                                    <p className="text-green-400 text-4xl font-black tracking-tight mb-1">
                                        R$ {walletBalance.toFixed(2)}
                                    </p>
                                    <p className="text-gray-500 text-sm">Saldo disponível para leilões</p>
                                </div>
                            </div>

                            {/* Botão Adicionar Saldo */}
                            <Button 
                                onClick={() => navigate(createPageUrl("AddFunds"))}
                                className="w-full sm:w-auto bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 hover:border-green-500/50 font-semibold px-6 py-3 shadow-lg hover:shadow-green-500/20 transition-all duration-300 backdrop-blur-sm"
                            >
                                <CreditCard className="w-5 h-5 mr-2" />
                                Adicionar Saldo
                            </Button>
                        </div>
                    </CardContent>
                </Card>



                {winnings.length === 0 ? (
                    <div className="text-center py-20 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm rounded-3xl border border-gray-700/50">
                        <div className="bg-gradient-to-br from-gray-700 to-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <ShoppingBag className="w-10 h-10 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Você ainda não arrematou nada</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">Participe de um leilão e dê seu lance para começar a sua coleção de produtos incríveis!</p>
                        <Link to={createPageUrl("Home")}>
                            <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-8 py-6 text-base shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300">
                                <Trophy className="w-5 h-5 mr-2" />
                                Ver Leilões Ativos
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {winnings.map(auction => (
                            <WonAuctionCard 
                                key={auction.id} 
                                auction={auction} 
                                onTrackClick={handleTrackClick}
                                isSaiDeBaixo={false}
                            />
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
}