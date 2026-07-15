import React from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";

/**
 * ▶ Botão "AO VIVO AGORA" — FASE 4A
 *
 * Sempre visível, sempre clicável, gradiente rosa/laranja com pulse sutil.
 * Leva ao /LiveShopNoZap.
 *
 * 🔮 Preparado para o futuro: quando a integração real com Livoo/LiveSession
 * chegar, basta adicionar um hook interno (ex: useLiveActive()) e alternar
 * a classe `animate-pulse` + destino do link. A superfície visual não muda,
 * evitando layout shift.
 */
export default function AoVivoAgoraButton() {
  return (
    <Link
      to="/LiveShopNoZap"
      className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-sm uppercase tracking-wide transition-transform hover:scale-105 active:scale-95"
      style={{
        background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
        boxShadow: "0 8px 24px rgba(236, 72, 153, 0.4), 0 0 20px rgba(249, 115, 22, 0.3)",
      }}
      aria-label="Ir para o Ao Vivo agora"
    >
      {/* Ícone play em círculo branco */}
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
        <Play className="w-3 h-3 fill-white text-white" />
      </span>
      <span>Ao Vivo Agora</span>

      {/* Pulse suave em anel externo (nunca some, indica atividade constante) */}
      <span
        className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
        style={{
          boxShadow: "0 0 0 2px rgba(236, 72, 153, 0.4)",
        }}
      />
    </Link>
  );
}