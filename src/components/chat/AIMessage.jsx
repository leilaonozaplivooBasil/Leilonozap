import React from "react";
import { Bot, Zap, Crown, Timer } from "lucide-react";
import VictoryCard from "./VictoryCard";
import LeiloeiroAvatar from "@/assets/leiloeiro-avatar.webp";

export default function AIMessage({ message, winner, auction, currentUser }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp || message.created_date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageIcon = () => {
    switch (message.message_type) {
      case 'countdown':
        return <Timer className="w-4 h-4 text-orange-300" />;
      case 'winner_announcement':
        return <Crown className="w-4 h-4 text-yellow-300" />;
      case 'ai_narration':
        // PONTO 83 — verde apagado da marca (o verde vibrante é só do botão de lance)
        return <Zap className="w-4 h-4" style={{ color: '#2E9D63' }} />;
      default:
        return <Bot className="w-4 h-4 text-green-400" />;
    }
  };

  const getMessageStyle = () => {
    if (message.message_type === 'countdown') {
      const phase = message.countdown_phase || 1;
      
      if (phase === 1) {
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-2xl animate-pulse-slow';
      } else if (phase === 2) {
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-2xl animate-pulse-medium';
      } else if (phase === 3) {
        return 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-2xl animate-pulse-fast';
      }
    }
    
    if (message.message_type === 'winner_announcement') {
      return null; // Será renderizado como VictoryCard
    }
    
    if (message.message_type === 'ai_narration') {
      // PONTO 83 — o degradê roxo/magenta saiu: não existe na identidade e ofuscava
      // o botão de lance. Agora é vidro fumê neutro (a IA narra, não compete).
      return 'ai-fume text-slate-100';
    }
    
    return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
  };

  const formatContent = (content) => {
    // 🔨 DESTAQUE PARA OS "DOU-LHE" COM IMAGEM DO LEILOEIRO
    if (content.includes('Dou-lhe')) {
      const phase = message.countdown_phase || 1;
      return (
        <div className="flex items-center gap-3 py-2">
          <img
            src={LeiloeiroAvatar}
            alt="Leiloeiro"
            className="w-16 h-16 object-contain animate-swing"
          />
          <div className="flex-1">
            <div className="text-2xl font-black tracking-wide mb-1">
              {content}
            </div>
            <div className="text-sm opacity-90 font-semibold uppercase tracking-wide">
              {phase === 3 ? 'Última chamada' : 'Lance agora'}
            </div>
          </div>
        </div>
      );
    }
    
    return content;
  };

  // 🏆 SE FOR MENSAGEM DE VITÓRIA, SEMPRE RENDERIZA O CARTÃO
  // 🆕 MESMO SE winner OU auction forem null! (usa fallback)
  if (message.message_type === 'winner_announcement') {
    // 🆕 SE NÃO TEM DADOS, TENTA PARSEAR DO message.content
    let finalWinner = winner;
    let finalAuction = auction;

    if (!finalWinner || !finalAuction) {
      try {
        const parsed = JSON.parse(message.content);
        if (!finalWinner && parsed.winner) finalWinner = parsed.winner;
        if (!finalAuction && parsed.auction) finalAuction = parsed.auction;
      } catch (e) {
        console.warn('⚠️ [AIMESSAGE] Erro ao parsear content:', e.message);
      }
    }

    // 🆕 SE AINDA NÃO TEM AUCTION, USA UM PLACEHOLDER
    if (!finalAuction) {
      finalAuction = {
        title: 'Produto Arrematado',
        current_price: 0,
        starting_price: 0,
        image_urls: []
      };
    }

    return <VictoryCard winner={finalWinner} auction={finalAuction} currentUser={currentUser} />;
  }

  const messageStyle = getMessageStyle();
  
  // Se retornou null (winner_announcement sem dados), não renderiza nada
  if (!messageStyle) return null;

  // PONTO 83 — narração ganha formato de FALA: balão estreito, alinhado à esquerda,
  // padding menor e canto inferior-esquerdo quebrado (leitura de conversa).
  const narracao = message.message_type === 'ai_narration';

  return (
    <div className={`flex mb-4 animate-slide-in ${narracao ? 'justify-start' : 'justify-center'}`}>
      <div className={narracao
        ? `ai-balao px-4 py-3 ${messageStyle}`
        : `max-w-xs lg:max-w-md px-6 py-4 rounded-2xl ${messageStyle}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getMessageIcon()}
            <span className="text-sm font-bold" style={narracao ? { color: '#2E9D63' } : undefined}>
              {message.message_type === 'winner_announcement' ? '🏆 LEILÃO NoZap' : 'LanceIA'}
            </span>
          </div>
          <span className="text-xs opacity-75">
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <div className="font-medium leading-relaxed">
          {formatContent(message.content)}
        </div>
      </div>
      
      <style>{`
        /* PONTO 83 — vidro fumê + balão de fala da LanceIA */
        .ai-fume {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(10px) saturate(1.2);
          -webkit-backdrop-filter: blur(10px) saturate(1.2);
        }
        .ai-balao {
          max-width: 78%;
          border-radius: 16px 16px 16px 5px;
        }

        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.95; }
        }
        
        @keyframes pulse-medium {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
        
        @keyframes pulse-fast {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
        
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(-10deg); }
        }
        
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animate-pulse-medium {
          animation: pulse-medium 1.5s ease-in-out infinite;
        }
        
        .animate-pulse-fast {
          animation: pulse-fast 1s ease-in-out infinite;
        }
        
        .animate-swing {
          animation: swing 1.5s ease-in-out infinite;
        }
        
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}