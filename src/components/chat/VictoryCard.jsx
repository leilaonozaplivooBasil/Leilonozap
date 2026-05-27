import React from 'react';
import { Crown, Sparkles, Trophy, Zap } from 'lucide-react';

export default function VictoryCard({ winner, auction }) {
  const winnerName = winner?.nickname || winner?.full_name || 'Vencedor';
  const finalPrice = auction?.current_price || auction?.starting_price || 0;
  
  // 🆕 GARANTIR QUE SEMPRE TENHA UMA IMAGEM
  const productImage = (auction?.image_urls && auction.image_urls.length > 0) 
    ? auction.image_urls[0] 
    : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';
  
  const productTitle = auction?.title || 'Produto Arrematado';
  
  return (
    <div className="flex justify-center mb-4 md:mb-6 px-2 md:px-4 animate-victory-entrance">
      <div className="victory-card-premium relative max-w-2xl w-full rounded-2xl md:rounded-3xl overflow-hidden">
        
        {/* 🌈 FUNDO DEGRADÊ NEON */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-400 to-yellow-400 opacity-90"></div>
        
        {/* ✨ EFEITO DE BRILHO PULSANTE */}
        <div className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent animate-pulse-glow"></div>
        
        {/* 🎆 CONFETE ANIMADO */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="confetti-1"></div>
          <div className="confetti-2"></div>
          <div className="confetti-3"></div>
          <div className="confetti-4"></div>
          <div className="confetti-5"></div>
        </div>

        {/* 📦 CONTEÚDO DO CARTÃO */}
        <div className="relative z-10 p-4 md:p-8 text-center">
          
          {/* 🔨 LOGO DO MARTELO */}
          <div className="flex justify-center mb-3 md:mb-6">
            <img 
              src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/50cd0ef98_image.png"
              alt="Arrematado"
              className="w-20 h-20 md:w-32 md:h-32 object-contain animate-bounce-celebration drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8)) drop-shadow(0 10px 40px rgba(0,0,0,0.6))'
              }}
            />
          </div>

          {/* 🎊 TÍTULO "VENDIDO!" */}
          <div className="mb-3 md:mb-4">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-1 md:mb-2 tracking-tight animate-pulse-text"
                style={{
                  textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(34,197,94,0.6), 0 4px 12px rgba(0,0,0,0.4)'
                }}>
              🎊 VENDIDO! 🎉
            </h2>
            <div className="text-xl md:text-3xl lg:text-4xl font-bold text-yellow-300 animate-scale-pulse"
                 style={{ 
                   textShadow: '0 0 25px rgba(253,224,71,0.9), 0 0 50px rgba(234,179,8,0.7), 0 4px 10px rgba(0,0,0,0.5)'
                 }}>
              Para {winnerName}!
            </div>
          </div>

          {/* 👤 AVATAR DO VENCEDOR */}
          <div className="flex justify-center mb-3 md:mb-6">
            {winner?.avatar_url ? (
              <div 
                className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 overflow-hidden animate-scale-pulse"
                style={{ 
                  borderColor: '#FFD700',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.9), 0 0 80px rgba(34,197,94,0.5)'
                }}
              >
                <img 
                  src={winner.avatar_url} 
                  alt={winnerName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div 
                className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center text-2xl md:text-4xl font-black text-white animate-scale-pulse bg-gradient-to-br from-green-600 to-emerald-700"
                style={{ 
                  borderColor: '#FFD700',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.9), 0 0 80px rgba(34,197,94,0.5)'
                }}
              >
                {winnerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* 🏆 MENSAGEM DE PARABENIZAÇÃO */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-6 mb-3 md:mb-6 border-2 border-yellow-400 shadow-2xl">
            <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
              <Trophy className="w-5 h-5 md:w-7 md:h-7 text-yellow-400 animate-bounce" />
              <h3 className="text-lg md:text-2xl font-bold text-yellow-300">Parabéns!</h3>
              <Trophy className="w-5 h-5 md:w-7 md:h-7 text-yellow-400 animate-bounce" />
            </div>
            <p className="text-white text-sm md:text-xl leading-relaxed font-semibold">
              <strong className="text-yellow-300">{winnerName}</strong> arrematou com sucesso:
            </p>
          </div>

          {/* 📦 CARD DO PRODUTO */}
          <div className="bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-6 border-2 border-green-400 shadow-2xl">
            <div className="flex items-start gap-2 md:gap-4">
              {/* 🆕 IMAGEM RESPONSIVA */}
              <img 
                src={productImage} 
                alt={productTitle}
                className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-lg md:rounded-xl flex-shrink-0 shadow-lg"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';
                }}
              />
              <div className="text-left flex-1">
                <h4 className="text-sm md:text-xl font-bold text-gray-900 mb-2 md:mb-3 leading-tight">
                  {productTitle}
                </h4>
                
                {/* 💰 PREÇO COM RESPONSIVIDADE */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg md:rounded-xl p-2 md:p-4 mb-1 md:mb-2 shadow-lg animate-pulse-glow-price">
                  <div className="flex items-center justify-center gap-1 md:gap-2">
                    <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-yellow-300 animate-spin-slow" />
                    <span className="text-2xl md:text-4xl font-black text-white"
                          style={{
                            textShadow: '0 0 20px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.4)'
                          }}>
                      R$ {finalPrice.toFixed(2)}
                    </span>
                    <Zap className="w-4 h-4 md:w-6 md:h-6 text-yellow-300 animate-bounce" />
                  </div>
                  <p className="text-center text-yellow-100 text-xs md:text-sm font-bold mt-0.5 md:mt-1">
                    Lance vencedor
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 👑 RODAPÉ */}
          <div className="mt-3 md:mt-6 flex items-center justify-center gap-2 text-white text-xs md:text-sm font-bold">
            <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 animate-bounce" />
            <span style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
              Leilão NoZap - Você arrematou!
            </span>
            <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 animate-bounce" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes victory-entrance {
          0% {
            opacity: 0;
            transform: scale(0.7) translateY(60px);
          }
          60% {
            transform: scale(1.08) translateY(-15px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes bounce-celebration {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(8deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-12px) rotate(-8deg);
          }
        }

        @keyframes scale-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        @keyframes pulse-text {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes pulse-glow-price {
          0%, 100% {
            box-shadow: 0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(16,185,129,0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(34,197,94,0.9), 0 0 80px rgba(16,185,129,0.6);
          }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-victory-entrance {
          animation: victory-entrance 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-bounce-celebration {
          animation: bounce-celebration 2s ease-in-out infinite;
        }

        .animate-scale-pulse {
          animation: scale-pulse 2s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .animate-pulse-text {
          animation: pulse-text 1.5s ease-in-out infinite;
        }
        
        .animate-pulse-glow-price {
          animation: pulse-glow-price 2s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .confetti-1, .confetti-2, .confetti-3, .confetti-4, .confetti-5 {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #FFD700;
          animation: confetti-fall 3s linear infinite;
        }
        
        .confetti-1 {
          left: 10%;
          animation-delay: 0s;
          background: #FFD700;
        }
        
        .confetti-2 {
          left: 30%;
          animation-delay: 0.5s;
          background: #22c55e;
        }
        
        .confetti-3 {
          left: 50%;
          animation-delay: 1s;
          background: #3b82f6;
        }
        
        .confetti-4 {
          left: 70%;
          animation-delay: 1.5s;
          background: #f59e0b;
        }
        
        .confetti-5 {
          left: 90%;
          animation-delay: 2s;
          background: #ef4444;
        }
        
        .victory-card-premium {
          box-shadow: 0 0 60px rgba(34,197,94,0.8), 0 0 120px rgba(255,215,0,0.6), 0 20px 80px rgba(0,0,0,0.4);
          border: 3px solid rgba(255,215,0,0.8);
        }
      `}</style>
    </div>
  );
}