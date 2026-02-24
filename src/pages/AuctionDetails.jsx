import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from '@/api/base44Client';

const Auction = base44.entities.Auction;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, CheckCircle, Package, Clock, TrendingUp, Shield, Info, Flame } from "lucide-react";
import { createPageUrl } from "@/utils";

import CountdownTimer from "../components/common/CountdownTimer";
import FixedAuctionPanel from "../components/auction/FixedAuctionPanel";
import ComparaiButton from '../components/comparai/ComparaiButton';
import LiquidGlassStyles from '../components/home/LiquidGlassStyles';

export default function AuctionDetails() {
  const location = useLocation();
  const auctionId = new URLSearchParams(location.search).get("id");
  const [auction, setAuction] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadAuction = async () => {
      if (!auctionId) return;
      
      try {
        const auctions = await Auction.filter({ id: auctionId });
        if (auctions.length > 0) {
          setAuction(auctions[0]);
        }
      } catch (error) {
        console.error("Error loading auction:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuction();
  }, [auctionId]);

  // Carrossel automático
  useEffect(() => {
    if (!auction?.image_urls || auction.image_urls.length <= 1) return;

    const startCarousel = () => {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % auction.image_urls.length);
      }, 4000);
    };

    startCarousel();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auction?.image_urls]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-green-400/8 rounded-full blur-[100px]" />
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" style={{ boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}></div>
          <p className="text-gray-400">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        <LiquidGlassStyles />
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="text-center glass-card-elevated rounded-3xl p-8 max-w-md relative z-10">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-white mb-2">Produto não encontrado</h2>
          <p className="text-gray-400 mb-6">Este leilão pode não existir ou ter sido removido.</p>
          <Link to={createPageUrl("Home")}>
            <Button className="glass-btn-green text-white font-bold rounded-xl border-0 px-6 py-3">
              Voltar para Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls : [];
  const currentPrice = auction.current_price || auction.starting_price;
  const isActive = auction.status === "active" && new Date(auction.end_time) > new Date();

  const categoryEmojis = {
    eletronicos: "📱",
    eletrodomesticos: "🔌",
    moveis_decoracao: "🛋️",
    casa_jardim: "🏡",
    ferramentas: "🛠️",
    roupas_acessorios: "👕",
    esportes_lazer: "⚽",
    brinquedos_hobbies: "🧸",
    livros_midia: "📚",
    veiculos_pecas: "🚗",
    instrumentos_musicais: "🎸",
    beleza_cuidado_pessoal: "💅",
    outros: "🎯"
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      <LiquidGlassStyles />
      
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] orb-1" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-green-400/8 rounded-full blur-[100px] orb-2" />
        <div className="absolute bottom-20 right-1/4 w-[300px] h-[300px] bg-emerald-600/6 rounded-full blur-[80px] orb-3" />
        <div className="grid-overlay absolute inset-0 opacity-40" />
      </div>

      {/* Header Mobile */}
      <div className="lg:hidden relative z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(16,185,129,0.1)',
        }}>
        <Link to={createPageUrl("Home")}>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="font-semibold text-white truncate mx-4">Detalhes do Produto</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
        {/* Breadcrumb Desktop */}
        <div className="hidden lg:block mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link to={createPageUrl("Home")} className="hover:text-emerald-400 transition-colors">
              Leilões
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300">{auction.title}</span>
          </nav>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 pb-24 lg:pb-0">
          {/* Coluna da Esquerda - Imagens */}
          <div className="space-y-4">
            {/* Imagem Principal */}
            <div className="relative overflow-hidden rounded-2xl aspect-square glass-shimmer"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(16,185,129,0.03) 100%)',
                border: '1px solid rgba(16,185,129,0.12)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
              {images.length > 0 ? (
                <>
                  {images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${auction.title} - foto ${index + 1}`}
                      className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
                        index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                      onError={(e) => {
                        e.target.src = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";
                      }}
                    />
                  ))}
                  
                  {/* Indicadores do carrossel */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentImageIndex 
                              ? 'bg-emerald-400 w-8 shadow-lg shadow-emerald-400/40' 
                              : 'bg-white/40 w-2 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-500">Sem imagem disponível</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Testado */}
            <div className="rounded-2xl p-4" style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)',
              border: '1px solid rgba(16,185,129,0.15)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(16,185,129,0.06)',
            }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-300">Produto Testado</h3>
                  <p className="text-sm text-emerald-400/70">
                    100% funcional, verificado pela nossa equipe técnica
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Principal Desktop */}
            <div className="hidden lg:block">
              {isActive ? (
                <Link to={createPageUrl("AuctionRoom") + `?id=${auction.id}`}>
                  <button className="w-full rounded-2xl py-4 text-lg font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]" style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))',
                    border: '1px solid rgba(16,185,129,0.3)',
                    boxShadow: '0 8px 32px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}>
                    <Flame className="w-5 h-5 animate-fire" />
                    Entrar na Sala de Leilão
                  </button>
                </Link>
              ) : (
                <Link to={createPageUrl("Home") + "?filter=ativos"}>
                  <button className="w-full rounded-2xl py-4 text-base font-semibold text-gray-300 flex items-center justify-center gap-2 transition-all duration-300 hover:text-white hover:scale-[1.01]" style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                  }}>
                    Ver Outros Leilões Ativos
                  </button>
                </Link>
              )}
            </div>

            {/* Especificações - Abaixo do CTA */}
            <div className="glass-card rounded-2xl overflow-hidden" style={{
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
              <div className="px-6 pt-5 pb-3">
                <h3 className="flex items-center gap-2 text-white font-semibold text-base">
                  <Shield className="w-5 h-5 text-emerald-400/60" />
                  Informações Importantes
                </h3>
              </div>
              <div className="px-6 pb-5 space-y-0">
                {[
                  { label: 'Origem', value: 'Devolução/Arremate' },
                  { label: 'Condição', value: 'Testado e Funcional' },
                  { label: 'Garantia', value: 'Sem Garantia*' },
                  { label: 'Categoria', value: auction.category?.replace('_', ' '), capitalize: true },
                ].map((item, i, arr) => (
                  <div key={item.label} className={`flex justify-between py-3`} style={i < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                    <span className="text-gray-500 text-sm">{item.label}:</span>
                    <span className={`font-medium text-gray-300 text-sm ${item.capitalize ? 'capitalize' : ''}`}>{item.value}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-600 mt-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                  * Produtos sem garantia de fábrica, por isso o preço especial.
                </p>
              </div>
            </div>
          </div>

          {/* Coluna da Direita - Informações */}
          <div className="space-y-5">
            {/* Título e Categoria */}
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-300" style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}>
                  {categoryEmojis[auction.category] || '🎯'} {auction.category?.replace('_', ' ')}
                </span>
                {isActive && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-300" style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    ATIVO
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 break-words tracking-tight">
                {auction.title}
              </h1>
            </div>

            {/* Preço e Timer */}
            <div className="glass-card rounded-2xl p-6 glass-shimmer" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(16,185,129,0.04) 100%)',
              borderColor: 'rgba(16,185,129,0.12)',
            }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm text-gray-400 mb-1">
                    {isActive ? 'Lance atual' : 'Valor final'}
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-gradient-green">
                    R$ {currentPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gray-400 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500/50" />
                    <span className="text-sm">{Math.floor(Math.random() * 25) + 5} lances</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Incremento: +R$ {auction.increment?.toFixed(2) || '10.00'}
                  </p>
                </div>
              </div>

              {isActive && (
                <div className="rounded-xl p-4" style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))',
                  border: '1px solid rgba(16,185,129,0.15)',
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                      <span className="font-semibold text-emerald-400 text-sm">LEILÃO ATIVO</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-emerald-300 font-bold">
                        <Clock className="w-4 h-4" />
                        <CountdownTimer endTime={auction.end_time} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isActive && auction.winner_name && (
                <div className="rounded-xl p-4 text-center" style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <div className="text-amber-400 font-semibold mb-1">🏆 ARREMATADO!</div>
                  <div className="text-amber-300/80 text-sm">Vencedor: {auction.winner_name}</div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="glass-card rounded-2xl overflow-hidden" style={{
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
              <div className="px-6 pt-5 pb-3">
                <h3 className="flex items-center gap-2 text-white font-semibold text-base">
                  <Info className="w-5 h-5 text-emerald-400/60" />
                  Descrição do Produto
                </h3>
              </div>
              <div className="px-6 pb-5">
                <p className="text-gray-400 leading-relaxed whitespace-pre-line break-words text-sm">
                  {auction.description}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* PAINEL FIXO PARA MOBILE */}
      {isActive && <FixedAuctionPanel auction={auction} />}

      {/* BOTÃO COMPARAI */}
      <ComparaiButton auction={auction} />
    </div>
  );
}