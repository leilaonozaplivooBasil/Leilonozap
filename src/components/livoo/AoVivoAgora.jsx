import React from 'react';
import LivooMark from './LivooMark';

// 🔗 Por ora leva direto ao feed da Livoo Live (integração de "quem está ao vivo" desativada).
// Depois que a conta da Leilão NoZap na Livoo for criada, é só trocar por ela.
const LIVOO_FEED = 'https://livoolive.com.br/app';

// Botão global "Ao vivo na Livoo" — abre o feed da Livoo Live. Fica no site e nos painéis.
export default function AoVivoAgora({ compact = false }) {
  return (
    <a href={LIVOO_FEED} target="_blank" rel="noreferrer" title="Ao vivo pela Livoo Live"
      className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 font-bold text-white text-[13px] transition hover:scale-105"
      style={{ background: 'linear-gradient(135deg,#E91E83,#ff6b35)', boxShadow: '0 4px 14px rgba(233,30,131,.35)' }}>
      <LivooMark size={20} />
      <span>{compact ? 'Ao vivo' : 'Ao vivo na Livoo'}</span>
    </a>
  );
}
