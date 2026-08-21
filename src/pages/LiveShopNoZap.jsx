import React, { useState, useEffect, useRef } from "react";
import { plataforma } from "@/api/plataformaClient";
import { money, addMoney, mulMoney, gteMoney, fmtBR } from "@/lib/money";
import { Eye, ShoppingBag, ChevronLeft, ChevronRight, Zap, TrendingUp, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import LiveShopHeader from "@/components/liveshop/LiveShopHeader";
import LivooPlayer from "@/components/liveshop/LivooPlayer";
import EmCenaAgora from "@/components/liveshop/EmCenaAgora";
import UltimosLances from "@/components/liveshop/UltimosLances";
import ProximosNaLive from "@/components/liveshop/ProximosNaLive";
import SelosLivoo from "@/components/liveshop/SelosLivoo";
import FundoRosaLive from "@/components/liveshop/FundoRosaLive";

const Auction = plataforma.entities.Auction;
const Bid = plataforma.entities.Bid;
const AppUser = plataforma.entities.AppUser;
const LiveSession = plataforma.entities.LiveSession;

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
    <div className="relative min-h-screen livoo-superficie">
      <FundoRosaLive />
      <LiveShopHeader
        viewers={viewers}
        aoVivo={!!liveSession?.is_live}
        onLogoClick={() => navigate(createPageUrl("Home"))}
        onLojaClick={() => navigate("/Loja-Virtual")}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-5">
        {/* 📱 mobile: coluna única em flex — assim o player sticky acompanha TODA a rolagem.
            💻 desktop: duas colunas com posicionamento explícito. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr,400px] lg:items-start">
          {/* sticky nos dois tamanhos: no celular o player acompanha a rolagem;
              no desktop ele fica ancorado no topo da própria coluna. */}
          <div className="sticky top-[60px] z-10 lg:col-start-1 lg:row-start-1">
            <LivooPlayer
              streamUrl={liveSession?.is_live ? liveSession?.stream_url : null}
              pauseImageUrl={liveSession?.pause_image_url}
              isPaused={!!(liveSession?.is_live && liveSession?.is_paused)}
            />
          </div>

          <div className="livoo-card rounded-2xl p-5 lg:col-start-1 lg:row-start-2">
              <h2 className="text-lg font-bold text-nz-tinta">
                Live Shop Leilão NoZap <span className="text-livoo-rosa">×</span> Livoo
              </h2>
              <p className="mt-1 text-sm text-nz-tinta-fraca">
                Assista à live aqui mesmo e dê seu lance sem sair da página. Arremates e devoluções
                com preço de disputa — e entrega expressa da malha Livoo.
              </p>
          </div>

          <div className="space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <EmCenaAgora
              produto={activeProduct ? currentProduct : null}
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              onBid={handleSubmitBid}
              isSubmitting={isSubmitting}
              logado={!!currentUser}
            />
            {activeProduct && <UltimosLances lances={recentBids} />}
            {products.length > 0 && (
              <ProximosNaLive
                produtos={products}
                index={currentProductIndex}
                setIndex={setCurrentProductIndex}
                onAbrir={goToProduct}
              />
            )}
          </div>
        </div>
      </div>

      <SelosLivoo />
    </div>
  );
}