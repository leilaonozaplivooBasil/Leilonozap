import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function formatar(ms) {
  if (ms <= 0) return 'Encerrando...';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(seg).padStart(2, '0')}s`;
}

// Relógio simples de leitura. Recalcula sempre a partir do end_time (nunca
// decrementa um contador em memória), então voltar do banco mostra o tempo certo.
export default function TempoRestante({ endTime }) {
  const alvo = endTime ? new Date(endTime).getTime() : 0;
  const [texto, setTexto] = useState(() => formatar(alvo - Date.now()));

  useEffect(() => {
    const tick = () => setTexto(formatar(alvo - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', tick);
    };
  }, [alvo]);

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <Clock className="w-3.5 h-3.5" />
      {texto}
    </span>
  );
}