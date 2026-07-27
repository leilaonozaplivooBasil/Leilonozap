import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { money, addMoney, mulMoney, gteMoney } from "@/lib/money";
import { Eye, ShoppingBag, ChevronLeft, ChevronRight, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Auction = base44.entities.Auction;
const Bid = base44.entities.Bid;
const AppUser = base44.entities.AppUser;
const LiveSession = base44.entities.LiveSession;

export default function LiveShop() {
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 50) + 150);
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentBids, setRecentBids] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const navigate = useNavigate();
  const lastPriceRef = useRef({});

  const currentProduct = activeProduct || products[currentProductIndex];

  useEffect(() => {
    const loadUser = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      if (savedUserJSON) {
        setCurrentUser(JSON.parse(savedUserJSON));
      }
    };

    const loadProducts = async () => {
      try {
        const allProducts = await Auction.filter({ 
          partner_store: 'sai_de_baixo',
          status: 'active'
        }, "-created_date", 10);
        setProducts(allProducts);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      }
    };

    const loadLiveSession = async () => {
      try {
        const sessions = await LiveSession.list("-created_date", 1);
        if (sessions.length > 0) {
          setLiveSession(sessions[0]);
          
          if (sessions[0].current_product_id) {
            const productData = await Auction.filter({ id: sessions[0].current_product_id });
            if (productData.length > 0) {
              setActiveProduct(productData[0]);
            }
          } else {
            setActiveProduct(null);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      }
    };

    loadUser();
    loadProducts();
    loadLiveSession();

    const sessionInterval = setInterval(loadLiveSession, 5000);
    return () => clearInterval(sessionInterval);

    // Simula variação de espectadores
    const viewerInterval = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 5000);

    return () => clearInterval(viewerInterval);
  }, []);

  // Auto-rotação de produtos DESABILITADA para evitar conflito com lances
  useEffect(() => {
    if (products.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentProductIndex(prev => (prev + 1) % products.length);
    }, 30000); // Aumentado para 30 segundos

    return () => clearInterval(interval);
  }, [products.length]);

  // Carrega lances recentes do produto atual
  useEffect(() => {
    const loadBids = async () => {
      if (!currentProduct) return;
      try {
        const bids = await Bid.filter({ auction_id: currentProduct.id }, "-created_date", 3);
        
        // Atualiza apenas se houver mudança real nos lances
        const currentBidsStr = JSON.stringify(bids.map(b => ({ id: b.id, amount: b.amount })));
        const lastBidsStr = JSON.stringify(recentBids.map(b => ({ id: b.id, amount: b.amount })));
        
        if (currentBidsStr !== lastBidsStr) {
          setRecentBids(bids);
          
          // Atualiza o preço APENAS se houver um lance NOVO e maior
          if (bids.length > 0) {
            const highestBid = Math.max(...bids.map(b => b.amount));
            const lastKnownPrice = lastPriceRef.current[currentProduct.id] || currentProduct.current_price;
            
            if (highestBid > lastKnownPrice) {
              lastPriceRef.current[currentProduct.id] = highestBid;
              const newProducts = [...products];
              newProducts[currentProductIndex] = {
                ...currentProduct,
                current_price: highestBid
              };
              setProducts(newProducts);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar lances:", error);
      }
    };
    
    loadBids();
    const interval = setInterval(loadBids, 5000);
    return () => clearInterval(interval);
  }, [currentProduct?.id]);

  const handleSubmitBid = async (amount = null) => {
    if (!currentUser) {
      toast.error("Faça login para dar lances!");
      return;
    }

    if (!currentProduct) return;

    const finalAmount = money(amount || parseFloat(bidAmount));
    if (!finalAmount || isNaN(finalAmount)) return;

    const minBid = addMoney(currentProduct.current_price, currentProduct.increment);
    if (!gteMoney(finalAmount, minBid)) {
      toast.error(`Lance mínimo é R$ ${fmtBR(minBid)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await Bid.create({
        auction_id: currentProduct.id,
        bidder_name: currentUser.full_name || currentUser.nickname,
        amount: finalAmount
      });

      // Atualiza referência do último preço
      lastPriceRef.current[currentProduct.id] = finalAmount;
      
      // Atualiza imediatamente no estado local
      const newProducts = [...products];
      newProducts[currentProductIndex] = {
        ...currentProduct,
        current_price: finalAmount
      };
      setProducts(newProducts);

      // Atualiza no banco de dados
      await Auction.update(currentProduct.id, {
        current_price: finalAmount
      });

      setBidAmount("");
      toast.success(`Lance de R$ ${fmtBR(finalAmount)} enviado! 🎯`);
    } catch (error) {
      console.error("Erro ao enviar lance:", error);
      toast.error("Erro ao enviar lance. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToProduct = (productId) => {
    navigate(createPageUrl("AuctionRoom") + `?id=${productId}`);
  };

  const nextProduct = () => {
    setCurrentProductIndex(prev => (prev + 1) % products.length);
  };

  const prevProduct = () => {
    setCurrentProductIndex(prev => (prev - 1 + products.length) % products.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/4898f3e09_br-11134210-7r98o-lub0ag42vvxhf2.jpg"
                alt="Sai de Baixo"
                className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(createPageUrl("SaiDeBaixo"))}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Live Shop</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold">AO VIVO</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{viewers}</span>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate(createPageUrl("SaiDeBaixo"))}
              variant="outline"
              className="border-gray-300"
            >
              Ver Loja
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          
          {/* Live Video Area */}
          <div className="space-y-4">
            <Card className="bg-black aspect-video rounded-xl overflow-hidden shadow-xl relative">
              {liveSession?.is_live && liveSession?.is_paused && liveSession?.pause_image_url ? (
                <div className="w-full h-full relative">
                  <img 
                    src={liveSession.pause_image_url} 
                    alt="Propaganda" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full">
                    <p className="text-white font-bold flex items-center gap-2">
                      ⏸️ Live pausada - Voltamos em breve
                    </p>
                  </div>
                  <audio autoPlay loop>
                    <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
                  </audio>
                </div>
              ) : liveSession?.is_live && liveSession?.stream_url ? (
                <iframe
                  src={liveSession.stream_url.includes('youtube.com') 
                    ? liveSession.stream_url.replace('watch?v=', 'embed/') 
                    : liveSession.stream_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white space-y-4">
                    <div className="w-20 h-20 mx-auto bg-red-600 rounded-full flex items-center justify-center">
                      <div className="w-16 h-16 border-4 border-white rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-xl font-bold">Live Shop Sai de Baixo</p>
                      <p className="text-gray-300 text-sm mt-2">Transmissão em breve...</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Sobre a Live</h2>
              <p className="text-gray-600">
                Bem-vindo à Live Shop Sai de Baixo! Acompanhe em tempo real as melhores ofertas 
                em moda fitness e lifestyle. Participe do chat e garanta seus produtos favoritos!
              </p>
            </div>
          </div>

          {/* Sidebar - Sistema de Leilão */}
          <div className="space-y-4">
            
            {/* Área de Lances */}
            {!activeProduct ? (
              <Card className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="p-8 text-center">
                  <div className="mb-6">
                    <div className="inline-block animate-bounce">
                      <svg className="w-20 h-20 mx-auto text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 1H7C5.9 1 5 1.9 5 3V6H3V8H5V12H3V14H5V18H3V20H5V21C5 22.1 5.9 23 7 23H17C18.1 23 19 22.1 19 21V20H21V18H19V14H21V12H19V8H21V6H19V3C19 1.9 18.1 1 17 1M17 21H7V3H17V21M12 8L8 12H11V16H13V12H16L12 8Z"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Fica de olho…
                  </h3>
                  <p className="text-lg text-gray-600">
                    O próximo leilão já já começa! 🎯
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <p className="text-sm text-red-600 font-semibold">Aguardando próximo produto</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Lance Agora</h3>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                {/* Preço Atual */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 mb-1">Lance Atual</p>
                    <p className="text-4xl font-bold text-red-600">
                      R$ {fmtBR(currentProduct.current_price)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Incremento mínimo: + R$ {fmtBR(currentProduct.increment)}
                    </p>
                  </div>

                  {/* Botões Rápidos */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 5].map((mult) => {
                      const quickAmount = addMoney(currentProduct.current_price, mulMoney(currentProduct.increment, mult));
                      return (
                        <Button
                          key={mult}
                          onClick={() => handleSubmitBid(quickAmount)}
                          disabled={isSubmitting || !currentUser}
                          className="bg-red-600 hover:bg-red-700 text-white flex flex-col items-center py-3 h-auto"
                        >
                          <Zap className="w-4 h-4 mb-1" />
                          <span className="text-xs">R$ {fmtBR(quickAmount)}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Input Personalizado */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="Valor personalizado"
                        disabled={isSubmitting || !currentUser}
                        className="flex-1"
                        min={addMoney(currentProduct.current_price, currentProduct.increment)}
                      />
                      <Button
                        onClick={() => handleSubmitBid()}
                        disabled={isSubmitting || !bidAmount || !currentUser}
                        className="bg-black hover:bg-gray-900 text-white px-6"
                      >
                        {isSubmitting ? "..." : "Dar Lance"}
                      </Button>
                    </div>
                    {!currentUser && (
                      <p className="text-xs text-gray-500 text-center">
                        Faça login para participar
                      </p>
                    )}
                  </div>
                </div>

                {/* Lances Recentes */}
                <div className="border-t border-gray-200">
                  <div className="px-4 py-2 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-600">Últimos Lances</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {recentBids.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        <p>Seja o primeiro a dar um lance! 🎯</p>
                      </div>
                    ) : (
                      recentBids.slice(0, 3).map((bid) => (
                        <div key={bid.id} className="px-4 py-2 border-b border-gray-100 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {bid.bidder_name[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {bid.bidder_name}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-red-600">
                              R$ {fmtBR(bid.amount)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            )}
            
            <style>{`
              @keyframes hammer {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-15deg); }
                75% { transform: rotate(15deg); }
              }
            `}</style>

            {/* Products Carousel */}
            {products.length > 0 && currentProduct && (
              <Card className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="font-semibold text-sm">Produtos em Destaque</span>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      {currentProductIndex + 1}/{products.length}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="p-4">
                    <div 
                      className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-3 cursor-pointer"
                      onClick={() => goToProduct(currentProduct.id)}
                    >
                      <img 
                        src={currentProduct.image_urls?.[0] || '/placeholder.jpg'} 
                        alt={currentProduct.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 
                      className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-red-600 transition-colors"
                      onClick={() => goToProduct(currentProduct.id)}
                    >
                      {currentProduct.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Lance atual</p>
                        <p className="text-lg font-bold text-red-600">
                          R$ {fmtBR(currentProduct.current_price)}
                        </p>
                      </div>
                      <Button 
                        onClick={() => goToProduct(currentProduct.id)}
                        className="bg-red-600 hover:bg-red-700 text-sm"
                      >
                        Ver Leilão
                      </Button>
                    </div>
                  </div>

                  {products.length > 1 && (
                    <>
                      <button
                        onClick={prevProduct}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextProduct}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex justify-center gap-1 pb-3">
                  {products.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentProductIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentProductIndex 
                          ? 'w-6 bg-red-600' 
                          : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}