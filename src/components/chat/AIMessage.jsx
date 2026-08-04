import React from "react";
import { Crown, Timer } from "lucide-react";
import VictoryCard from "./VictoryCard";
import LeiloeiroAvatar from "@/assets/leiloeiro-avatar.webp";
import useEntradaShow from "./useEntradaShow";

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
  // PONTO 89 — leiloeiro entra por cima e bate o martelo só quando a narração
  // acabou de chegar; histórico segue estático.
  const isNova = useEntradaShow(message);
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
    <div className="ia-linha mb-4 flex flex-col items-start">
      {/* PONTO 90 — o leiloeiro virou a BASE da fala (igual a placa): balão em
          cima e ele maior embaixo, com a fala saindo da cabeça dele. */}
      <div className={`ia-conjunto ${isNova ? 'ia-conjunto--entra' : ''}`}>
        <div className="ia-balao min-w-0 px-3.5 py-2.5">
          <div className="mb-1 flex items-center justify-end gap-3">
            <span className="flex items-center gap-1.5">
              {isCountdown && <Timer className="h-3 w-3 text-amber-300" />}
              {message.message_type === 'winner_announcement' && <Crown className="h-3 w-3 text-yellow-300" />}
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/35">
              {formatTime(message.timestamp)}
            </span>
          </div>

          <p className="text-[13px] leading-[1.55] text-slate-200/90 sm:text-sm">
            {realcarValores(message.content)}
          </p>
        </div>

        <img
          src={LeiloeiroAvatar}
          alt=""
          aria-hidden="true"
          className="ia-leiloeiro-base h-16 w-16 object-contain sm:h-[72px] sm:w-[72px]"
        />
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
      /* PONTO 90 — conjunto fala+leiloeiro: o balão fica em cima e ele embaixo,
         encostado na cabeça (a fala "sai" dele). */
      .ia-conjunto {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        max-width: 88%;
      }
      .ia-leiloeiro-base { margin-top: -6px; margin-left: 10px; }
      /* 👻 FANTASMA TIKTOK — o leiloeiro e a fala descem de fora da tela,
         gigantes e translúcidos, cobrindo tudo, e encolhem até assentar. */
      .ia-conjunto--entra {
        animation: iaFantasma 1.05s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: 20% 100%;
        will-change: transform, opacity;
        position: relative;
        z-index: 40;
      }
      @keyframes iaFantasma {
        0%   { opacity: 0; transform: translateY(-75vh) scale(5.2) rotate(-10deg); }
        18%  { opacity: 0.35; transform: translateY(-20vh) scale(4.2) rotate(6deg); }
        40%  { opacity: 0.6; transform: translateY(0) scale(2.8) rotate(-4deg); }
        62%  { opacity: 0.9; transform: translateY(0) scale(1.65) rotate(2deg); }
        80%  { opacity: 1; transform: translateY(0) scale(0.95) rotate(-1deg); }
        90%  { transform: translateY(0) scale(1.05) rotate(0.5deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
      }
      .ia-balao {
        max-width: 100%;
        border-radius: 16px 16px 16px 4px;
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
      /* PONTO 89 — entrada de live: o leiloeiro vem GRANDE por cima, dá duas
         marteladas e assenta no tamanho normal (estado final igual ao de hoje). */
      .ia-entrada-leiloeiro {
        animation: iaLeiloeiroEntra 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: 70% 30%;
        will-change: transform, opacity;
        position: relative;
        z-index: 2;
      }
      @keyframes iaLeiloeiroEntra {
        0%   { opacity: 0; transform: scale(1.8) rotate(-22deg); }
        28%  { opacity: 1; transform: scale(1.55) rotate(10deg); }
        44%  { transform: scale(1.4) rotate(-16deg); }
        58%  { transform: scale(1.3) rotate(9deg); }
        74%  { transform: scale(1.1) rotate(-5deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      .ia-balao--entra { animation: iaBalaoEntra 0.55s ease-out 0.18s both; will-change: transform, opacity; }
      @keyframes iaBalaoEntra {
        from { opacity: 0; transform: translateY(14px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .ia-linha, .ia-pop, .ia-swing, .ia-conjunto--entra { animation: none; }
      }
    `}</style>
  );
}