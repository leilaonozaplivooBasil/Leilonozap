import React, { useEffect, useState } from 'react';
import { Trophy, Gift } from 'lucide-react';

// FEATURE 5 — Feed de ganhadores (prova social).
// Consome o histórico real de sorteios (action=sorteios). Nome parcial por privacidade.

const PERIODO_LABEL = { dia: 'Diário', semana: 'Semanal', mes: 'Mensal' };

const nomeParcial = (nome) => {
  const p = String(nome || '').trim().split(/\s+/);
  return p[1] ? `${p[0]} ${p[1][0].toUpperCase()}.` : (p[0] || 'Ganhador');
};
const fmtData = (iso) => {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); } catch { return ''; }
};

export default function WinnersFeed() {
  const [winners, setWinners] = useState([]);
  useEffect(() => {
    fetch('/api/concurso?action=sorteios', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setWinners((j.sorteios || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  if (!winners.length) return null;

  return (
    <div className="rounded-2xl p-4 bg-white border border-nz-borda">
      <style>{`@keyframes wf-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <p className="font-black mb-3 flex items-center gap-2 text-sm text-nz-tinta"><Trophy className="w-4 h-4 text-nz-ouro" /> Últimos ganhadores</p>
      <div className="space-y-2">
        {winners.map((w, i) => (
          <div
            key={`${w.data_ref}-${i}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-nz-cinza-fundo border border-nz-borda"
            style={{ animation: `wf-in .45s ease ${i * 100}ms both` }}
          >
            {w.ganhador_foto ? (
              <img src={w.ganhador_foto} alt="" className="w-10 h-10 rounded-full object-cover border border-nz-ouro-claro shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-full grid place-items-center font-black text-nz-ouro shrink-0 bg-nz-ouro-fundo border border-nz-ouro-claro">
                {nomeParcial(w.ganhador_nome)[0]}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-nz-tinta">{nomeParcial(w.ganhador_nome)}</p>
              <p className="text-nz-verde text-xs truncate flex items-center gap-1">
                <Gift className="w-3 h-3 shrink-0" /> {w.premio ? `Ganhou: ${w.premio}` : 'Campeão do ranking'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-nz-tinta-fraca">{fmtData(w.data_ref)}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-nz-ouro">{PERIODO_LABEL[w.periodo] || w.periodo}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-nz-tinta-fraca text-center mt-2.5">Prêmio todo dia — o próximo pode ser você. 🍀</p>
    </div>
  );
}