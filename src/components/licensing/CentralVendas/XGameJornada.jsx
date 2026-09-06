import React, { useEffect, useRef, useState } from 'react';
import {
  Sunrise, BookOpen, Dumbbell, Camera, Store, Utensils, Handshake,
  GraduationCap, FileText, Moon, Sparkles, Car, Star, Trophy, Flag, Play, Check, X as XIcon, CalendarDays, Gift,
} from 'lucide-react';

// 🗺️ X-GAME — O MOMENTO + A JORNADA (ordem do dono, 05/09):
//   • O dia começa LIMPO: só a saudação e A TAREFA DO MOMENTO.
//   • As feitas viram o RASTRO; expandir abre o mapa DE BAIXO PRA CIMA;
//     clicar numa parada foca só nela.
//   • Visual VALE DO SILÍCIO: branco sólido, sombra nítida, hairlines —
//     nada lavado, nada transparente, zero emoji (selos vetoriais).

// cada selo carrega a cor da BORDA 3D (a mesma cor do bot\u00e3o, s\u00f3 mais escura \u2014
// \u00e9 o truque de profundidade do Duolingo, nada de sombra preta gen\u00e9rica)
const SELOS = [
  [/acordar|gratidao|bom dia/i, Sunrise, 'from-amber-400 to-orange-500', '#c2410c'],
  [/leitura|estudo|curso/i, BookOpen, 'from-sky-400 to-blue-600', '#1e40af'],
  [/corrida|treino|atividade fisica|academia/i, Dumbbell, 'from-rose-400 to-red-500', '#b91c1c'],
  [/story|post|instagram|conteudo/i, Camera, 'from-fuchsia-500 to-purple-600', '#7e22ce'],
  [/loja/i, Store, 'from-emerald-400 to-teal-600', '#0f766e'],
  [/almoco/i, Utensils, 'from-orange-300 to-amber-500', '#b45309'],
  [/reuniao|apresenta/i, Handshake, 'from-indigo-400 to-violet-600', '#5b21b6'],
  [/treinament|sala/i, GraduationCap, 'from-violet-500 to-purple-700', '#6b21a8'],
  [/contrato|follow|fechamento/i, FileText, 'from-slate-400 to-slate-600', '#334155'],
  [/descanso|leve/i, Moon, 'from-indigo-500 to-slate-700', '#312e81'],
  [/organizacao|ambiente/i, Sparkles, 'from-cyan-400 to-sky-600', '#0369a1'],
  [/caminho|chegar/i, Car, 'from-lime-400 to-green-600', '#15803d'],
];
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const seloDa = (titulo) => {
  const t = semAcento(titulo);
  for (const [re, Icone, grad, borda] of SELOS) if (re.test(t)) return { Icone, grad, borda };
  return { Icone: Star, grad: 'from-amber-300 to-yellow-500', borda: '#a16207' };
};

// a saudação segue o RELÓGIO DO JOGO (o teste do super admin muda o dia inteiro)
const saudacao = (min) => {
  const h = min != null ? Math.floor(min / 60) : new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

// a SERPENTINA do Duolingo: um S suave, não zigue-zague duro
const OFFSETS = [0, -60, -92, -60, 0, 60, 92, 60];

// 🦉→🏆 os PERÍODOS do dia (as "unidades" da jornada, estilo Duolingo):
// cada período tem cor própria; o baú abre quando o período fecha inteiro
const PERIODOS = [
  [7 * 60, 'AMANHECER', 'from-amber-400 to-orange-500'],
  [12 * 60, 'MANHÃ', 'from-sky-400 to-blue-600'],
  [18 * 60, 'TARDE', 'from-violet-500 to-purple-600'],
  [Infinity, 'NOITE', 'from-indigo-500 to-slate-800'],
];
const periodoDe = (t) => {
  const [h = 0, m = 0] = String(t?.hora || '').split(':').map(Number);
  const min = (h * 60) + (m || 0);
  return PERIODOS.find(([lim]) => min < lim) || PERIODOS[PERIODOS.length - 1];
};

/** O botão de lição do Duolingo, versão executiva:
 *  GRANDE, borda 3D da mesma cor (mais escura), feito = CHECK gigante no
 *  lugar do ícone, atual = aceso com halo + balão COMEÇAR, futuro/perdido =
 *  apagado e quieto (zero muro de X vermelho). Sem legenda embaixo — o
 *  contexto vem do banner e do clique. */
function Parada3D({ titulo, hora, feito, perdido, atual, onClick, refEl }) {
  const { Icone, grad, borda } = seloDa(titulo);
  const aceso = feito || atual;
  return (
    <div ref={refEl} className="relative flex flex-col items-center">
      {atual && (
        <span className="absolute -top-10 z-10 animate-bounce whitespace-nowrap rounded-xl bg-white text-emerald-600 text-[11px] font-extrabold tracking-[0.14em] px-3.5 py-1.5 shadow-lg border border-slate-100">
          COMEÇAR
          <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-white border-b border-r border-slate-100" />
        </span>
      )}
      <button type="button" onClick={onClick} title={`${hora} — ${titulo}`} className="relative group outline-none">
        {atual && (
          <span className="absolute -inset-2.5 rounded-full border-4 border-amber-300" style={{ animation: 'xgHalo 1.8s ease-out infinite' }} />
        )}
        <span
          className={[
            'relative w-[74px] h-[70px] rounded-[50%] flex items-center justify-center transition-transform',
            'group-hover:brightness-105 group-active:translate-y-[5px]',
            aceso ? `bg-gradient-to-b ${grad}` : 'bg-slate-200',
          ].join(' ')}
          style={{ boxShadow: aceso ? `0 7px 0 0 ${borda}` : '0 7px 0 0 #cbd5e1' }}
        >
          {feito ? (
            <Check className="w-9 h-9 text-white drop-shadow-sm" strokeWidth={3.5} />
          ) : (
            <Icone className={`w-8 h-8 ${aceso ? 'text-white drop-shadow-sm' : 'text-slate-400'}`} strokeWidth={2.4} />
          )}
          {!feito && perdido && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-400 ring-2 ring-white flex items-center justify-center">
              <XIcon className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** O selo redondo de uma parada: ícone vetorial sobre gradiente. */
function Selo({ titulo, tamanho = 'w-14 h-14', icone = 'w-6 h-6', feito, perdido, atual }) {
  const { Icone, grad } = seloDa(titulo);
  return (
    <span
      className={[
        `relative ${tamanho} rounded-full flex items-center justify-center shadow-md bg-gradient-to-br`,
        perdido && !feito ? 'from-slate-300 to-slate-400' : grad,
        feito ? 'ring-4 ring-emerald-200' : '',
        atual && !feito ? 'ring-4 ring-amber-300' : '',
        !feito && !atual && !perdido ? 'ring-2 ring-slate-100' : '',
      ].join(' ')}
    >
      <Icone className={`${icone} text-white drop-shadow-sm`} strokeWidth={2.2} />
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

export default function XGameJornada({ tarefas = [], nome, pct = 0, fogo, onTarefa, acaoExtra, agoraMin = null }) {
  const [expandida, setExpandida] = useState(false);
  const [focoId, setFocoId] = useState(null);
  const refAtual = useRef(null);
  // expandiu → a jornada rola sozinha até onde a pessoa está (o "você está aqui")
  useEffect(() => {
    if (!expandida) return undefined;
    const t = setTimeout(() => refAtual.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    return () => clearTimeout(t);
  }, [expandida]);

  const feitas = tarefas.filter((t) => t.feito);
  const pendentes = tarefas.filter((t) => !t.feito);
  const atual = tarefas.find((t) => !t.feito && (t.estado?.id === 'AGORA' || t.estado?.id === 'ATRASADO')) || pendentes[0] || null;
  const foco = tarefas.find((x) => x.id === focoId && !x.feito) || atual;
  const completou = pct >= 100;

  // ══ A JORNADA EXPANDIDA — estilo Duolingo, de baixo pra cima: o dia SOBE.
  //    Sem linha; períodos com cor própria; a parada atual ACESA com balão
  //    COMEÇAR; as futuras apagadas; baú fecha cada período; a tela rola
  //    sozinha até onde a pessoa está. ══
  if (expandida) {
    // as "unidades" do dia: agrupa por período na ordem do dia...
    const grupos = [];
    tarefas.forEach((t) => {
      const [, rotulo, grad] = periodoDe(t);
      const g = grupos[grupos.length - 1];
      if (!g || g.rotulo !== rotulo) grupos.push({ rotulo, grad, itens: [t] });
      else g.itens.push(t);
    });
    // ...e sobe: o último período no topo, dentro de cada um a última tarefa primeiro
    const gruposSubida = [...grupos].reverse().map((g) => ({
      ...g,
      itens: [...g.itens].reverse(),
      completo: g.itens.length > 0 && g.itens.every((t) => t.feito),
    }));
    const periodoAtual = atual ? periodoDe(atual) : PERIODOS[PERIODOS.length - 1];
    const gradBanner = completou ? 'from-amber-400 to-yellow-500' : periodoAtual[2];
    const mensagem = completou
      ? 'DIA PERFEITO — você subiu a jornada inteira!'
      : pct >= 70
        ? 'Reta final — não solta agora.'
        : pct >= 40
          ? 'Ritmo bom. Segue subindo.'
          : feitas.length > 0
            ? 'Começou bem — o dia é seu.'
            : 'O dia inteiro está te esperando.';
    let zig = 0; // o zigue-zague contínuo da trilha

    return (
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <style>{'@keyframes xgHalo { 0% { transform: scale(1); opacity: .8 } 70% { transform: scale(1.3); opacity: 0 } 100% { transform: scale(1.3); opacity: 0 } }'}</style>

        {/* o banner da "unidade" (como o cartão verde do Duolingo) */}
        <div className={`bg-gradient-to-r ${gradBanner} px-6 py-4 flex items-center justify-between gap-3`}>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
              A jornada de hoje · {completou ? 'COMPLETA' : periodoAtual[1]} · {feitas.length}/{tarefas.length}
            </p>
            <p className="text-sm font-bold text-white truncate">{mensagem}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!completou && (
              <button
                type="button"
                onClick={() => refAtual.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold tracking-wide px-3 py-2"
              >IR PRO AGORA</button>
            )}
            <button type="button" onClick={() => setExpandida(false)} className="rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold tracking-wide px-3 py-2">
              RECOLHER
            </button>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-4 px-4 pb-10 pt-8">
          {/* o troféu no TOPO do dia */}
          <div className="relative flex flex-col items-center mb-2">
            <span
              className={`w-[74px] h-[70px] rounded-[50%] flex items-center justify-center ${completou ? 'bg-gradient-to-b from-amber-400 to-yellow-500 animate-bounce' : 'bg-slate-200'}`}
              style={{ boxShadow: completou ? '0 7px 0 0 #b45309' : '0 7px 0 0 #cbd5e1' }}
            >
              {completou ? <Trophy className="w-9 h-9 text-white drop-shadow-sm" /> : <Flag className="w-8 h-8 text-slate-400" />}
            </span>
            <p className={`mt-2 text-[10px] font-extrabold tracking-wide ${completou ? 'text-amber-600' : 'text-slate-400'}`}>{completou ? 'DIA PERFEITO!' : 'O TOPO DO DIA'}</p>
          </div>

          {gruposSubida.map((g) => (
            <React.Fragment key={g.rotulo}>
              {/* o BAÚ do período: abre quando o período fecha inteiro */}
              <div
                className="relative flex flex-col items-center"
                title={g.completo ? `${g.rotulo} completo — recompensa garantida!` : `Complete ${g.rotulo === 'AMANHECER' ? 'o' : 'a'} ${g.rotulo} pra abrir o baú`}
              >
                <span
                  className={`w-[66px] h-[60px] rounded-2xl flex items-center justify-center ${g.completo ? 'bg-gradient-to-b from-amber-300 to-amber-500' : 'bg-slate-200'}`}
                  style={{ boxShadow: g.completo ? '0 7px 0 0 #92400e' : '0 7px 0 0 #cbd5e1' }}
                >
                  <Gift className={`w-8 h-8 ${g.completo ? 'text-white drop-shadow-sm' : 'text-slate-400'}`} strokeWidth={2.2} />
                </span>
              </div>

              {g.itens.map((t) => {
                const ehAtual = atual && t.id === atual.id;
                const offset = OFFSETS[zig % OFFSETS.length];
                zig += 1;
                return (
                  <div key={t.id} className="relative" style={{ transform: `translateX(${offset}px)` }}>
                    <Parada3D
                      titulo={t.titulo}
                      hora={t.hora}
                      feito={!!t.feito}
                      perdido={t.estado?.id === 'PERDIDO'}
                      atual={ehAtual}
                      refEl={ehAtual ? refAtual : undefined}
                      onClick={() => { setFocoId(t.id); setExpandida(false); }}
                    />
                  </div>
                );
              })}

              {/* o divisor do período (o "— Diga de onde você é —" do Duolingo) */}
              <div className="w-full max-w-sm flex items-center gap-3 py-2">
                <span className="flex-1 border-t border-slate-200" />
                <span className="text-[10px] font-extrabold tracking-[0.22em] text-slate-400">{g.rotulo}</span>
                <span className="flex-1 border-t border-slate-200" />
              </div>
            </React.Fragment>
          ))}

          {/* o amanhecer na BASE: é daqui que o dia sobe */}
          <span
            className="w-[66px] h-[62px] rounded-[50%] bg-gradient-to-b from-amber-400 to-orange-500 flex items-center justify-center"
            style={{ boxShadow: '0 7px 0 0 #c2410c' }}
          >
            <Sunrise className="w-8 h-8 text-white drop-shadow-sm" />
          </span>
        </div>
      </div>
    );
  }

  // ══ O MOMENTO — branco sólido, um passo por vez ══
  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-6 py-8 text-center space-y-6">
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight text-slate-900">{saudacao(agoraMin)}, {nome || 'campeão'}.</p>
          <p className="text-xs text-slate-400">
            {fogo?.dias > 0 ? `${fogo.dias} ${fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva · ` : ''}
            {feitas.length} de {tarefas.length} passos hoje
          </p>
        </div>

        {completou || !foco ? (
          <div className="py-6 space-y-4">
            <span className="mx-auto w-24 h-24 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-400 to-yellow-500 ring-8 ring-amber-50 animate-bounce">
              <Trophy className="w-12 h-12 text-white drop-shadow-sm" />
            </span>
            <p className="text-lg font-bold text-slate-900">DIA PERFEITO — BRILHANTE!</p>
            <p className="text-xs text-slate-400">Você subiu a jornada inteira. Amanhã o sol nasce de novo.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-sm rounded-2xl bg-white border border-slate-200 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] px-8 py-8 space-y-5">
            <div className="mx-auto w-fit">
              <Selo titulo={foco.titulo} tamanho="w-24 h-24" icone="w-11 h-11" perdido={foco.estado?.id === 'PERDIDO'} atual={foco.estado?.id !== 'PERDIDO'} />
            </div>
            <div className="space-y-1.5">
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${foco.estado?.id === 'PERDIDO' ? 'text-slate-400' : foco.estado?.id === 'ATRASADO' ? 'text-orange-500' : 'text-emerald-600'}`}>
                {foco.estado?.id === 'PERDIDO' ? 'ainda dá pra comprovar' : foco.estado?.id === 'ATRASADO' ? 'tá na hora — corre' : 'o seu momento agora'}
              </p>
              <p className="text-lg font-bold text-slate-900 leading-snug">{foco.titulo}</p>
              <p className="text-xs font-semibold text-slate-400">{foco.hora}</p>
              {foco.detalhe && <p className="text-xs text-slate-400 leading-relaxed">{foco.detalhe}</p>}
            </div>
            {acaoExtra && acaoExtra(foco) && (
              <a
                href={acaoExtra(foco).href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-sky-600 hover:underline"
              ><CalendarDays className="w-3.5 h-3.5" /> {acaoExtra(foco).rotulo}</a>
            )}
            <button
              type="button"
              onClick={() => onTarefa(foco)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-nz-verde hover:bg-nz-verde-claro text-white text-sm font-bold py-3.5 shadow-sm"
            ><Play className="w-4 h-4" strokeWidth={2.5} /> Viver esse momento</button>
          </div>
        )}

        {feitas.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">o seu rastro de hoje</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[...feitas].reverse().map((t) => {
                const { Icone, grad } = seloDa(t.titulo);
                return (
                  <span key={t.id} title={`${t.hora} — ${t.titulo}`} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold pl-1 pr-2.5 py-1">
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

        <button type="button" onClick={() => setExpandida(true)} className="text-[11px] font-bold text-slate-400 hover:text-slate-900">
          expandir a jornada · {pendentes.length} {pendentes.length === 1 ? 'passo' : 'passos'} pela frente
        </button>
      </div>
    </div>
  );
}
