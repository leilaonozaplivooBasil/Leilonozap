import React from 'react';

// 🔗 Por ora leva direto ao feed da Livoo Live (integração de "quem está ao vivo" desativada).
// Depois que a conta da Leilão NoZap na Livoo for criada, é só trocar por ela.
const LIVOO_FEED = 'https://livoolive.com.br/app';

// Botão-padrão "AO VIVO AGORA" — pílula vermelha pulsante (mesmo padrão do Amigão).
// Abre o feed da Livoo Live. Fica no site e nos painéis.
export default function AoVivoAgora({ compact = false }) {
  return (
    <a href={LIVOO_FEED} target="_blank" rel="noreferrer" title="Ao vivo agora pela Livoo Live"
      className="relative inline-flex items-center">
      {/* glow pulsante em volta */}
      <span aria-hidden className="absolute -inset-1 rounded-full bg-red-500/40 blur-sm animate-pulse" />
      <span className="relative inline-flex items-center gap-2 rounded-full pl-2 pr-4 py-2 font-black uppercase tracking-wide text-white text-[13px] shadow-lg"
        style={{ background: 'linear-gradient(135deg,#ff2d2d,#d61010)', border: '1.5px solid rgba(255,120,120,.6)', boxShadow: '0 6px 20px rgba(220,20,20,.5)' }}>
        {/* ponto de gravação pulsante */}
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span>{compact ? 'Ao vivo' : 'Ao vivo agora'}</span>
      </span>
    </a>
  );
}
