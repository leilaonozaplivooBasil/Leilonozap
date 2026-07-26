import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

// FEATURE 3 — Missão do dia (retenção diária).
// 7 missões rotativas, uma por dia da semana (horário de Brasília).
// Progresso: pontos do dia (indicações que contaram hoje) — vem por props da página.

const MISSOES = [
  { titulo: 'Domingo em família', desc: 'Traga 2 pessoas da sua família pro grupo hoje', alvo: 2, icone: '👨‍👩‍👧' },
  { titulo: 'Indique 3 amigos hoje', desc: 'Traga 3 pessoas novas pro grupo e dispare no ranking', alvo: 3, icone: '👥' },
  { titulo: 'Compartilhe no Status', desc: 'Poste seu story no WhatsApp e traga 1 pessoa', alvo: 1, icone: '📱' },
  { titulo: 'Quem nunca comprou online', desc: 'Apresente o Leilão NoZap a 1 pessoa que não conhece', alvo: 1, icone: '🎯' },
  { titulo: 'Corrente de 5', desc: 'Mande seu link pra 5 contatos e traga pelo menos 2', alvo: 2, icone: '✉️' },
  { titulo: 'Áudio que converte', desc: 'Grave um áudio de 30s explicando o grupo e traga 1 pessoa', alvo: 1, icone: '🎙️' },
  { titulo: 'Sábado do trabalho', desc: 'Traga 1 colega de trabalho — eles ficam mais tempo', alvo: 1, icone: '💼' },
];

function diaSP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay();
}

export default function DailyMission({ progresso = 0 }) {
  const m = MISSOES[diaSP()];
  const pct = Math.min(100, (progresso / m.alvo) * 100);
  const feita = progresso >= m.alvo;

  return (
    <div className="rounded-2xl p-4" style={feita
      ? { background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.45)' }
      : { background: 'rgba(255,255,255,.045)', border: '1px solid rgba(245,196,81,.26)' }}>
      <div className="flex items-center gap-3 mb-2.5">
        <span className="text-2xl leading-none">{m.icone}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-yellow-300 font-black uppercase tracking-widest flex items-center gap-1"><Target className="w-3 h-3" /> Missão do dia</p>
          <h3 className="font-black text-sm leading-tight">{m.titulo}</h3>
        </div>
        {feita && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
      </div>
      <p className="text-green-100/70 text-xs mb-3">{m.desc}</p>
      <div className="w-full rounded-full h-2 mb-1.5" style={{ background: 'rgba(0,0,0,.4)' }}>
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f5c451,#22c55e)' }} />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-green-300/60">{Math.min(progresso, m.alvo)}/{m.alvo} concluído</span>
        {feita && <span className="text-emerald-400 font-black">Missão completa! 🏆</span>}
      </div>
    </div>
  );
}
