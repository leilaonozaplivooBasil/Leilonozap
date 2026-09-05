import React, { useState } from 'react';
import {
  Sunrise, BookOpen, Dumbbell, Camera, Store, Utensils, Handshake,
  GraduationCap, FileText, Moon, Sparkles, Car, Star, Trophy, Flag, Play, Check, X as XIcon, CalendarDays,
} from 'lucide-react';

// 🗺️ X-GAME — O MOMENTO + A JORNADA (ordem do dono, 05/09):
//   • O dia começa LIMPO: só a saudação e A TAREFA DO MOMENTO.
//   • As feitas viram o RASTRO; expandir abre o mapa DE BAIXO PRA CIMA
//     (o dia SOBE do amanhecer ao troféu); clicar numa parada foca só nela.
//   • NADA DE EMOJI: cada parada é um SELO com ícone vetorial em gradiente
//     (sistema visual de app grande — limpo e consistente).

const SELOS = [
  [/acordar|gratidao|bom dia/i, Sunrise, 'from-amber-400 to-orange-500'],
  [/leitura|estudo|curso/i, BookOpen, 'from-sky-400 to-blue-600'],
  [/corrida|treino|atividade fisica|academia/i, Dumbbell, 'from-rose-400 to-red-500'],
  [/story|post|instagram|conteudo/i, Camera, 'from-fuchsia-500 to-purple-600'],
  [/loja/i, Store, 'from-emerald-400 to-teal-600'],
  [/almoco/i, Utensils, 'from-orange-300 to-amber-500'],
  [/reuniao|apresenta/i, Handshake, 'from-indigo-400 to-violet-600'],
  [/treinament|sala/i, GraduationCap, 'from-violet-500 to-purple-700'],
  [/contrato|follow|fechamento/i, FileText, 'from-slate-400 to-slate-600'],
  [/descanso|leve/i, Moon, 'from-indigo-500 to-slate-700'],
  [/organizacao|ambiente/i, Sparkles, 'from-cyan-400 to-sky-600'],
  [/caminho|chegar/i, Car, 'from-lime-400 to-green-600'],
];
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const seloDa = (titulo) => {
  const t = semAcento(titulo);
  for (const [re, Icone, grad] of SELOS) if (re.test(t)) return { Icone, grad };
  return { Icone: Star, grad: 'from-amber-300 to-yellow-500' };
};

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const OFFSETS = [0, -72, 0, 72];

/** O selo redondo de uma parada: ícone vetorial sobre gradiente. */
function Selo({ titulo, tamanho = 'w-14 h-14', icone = 'w-6 h-6', feito, perdido, atual }) {
  const { Icone, grad } = seloDa(titulo);
  return (
    <span
      className={[
        `relative ${tamanho} rounded-full flex items-center justify-center shadow-md bg-gradient-to-br`,
        perdido && !feito ? 'from-gray-300 to-gray-400 opacity-70' : grad,
        feito ? 'ring-4 ring-emerald-300' : '',
        atual && !feito ? 'ring-4 ring-amber-400 animate-pulse' : '',
        !feito && !atual && !perdido ? 'ring-2 ring-white/80' : '',
      ].join(' ')}
    >
      <Icone className={`${icone} text-white drop-shadow`} strokeWidth={2.2} />
      {feito && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
        </span>
      )}
      {!feito && perdido && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center shadow">
          <XIcon className="w-3 h-3 text-white" strokeWidth={3.5} />
        </span>
      )}
    </span>
  );
}

export default function XGameJornada({ tarefas = [], nome, pct = 0, fogo, onTarefa, acaoExtra }) {
  const [expandida, setExpandida] = useState(false);
  const [focoId, setFocoId] = useState(null);

  const feitas = tarefas.filter((t) => t.feito);
  const pendentes = tarefas.filter((t) => !t.feito);
  const atual = tarefas.find((t) => !t.feito && (t.estado?.id === 'AGORA' || t.estado?.id === 'ATRASADO')) || pendentes[0] || null;
  const foco = tarefas.find((x) => x.id === focoId && !x.feito) || atual;
  const completou = pct >= 100;

  // ══ A JORNADA EXPANDIDA — de baixo pra cima: o dia SOBE ══
  if (expandida) {
    const subida = [...tarefas].reverse();
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-100 via-sky-50 to-amber-100 shadow-sm">
        <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-300/50 blur-3xl" />
        <div className="relative flex items-center justify-between px-5 pt-4">
          <p className="text-xs font-bold text-gray-700">A jornada de hoje — o dia sobe</p>
          <button type="button" onClick={() => setExpandida(false)} className="text-[11px] font-bold text-gray-400 hover:text-gray-700">recolher</button>
        </div>

        <div className="relative flex flex-col items-center gap-6 px-4 pb-8 pt-4">
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-white" />

          <div className="relative flex flex-col items-center">
            <span className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${completou ? 'from-amber-400 to-yellow-500 ring-4 ring-amber-200 animate-bounce' : 'from-white to-gray-100 ring-2 ring-white'}`}>
              {completou ? <Trophy className="w-8 h-8 text-white drop-shadow" /> : <Flag className="w-7 h-7 text-gray-400" />}
            </span>
            <p className="mt-1 text-[10px] font-bold text-gray-600">{completou ? 'DIA PERFEITO!' : 'o topo do dia'}</p>
          </div>

          {subida.map((t, i) => {
            const est = t.estado?.id;
            const ehAtual = atual && t.id === atual.id;
            return (
              <div key={t.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
                {ehAtual && (
                  <span className="absolute -top-6 whitespace-nowrap rounded-full bg-gray-900 text-white text-[9px] font-bold px-2.5 py-0.5 shadow">VOCÊ ESTÁ AQUI</span>
                )}
                <button type="button" onClick={() => { setFocoId(t.id); setExpandida(false); }} title={`${t.hora} — ${t.titulo}`} className="transition-transform hover:scale-110">
                  <Selo titulo={t.titulo} feito={!!t.feito} perdido={est === 'PERDIDO'} atual={ehAtual} />
                </button>
                <p className="mt-1.5 max-w-[120px] text-center text-[10px] leading-tight text-gray-500">
                  <span className="font-bold text-gray-700">{t.hora}</span><br />
                  <span className="line-clamp-2">{t.titulo}</span>
                </p>
              </div>
            );
          })}

          <Sunrise className="w-7 h-7 text-amber-500" />
        </div>
      </div>
    );
  }

  // ══ O MOMENTO — o dia limpo: só a tarefa da vez + o rastro ══
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 via-amber-50/60 to-amber-100 shadow-sm">
      <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-300/40 blur-3xl" />

      <div className="relative px-6 py-8 text-center space-y-5">
        <div className="space-y-0.5">
          <p className="text-xl font-bold text-gray-800">{saudacao()}, {nome || 'campeão'}.</p>
          <p className="text-[11px] text-gray-400">
            {fogo?.dias > 0 ? `${fogo.dias} ${fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva · ` : ''}
            {feitas.length} de {tarefas.length} passos hoje
          </p>
        </div>

        {completou || !foco ? (
          <div className="py-6 space-y-3">
            <span className="mx-auto w-24 h-24 rounded-full flex items-center justify-center shadow-xl bg-gradient-to-br from-amber-400 to-yellow-500 ring-8 ring-amber-100 animate-bounce">
              <Trophy className="w-12 h-12 text-white drop-shadow" />
            </span>
            <p className="text-base font-bold text-gray-800">DIA PERFEITO — BRILHANTE! PARABÉNS!</p>
            <p className="text-[11px] text-gray-400">Você subiu a jornada inteira. Amanhã o sol nasce de novo.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-xs rounded-3xl bg-white/90 backdrop-blur shadow-xl px-6 py-7 space-y-4">
            <div className="mx-auto w-fit">
              <Selo titulo={foco.titulo} tamanho="w-24 h-24" icone="w-11 h-11" perdido={foco.estado?.id === 'PERDIDO'} atual={foco.estado?.id !== 'PERDIDO'} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-nz-verde uppercase tracking-widest">
                {foco.estado?.id === 'PERDIDO' ? 'ainda dá pra comprovar' : foco.estado?.id === 'ATRASADO' ? 'tá na hora — corre' : 'o seu momento agora'}
              </p>
              <p className="text-base font-bold text-gray-800">{foco.hora} · {foco.titulo}</p>
              {foco.detalhe && <p className="text-[11px] text-gray-400">{foco.detalhe}</p>}
            </div>
            {/* 🤝 reunião puxada do sistema? abre direto na agenda */}
            {acaoExtra && acaoExtra(foco) && (
              <a
                href={acaoExtra(foco).href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-sky-600 hover:underline"
              ><CalendarDays className="w-3.5 h-3.5" /> {acaoExtra(foco).rotulo}</a>
            )}
            <button
              type="button"
              onClick={() => onTarefa(foco)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-nz-verde hover:bg-nz-verde-claro text-white text-sm font-bold py-3.5"
            ><Play className="w-4 h-4" strokeWidth={2.5} /> Viver esse momento</button>
          </div>
        )}

        {feitas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">o seu rastro de hoje</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[...feitas].reverse().map((t) => {
                const { Icone, grad } = seloDa(t.titulo);
                return (
                  <span key={t.id} title={`${t.hora} — ${t.titulo}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 shadow-sm text-gray-600 text-[10px] font-semibold pl-1 pr-2 py-1">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center bg-gradient-to-br ${grad}`}>
                      <Icone className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </span>
                    {t.hora}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button type="button" onClick={() => setExpandida(true)} className="text-[11px] font-bold text-gray-400 hover:text-gray-700">
          expandir a jornada · {pendentes.length} {pendentes.length === 1 ? 'passo' : 'passos'} pela frente
        </button>
      </div>
    </div>
  );
}
