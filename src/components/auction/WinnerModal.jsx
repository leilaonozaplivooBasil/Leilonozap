import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X } from "lucide-react";

// 🏆 Modal de ARREMATADO — liquid glass verde do site, com 3 estados REAIS
// (dados gravados pelo servidor em finalizeAuction, não estimativa do cliente):
//   • VOCÊ venceu  → celebração completa + CTA de pagamento
//   • OUTRO venceu → informativo, mostra quem arrematou
//   • SEM lances   → encerramento sóbrio, sem festa
export default function WinnerModal({ isOpen, auction, finalPrice, onClose, currentUser }) {
  const navigate = useNavigate();

  if (!isOpen || !auction) return null;

  const productImage = (auction.image_urls && auction.image_urls.length > 0)
    ? auction.image_urls[0]
    : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

  const hasWinner = Boolean(auction.winner_id || auction.winner_name);
  const isWinner = Boolean(currentUser && auction.winner_id === currentUser.id);
  const winnerLabel = auction.winner_name || null;
  const price = Number(auction.current_price ?? finalPrice) || 0;

  const handleGoToWinnings = () => {
    onClose();
    navigate(createPageUrl("MyWinnings"));
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-3 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="winner-glass relative max-w-sm w-full p-5 text-center animate-scaleIn my-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Confetes — só quando houve vencedor */}
        {hasWinner && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  width: i % 3 === 0 ? 5 : 7,
                  height: i % 3 === 0 ? 5 : 11,
                  borderRadius: i % 3 === 0 ? '999px' : '2px',
                  background: ['#fbbf24', '#34d399', '#FFD700', '#a7f3d0'][i % 4],
                  left: `${(i * 83) % 100}%`,
                  animationDelay: `${(i * 0.37) % 2}s`,
                  animationDuration: `${2 + ((i * 0.53) % 2)}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Ícone principal — martelo 3D martelando 3 vezes */}
        <div className="relative mb-3 h-24 grid place-items-center">
          <div className="wm-hammer-stage relative">
            {hasWinner && (
              <>
                <span className="wm-impact-ring" style={{ animationDelay: '0.55s' }} />
                <span className="wm-impact-ring" style={{ animationDelay: '1.15s' }} />
                <span className="wm-impact-ring" style={{ animationDelay: '1.75s' }} />
              </>
            )}
            <img
              src="/martelo-3d.png"
              alt="Martelo do leiloeiro"
              className={`w-20 h-20 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] ${hasWinner ? 'wm-hammer-strike' : ''}`}
            />
          </div>
        </div>

        {isWinner && (
          <p className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200 border border-emerald-300/30 bg-emerald-400/10 rounded-full px-3 py-1 mb-2">
            Arremate confirmado
          </p>
        )}

        <h2 className="text-2xl font-black text-white mb-1 tracking-wide">
          {isWinner ? 'VOCÊ ARREMATOU!' : hasWinner ? 'ARREMATADO!' : 'Leilão encerrado'}
        </h2>
        <p className="text-emerald-200 text-sm font-semibold mb-3">
          {isWinner
            ? 'O lote é seu — garanta seu produto!'
            : hasWinner
              ? <>Vencedor: <span className="text-white">{winnerLabel}</span></>
              : 'Este lote terminou sem lances.'}
        </p>

        {/* Card do produto — vidro claro por cima do vidro verde */}
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-3 mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <img
            src={productImage}
            alt={auction.title}
            className="w-full h-28 object-cover rounded-xl mb-2"
          />
          <h3 className="text-white font-bold text-sm mb-2 line-clamp-1">{auction.title}</h3>
          <div className={`rounded-xl border p-2.5 ${hasWinner ? 'border-emerald-300/25 bg-emerald-400/15' : 'border-white/10 bg-white/5'}`}>
            <p className="text-[11px] text-emerald-200 mb-0.5 uppercase tracking-wide">
              {isWinner ? 'Seu lance vencedor' : hasWinner ? `${winnerLabel} arrematou por` : 'Encerrado em'}
            </p>
            <p className={`text-2xl font-black drop-shadow ${hasWinner ? 'text-emerald-300 wm-price' : 'text-gray-200'}`}>
              R$ {price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* CTA */}
        {hasWinner ? (
          <>
            <button
              onClick={handleGoToWinnings}
              className="w-full rounded-xl py-3 text-sm font-bold text-emerald-950 shadow-lg transition-transform hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg,#34d399,#10b981)', boxShadow: '0 10px 28px rgba(16,185,129,.4)' }}
            >
              {isWinner ? 'Pagar e garantir meu arremate' : 'Ver Meus Arremates'}
            </button>
            <p className="text-white/70 text-[11px] mt-2">
              {isWinner ? 'Realize o pagamento para garantir o produto!' : 'Confira os produtos arrematados'}
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => { onClose(); navigate(createPageUrl('Home')); }}
              className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.03] border border-white/20 bg-white/10 hover:bg-white/15"
            >
              Ver outros leilões
            </button>
            <p className="text-white/70 text-[11px] mt-2">Novos lotes entram no ar todos os dias</p>
          </>
        )}
      </div>

      <style>{`
        .winner-glass {
          border-radius: 24px;
          border: 1px solid rgba(52, 211, 153, 0.35);
          background: linear-gradient(155deg, rgba(16,185,129,0.28) 0%, rgba(6,78,59,0.55) 45%, rgba(2,44,34,0.75) 100%);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.18);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
        }
        @keyframes wm-price-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        /* Martelo 3D: levanta e bate 3 vezes, depois descansa */
        @keyframes wm-hammer-strike {
          0%   { transform: rotate(0deg); }
          8%   { transform: rotate(-42deg); }
          17%  { transform: rotate(10deg) scale(0.97); }  /* 1ª batida ~0.55s */
          22%  { transform: rotate(0deg); }
          30%  { transform: rotate(-42deg); }
          38%  { transform: rotate(10deg) scale(0.97); }  /* 2ª batida ~1.15s */
          43%  { transform: rotate(0deg); }
          51%  { transform: rotate(-46deg); }
          59%  { transform: rotate(12deg) scale(0.95); }  /* 3ª batida ~1.75s */
          66%  { transform: rotate(-4deg); }
          74%  { transform: rotate(1deg); }
          100% { transform: rotate(0deg); }
        }
        .wm-hammer-strike {
          transform-origin: 82% 85%; /* pivô no cabo */
          animation: wm-hammer-strike 3s cubic-bezier(0.36, 0, 0.24, 1) 0.15s both;
        }
        /* Onda de impacto a cada batida */
        @keyframes wm-impact {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          12%  { opacity: 0.9; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
        .wm-impact-ring {
          position: absolute;
          left: 50%; top: 68%;
          width: 58px; height: 58px;
          border-radius: 9999px;
          border: 2px solid rgba(52, 211, 153, 0.8);
          box-shadow: 0 0 18px rgba(52, 211, 153, 0.5);
          transform: translate(-50%, -50%) scale(0.3);
          opacity: 0;
          animation: wm-impact 0.7s ease-out both;
          pointer-events: none;
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-confetti { animation: confetti linear infinite; }
        .wm-price { display: inline-block; animation: wm-price-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
