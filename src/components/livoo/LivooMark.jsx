import React from 'react';
import { Play } from 'lucide-react';

// Marca oficial da Livoo Live: play branco em quadrado arredondado rosa→laranja (#E91E83→#ff6b35).
// Inline (SVG/CSS) — nunca quebra e fica sempre na cor da marca.
export default function LivooMark({ size = 44, plain = false, className = '' }) {
  if (plain) {
    return <Play className={className} style={{ width: size, height: size }} fill="currentColor" />;
  }
  const r = Math.round(size * 0.26);
  const play = Math.round(size * 0.46);
  return (
    <span
      aria-label="Livoo Live"
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: r, background: 'linear-gradient(135deg,#E91E83,#ff6b35)', boxShadow: '0 2px 8px rgba(233,30,131,.35)' }}
    >
      <Play style={{ width: play, height: play, marginLeft: Math.round(size * 0.04), color: '#fff' }} fill="#fff" />
    </span>
  );
}
