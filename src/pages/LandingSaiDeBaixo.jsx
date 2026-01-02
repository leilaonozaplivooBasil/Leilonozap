import React, { useEffect, useRef, useCallback, useState } from "react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;

export default function LandingSaiDeBaixo() {
  const audioContextRef = useRef(null);
  const [productImages, setProductImages] = useState([]);

  // --- FUNÇÕES DE SOM E VIBRAÇÃO ---
  const playHammerSound = useCallback(() => {
    if (!audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (error) {
      console.error("Erro ao tocar som do martelo:", error);
    }
  }, []);

  const triggerVibration = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 150, 200, 150, 300]);
    }
  }, []);

  // --- BOTÃO DE ENTRADA ---
  const handleEnter = useCallback(async () => {
    console.log("🚀 BOTÃO PRESSIONADO - NAVEGANDO PARA SAI DE BAIXO!");
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      triggerVibration();
      setTimeout(() => playHammerSound(), 200);
      setTimeout(() => playHammerSound(), 700);
      setTimeout(() => playHammerSound(), 1200);

      setTimeout(() => {
        sessionStorage.setItem('hasEnteredAsGuest', 'true');
        window.location.href = createPageUrl('SaiDeBaixo');
      }, 1500);

    } catch (error) {
      console.error("Erro na sequência do botão:", error);
      sessionStorage.setItem('hasEnteredAsGuest', 'true');
      window.location.href = createPageUrl('SaiDeBaixo');
    }
  }, [playHammerSound, triggerVibration]);
  
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Erro ao fechar AudioContext:", e));
      }
    };
  }, []);

  useEffect(() => {
    const loadSaiDeBaixoProducts = async () => {
      try {
        const saiDeBaixoAuctions = await Auction.filter({ partner_store: 'sai_de_baixo' }, "-created_date", 20);
        
        const images = saiDeBaixoAuctions
          .filter(auction => auction.image_urls && auction.image_urls.length > 0)
          .map(auction => auction.image_urls[0])
          .slice(0, 10);
        
        setProductImages(images);
        console.log('✅ [Sai de Baixo] Carregados', images.length, 'produtos no carrossel');
      } catch (error) {
        console.error('Erro ao carregar produtos Sai de Baixo:', error);
        setProductImages([]);
      }
    };

    loadSaiDeBaixoProducts();
  }, []);

  return (
    <>
      <div className="page-entry-animation">
        <div className="hammer-impact-indicator">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/917b16eb6_image.png" alt="Martelo de Leilão" className="w-20 h-20" />
        </div>
      </div>

      <div className="landing-container-sdb">
        <div className="shape-blob-sdb"></div>
        <div className="shape-blob-sdb one"></div>
        <div className="shape-blob-sdb two"></div>
        
        <div className="content-wrapper">
          <div className="text-center pt-8 md:pt-16">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/4898f3e09_br-11134210-7r98o-lub0ag42vvxhf2.jpg"
              alt="Sai de Baixo"
              className="h-24 md:h-32 w-auto mx-auto mb-6 logo-entrance"
            />
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter title-entrance">
              Sai de Baixo Leilões
            </h1>
            <p className="text-xl md:text-2xl text-red-600 font-semibold mb-8 subtitle-entrance">
              Moda com estilo. Preços imbatíveis.
            </p>
          </div>

          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <Card className="glass-card-sdb mb-12">
                <CardContent className="p-8 md:p-12">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                      O que é Sai de Baixo Leilões?
                    </h2>
                    <div className="w-24 h-1 bg-red-600 mx-auto"></div>
                  </div>

                  <div className="text-lg md:text-xl leading-relaxed text-gray-800 space-y-6 mb-10">
                    <p className="text-center">
                      Sua loja de moda exclusiva com 
                      <span className="text-red-600 font-bold"> ofertas-relâmpago e descontos reais</span>. 
                      Trabalhamos com <strong className="text-gray-900">roupas e acessórios de qualidade</strong>, 100% testados e prontos para você arrasar.
                    </p>
                    <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-200">
                      <p className="text-gray-900 font-medium text-center text-xl">
                        Nossa proposta: <strong className="text-red-600">você compra barato porque conseguimos os melhores preços</strong> — e repassamos pra você!
                      </p>
                    </div>
                  </div>

                  <div className="text-center px-4 sm:px-0">
                    <Button 
                      onClick={handleEnter}
                      className="cta-button-sdb epic-pulse-button-sdb w-full sm:w-auto max-w-full"
                      size="lg"
                    >
                      <span className="text-base sm:text-lg whitespace-nowrap overflow-hidden text-ellipsis">🔥 Entrar na Sai de Baixo</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <p className="text-gray-400 text-xs sm:text-sm mt-4">
                      Clique para sentir o impacto do leilão! 🔥
                    </p>
                  </div>
                </CardContent>
              </Card>

              {productImages.length > 0 && (
                <div className="infinite-scroll-container-sdb">
                  <div className="infinite-scroll-track">
                    {productImages.map((src, index) => (
                      <div key={`first-${index}`} className="product-scroll-item-sdb">
                        <img 
                          src={src} 
                          alt={`Produto Sai de Baixo ${index + 1}`}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ))}
                    {productImages.map((src, index) => (
                      <div key={`second-${index}`} className="product-scroll-item-sdb">
                        <img 
                          src={src} 
                          alt={`Produto Sai de Baixo ${index + 1}`}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-8 my-16">
                <Card className="benefit-card-sdb">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper-sdb bg-red-500/20 text-red-400">
                      <div className="text-4xl">💰</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Preços Imbatíveis</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Moda de qualidade com preços abaixo do mercado.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="benefit-card-sdb">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper-sdb bg-white/20 text-white">
                      <div className="text-4xl">👕</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Variedade Total</h3>
                    <p className="text-gray-700 leading-relaxed">
                      <span className="text-red-600 font-semibold">👔 Masculino</span>, <span className="text-gray-900 font-semibold">👗 Feminino</span> e <span className="text-red-600 font-semibold">👶 Infantil</span>
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="benefit-card-sdb">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper-sdb bg-red-500/20 text-red-400">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.687"/>
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Direto no WhatsApp</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Atendimento rápido, transparente e sem burocracia.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-red-50 border-red-300 border-2">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-white"/>
                    </div>
                    <div>
                      <h4 className="font-bold text-red-700 text-lg mb-3">Transparência Total:</h4>
                      <div className="text-gray-800 space-y-3 text-sm leading-relaxed">
                        <p>• Sai de Baixo Leilões é uma <strong>estratégia de venda</strong>, não um leilão oficial.</p>
                        <p>• Nossos produtos são <strong>cuidadosamente selecionados</strong> para oferecer a melhor relação custo-benefício.</p>
                        <p>• Trabalhamos com <strong>produtos de qualidade</strong> a preços excepcionais.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* --- GERAL & BACKGROUND --- */
        .landing-container-sdb {
          min-height: 100vh;
          background: #ffffff;
          overflow: hidden;
          position: relative;
        }
        .content-wrapper {
          position: relative;
          z-index: 10;
        }

        /* --- ANIMAÇÃO DE BLOBS DE FUNDO --- */
        @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .shape-blob-sdb {
          background: #dc2626;
          height: 150px; width: 150px;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          opacity: 0.15;
          position: absolute;
          top: 10%; left: 10%;
          animation: rotate 20s infinite linear;
        }
        .shape-blob-sdb.one {
          background: #991b1b;
          height: 250px; width: 250px;
          top: 60%; left: 70%;
          animation: rotate 30s infinite linear reverse;
        }
        .shape-blob-sdb.two {
          background: #ef4444;
          height: 200px; width: 200px;
          top: 40%; left: 40%;
          animation: rotate 25s infinite linear;
        }

        /* --- CARDS DE VIDRO (GLASSMORPHISM) --- */
        .glass-card-sdb, .benefit-card-sdb {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 2px solid rgba(220, 38, 38, 0.3);
          box-shadow: 0 8px 32px 0 rgba(220, 38, 38, 0.25);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .benefit-card-sdb:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 40px 0 rgba(220, 38, 38, 0.5);
        }

        /* --- BOTÃO COM ANIMAÇÃO PULSANTE --- */
        .cta-button-sdb {
          background: linear-gradient(90deg, #dc2626, #b91c1c);
          color: white;
          font-weight: bold;
          padding: 1rem 1.5rem;
          border-radius: 9999px;
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
          transition: all 0.3s ease-in-out;
          border: none;
          position: relative;
          overflow: visible;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 3.5rem;
          max-width: 100%;
        }
        
        @media (min-width: 640px) {
          .cta-button-sdb {
            padding: 1rem 2.5rem;
            overflow: hidden;
          }
        }
        
        .epic-pulse-button-sdb {
          animation: epic-pulse-sdb 2s ease-in-out infinite;
        }
        
        @keyframes epic-pulse-sdb {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
          }
          50% { 
            transform: scale(1.08); 
            box-shadow: 0 8px 30px rgba(220, 38, 38, 0.8);
          }
        }
        
        .epic-pulse-button-sdb:hover {
          animation: none;
          transform: translateY(-3px) scale(1.1);
          box-shadow: 0 12px 40px rgba(220, 38, 38, 0.9);
        }
        
        .cta-button-sdb::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.6s ease;
        }
        .cta-button-sdb:hover::before {
          left: 100%;
        }

        /* --- SCROLL INFINITO --- */
        .infinite-scroll-container-sdb {
          width: 100%;
          overflow: hidden;
          margin: 3rem auto;
          background: rgba(254, 226, 226, 0.6);
          border-radius: 1rem;
          padding: 1.5rem 0;
          mask-image: linear-gradient(to right, 
                      hsl(0 0% 0% / 0), 
                      hsl(0 0% 0% / 1) 15%, 
                      hsl(0 0% 0% / 1) 85%, 
                      hsl(0 0% 0% / 0));
        }

        .infinite-scroll-track {
          display: flex;
          width: calc(280px * 14);
          animation: scroll-infinite 25s linear infinite;
        }

        .product-scroll-item-sdb {
          flex: 0 0 260px;
          height: 160px;
          margin: 0 10px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2);
          border: 2px solid rgba(220, 38, 38, 0.3);
        }

        .product-scroll-item-sdb img {
          max-width: 95%;
          max-height: 95%;
          object-fit: contain;
          filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.4));
          transition: transform 0.3s ease;
        }

        .product-scroll-item-sdb:hover img {
          transform: scale(1.08);
        }

        @keyframes scroll-infinite {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-280px * 7));
          }
        }

        .infinite-scroll-container-sdb:hover .infinite-scroll-track {
          animation-play-state: paused;
        }

        /* --- CARDS DE BENEFÍCIOS --- */
        .benefit-icon-wrapper-sdb {
          width: 4rem; height: 4rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        /* === ANIMAÇÕES DE ENTRADA ÉPICA === */
        .page-entry-animation {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeOutEpic 2.5s ease-out forwards;
        }

        .hammer-impact-indicator {
          font-size: 4rem;
          opacity: 0;
          animation: hammerSequence 2s ease-out;
        }
        .hammer-impact-indicator img {
          filter: drop-shadow(0 0 15px rgba(220, 38, 38, 0.5));
        }

        @keyframes hammerSequence {
          0% { opacity: 0; transform: scale(0.5); }
          15% { opacity: 1; transform: scale(1.5) rotate(15deg); }
          25% { opacity: 0; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.3) rotate(-10deg); }
          50% { opacity: 0; transform: scale(1); }
          65% { opacity: 1; transform: scale(1.6) rotate(20deg); }
          75% { opacity: 0; transform: scale(1); }
          100% { opacity: 0; }
        }

        @keyframes fadeOutEpic {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        .logo-entrance {
          opacity: 0;
          animation: logoAppear 1s ease-out 2.2s both;
        }
        
        .title-entrance {
          opacity: 0;
          animation: titleSlideIn 1.2s ease-out 2.5s both;
        }
        
        .subtitle-entrance {
          opacity: 0;
          animation: subtitleFadeIn 1s ease-out 2.8s both;
        }

        @keyframes logoAppear {
          0% { opacity: 0; transform: scale(0.3) rotate(-180deg); }
          50% { transform: scale(1.2) rotate(10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes titleSlideIn {
          0% { opacity: 0; transform: translateY(50px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes subtitleFadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}