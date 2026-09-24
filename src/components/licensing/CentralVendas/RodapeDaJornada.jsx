import React, { useEffect } from 'react';
import { Sunrise, Sun, Sunset, Moon, Play, ChevronUp, Undo2 } from 'lucide-react';
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
//
// 🧹 DIR-180 (24/09/2026) — dono: "você vai sumir com esse manhã, tarde e
// noite... eu até gostei do botão agora." Ele está certo, e o motivo é
// estrutural: na tela do MOMENTO os quatro períodos não levavam a lugar
// nenhum — só expandiam a jornada. Quatro botões, um resultado.
// Agora a barra MUDA COM A TELA (barraDaJornada, na lib):
//   • no MOMENTO   → UM botão, com o rótulo certo da hora e o trilho do dia;
//   • na EXPANDIDA → os períodos voltam, porque ali eles navegam de verdade.
// Item ATUAL: ladrilho colorido, como o Duolingo. FEITO: troféu dourado no
// canto. FUTURO: cinza. VAZIO: contorno tracejado dizendo "sem parada" —
// antes era um bloco cinza apagado, que o olho lia como CASTIGO/bloqueado.
export default function RodapeDaJornada({ barra, onIr }) {
  // 🧲 avisa os flutuantes (X-Music, voltar ao topo) que a base está ocupada
  useEffect(() => {
    document.body.classList.add('nz-rodape-jornada');
    return () => document.body.classList.remove('nz-rodape-jornada');
  }, []);

  const mapa = barra.modo === 'mapa';

  return (
    <nav
      aria-label="Navegar pela jornada"
      data-teste="rodape-jornada"
      data-modo={barra.modo}
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
        {mapa ? <Mapa itens={barra.itens} onIr={onIr} /> : <BotaoUnico barra={barra} onIr={onIr} />}
      </div>
    </nav>
  );
}

// ── O MOMENTO: um botão só, e o rótulo dele é sempre a ação certa da hora.
//    O trilho do dia mora DENTRO do botão — o progresso não merece uma
//    linha própria roubando altura da tela do celular.
function BotaoUnico({ barra, onIr }) {
  const voltar = barra.modo === 'voltar';
  const Icone = voltar ? Undo2 : ChevronUp;
  return (
    <button
      type="button"
      onClick={() => { vibrar(VIBRA_TOQUE); onIr(barra.id); }}
      data-teste={`rodape-${barra.id}`}
      aria-label={`${barra.rotulo} — ${barra.detalhe}`}
      className={`relative w-full overflow-hidden rounded-2xl px-4 py-3 text-left transition-transform active:scale-[0.98] ${
        voltar ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-gradient-to-b from-slate-700 to-slate-900'}`}
      style={{ boxShadow: '0 4px 0 0 rgba(0,0,0,0.20)' }}
    >
      {/* o trilho do dia, por baixo do texto — dá a informação sem pedir espaço */}
      {!voltar && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 ${barra.completo ? 'bg-amber-400/35' : 'bg-emerald-400/25'}`}
          style={{ width: `${barra.pct}%`, transition: 'width .5s ease' }}
        />
      )}
      <span className="relative flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20">
          <Icone className="h-5 w-5 text-white" strokeWidth={2.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-extrabold uppercase tracking-wide text-white">{barra.rotulo}</span>
          <span className="block truncate text-[11px] font-semibold text-white/75">{barra.detalhe}</span>
        </span>
        {!voltar && (
          <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-white/90">{barra.pct}%</span>
        )}
      </span>
    </button>
  );
}

// ── A JORNADA ABERTA: aí sim os períodos, porque aí eles têm pra onde ir.
function Mapa({ itens, onIr }) {
  return (
    <ul className="grid grid-cols-5 gap-1">
      {itens.map((item) => {
        const Icone = ICONES[item.id];
        const atual = item.estado === 'atual';
        const vazio = item.estado === 'vazio';
        const clicavel = podeIr(item);
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!clicavel}
              aria-current={atual ? 'step' : undefined}
              aria-label={`${item.rotulo}${item.estado === 'feito' ? ' — completo' : vazio ? ' — sem parada hoje' : ''}`}
              title={vazio ? `${item.rotulo} — sem parada hoje` : item.rotulo}
              data-teste={`rodape-${item.id}`}
              data-estado={item.estado}
              onClick={() => { vibrar(VIBRA_TOQUE); onIr(item.id); }}
              className={`relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wide transition-all active:scale-95 ${
                atual ? 'text-white' : item.estado === 'feito' ? 'text-amber-600' : item.estado === 'futuro' ? 'text-nz-tinta-fraca' : 'text-nz-tinta-fraca/60'
              } ${clicavel ? '' : 'cursor-default'}`}
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-2xl ${
                  atual ? `bg-gradient-to-b ${TOM[item.id]} shadow-lg`
                    : item.estado === 'feito' ? 'bg-amber-100'
                      : vazio ? 'border border-dashed border-nz-borda' : 'bg-nz-borda/30'}`}
                style={atual ? { boxShadow: '0 4px 0 0 rgba(0,0,0,0.18)' } : undefined}
              >
                <Icone className={`h-5 w-5 ${vazio ? 'opacity-40' : ''}`} strokeWidth={atual ? 2.4 : 2} fill={item.estado === 'feito' ? 'currentColor' : 'none'} />
              </span>
              {/* 🩹 DIR-180 — o azulejo cinza apagado o olho lia como "bloqueado /
                  perdi". Dia sem parada ali agora DIZ o que é. */}
              <span className={`w-full leading-tight ${vazio ? 'text-[8px] normal-case tracking-normal' : 'truncate'}`}>
                {vazio ? 'sem parada' : item.rotulo}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
