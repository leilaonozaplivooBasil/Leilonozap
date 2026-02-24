import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from '@/api/base44Client';

const Auction = base44.entities.Auction;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Zap, CheckCircle, Package, Clock, TrendingUp, Shield, Info } from "lucide-react";
import { createPageUrl } from "@/utils";

import CountdownTimer from "../components/common/CountdownTimer";
import FixedAuctionPanel from "../components/auction/FixedAuctionPanel";
import ComparaiButton from '../components/comparai/ComparaiButton';

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Produto não encontrado</h2>
          <p className="text-gray-400 mb-4">Este leilão pode não existir ou ter sido removido.</p>
          <Link to={createPageUrl("Home")}>
            <Button className="bg-green-600 hover:bg-green-700">
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
    <div className="min-h-screen bg-gray-900">
      {/* Header Mobile */}
      <div className="lg:hidden bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <Link to={createPageUrl("Home")}>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="font-semibold text-white truncate mx-4">Detalhes do Produto</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb Desktop */}
        <div className="hidden lg:block mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link to={createPageUrl("Home")} className="hover:text-green-400">
              Leilões
            </Link>
            <span>/</span>
            <span className="text-white">{auction.title}</span>
          </nav>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8 pb-24 lg:pb-0">
          {/* Coluna da Esquerda - Imagens */}
          <div className="space-y-4">
            {/* Imagem Principal */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-700 aspect-square">
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
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex 
                              ? 'bg-white w-8' 
                              : 'bg-white/60 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-4" />
                    <p>Sem imagem disponível</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status de Teste */}
            <Card className="bg-green-900/30 border-green-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-800/50 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-300">Produto Testado</h3>
                    <p className="text-sm text-green-400/80">
                      100% funcional, verificado pela nossa equipe técnica
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Principal - AGORA NA COLUNA DA ESQUERDA */}
            <div className="hidden lg:block">
              {isActive ? (
                <Link to={createPageUrl("AuctionRoom") + `?id=${auction.id}`}>
                  <Button className="w-full bg-green-600 hover:bg-green-700 font-bold py-4 text-lg shadow-lg shadow-green-500/30">
                    <Zap className="w-5 h-5 mr-2" />
                    Entrar na Sala de Leilão
                  </Button>
                </Link>
              ) : (
                <Link to={createPageUrl("Home") + "?filter=ativos"}>
                  <Button variant="outline" className="w-full py-4">
                    Ver Outros Leilões Ativos
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Coluna da Direita - Informações */}
          <div className="space-y-6">
            {/* Título e Categoria */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-gray-100 text-gray-800">
                  {categoryEmojis[auction.category] || '🎯'} {auction.category?.replace('_', ' ')}
                </Badge>
                {isActive && <Badge className="bg-green-100 text-green-800">ATIVO</Badge>}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">
                {auction.title}
              </h1>
            </div>

            {/* Preço e Timer */}
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      {isActive ? 'Lance atual' : 'Valor final'}
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {currentPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">{Math.floor(Math.random() * 25) + 5} lances</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Incremento: +R$ {auction.increment?.toFixed(2) || '10.00'}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium text-green-700">LEILÃO ATIVO</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600 font-bold">
                          <Clock className="w-4 h-4" />
                          <CountdownTimer endTime={auction.end_time} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isActive && auction.winner_name && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <div className="text-amber-700 font-semibold mb-1">🏆 ARREMATADO!</div>
                    <div className="text-amber-600">Vencedor: {auction.winner_name}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Descrição */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Descrição do Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words overflow-wrap-anywhere">
                  {auction.description}
                </p>
              </CardContent>
            </Card>

            {/* Especificações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Informações Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Origem:</span>
                  <span className="font-medium">Devolução/Arremate</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Condição:</span>
                  <span className="font-medium">Testado e Funcional</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Garantia:</span>
                  <span className="font-medium">Sem Garantia*</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Categoria:</span>
                  <span className="font-medium capitalize">{auction.category?.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  * Produtos sem garantia de fábrica, por isso o preço especial.
                </p>
              </CardContent>
            </Card>
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