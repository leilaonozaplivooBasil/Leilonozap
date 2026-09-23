import React, { useEffect } from 'react';
import { Sunrise, Sun, Sunset, Moon, Play } from 'lucide-react';
import { vibrar, VIBRA_TOQUE } from '@/lib/xgame';
import { ID_MOMENTO, podeIr } from '@/lib/rodapeDaJornada';

const ICONES = { [ID_MOMENTO]: Play, AMANHECER: Sunrise, 'MANHÃ': Sun, TARDE: Sunset, NOITE: Moon };

// as mesmas cores que cada período já usa na Jornada
const TOM = {
  [ID_MOMENTO]: 'from-emerald-400 to-emerald-600',
  AMANHECER: 'from-amber-400 to-orange-500',
  'MANHÃ': 'from-sky-400 to-blue-600',
  TARDE: 'from-violet-500 to-purple-600',
  NOITE: 'from-indigo-500 to-slate-800',
};

// 🦉 A barra fixa na base da Jornada (ver src/lib/rodapeDaJornada.js).
// Item ATUAL: ladrilho colorido, como o Duolingo. FEITO: troféu dourado no
// canto. FUTURO: cinza. VAZIO: apagado e sem clique.
export default function RodapeDaJornada({ itens, onIr }) {
  // 🧲 avisa os flutuantes (X-Music, voltar ao topo) que a base está ocupada
  useEffect(() => {
    document.body.classList.add('nz-rodape-jornada');
    return () => document.body.classList.remove('nz-rodape-jornada');
  }, []);

  return (
    <nav
      aria-label="Navegar pela jornada"
      data-teste="rodape-jornada"
      className="fixed inset-x-0 bottom-0 z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <style>{`.nz-rodape-jornada .nz-dock-bottom { bottom: calc(var(--nz-dock-b) + 4.5rem) !important; }
        .nz-rodape-jornada .nz-dock-bottom-2 { bottom: calc(var(--nz-dock-b) + var(--nz-dock-step) + 4.5rem) !important; }
        .nz-rodape-jornada .nz-dock-bottom-3 { bottom: calc(var(--nz-dock-b) + var(--nz-dock-step) * 2 + 4.5rem) !important; }`}</style>
      <div
        className="mx-auto max-w-md rounded-t-3xl border border-b-0 border-nz-borda/60 bg-white/90 px-2 pt-2 pb-1.5 backdrop-blur-xl"
        style={{ boxShadow: '0 -8px 28px rgba(0,0,0,0.10)' }}
      >
        <ul className="grid grid-cols-5 gap-1">
          {itens.map((item) => {
            const Icone = ICONES[item.id];
            const atual = item.estado === 'atual';
            const clicavel = podeIr(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!clicavel}
                  aria-current={atual ? 'step' : undefined}
                  aria-label={`${item.rotulo}${item.estado === 'feito' ? ' — completo' : item.estado === 'vazio' ? ' — sem parada hoje' : ''}`}
                  title={item.rotulo}
                  data-teste={`rodape-${item.id}`}
                  data-estado={item.estado}
                  onClick={() => { vibrar(VIBRA_TOQUE); onIr(item.id); }}
                  className={`relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wide transition-all active:scale-95 ${
                    atual ? 'text-white' : item.estado === 'feito' ? 'text-amber-600' : item.estado === 'futuro' ? 'text-nz-tinta-fraca' : 'text-nz-tinta-fraca/40'
                  } ${clicavel ? '' : 'cursor-default'}`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-2xl ${
                      atual ? `bg-gradient-to-b ${TOM[item.id]} shadow-lg` : item.estado === 'feito' ? 'bg-amber-100' : 'bg-nz-borda/30'}`}
                    style={atual ? { boxShadow: '0 4px 0 0 rgba(0,0,0,0.18)' } : undefined}
                  >
                    <Icone className="h-5 w-5" strokeWidth={atual ? 2.4 : 2} fill={item.estado === 'feito' ? 'currentColor' : 'none'} />
                  </span>
                  <span className="truncate">{item.rotulo}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
