import React from 'react';
import LivooMark from './LivooMark';

// 🔗 Por ora leva direto ao feed da Livoo Live (integração de "quem está ao vivo" desativada).
// Depois que a conta da Leilão NoZap na Livoo for criada, é só trocar por ela.
const LIVOO_FEED = 'https://livoolive.com.br/app';

// Botão-padrão "Ao vivo agora" — marca Livoo Live (logo + rosa #E91E83), pulsante. Abre o feed.
export default function AoVivoAgora({ compact = false }) {
  return (
    <a href={LIVOO_FEED} target="_blank" rel="noreferrer" title="Ao vivo agora pela Livoo Live"
      className="relative inline-flex items-center">
      {/* glow rosa pulsante (padrão Livoo) */}
      <span aria-hidden className="absolute -inset-1 rounded-full blur-sm animate-pulse" style={{ background: 'rgba(233,30,131,.45)' }} />
      <span className="relative inline-flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 font-black uppercase tracking-wide text-white text-[13px]"
        style={{ background: 'linear-gradient(135deg,#E91E83,#ff6b35)', boxShadow: '0 6px 20px rgba(233,30,131,.5)' }}>
        <LivooMark size={26} />
        <span>{compact ? 'Ao vivo' : 'Ao vivo agora'}</span>
      </span>
    </a>
  );
}
