import React from "react";
import { Crown, Timer } from "lucide-react";
import VictoryCard from "./VictoryCard";
import LanceIAAvatar from "./LanceIAAvatar";
import LeiloeiroAvatar from "@/assets/leiloeiro-avatar.webp";

// PONTO 85 — realce visual dos valores em R$ que JÁ vêm no texto do backend.
// Não altera, não reescreve e não reordena nada: só destaca o que existe.
const realcarValores = (texto) => {
  if (typeof texto !== 'string') return texto;
  const partes = texto.split(/(R\$\s?[\d.]+,\d{2}|R\$\s?[\d.,]+)/g);
  return partes.map((parte, i) =>
    /^R\$/.test(parte)
      ? <strong key={i} className="font-bold text-emerald-300">{parte}</strong>
      : <React.Fragment key={i}>{parte}</React.Fragment>
  );
};

export default function AIMessage({ message, winner, auction, currentUser }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp || message.created_date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🏆 SE FOR MENSAGEM DE VITÓRIA, SEMPRE RENDERIZA O CARTÃO
  // 🆕 MESMO SE winner OU auction forem null! (usa fallback)
  if (message.message_type === 'winner_announcement') {
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

  const isCountdown = message.message_type === 'countdown';
  const phase = message.countdown_phase || 1;
  const isMartelo = isCountdown && String(message.content || '').includes('Dou-lhe');

  // 🔨 MARTELO — mantém a urgência, mas em cápsula contida (nada de faixa
  // gradiente ocupando a largura toda da tela)
  if (isMartelo) {
    const tomFase = {
      1: { borda: 'rgba(245,197,81,0.55)', fundo: 'rgba(245,197,81,0.12)', texto: 'text-amber-200' },
      2: { borda: 'rgba(251,146,60,0.6)', fundo: 'rgba(251,146,60,0.14)', texto: 'text-orange-200' },
      3: { borda: 'rgba(248,113,113,0.65)', fundo: 'rgba(239,68,68,0.16)', texto: 'text-red-200' },
    }[phase] || {};

    return (
      <div className="ia-linha mb-4 flex justify-center">
        <div
          className="ia-martelo flex items-center gap-3 rounded-2xl px-3.5 py-2.5"
          style={{ background: tomFase.fundo, border: `1px solid ${tomFase.borda}` }}
        >
          <img src={LeiloeiroAvatar} alt="Leiloeiro" className="ia-swing h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className={`text-base font-extrabold leading-tight tracking-tight sm:text-lg ${tomFase.texto}`}>
              {message.content}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {phase === 3 ? 'Última chamada' : 'Lance agora'}
            </div>
          </div>
        </div>
        <EstilosIA />
      </div>
    );
  }

  return (
    <div className="ia-linha mb-3.5 flex items-start gap-2">
      <LanceIAAvatar className="ia-pop mt-0.5" />

      <div className="ia-balao min-w-0 px-3.5 py-2.5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400/80">
            {isCountdown && <Timer className="h-3 w-3 text-amber-300" />}
            {message.message_type === 'winner_announcement' && <Crown className="h-3 w-3 text-yellow-300" />}
            LanceIA
          </span>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/35">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <p className="text-[13px] leading-[1.55] text-slate-200/90 sm:text-sm">
          {realcarValores(message.content)}
        </p>
      </div>

      <EstilosIA />
    </div>
  );
}

function EstilosIA() {
  return (
    <style>{`
      /* PONTO 85 — narração sóbria: vidro fumê levíssimo, canto quebrado no
         lado do avatar, sem "quadradão" e sem competir com o botão de lance. */
      .ia-balao {
        max-width: 82%;
        border-radius: 4px 16px 16px 16px;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.075);
        backdrop-filter: blur(10px) saturate(1.15);
        -webkit-backdrop-filter: blur(10px) saturate(1.15);
      }
      .ia-martelo { max-width: 100%; }
      @keyframes iaLinhaIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .ia-linha { animation: iaLinhaIn 0.35s ease-out; }
      @keyframes iaPop { 0% { transform: scale(0.82); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
      .ia-pop { animation: iaPop 0.45s ease-out; }
      @keyframes iaSwing { 0%,100% { transform: rotate(0deg); } 30% { transform: rotate(-14deg); } 60% { transform: rotate(12deg); } }
      .ia-swing { animation: iaSwing 1.5s ease-in-out infinite; transform-origin: 70% 30%; }
      @media (prefers-reduced-motion: reduce) {
        .ia-linha, .ia-pop, .ia-swing { animation: none; }
      }
    `}</style>
  );
}