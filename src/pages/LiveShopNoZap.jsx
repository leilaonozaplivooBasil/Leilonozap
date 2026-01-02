import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, ShoppingBag, ChevronLeft, ChevronRight, Zap, TrendingUp, Gavel } from "lucide-react";
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

export default function LiveShopNoZap() {
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
          partner_store: { $ne: 'sai_de_baixo' },
          status: 'active'
        }, "-created_date", 10);
        setProducts(allProducts);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      }
    };

    const loadLiveSession = async () => {
      try {
        const sessions = await LiveSession.filter({ partner_store: 'nozap' }, "-created_date", 1);
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
    const viewerInterval = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 5000);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(viewerInterval);
    };
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentProductIndex(prev => (prev + 1) % products.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [products.length]);

  useEffect(() => {
    const loadBids = async () => {
      if (!currentProduct) return;
      try {
        const bids = await Bid.filter({ auction_id: currentProduct.id }, "-created_date", 3);
        
        const currentBidsStr = JSON.stringify(bids.map(b => ({ id: b.id, amount: b.amount })));
        const lastBidsStr = JSON.stringify(recentBids.map(b => ({ id: b.id, amount: b.amount })));
        
        if (currentBidsStr !== lastBidsStr) {
          setRecentBids(bids);
          
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

    const finalAmount = amount || parseFloat(bidAmount);
    if (!finalAmount || isNaN(finalAmount)) return;

    const minBid = currentProduct.current_price + currentProduct.increment;
    if (finalAmount < minBid) {
      toast.error(`Lance mínimo é R$ ${minBid.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await Bid.create({
        auction_id: currentProduct.id,
        bidder_name: currentUser.full_name || currentUser.nickname,
        amount: finalAmount
      });

      lastPriceRef.current[currentProduct.id] = finalAmount;
      
      const newProducts = [...products];
      newProducts[currentProductIndex] = {
        ...currentProduct,
        current_price: finalAmount
      };
      setProducts(newProducts);

      await Auction.update(currentProduct.id, {
        current_price: finalAmount
      });

      setBidAmount("");
      toast.success(`Lance de R$ ${finalAmount.toFixed(2)} enviado! 🎯`);
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
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
                alt="Leilão NoZap"
                className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(createPageUrl("Home"))}
              />
              <div>
                <h1 className="text-xl font-bold text-white">Live Shop</h1>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Ver Loja
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          
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
                    <div className="w-20 h-20 mx-auto bg-green-600 rounded-full flex items-center justify-center">
                      <div className="w-16 h-16 border-4 border-white rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-xl font-bold">Live Shop</p>
                      <p className="text-gray-300 text-sm mt-2">Transmissão em breve...</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div className="bg-gray-800 rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-bold text-white mb-2">Sobre a Live</h2>
              <p className="text-gray-400">
                Bem-vindo à Live Shop NoZap! Acompanhe em tempo real as melhores ofertas 
                em arremates e devoluções. Participe do chat e garanta seus produtos favoritos!
              </p>
            </div>
          </div>

          <div className="space-y-4">
            
            {!activeProduct ? (
              <Card className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-8 text-center">
                  <div className="mb-6">
                    <div className="inline-block animate-bounce">
                      <Gavel className="w-20 h-20 mx-auto text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Fica de olho…
                  </h3>
                  <p className="text-lg text-gray-400">
                    O próximo leilão já já começa! 🎯
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-sm text-green-500 font-semibold">Aguardando próximo produto</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Lance Agora</h3>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-gray-700 to-gray-800">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-400 mb-1">Lance Atual</p>
                    <p className="text-4xl font-bold text-green-400">
                      R$ {currentProduct.current_price?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Incremento mínimo: + R$ {currentProduct.increment?.toFixed(2)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 5].map((mult) => {
                      const quickAmount = currentProduct.current_price + (currentProduct.increment * mult);
                      return (
                        <Button
                          key={mult}
                          onClick={() => handleSubmitBid(quickAmount)}
                          disabled={isSubmitting || !currentUser}
                          className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center py-3 h-auto"
                        >
                          <Zap className="w-4 h-4 mb-1" />
                          <span className="text-xs">R$ {quickAmount.toFixed(2)}</span>
                        </Button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="Valor personalizado"
                        disabled={isSubmitting || !currentUser}
                        className="flex-1 bg-gray-900 border-gray-600 text-white"
                        min={currentProduct.current_price + currentProduct.increment}
                      />
                      <Button
                        onClick={() => handleSubmitBid()}
                        disabled={isSubmitting || !bidAmount || !currentUser}
                        className="bg-green-600 hover:bg-green-700 text-white px-6"
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

                <div className="border-t border-gray-700">
                  <div className="px-4 py-2 bg-gray-900">
                    <p className="text-xs font-semibold text-gray-400">Últimos Lances</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {recentBids.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-sm">
                        <p>Seja o primeiro a dar um lance! 🎯</p>
                      </div>
                    ) : (
                      recentBids.slice(0, 3).map((bid) => (
                        <div key={bid.id} className="px-4 py-2 border-b border-gray-700 hover:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {bid.bidder_name[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-white">
                                {bid.bidder_name}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-green-400">
                              R$ {bid.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            )}

            {products.length > 0 && currentProduct && (
              <Card className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2">
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
                      className="w-full h-40 bg-gray-700 rounded-lg overflow-hidden mb-3 cursor-pointer"
                      onClick={() => goToProduct(currentProduct.id)}
                    >
                      <img 
                        src={currentProduct.image_urls?.[0] || '/placeholder.jpg'} 
                        alt={currentProduct.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 
                      className="font-bold text-white text-sm mb-2 line-clamp-2 cursor-pointer hover:text-green-400 transition-colors"
                      onClick={() => goToProduct(currentProduct.id)}
                    >
                      {currentProduct.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Lance atual</p>
                        <p className="text-lg font-bold text-green-400">
                          R$ {currentProduct.current_price?.toFixed(2)}
                        </p>
                      </div>
                      <Button 
                        onClick={() => goToProduct(currentProduct.id)}
                        className="bg-green-600 hover:bg-green-700 text-sm"
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
                          ? 'w-6 bg-green-500' 
                          : 'w-1.5 bg-gray-600 hover:bg-gray-500'
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