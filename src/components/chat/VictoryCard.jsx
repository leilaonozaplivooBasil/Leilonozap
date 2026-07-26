import React from 'react';
import { Crown, Sparkles, Trophy, Zap, Gavel } from 'lucide-react';

const HAMMER_IMG = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/50cd0ef98_image.png';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

// Confete gerado de forma determinística (mesma sequência a cada render,
// para a animação não "pular" quando o chat re-renderiza)
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: ((i * 53) % 28) / 10,
  duration: 2.6 + ((i * 29) % 18) / 10,
  size: 6 + ((i * 13) % 7),
  color: ['#FFD700', '#22c55e', '#34d399', '#fbbf24', '#f59e0b', '#a7f3d0'][i % 6],
  tilt: ((i * 71) % 360),
  round: i % 3 === 0,
}));

export default function VictoryCard({ winner, auction, currentUser }) {
  const hasWinner = Boolean(winner?.id || winner?.nickname || winner?.full_name);
  const winnerName = winner?.nickname || winner?.full_name || null;
  const isMe = Boolean(hasWinner && currentUser && winner?.id === currentUser.id);
  const finalPrice = auction?.current_price || auction?.starting_price || 0;

  const productImage = (auction?.image_urls && auction.image_urls.length > 0)
    ? auction.image_urls[0]
    : FALLBACK_IMG;
  const productTitle = auction?.title || 'Produto';

  // ── 🔨 SEM LANCES: encerramento sóbrio, sem festa ─────────────────────────
  if (!hasWinner) {
    return (
      <div className="flex justify-center mb-4 md:mb-6 px-2 md:px-4 vc-entrance">
        <div className="relative max-w-xl w-full rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="p-5 md:p-7 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-amber-400/40 bg-amber-500/10">
              <Gavel className="h-7 w-7 text-amber-400 vc-hammer-idle" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-1">🔨 Leilão encerrado</h3>
            <p className="text-amber-300/90 text-sm font-semibold mb-4">Este lote terminou sem lances.</p>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left">
              <img
                src={productImage}
                alt={productTitle}
                className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                onError={(e) => { e.target.src = FALLBACK_IMG; }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{productTitle}</p>
                <p className="text-xs text-gray-400">Encerrado em <span className="font-bold text-gray-200">R$ {Number(finalPrice).toFixed(2)}</span></p>
              </div>
            </div>
          </div>
          <VictoryStyles />
        </div>
      </div>
    );
  }

  // ── 🏆 COM VENCEDOR: sequência de arremate (marteladas → carimbo → festa) ──
  return (
    <div className="flex justify-center mb-4 md:mb-6 px-2 md:px-4 vc-entrance">
      <div className="vc-card relative max-w-2xl w-full rounded-2xl md:rounded-3xl overflow-hidden">

        {/* Fundo degradê + brilho varrendo */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-500 to-yellow-400"></div>
        <div className="vc-sheen absolute inset-0"></div>

        {/* 🎆 Confete (começa junto do carimbo) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="vc-confetti"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.round ? c.size : c.size * 1.8,
                background: c.color,
                borderRadius: c.round ? '999px' : '2px',
                animationDelay: `${1.3 + c.delay}s`,
                animationDuration: `${c.duration}s`,
                transform: `rotate(${c.tilt}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-4 md:p-8 text-center">

          {/* 🔨 FASE 1 — martelo bate 3x com onda de choque */}
          <div className="relative flex justify-center mb-2 md:mb-4">
            <span className="vc-shockwave" style={{ animationDelay: '0.25s' }}></span>
            <span className="vc-shockwave" style={{ animationDelay: '0.65s' }}></span>
            <span className="vc-shockwave vc-shockwave--big" style={{ animationDelay: '1.05s' }}></span>
            <img
              src={HAMMER_IMG}
              alt="Martelo do leiloeiro"
              className="vc-hammer w-20 h-20 md:w-28 md:h-28 object-contain"
            />
          </div>

          {/* 💥 Flash da batida final */}
          <div className="vc-flash absolute inset-0 pointer-events-none"></div>

          {/* 🎊 FASE 2 — carimbo "VENDIDO!" */}
          <div className="mb-3 md:mb-4">
            <h2 className="vc-stamp text-4xl md:text-6xl font-black text-white tracking-tight">
              VENDIDO!
            </h2>
            <div className="vc-rise text-lg md:text-2xl font-bold text-yellow-200 mt-1" style={{ animationDelay: '1.75s' }}>
              {isMe ? 'Para VOCÊ' : `Para ${winnerName}`}! 🎉
            </div>
          </div>

          {/* 👤 FASE 3 — vencedor + produto sobem em cascata */}
          <div className="vc-rise flex justify-center mb-3 md:mb-5" style={{ animationDelay: '1.95s' }}>
            {winner?.avatar_url ? (
              <div className="vc-avatar h-16 w-16 md:h-24 md:w-24 overflow-hidden rounded-full border-4">
                <img src={winner.avatar_url} alt={winnerName} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="vc-avatar grid h-16 w-16 md:h-24 md:w-24 place-items-center rounded-full border-4 bg-gradient-to-br from-green-700 to-emerald-800 text-2xl md:text-4xl font-black text-white">
                {(winnerName || 'V').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="vc-rise mx-auto mb-3 md:mb-5 max-w-md rounded-xl md:rounded-2xl border-2 border-yellow-400/80 bg-gray-900/85 p-3 md:p-5 backdrop-blur-md" style={{ animationDelay: '2.1s' }}>
            <div className="mb-1.5 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-yellow-400" />
              <h3 className="text-lg md:text-xl font-bold text-yellow-300">{isMe ? 'Parabéns, você venceu!' : 'Parabéns!'}</h3>
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-yellow-400" />
            </div>
            <p className="text-sm md:text-lg font-semibold text-white">
              <strong className="text-yellow-300">{winnerName}</strong> arrematou com sucesso:
            </p>
          </div>

          <div className="vc-rise mx-auto max-w-md rounded-xl md:rounded-2xl border-2 border-green-300/70 bg-white/95 p-3 md:p-5 shadow-2xl" style={{ animationDelay: '2.25s' }}>
            <div className="flex items-start gap-3 md:gap-4">
              <img
                src={productImage}
                alt={productTitle}
                className="h-20 w-20 md:h-24 md:w-24 flex-shrink-0 rounded-lg md:rounded-xl object-cover shadow-lg"
                onError={(e) => { e.target.src = FALLBACK_IMG; }}
              />
              <div className="flex-1 text-left">
                <h4 className="mb-2 text-sm md:text-lg font-bold leading-tight text-gray-900">{productTitle}</h4>
                <div className="vc-price rounded-lg md:rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-2 md:p-3">
                  <div className="flex items-center justify-center gap-1.5 md:gap-2">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-yellow-300" />
                    <span className="text-2xl md:text-3xl font-black text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
                      R$ {Number(finalPrice).toFixed(2)}
                    </span>
                    <Zap className="h-4 w-4 md:h-5 md:w-5 text-yellow-300" />
                  </div>
                  <p className="mt-0.5 text-center text-[11px] md:text-xs font-bold text-yellow-100">Lance vencedor</p>
                </div>
              </div>
            </div>
          </div>

          {/* 👑 Rodapé */}
          <div className="vc-rise mt-3 md:mt-5 flex items-center justify-center gap-2 text-xs md:text-sm font-bold text-white" style={{ animationDelay: '2.4s' }}>
            <Crown className="h-4 w-4 md:h-5 md:w-5 text-yellow-300" />
            <span style={{ textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}>
              {isMe ? 'Leilão NoZap — Você arrematou!' : 'Leilão NoZap — Arrematado ao vivo'}
            </span>
            <Crown className="h-4 w-4 md:h-5 md:w-5 text-yellow-300" />
          </div>
        </div>

        <VictoryStyles />
      </div>
    </div>
  );
}

function VictoryStyles() {
  return (
    <style>{`
      .vc-card {
        border: 3px solid rgba(255, 215, 0, 0.85);
        box-shadow: 0 0 50px rgba(34, 197, 94, 0.65), 0 0 110px rgba(255, 215, 0, 0.45), 0 20px 70px rgba(0, 0, 0, 0.45);
      }

      /* Entrada do card inteiro */
      @keyframes vc-entrance {
        0% { opacity: 0; transform: scale(0.85) translateY(40px); }
        70% { transform: scale(1.03) translateY(-8px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .vc-entrance { animation: vc-entrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

      /* 🔨 Martelo: 3 batidas secas (sincronizadas com o "bum bum bum" do som) */
      @keyframes vc-hammer-strike {
        0%, 8% { transform: rotate(-38deg) translateY(-8px); }
        14% { transform: rotate(14deg) translateY(4px); }
        20%, 30% { transform: rotate(-38deg) translateY(-8px); }
        36% { transform: rotate(14deg) translateY(4px); }
        42%, 52% { transform: rotate(-42deg) translateY(-10px); }
        58% { transform: rotate(16deg) translateY(6px); }
        70%, 100% { transform: rotate(0deg) translateY(0); }
      }
      .vc-hammer {
        transform-origin: 80% 85%;
        animation: vc-hammer-strike 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        filter: drop-shadow(0 0 24px rgba(255, 215, 0, 0.75)) drop-shadow(0 8px 30px rgba(0, 0, 0, 0.5));
      }
      .vc-hammer-idle { animation: vc-hammer-idle 2.4s ease-in-out infinite; transform-origin: 70% 80%; }
      @keyframes vc-hammer-idle {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-14deg); }
      }

      /* Ondas de choque a cada batida */
      @keyframes vc-shockwave {
        0% { opacity: 0.9; transform: translate(-50%, -50%) scale(0.2); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(2.6); }
      }
      .vc-shockwave {
        position: absolute; left: 50%; top: 60%;
        width: 90px; height: 90px; border-radius: 999px;
        border: 3px solid rgba(255, 255, 255, 0.85);
        transform: translate(-50%, -50%) scale(0.2);
        opacity: 0;
        animation: vc-shockwave 0.55s ease-out both;
        pointer-events: none;
      }
      .vc-shockwave--big { border-width: 5px; border-color: rgba(255, 215, 0, 0.95); animation-duration: 0.75s; }

      /* Flash branco na batida final */
      @keyframes vc-flash {
        0%, 100% { opacity: 0; }
        50% { opacity: 0.75; }
      }
      .vc-flash { background: white; opacity: 0; animation: vc-flash 0.35s ease-out 1.05s both; }

      /* 🎊 Carimbo "VENDIDO!": cai como um stamp após a batida final */
      @keyframes vc-stamp {
        0% { opacity: 0; transform: scale(3.2) rotate(-14deg); }
        55% { opacity: 1; transform: scale(0.92) rotate(-4deg); }
        75% { transform: scale(1.06) rotate(-2deg); }
        100% { opacity: 1; transform: scale(1) rotate(-2deg); }
      }
      .vc-stamp {
        display: inline-block;
        animation: vc-stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.15s both;
        text-shadow: 0 0 18px rgba(255,255,255,0.85), 0 0 45px rgba(34,197,94,0.7), 0 5px 14px rgba(0,0,0,0.4);
      }

      /* Elementos sobem em cascata depois do carimbo */
      @keyframes vc-rise {
        0% { opacity: 0; transform: translateY(22px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .vc-rise { animation: vc-rise 0.45s ease-out both; }

      /* Brilho varrendo o fundo */
      @keyframes vc-sheen {
        0% { transform: translateX(-120%) skewX(-18deg); }
        100% { transform: translateX(220%) skewX(-18deg); }
      }
      .vc-sheen {
        background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
        animation: vc-sheen 2.8s ease-in-out 1.4s infinite;
      }

      /* Avatar com pulso dourado */
      @keyframes vc-avatar-glow {
        0%, 100% { box-shadow: 0 0 26px rgba(255, 215, 0, 0.85), 0 0 60px rgba(34, 197, 94, 0.45); }
        50% { box-shadow: 0 0 44px rgba(255, 215, 0, 1), 0 0 90px rgba(34, 197, 94, 0.6); }
      }
      .vc-avatar { border-color: #FFD700; animation: vc-avatar-glow 2s ease-in-out infinite; }

      /* Preço pulsando */
      @keyframes vc-price-glow {
        0%, 100% { box-shadow: 0 0 16px rgba(34, 197, 94, 0.55); }
        50% { box-shadow: 0 0 34px rgba(34, 197, 94, 0.9); }
      }
      .vc-price { animation: vc-price-glow 2s ease-in-out infinite; }

      /* Confete com balanço lateral */
      @keyframes vc-confetti-fall {
        0% { transform: translateY(-40px) rotate(0deg); opacity: 0; }
        8% { opacity: 1; }
        50% { transform: translateY(45vh) translateX(18px) rotate(340deg); }
        100% { transform: translateY(95vh) translateX(-14px) rotate(720deg); opacity: 0; }
      }
      .vc-confetti {
        position: absolute; top: -20px;
        animation-name: vc-confetti-fall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .vc-hammer, .vc-stamp, .vc-rise, .vc-sheen, .vc-confetti, .vc-shockwave, .vc-flash, .vc-avatar, .vc-price, .vc-entrance {
          animation: none !important; opacity: 1 !important; transform: none !important;
        }
      }
    `}</style>
  );
}
