import React, { useEffect, useRef, useState } from 'react';
import {
  Sunrise, BookOpen, Dumbbell, Camera, Store, Utensils, Handshake,
  GraduationCap, FileText, Moon, Sparkles, Car, Star, Trophy, Play, Check, X as XIcon, CalendarDays,
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

/** 🪑 A MESINHA REDONDA 3D — a plataforma das paradas que ainda não chegaram.
 *  É uma MESA COMPLETA vista em leve perspectiva: um disco sólido (elipse
 *  cheia) com a espessura aparecendo embaixo, tipo moeda deitada. NÃO é
 *  arco, NÃO é meia-lua. */
function Mesinha({ className = '', topo = '#E2E8F0', lado = '#94A3B8', brilho = '#F8FAFC' }) {
  return (
    <svg viewBox="0 0 100 48" className={className} aria-hidden="true">
      {/* a espessura da mesa (a parede lateral) */}
      <ellipse cx="50" cy="32" rx="46" ry="13" fill={lado} />
      <rect x="4" y="24" width="92" height="8" fill={lado} />
      {/* a face de cima, inteira */}
      <ellipse cx="50" cy="24" rx="46" ry="13" fill={topo} />
      {/* o brilho que dá o volume */}
      <ellipse cx="50" cy="21.5" rx="37" ry="8.5" fill={brilho} opacity="0.7" />
    </svg>
  );
}

/** 🎁 O BAÚ DO TESOURO 3D — desenhado de verdade (tampa abaulada, ferragens,
 *  fechadura, rodapé). Trancado = chumbo; conquistado = ouro com a tampa
 *  aberta e o brilho saindo de dentro. */
function Bau({ aberto = false, className = '' }) {
  const c = aberto
    ? { corpo: '#F59E0B', claro: '#FCD34D', escuro: '#B45309', metal: '#FDE68A', luz: '#FEF3C7' }
    : { corpo: '#475569', claro: '#64748B', escuro: '#334155', metal: '#94A3B8', luz: '#CBD5E1' };
  return (
    <svg viewBox="0 0 100 92" className={className} aria-hidden="true">
      {/* o corpo */}
      <path d="M14 48 h72 v26 a6 6 0 0 1 -6 6 h-60 a6 6 0 0 1 -6 -6 z" fill={c.corpo} />
      {/* a lateral escura, que dá o volume */}
      <path d="M76 48 h10 v26 a6 6 0 0 1 -6 6 h-4 z" fill={c.escuro} opacity="0.45" />

      {aberto ? (
        <g>
          {/* o brilho saindo de dentro */}
          <path d="M20 48 h60 l-6 -12 h-48 z" fill={c.luz} />
          <path d="M42 30 l3 -9 3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 z" fill={c.luz} />
          <circle cx="30" cy="27" r="2.6" fill={c.luz} />
          <circle cx="70" cy="24" r="2" fill={c.luz} />
          {/* a tampa inclinada pra trás */}
          <g transform="rotate(-24 16 40)">
            <path d="M14 40 v-4 a36 22 0 0 1 72 0 v4 z" fill={c.claro} />
            <path d="M24 34 a26 15 0 0 1 52 0 z" fill={c.metal} opacity="0.5" />
            <rect x="12" y="34" width="76" height="8" rx="3" fill={c.metal} />
          </g>
        </g>
      ) : (
        <g>
          {/* a tampa abaulada, fechada */}
          <path d="M14 48 v-6 a36 24 0 0 1 72 0 v6 z" fill={c.claro} />
          <path d="M24 42 a26 16 0 0 1 52 0 z" fill={c.metal} opacity="0.45" />
        </g>
      )}

      {/* a faixa metálica entre a tampa e o corpo */}
      <rect x="11" y="44" width="78" height="9" rx="3.5" fill={c.metal} />
      {/* a ferragem vertical do meio */}
      <rect x="44" y={aberto ? 44 : 20} width="12" height={aberto ? 36 : 60} fill={c.metal} />
      {/* a fechadura */}
      <rect x="40.5" y="46" width="19" height="17" rx="4.5" fill={c.escuro} />
      <circle cx="50" cy="52" r="3.2" fill={c.metal} />
      <rect x="48.4" y="52" width="3.2" height="7" rx="1.6" fill={c.metal} />
      {/* o rodapé */}
      <rect x="9" y="74" width="82" height="10" rx="4.5" fill={c.escuro} />
      {/* o pezinho de sombra */}
      <ellipse cx="50" cy="87" rx="34" ry="4" fill="#0F172A" opacity="0.13" />
    </svg>
  );
}

/** A parada que ainda não chegou: o DESENHO CHAPADO NA MESINHA.
 *  A ordem do dono é literal: "é um desenho NA mesa, não algo EM CIMA da
 *  mesa". Então o glifo é estampado na superfície, como pintura no tampo.
 *
 *  GEOMETRIA (banquinho de 88px, SVG viewBox 0 0 100 48):
 *    • altura do SVG = 88 × 0,48 ≈ 42px; o TAMPO tem centro em cy=24, ou
 *      seja na metade: 21px do chão. A elipse do tampo (ry=13) vai de
 *      ~9,6px a ~32,4px do chão — essa faixa é a superfície pintável.
 *    • o glifo é CENTRADO nesse centro (não apoiado pela base). Esse era o
 *      erro anterior: os ícones do lucide têm respiro interno no viewBox,
 *      então ancorar a CAIXA pelo pé deixava o DESENHO boiando ~7px acima
 *      da mesa — a origem do "está meio alto".
 *    • scaleY 0,70 a partir do centro: o desenho deita no mesmo plano de
 *      perspectiva do tampo e cabe dentro da elipse.
 *    • SEM sombra de contato: pintura na mesa não projeta sombra. O que
 *      sobra é só a sombra de CHÃO, que acende quando a peça levanta. */
function ParadaNaMesa({ Icone }) {
  return (
    <span className="relative block w-[88px] h-[54px]">
      {/* a sombra do chão: só aparece quando a peça levanta no hover */}
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-[58px] h-[10px] rounded-[50%] bg-slate-900/0 blur-[3px] transition-colors duration-200 ease-out group-hover:bg-slate-900/25" />
      <Mesinha className="absolute bottom-0 left-0 w-[88px]" />
      {/* o desenho ESTAMPADO no tampo */}
      <Icone
        className="absolute text-slate-500"
        style={{
          left: '50%',
          top: '10px',
          width: '46px',
          height: '46px',
          transform: 'translateX(-50%) scaleY(0.7)',
          transformOrigin: 'center center',
        }}
        fill="currentColor"
        strokeWidth={1.3}
      />
    </span>
  );
}

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
        {/* ⬆️ A LEVANTADA: passou o mouse, a peça inteira sobe (banquinho +
            desenho juntos); tirou, desce de volta; clicou, afunda. */}
        <span className="relative block transition-transform duration-200 ease-out group-hover:-translate-y-2 group-active:translate-y-[3px]">
        {atual && (
          <span className="absolute -inset-2.5 rounded-full border-4 border-amber-300" style={{ animation: 'xgHalo 1.8s ease-out infinite' }} />
        )}
        {aceso ? (
          /* feita/atual: a MOEDA 3D colorida — feita fica tortinha com o
             check gigante, como a moeda jogada do Duolingo */
          <span
            className={[
              'relative w-[74px] h-[70px] rounded-[50%] flex items-center justify-center transition-transform',
              'group-hover:brightness-105',
              `bg-gradient-to-b ${grad}`,
              feito ? '-rotate-6' : '',
            ].join(' ')}
            style={{ boxShadow: `0 7px 0 0 ${borda}` }}
          >
            {feito ? (
              <Check className="w-9 h-9 text-white drop-shadow-sm" strokeWidth={3.5} />
            ) : (
              /* desenho CHEIO (preenchido), gordinho como o glifo do Duolingo */
              <Icone className="w-8 h-8 text-white drop-shadow-sm" fill="currentColor" strokeWidth={1.6} />
            )}
          </span>
        ) : (
          /* futura/perdida: o DESENHO 3D em cima da MESINHA REDONDA */
          <span className="relative flex flex-col items-center">
            <ParadaNaMesa Icone={Icone} />
            {perdido && (
              <span className="absolute top-1 -right-0.5 z-10 w-4 h-4 rounded-full bg-red-400 ring-2 ring-white flex items-center justify-center">
                <XIcon className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
              </span>
            )}
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
            {completou ? (
              <span
                className="w-[74px] h-[70px] rounded-[50%] flex items-center justify-center bg-gradient-to-b from-amber-400 to-yellow-500 animate-bounce"
                style={{ boxShadow: '0 7px 0 0 #b45309' }}
              >
                <Trophy className="w-9 h-9 text-white drop-shadow-sm" />
              </span>
            ) : (
              /* troféu ainda trancado: o desenho em cima da mesinha redonda */
              <ParadaNaMesa Icone={Trophy} />
            )}
            <p className={`mt-2 text-[10px] font-extrabold tracking-wide ${completou ? 'text-amber-600' : 'text-slate-400'}`}>{completou ? 'DIA PERFEITO!' : 'O TOPO DO DIA'}</p>
          </div>

          {gruposSubida.map((g) => {
            // a receita da lâmina 6 do Duolingo, subindo: TROFÉU fecha o
            // período (topo do grupo), o BAÚ fica no MEIO da unidade
            const posBau = Math.floor(g.itens.length / 2);
            return (
              <React.Fragment key={g.rotulo}>
                {/* o troféu do período */}
                <div
                  className="relative flex flex-col items-center"
                  title={g.completo ? `${g.rotulo} completo — troféu garantido!` : `Feche ${g.rotulo === 'AMANHECER' ? 'o' : 'a'} ${g.rotulo} inteiro pro troféu`}
                >
                  {g.completo ? (
                    <span
                      className="w-[74px] h-[70px] rounded-[50%] flex items-center justify-center bg-gradient-to-b from-amber-400 to-yellow-500 -rotate-6"
                      style={{ boxShadow: '0 7px 0 0 #b45309' }}
                    >
                      <Trophy className="w-9 h-9 text-white drop-shadow-sm" fill="currentColor" strokeWidth={1.4} />
                    </span>
                  ) : (
                    <ParadaNaMesa Icone={Trophy} />
                  )}
                </div>

                {g.itens.map((t, i) => {
                  const ehAtual = atual && t.id === atual.id;
                  const offset = OFFSETS[zig % OFFSETS.length];
                  zig += 1;
                  const offsetBau = OFFSETS[zig % OFFSETS.length];
                  return (
                    <React.Fragment key={t.id}>
                      <div className="relative" style={{ transform: `translateX(${offset}px)` }}>
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
                      {i === posBau && g.itens.length > 1 && (
                        /* o BAÚ no meio da unidade: chumbo 3D trancado,
                           dourado quando o período fecha */
                        <div
                          className="relative flex flex-col items-center"
                          style={{ transform: `translateX(${offsetBau}px)` }}
                          title={g.completo ? 'Baú aberto — recompensa do período!' : 'O baú abre quando o período fechar inteiro'}
                        >
                          <Bau aberto={g.completo} className={`w-[74px] ${g.completo ? 'animate-pulse' : ''}`} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* o divisor do período (o "— Diga de onde você é —" do Duolingo) */}
                <div className="w-full max-w-sm flex items-center gap-3 py-2">
                  <span className="flex-1 border-t border-slate-200" />
                  <span className="text-[10px] font-extrabold tracking-[0.22em] text-slate-400">{g.rotulo}</span>
                  <span className="flex-1 border-t border-slate-200" />
                </div>
              </React.Fragment>
            );
          })}

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
