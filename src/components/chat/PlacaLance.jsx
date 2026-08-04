import React from "react";
import { fmtBR } from "@/lib/money";

// PONTO 88 — cada lance vira uma PLACA de leilão erguida por uma mão.
// Só visual: recebe a mensagem já pronta do chat, não calcula nada.
export default function PlacaLance({ message, isOwn }) {
  const valor = Number(message.bid_amount) > 0 ? Number(message.bid_amount) : null;
  const hora = new Date(message.created_date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`placa-linha ${isOwn ? 'placa-linha--own' : ''}`}>
      <div className="placa-conjunto">
        <div className={`placa-corpo ${isOwn ? 'placa-corpo--own' : ''}`}>
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
          {/* punho fechado segurando a haste */}
          <rect x="9" y="10" width="28" height="20" rx="9.5" fill="#e8b489" />
          <rect x="9" y="10" width="28" height="7" rx="3.5" fill="#f0c39b" />
          {/* vincos dos dedos */}
          <path d="M17 12.5v15M23 12.5v15M29 12.5v15" stroke="#d09b70" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
          {/* polegar */}
          <rect x="5.5" y="17" width="9" height="7" rx="3.5" fill="#f0c39b" />
          {/* pulso */}
          <rect x="14" y="28" width="18" height="10" rx="4" fill="#dda67c" />
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
        @media (prefers-reduced-motion: reduce) {
          .placa-conjunto { animation: none; }
        }
      `}</style>
    </div>
  );
}