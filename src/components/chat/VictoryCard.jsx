import React from 'react';
import { Crown, Trophy, Gavel } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

// Partículas discretas (determinísticas — mesma sequência a cada render,
// para a animação não "pular" quando o chat re-renderiza)
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 41 + 13) % 100,
  delay: ((i * 53) % 30) / 10,
  duration: 3 + ((i * 29) % 20) / 10,
  size: 3 + ((i * 13) % 4),
  color: i % 3 === 0 ? 'rgba(251,191,36,0.75)' : 'rgba(52,211,153,0.7)',
}));

// 🏆 Card de arremate no chat — liquid glass verde do site (mesma linguagem do
// WinnerModal). Sequência: martelo bate → "VENDIDO" revela → conteúdo em cascata.
export default function VictoryCard({ winner, auction, currentUser }) {
  const hasWinner = Boolean(winner?.id || winner?.nickname || winner?.full_name);
  const winnerName = winner?.nickname || winner?.full_name || null;
  const isMe = Boolean(hasWinner && currentUser && winner?.id === currentUser.id);
  const finalPrice = auction?.current_price || auction?.starting_price || 0;

  const productImage = (auction?.image_urls && auction.image_urls.length > 0)
    ? auction.image_urls[0]
    : FALLBACK_IMG;
  const productTitle = auction?.title || 'Produto';

  // ── 🔨 SEM LANCES: encerramento sóbrio ────────────────────────────────────
  if (!hasWinner) {
    return (
      <div className="flex justify-center mb-4 md:mb-6 px-2 md:px-4 vc-entrance">
        <div className="vc-glass vc-glass--amber relative max-w-xl w-full p-5 md:p-7 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-amber-400/30 bg-amber-400/10">
            <Gavel className="h-6 w-6 text-amber-300/90" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white mb-1">Leilão encerrado</h3>
          <p className="text-amber-200/80 text-sm mb-4">Este lote terminou sem lances.</p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left backdrop-blur-xl">
            <img
              src={productImage}
              alt={productTitle}
              className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
              onError={(e) => { e.target.src = FALLBACK_IMG; }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{productTitle}</p>
              <p className="text-xs text-gray-400 mt-0.5">Encerrado em <span className="font-semibold text-gray-200">R$ {Number(finalPrice).toFixed(2)}</span></p>
            </div>
          </div>
          <VictoryStyles />
        </div>
      </div>
    );
  }

  // ── 🏆 COM VENCEDOR: liquid glass + sequência de arremate ─────────────────
  return (
    <div className="flex justify-center mb-4 md:mb-6 px-2 md:px-4 vc-entrance">
      <div className="vc-glass relative max-w-xl w-full overflow-hidden">

        {/* brilho varrendo o vidro, bem sutil */}
        <div className="vc-sheen absolute inset-0 pointer-events-none"></div>

        {/* partículas discretas caindo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="vc-particle"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                animationDelay: `${1.2 + p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-5 md:p-8 text-center">

          {/* 🔨 Martelo — 3 batidas com ondas finas */}
          <div className="relative mx-auto mb-4 h-16 w-16 md:h-20 md:w-20">
            <span className="vc-ring" style={{ animationDelay: '0.25s' }}></span>
            <span className="vc-ring" style={{ animationDelay: '0.65s' }}></span>
            <span className="vc-ring vc-ring--gold" style={{ animationDelay: '1.05s' }}></span>
            <div className="vc-hammer-badge grid h-full w-full place-items-center rounded-full">
              <Gavel className="vc-hammer h-8 w-8 md:h-10 md:w-10 text-amber-300" />
            </div>
          </div>

          {/* VENDIDO — carimbo limpo */}
          <div className="mb-4">
            <h2 className="vc-stamp text-3xl md:text-5xl font-black tracking-[0.08em] text-white">
              VENDIDO
            </h2>
            <div className="vc-underline mx-auto mt-2 h-[3px] w-24 rounded-full"></div>
            <p className="vc-rise mt-2.5 text-base md:text-lg font-semibold text-emerald-300" style={{ animationDelay: '1.7s' }}>
              {isMe ? 'para você' : `para ${winnerName}`}
            </p>
          </div>

          {/* Avatar do vencedor */}
          <div className="vc-rise flex justify-center mb-4" style={{ animationDelay: '1.85s' }}>
            {winner?.avatar_url ? (
              <div className="vc-avatar h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-full">
                <img src={winner.avatar_url} alt={winnerName} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="vc-avatar grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-2xl md:text-3xl font-black text-white">
                {(winnerName || 'V').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <p className="vc-rise mb-4 text-sm md:text-base text-white/85" style={{ animationDelay: '2.0s' }}>
            <Trophy className="mr-1.5 inline h-4 w-4 text-amber-300 align-[-2px]" />
            {isMe ? 'Parabéns! Você arrematou:' : <><strong className="text-white">{winnerName}</strong> arrematou com sucesso:</>}
          </p>

          {/* Produto — vidro claro por cima do vidro verde */}
          <div className="vc-rise mx-auto max-w-md rounded-2xl border border-white/12 bg-white/[0.07] p-3 md:p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" style={{ animationDelay: '2.15s' }}>
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src={productImage}
                alt={productTitle}
                className="h-16 w-16 md:h-20 md:w-20 flex-shrink-0 rounded-xl object-cover"
                onError={(e) => { e.target.src = FALLBACK_IMG; }}
              />
              <div className="flex-1 text-left min-w-0">
                <h4 className="mb-2 truncate text-sm md:text-base font-semibold text-white">{productTitle}</h4>
                <div className="vc-price inline-flex flex-col items-start rounded-xl border border-emerald-300/25 bg-emerald-400/15 px-3.5 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-200/90">Lance vencedor</span>
                  <span className="text-xl md:text-2xl font-black text-emerald-300">R$ {Number(finalPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="vc-rise mt-4 flex items-center justify-center gap-1.5 text-[11px] md:text-xs font-medium text-white/55" style={{ animationDelay: '2.3s' }}>
            <Crown className="h-3.5 w-3.5 text-amber-300/80" />
            <span>{isMe ? 'Leilão NoZap · Você arrematou' : 'Leilão NoZap · Arrematado ao vivo'}</span>
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
      /* Liquid glass verde — mesma linguagem do WinnerModal */
      .vc-glass {
        border-radius: 24px;
        border: 1px solid rgba(52, 211, 153, 0.32);
        background: linear-gradient(155deg, rgba(16,185,129,0.22) 0%, rgba(6,78,59,0.5) 45%, rgba(2,44,34,0.72) 100%);
        backdrop-filter: blur(24px) saturate(1.4);
        -webkit-backdrop-filter: blur(24px) saturate(1.4);
        box-shadow: 0 20px 60px rgba(0,0,0,0.45), 0 0 34px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.16);
      }
      .vc-glass--amber {
        border-color: rgba(251, 191, 36, 0.25);
        background: linear-gradient(155deg, rgba(120,85,15,0.18) 0%, rgba(41,32,10,0.5) 45%, rgba(17,24,39,0.75) 100%);
        box-shadow: 0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1);
      }

      @keyframes vc-entrance {
        0% { opacity: 0; transform: scale(0.92) translateY(28px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .vc-entrance { animation: vc-entrance 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }

      .vc-hammer-badge {
        border: 1px solid rgba(251, 191, 36, 0.3);
        background: rgba(251, 191, 36, 0.08);
        backdrop-filter: blur(8px);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
      }

      /* Martelo: 3 batidas secas (sincronizadas com o som) */
      @keyframes vc-hammer-strike {
        0%, 8% { transform: rotate(-34deg); }
        14% { transform: rotate(10deg); }
        20%, 30% { transform: rotate(-34deg); }
        36% { transform: rotate(10deg); }
        42%, 52% { transform: rotate(-38deg); }
        58% { transform: rotate(12deg); }
        70%, 100% { transform: rotate(0deg); }
      }
      .vc-hammer {
        transform-origin: 75% 80%;
        animation: vc-hammer-strike 1.8s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      /* Ondas finas a cada batida */
      @keyframes vc-ring {
        0% { opacity: 0.55; transform: translate(-50%, -50%) scale(0.6); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(2.1); }
      }
      .vc-ring {
        position: absolute; left: 50%; top: 50%;
        width: 100%; height: 100%; border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.45);
        transform: translate(-50%, -50%) scale(0.6);
        opacity: 0;
        animation: vc-ring 0.6s ease-out both;
        pointer-events: none;
      }
      .vc-ring--gold { border-color: rgba(251, 191, 36, 0.6); border-width: 2px; animation-duration: 0.8s; }

      /* "VENDIDO": revela após a batida final, sem exagero */
      @keyframes vc-stamp {
        0% { opacity: 0; transform: scale(1.5); letter-spacing: 0.3em; }
        100% { opacity: 1; transform: scale(1); letter-spacing: 0.08em; }
      }
      .vc-stamp {
        display: inline-block;
        animation: vc-stamp 0.45s cubic-bezier(0.22, 1, 0.36, 1) 1.15s both;
        text-shadow: 0 2px 18px rgba(16, 185, 129, 0.45);
      }
      @keyframes vc-underline-grow {
        0% { transform: scaleX(0); }
        100% { transform: scaleX(1); }
      }
      .vc-underline {
        background: linear-gradient(90deg, transparent, #34d399, transparent);
        animation: vc-underline-grow 0.5s ease-out 1.5s both;
      }

      @keyframes vc-rise {
        0% { opacity: 0; transform: translateY(14px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .vc-rise { animation: vc-rise 0.4s ease-out both; }

      /* brilho varrendo o vidro */
      @keyframes vc-sheen {
        0% { transform: translateX(-130%) skewX(-16deg); }
        100% { transform: translateX(230%) skewX(-16deg); }
      }
      .vc-sheen {
        background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.09) 50%, transparent 65%);
        animation: vc-sheen 3.6s ease-in-out 1.6s infinite;
      }

      .vc-avatar {
        border: 2px solid rgba(52, 211, 153, 0.7);
        box-shadow: 0 0 22px rgba(52, 211, 153, 0.35);
      }

      @keyframes vc-price-breathe {
        0%, 100% { box-shadow: 0 0 0 rgba(52, 211, 153, 0); }
        50% { box-shadow: 0 0 18px rgba(52, 211, 153, 0.25); }
      }
      .vc-price { animation: vc-price-breathe 2.6s ease-in-out infinite; }

      /* partículas finas caindo dentro do card */
      @keyframes vc-particle-fall {
        0% { transform: translateY(-16px); opacity: 0; }
        10% { opacity: 1; }
        100% { transform: translateY(115%); opacity: 0; }
      }
      .vc-particle {
        position: absolute; top: 0;
        border-radius: 999px;
        animation-name: vc-particle-fall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .vc-hammer, .vc-stamp, .vc-rise, .vc-sheen, .vc-particle, .vc-ring, .vc-underline, .vc-price, .vc-entrance {
          animation: none !important; opacity: 1 !important; transform: none !important;
        }
      }
    `}</style>
  );
}
