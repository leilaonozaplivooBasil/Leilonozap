import React, { useEffect, useRef, useCallback } from "react";
// import { User } from "@/entities/User"; // Removed as per instructions (no login flow)
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const audioContextRef = useRef(null);

  // --- FUNÇÕES DE SOM E VIBRAÇÃO (COM SOM DE MARTELO MELHORADO) ---
  const playHammerSound = useCallback(() => {
    if (!audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // --- A MÁGICA PARA UM SOM DE IMPACTO REAL ---
      // 1. ONDA SONORA: Um triângulo é menos "eletrônico" que a onda anterior.
      osc.type = 'triangle';
      
      // 2. VOLUME (O "THUMP"): Ataque muito rápido, queda rápida.
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.02); // Sobe pra 70% do volume em 0.02s
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); // Cai drasticamente em 0.2s

      // 3. FREQUÊNCIA (O "TACK"): Começa mais agudo e fica grave, simulando o impacto.
      osc.frequency.setValueAtTime(150, now); // Começa em 150hz
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1); // Cai para um grave de 50hz

      osc.start(now);
      osc.stop(now + 0.3); // O som dura apenas 0.3 segundos.
    } catch (error) {
      console.error("Erro ao tocar som do martelo:", error);
    }
  }, []);

  const triggerVibration = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 150, 200, 150, 300]);
    }
  }, []);

  // --- BOTÃO DE ENTRADA INTELIGENTE ---
  const handleEnterAsGuest = useCallback(async () => { // Renamed from handleLoginRedirect
    console.log("🚀 BOTÃO PRESSIONADO - NAVEGANDO PARA HOME!");
    try {
      // 1. Prepara o áudio
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume(); // Added await here, was missing in original and outline
      }
      
      // 2. Efeitos sonoros e de vibração
      triggerVibration();
      setTimeout(() => playHammerSound(), 200);
      setTimeout(() => playHammerSound(), 700);
      setTimeout(() => playHammerSound(), 1200);

      // 🔒 AÇÃO PRINCIPAL: Marca o visitante e Navega para a Home
      setTimeout(() => {
        // ✅ A SOLUÇÃO: "Etiqueta" o visitante antes de navegar.
        sessionStorage.setItem('hasEnteredAsGuest', 'true');
        window.location.href = createPageUrl('Home');
      }, 1500);

    } catch (error) {
      console.error("Erro na sequência do botão:", error);
      // Fallback: vai para Home mesmo se o som falhar
      sessionStorage.setItem('hasEnteredAsGuest', 'true'); // Ensure guest status is set even on error
      window.location.href = createPageUrl('Home');
    }
  }, [playHammerSound, triggerVibration]);
  
  // Limpeza do AudioContext ao sair da página
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Erro ao fechar AudioContext:", e));
      }
    };
  }, []);

  const productImages = [
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/f917607a1_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/42516c4cc_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/560991041_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/78549b7ee_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/32aeb727f_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/245d4009f_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png"
  ];
  
  // Removed floatingItems array based on the outline

  return (
    <>
      <div className="page-entry-animation">
        <div className="hammer-impact-indicator">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/917b16eb6_image.png" alt="Martelo de Leilão" className="w-20 h-20" />
        </div>
      </div>

      {/* Header exclusivo da Landing */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10, 15, 28, 0.55)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(16, 185, 129, 0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-12 w-auto"
          />
          <button
            onClick={() => base44.auth.redirectToLogin('/Home')}
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 16px rgba(16,185,129,0.15)' }}
            className="text-white text-sm font-semibold px-4 py-2 rounded-xl hover:scale-105 transition-transform"
          >
            Painel do Arrematante
          </button>
        </div>
      </header>

      <div className="landing-container" style={{ paddingTop: '64px' }}>
        <div className="shape-blob"></div>
        <div className="shape-blob one"></div>
        <div className="shape-blob two"></div>

        {/* Removed floating-items-container JSX based on the outline */}
        
        <div className="content-wrapper">
          <div className="text-center pt-8 md:pt-16">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
              alt="Leilão NoZap"
              className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-full shadow-2xl border-2 border-green-500/50 logo-entrance"
            />
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter title-entrance">
              Leilão NoZap
            </h1>
            <p className="text-xl md:text-2xl text-green-400 font-semibold mb-8 subtitle-entrance">
              Consumo inteligente. Entrega imediata.
            </p>
          </div>

          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <Card className="glass-card mb-12">
                <CardContent className="p-8 md:p-12">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      O que é o Leilão NoZap?
                    </h2>
                    <div className="w-24 h-1 bg-green-500 mx-auto"></div>
                  </div>

                  <div className="text-lg md:text-xl leading-relaxed text-gray-300 space-y-6 mb-10">
                    <p className="text-center">
                      Um canal de vendas exclusivo via WhatsApp com 
                      <span className="text-green-400 font-bold"> ofertas-relâmpago e descontos reais</span>. 
                      Trabalhamos com produtos <strong className="text-white">arrematados e devolvidos no período de 7 dias</strong>, 100% testados e prontos para entrega.
                    </p>
                    <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                      <p className="text-white font-medium text-center text-xl">
                        Nossa proposta: <strong className="text-green-300">você compra barato porque a loja não pode vender como novo</strong> — e a gente pode.
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={handleEnterAsGuest} // Updated onClick handler
                      className="cta-button epic-pulse-button"
                      size="lg"
                    >
                      <span>🔨 Entrar no Leilão Agora</span>
                      <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <p className="text-gray-400 text-sm mt-4">
                      Clique para sentir o impacto do martelo do leilão! 🔥
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="infinite-scroll-container">
                <div className="infinite-scroll-track">
                  {productImages.map((src, index) => (
                    <div key={`first-${index}`} className="product-scroll-item">
                      <img 
                        src={src} 
                        alt={`Produto ${index + 1}`}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                  {productImages.map((src, index) => (
                    <div key={`second-${index}`} className="product-scroll-item">
                      <img 
                        src={src} 
                        alt={`Produto ${index + 1}`}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 my-16">
                <Card className="benefit-card">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper bg-green-500/20 text-green-400">
                      <div className="text-4xl">💰</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Descontos Reais</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Preços abaixo do mercado em produtos 100% funcionais.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="benefit-card">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper bg-blue-500/20 text-blue-400">
                      <div className="text-4xl">🚀</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Entrega ou Retirada Imediata</h3>
                    <p className="text-gray-400 leading-relaxed">
                      <span className="text-blue-300 font-semibold">🚶‍♂️ Retirada no local</span> ou <span className="text-green-300 font-semibold">🚀 entrega expressa</span>. Produtos testados e higienizados.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="benefit-card">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper bg-green-500/20 text-green-400">
                      {/* Updated icon to an inline SVG */}
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.687"/>
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Direto no WhatsApp</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Negociação rápida, transparente e sem burocracia.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-orange-500/10 border-orange-500/30 border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-orange-400/80 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-white"/>
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-300 text-lg mb-3">Transparência Total:</h4>
                      <div className="text-orange-300/90 space-y-3 text-sm leading-relaxed">
                        <p>• O Leilão NoZap é uma <strong>estratégia de venda</strong>, não um leilão oficial regido por leiloeiro.</p>
                        <p>• Nossos produtos são <strong>arrematados e devolvidos no período de 7 dias</strong>. Na grande maioria, são <strong>produtos zerados que nunca foram usados</strong>. Você não compra usado, compra novo que foi devolvido, apenas sem a garantia da loja original.</p>
                        <p>• Como trabalhamos com produtos de repasse, <strong>não oferecemos devolução</strong>. Mas é por isso que conseguimos oferecer preços tão abaixo do mercado.</p>
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
        .landing-container {
          min-height: 100vh;
          background-color: #0c0a09;
          background-image: radial-gradient(circle at 25% 30%, #166534 0%, transparent 40%),
                            radial-gradient(circle at 75% 70%, #15803d 0%, transparent 40%);
          overflow: hidden;
          position: relative;
        }
        .content-wrapper {
          position: relative;
          z-index: 10;
        }

        /* --- ANIMAÇÃO DE BLOBS DE FUNDO --- */
        @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .shape-blob {
          background: #16a34a;
          height: 150px; width: 150px;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          opacity: 0.15;
          position: absolute;
          top: 10%; left: 10%;
          animation: rotate 20s infinite linear;
        }
        .shape-blob.one {
          background: #4f46e5;
          height: 250px; width: 250px;
          top: 60%; left: 70%;
          animation: rotate 30s infinite linear reverse;
        }
        .shape-blob.two {
          background: #be185d;
          height: 200px; width: 200px;
          top: 40%; left: 40%;
          animation: rotate 25s infinite linear;
        }
        
        /* Removed PRODUTOS FLUTUANTES CSS based on the outline */

        /* --- CARDS DE VIDRO (GLASSMORPHISM) --- */
        .glass-card, .benefit-card {
          background: rgba(17, 24, 39, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .benefit-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 40px 0 rgba(0, 0, 0, 0.5);
        }

        /* --- BOTÃO COM ANIMAÇÃO PULSANTE --- */
        .cta-button {
          background: linear-gradient(90deg, #22c55e, #16a34a);
          color: white;
          font-weight: bold;
          font-size: 1.125rem;
          padding: 1rem 2.5rem;
          border-radius: 9999px;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
          transition: all 0.3s ease-in-out;
          border: none;
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
        }
        
        .epic-pulse-button {
          animation: epic-pulse 2s ease-in-out infinite;
        }
        
        @keyframes epic-pulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
          }
          50% { 
            transform: scale(1.08); 
            box-shadow: 0 8px 30px rgba(34, 197, 94, 0.8);
          }
        }
        
        .epic-pulse-button:hover {
          animation: none;
          transform: translateY(-3px) scale(1.1);
          box-shadow: 0 12px 40px rgba(34, 197, 94, 0.9);
        }
        
        .cta-button::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.6s ease;
        }
        .cta-button:hover::before {
          left: 100%;
        }

        /* --- SCROLL INFINITO --- */
        .infinite-scroll-container {
          width: 100%;
          overflow: hidden;
          margin: 3rem auto;
          background: rgba(17, 24, 39, 0.3);
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

        .product-scroll-item {
          flex: 0 0 260px;
          height: 160px;
          margin: 0 10px;
          background: rgba(31, 41, 55, 0.8);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(34, 197, 94, 0.2);
        }

        .product-scroll-item img {
          max-width: 95%;
          max-height: 95%;
          object-fit: contain;
          filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.4));
          transition: transform 0.3s ease;
        }

        .product-scroll-item:hover img {
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

        .infinite-scroll-container:hover .infinite-scroll-track {
          animation-play-state: paused;
        }

        /* --- CARDS DE BENEFÍCIOS --- */
        .benefit-icon-wrapper {
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
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
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