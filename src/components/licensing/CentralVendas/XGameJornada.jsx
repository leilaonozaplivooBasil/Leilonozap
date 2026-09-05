import React from 'react';

// 🗺️ X-GAME — A JORNADA DO DIA (ordem do dono: "igual o Duolingo, quero uma
// jornada, não quero uma lista"). O dia é um CAMINHO: amanhece no topo,
// anoitece embaixo; cada tarefa é uma parada no trajeto, em zigue-zague.
// Clicou na parada da vez → abre o ritual/comprovação. A lista completa
// continua existindo — mas escondida, pra quem quiser ver.

const EMOJI_PARADA = [
  [/acordar|gratidao|bom dia/i, '🌅'],
  [/leitura|estudo|curso/i, '📚'],
  [/corrida|treino|atividade fisica|academia/i, '🏃'],
  [/story|post|instagram|conteudo/i, '📸'],
  [/loja/i, '🛒'],
  [/almoco/i, '🍽️'],
  [/reuniao|apresenta/i, '🤝'],
  [/treinament|sala/i, '🎓'],
  [/contrato|follow|fechamento/i, '💼'],
  [/descanso|leve/i, '🌙'],
  [/organizacao|ambiente/i, '🧹'],
  [/caminho|chegar/i, '🚗'],
];
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const emojiDa = (titulo) => {
  const t = semAcento(titulo);
  for (const [re, e] of EMOJI_PARADA) if (re.test(t)) return e;
  return '⭐';
};

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

// zigue-zague do caminho (igual a trilha do Duolingo)
const OFFSETS = [0, -72, 0, 72];

export default function XGameJornada({ tarefas = [], nome, pct = 0, fogo, onTarefa }) {
  const completou = pct >= 100;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-nz-borda bg-gradient-to-b from-amber-100 via-sky-100 to-indigo-200">
      {/* o sol da jornada */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-300/40 blur-3xl" />

      {/* saudação + fogo — o topo limpo */}
      <div className="relative px-4 pt-4 pb-2 text-center">
        <p className="text-base font-bold text-gray-800">{saudacao()}, {nome || 'campeão'}! {completou ? '💎' : '🌅'}</p>
        <p className="text-[11px] text-gray-500">
          {fogo?.dias > 0 ? `🔥 ${fogo.dias} ${fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva · ` : ''}
          {Math.round(pct)}% da jornada de hoje
        </p>
      </div>

      {/* a trilha */}
      <div className="relative flex flex-col items-center gap-5 px-4 pb-6 pt-2">
        {/* a linha do caminho */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-white/80" />

        {tarefas.map((t, i) => {
          const est = t.estado?.id;
          const atual = !t.feito && (est === 'AGORA' || est === 'ATRASADO');
          return (
            <div key={t.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
              {atual && (
                <span className="absolute -top-6 whitespace-nowrap rounded-full bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 shadow">
                  VOCÊ ESTÁ AQUI
                </span>
              )}
              <button
                type="button"
                onClick={() => onTarefa(t)}
                title={`${t.hora} — ${t.titulo}`}
                className={[
                  'relative w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md transition-transform hover:scale-110',
                  t.feito ? 'bg-emerald-500 ring-4 ring-emerald-200' : '',
                  !t.feito && atual ? 'bg-white ring-4 ring-amber-400 animate-pulse' : '',
                  !t.feito && est === 'PERDIDO' ? 'bg-gray-200 ring-2 ring-gray-300 grayscale opacity-75' : '',
                  !t.feito && !atual && est !== 'PERDIDO' ? 'bg-white/90 ring-2 ring-white' : '',
                ].join(' ')}
              >
                <span>{emojiDa(t.titulo)}</span>
                {t.feito && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-emerald-600 text-[11px] font-black flex items-center justify-center shadow">✔</span>}
                {!t.feito && est === 'PERDIDO' && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-red-500 text-[11px] font-black flex items-center justify-center shadow">✖</span>}
              </button>
              <p className="mt-1 max-w-[120px] text-center text-[10px] leading-tight text-gray-600">
                <span className="font-bold text-gray-800">{t.hora}</span><br />
                <span className="line-clamp-2">{t.titulo}</span>
              </p>
            </div>
          );
        })}

        {/* a chegada */}
        <div className="relative flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${completou ? 'bg-amber-400 ring-4 ring-amber-200 animate-bounce' : 'bg-white/70 ring-2 ring-white'}`}>
            {completou ? '🏆' : '🏁'}
          </div>
          <p className="mt-1 text-[10px] font-bold text-gray-700">{completou ? 'DIA PERFEITO!' : 'a chegada'}</p>
        </div>
      </div>
    </div>
  );
}
