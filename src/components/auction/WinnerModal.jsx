import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles } from "lucide-react";

export default function WinnerModal({ isOpen, auction, finalPrice, onClose, currentUser }) {
  const navigate = useNavigate();

  if (!isOpen || !auction) return null;

  const productImage = (auction.image_urls && auction.image_urls.length > 0) 
    ? auction.image_urls[0] 
    : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

  const isWinner = currentUser && auction.winner_id === currentUser.id;

  const handleGoToWinnings = () => {
    onClose();
    navigate(createPageUrl("MyWinnings"));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 animate-fadeIn overflow-y-auto">
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl max-w-xs w-full p-3 text-center shadow-2xl animate-scaleIn border-2 border-yellow-400 my-2">
        {/* Confetes animados */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Ícone de troféu */}
        <div className="relative mb-2">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Trophy className="w-6 h-6 text-yellow-900 animate-bounce" />
          </div>
          <Sparkles className="absolute top-0 right-1/3 w-4 h-4 text-yellow-300 animate-pulse" />
          <Sparkles className="absolute top-0 left-1/3 w-4 h-4 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Título */}
        <h2 className="text-lg font-bold text-white mb-1">
          🎉 ARREMATADO! 🎉
        </h2>
        <p className="text-yellow-200 text-xs font-semibold mb-2">
          {isWinner ? 'Você venceu!' : `Vencedor: ${auction.winner_name || 'Participante'}`}
        </p>

        {/* Card do Produto */}
        <div className="bg-white rounded-lg p-2 mb-2 shadow-xl">
          <img 
            src={productImage} 
            alt={auction.title}
            className="w-full h-24 object-cover rounded-md mb-2"
          />
          <h3 className="text-gray-900 font-bold text-sm mb-1 line-clamp-1">
            {auction.title}
          </h3>
          <div className="bg-green-100 rounded-md p-2">
            <p className="text-[10px] text-green-700 mb-0.5">
              {isWinner ? '🏆 Parabéns!' : '🎯 Leilão Encerrado'}
            </p>
            <p className="text-xs text-green-600 mb-1">
              {auction.winner_name} arrematou por
            </p>
            <p className="text-xl font-bold text-green-700">
              R$ {finalPrice.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Botão de ação */}
        {isWinner ? (
          <>
            <Button
              onClick={handleGoToWinnings}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg text-sm shadow-lg transform hover:scale-105 transition-all"
            >
              💳 Meus Arremates
            </Button>
            <p className="text-white/80 text-[10px] mt-2">
              Realize o pagamento para garantir!
            </p>
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                onClose();
                navigate(createPageUrl("Home"));
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm shadow-lg transform hover:scale-105 transition-all"
            >
              🏠 Ver Outros Leilões
            </Button>
            <p className="text-white/80 text-[10px] mt-2">
              Continue participando!
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.8);
          }
          to { 
            opacity: 1; 
            transform: scale(1);
          }
        }
        
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}