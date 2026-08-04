import React from "react";
import { fmtBR } from "@/lib/money";
import useEntradaShow from "./useEntradaShow";

// PONTO 88 — cada lance vira uma PLACA de leilão erguida por uma mão.
// Só visual: recebe a mensagem já pronta do chat, não calcula nada.
export default function PlacaLance({ message, isOwn }) {
  // PONTO 89 — só lances recém-chegados fazem a entrada "de fora da tela"
  const isNova = useEntradaShow(message);
  const valor = Number(message.bid_amount) > 0 ? Number(message.bid_amount) : null;
  const hora = new Date(message.created_date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`placa-linha ${isOwn ? 'placa-linha--own' : ''}`}>
      <div className={`placa-conjunto ${isNova ? 'placa-conjunto--entra' : ''}`}>
        <div className={`placa-corpo ${isOwn ? 'placa-corpo--own' : ''} ${isNova ? 'placa-corpo--flash' : ''}`}>
          <span className="placa-nome">{message.sender_name}</span>
          <span className="placa-valor">
            {valor !== null ? `R$ ${fmtBR(valor)}` : message.content}
          </span>
          <span className="placa-hora">{hora}</span>
        </div>

        {/* Haste + mão segurando a placa (SVG próprio) */}
        <svg className="placa-mao" viewBox="0 0 46 40" aria-hidden="true">
          {/* haste da placa */}
          <rect x="20" y="0" width="6" height="14" rx="2" fill="#8a5a33" />
          <rect x="20" y="0" width="2.2" height="14" rx="1.1" fill="#a9713f" />
          {/* PONTO 89 — punho FECHADO de verdade: os 4 dedos dobrados são faixas
              horizontais (nada de dedo vertical se destacando no meio). */}
          <rect x="9" y="11" width="28" height="19" rx="8" fill="#e8b489" />
          <rect x="10.5" y="12.5" width="25" height="4" rx="2" fill="#f2c79f" />
          <rect x="10.5" y="17.2" width="25" height="4" rx="2" fill="#eec096" />
          <rect x="10.5" y="21.9" width="25" height="4" rx="2" fill="#e8b489" />
          <rect x="10.5" y="26" width="25" height="3.4" rx="1.7" fill="#dfa87c" />
          {/* polegar dobrado por cima, na lateral */}
          <rect x="5.2" y="16.5" width="10" height="7" rx="3.5" fill="#f2c79f" />
          {/* pulso */}
          <rect x="14" y="28.5" width="18" height="10" rx="4" fill="#dda67c" />
        </svg>
      </div>

      <style>{`
        .placa-linha { display: flex; justify-content: flex-start; margin-bottom: 18px; }
        .placa-linha--own { justify-content: flex-end; }
        .placa-conjunto {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 78%;
          animation: placaSobe 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);
        }
        /* PONTO 89 — entrada "presente de live": vem grande e transparente de
           fora da tela, bate o impacto e ASSENTA no estado final (idêntico ao
           de hoje). Só a chegada é show; depois nada muda. */
        .placa-conjunto--entra {
          animation: placaEntradaShow 1.05s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
          position: relative;
          z-index: 40;
        }
        .placa-corpo {
          min-width: 132px;
          min-height: 44px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
          padding: 8px 14px 9px;
          border-radius: 14px;
          background: linear-gradient(180deg, #F6E7CE, #E7D2AE);
          border: 1px solid rgba(90, 39, 15, 0.35);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.65);
        }
        .placa-corpo--own {
          background: linear-gradient(180deg, #FBF2E0, #EEDCBC);
          border-color: rgba(27, 122, 72, 0.55);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.42), 0 0 0 2px rgba(27, 122, 72, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }
        .placa-nome {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 600;
          color: #5A270F;
          opacity: 0.85;
        }
        .placa-valor {
          white-space: nowrap;
          font-size: 19px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #2A1206;
        }
        .placa-hora {
          font-size: 9px;
          font-variant-numeric: tabular-nums;
          color: rgba(90, 39, 15, 0.6);
        }
        .placa-mao { width: 40px; height: 38px; margin-top: -3px; }
        @keyframes placaSobe {
          from { opacity: 0; transform: translateY(22px) rotate(-4deg); }
          to { opacity: 1; transform: translateY(0) rotate(0deg); }
        }
        /* 👻 FANTASMA TIKTOK — vem de FORA (de cima), gigante o suficiente pra
           cobrir a tela toda, translúcida, e vai encolhendo até assentar. */
        @keyframes placaEntradaShow {
          0%   { opacity: 0; transform: translateY(-70vh) scale(5.5) rotate(-12deg); }
          18%  { opacity: 0.35; transform: translateY(-18vh) scale(4.4) rotate(6deg); }
          40%  { opacity: 0.6; transform: translateY(0) scale(2.9) rotate(-4deg); }
          62%  { opacity: 0.9; transform: translateY(0) scale(1.7) rotate(2deg); }
          80%  { opacity: 1; transform: translateY(0) scale(0.94) rotate(-1deg); }
          90%  { transform: translateY(0) scale(1.06) rotate(0.5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        /* flash dourado curtinho no impacto — some sozinho e não deixa rastro */
        .placa-corpo--flash { animation: placaFlash 0.7s ease-out; }
        @keyframes placaFlash {
          0%, 40% { box-shadow: 0 10px 22px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.65); }
          52% { box-shadow: 0 0 0 3px rgba(245, 196, 81, 0.85), 0 0 34px 10px rgba(245, 196, 81, 0.55), inset 0 1px 0 rgba(255,255,255,0.9); }
          100% { box-shadow: 0 10px 22px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.65); }
        }
        @media (prefers-reduced-motion: reduce) {
          .placa-conjunto, .placa-conjunto--entra, .placa-corpo--flash { animation: none; }
        }
      `}</style>
    </div>
  );
}