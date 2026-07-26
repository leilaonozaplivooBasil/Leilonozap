import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Timer } from 'lucide-react';

// FEATURE 1 — Contador regressivo do sorteio (FOMO).
// Conta até o horário do sorteio EM BRASÍLIA (America/Sao_Paulo), independente do fuso do aparelho.
// Horário alvo: config.sorteio_horario ("20:00") quando a coluna existir; senão tenta extrair de
// config.live_horario ("hoje 20h"); fallback 20:00. Passa do horário → recomeça pro dia seguinte.

function parseAlvo(config) {
  const fontes = [config?.sorteio_horario, config?.live_horario];
  for (const raw of fontes) {
    const m = String(raw || '').match(/(\d{1,2})(?::(\d{2}))?\s*h?/);
    if (m) {
      const h = parseInt(m[1], 10), min = parseInt(m[2] || '0', 10);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { h, min };
    }
  }
  return { h: 20, min: 0 };
}

function agoraSP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function useCountdown(targetHour, targetMinute) {
  const calc = useCallback(() => {
    const now = agoraSP();
    const target = new Date(now);
    target.setHours(targetHour, targetMinute, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const s = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
    return {
      hours: String(Math.floor(s / 3600)).padStart(2, '0'),
      minutes: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
      seconds: String(s % 60).padStart(2, '0'),
      isBelowOneHour: s > 0 && s < 3600,
    };
  }, [targetHour, targetMinute]);
  const [t, setT] = useState(calc);
  useEffect(() => {
    const i = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(i);
  }, [calc]);
  return t;
}

export default function CountdownTimer({ config }) {
  const { h, min } = parseAlvo(config);
  const { hours, minutes, seconds, isBelowOneHour } = useCountdown(h, min);
  const items = [
    { val: hours, label: 'HORAS' },
    { val: minutes, label: 'MIN' },
    { val: seconds, label: 'SEG' },
  ];
  return (
    <div className="mt-4 rounded-2xl p-5 flex flex-col items-center" style={{ background: 'rgba(255,255,255,.045)', border: isBelowOneHour ? '1px solid rgba(239,68,68,.5)' : '1px solid rgba(245,196,81,.26)' }}>
      <span className="text-[11px] font-bold uppercase tracking-widest text-green-300/70 mb-3 flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5" /> Tempo para o sorteio de hoje
      </span>
      <div className={`flex items-center gap-2.5 font-black font-mono ${isBelowOneHour ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`} style={{ fontSize: 'clamp(1.6rem,6vw,2.4rem)' }}>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <span className="text-white/25 pb-5">:</span>}
            <div className="flex flex-col items-center">
              <div className="rounded-xl px-3 py-1.5 min-w-[64px] text-center" style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.1)' }}>{item.val}</div>
              <span className="text-[10px] text-green-300/60 font-sans font-bold mt-1.5 tracking-wider">{item.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      {isBelowOneHour && (
        <p className="text-xs text-red-300 font-bold animate-bounce mt-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Sorteio muito próximo! Indique agora!
        </p>
      )}
    </div>
  );
}
