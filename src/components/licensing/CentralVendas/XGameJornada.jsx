import React, { useEffect, useRef, useState } from 'react';
import {
  Sunrise, BookOpen, Dumbbell, Camera, Store, Utensils, Handshake,
  GraduationCap, FileText, Moon, Sparkles, Car, Star, Trophy, Play, Check, X as XIcon, CalendarDays,
  Target, Users, Phone, MessageCircle, Wallet, ClipboardList, Heart, Droplet, Bed, ShoppingBag,
  Mic, Rocket, Flame,
} from 'lucide-react';
import XGameCapa from './XGameCapas';

// 🗺️ X-GAME — O MOMENTO + A JORNADA (ordem do dono, 05/09):
//   • O dia começa LIMPO: só a saudação e A TAREFA DO MOMENTO.
//   • As feitas viram o RASTRO; expandir abre o mapa DE BAIXO PRA CIMA;
//     clicar numa parada foca só nela.
//   • Visual VALE DO SILÍCIO: branco sólido, sombra nítida, hairlines —
//     nada lavado, nada transparente, zero emoji (selos vetoriais).

// cada selo carrega a cor da BORDA 3D (a mesma cor do bot\u00e3o, s\u00f3 mais escura \u2014
// \u00e9 o truque de profundidade do Duolingo, nada de sombra preta gen\u00e9rica)
const SELOS = [
  // o AMANHECER e o encerramento
  [/gratidao|foco no sonho|visualiza/i, Heart, 'from-rose-400 to-pink-600', '#9d174d'],
  [/acordar|bom dia|amanhecer|despertar/i, Sunrise, 'from-amber-400 to-orange-500', '#c2410c'],
  [/agua|hidrata/i, Droplet, 'from-cyan-400 to-sky-600', '#0369a1'],
  // corpo
  [/corrida|treino|atividade fisica|academia|alongamento/i, Dumbbell, 'from-rose-400 to-red-500', '#b91c1c'],
  // mente
  [/leitura|estudo|curso|licao|aprendiz/i, BookOpen, 'from-sky-400 to-blue-600', '#1e40af'],
  [/treinament|sala|mentoria|aula/i, GraduationCap, 'from-violet-500 to-purple-700', '#6b21a8'],
  [/audio|podcast|escuta/i, Mic, 'from-teal-400 to-cyan-600', '#155e75'],
  // conteúdo
  [/story|post|instagram|conteudo|reels|video/i, Camera, 'from-fuchsia-500 to-purple-600', '#7e22ce'],
  // negócio
  [/prospec|meta|objetivo|resultado/i, Target, 'from-red-400 to-rose-600', '#9f1239'],
  [/ligar|ligacao|telefone|call/i, Phone, 'from-green-400 to-emerald-600', '#065f46'],
  [/whatsapp|mensagem|zap|convite/i, MessageCircle, 'from-emerald-400 to-green-600', '#166534'],
  [/cliente|equipe|time|lideranca/i, Users, 'from-indigo-400 to-blue-600', '#1e3a8a'],
  [/reuniao|apresenta|encontro/i, Handshake, 'from-indigo-400 to-violet-600', '#5b21b6'],
  [/venda|loja|catalogo|produto/i, Store, 'from-emerald-400 to-teal-600', '#0f766e'],
  [/compra|pedido|estoque/i, ShoppingBag, 'from-lime-400 to-green-600', '#15803d'],
  [/financeiro|caixa|dinheiro|pagamento/i, Wallet, 'from-amber-400 to-yellow-600', '#a16207'],
  [/contrato|follow|fechamento|documento/i, FileText, 'from-slate-400 to-slate-600', '#334155'],
  [/planejament|organizacao do negocio|agenda|checklist/i, ClipboardList, 'from-blue-400 to-indigo-600', '#3730a3'],
  [/lancamento|expansao|crescer/i, Rocket, 'from-orange-400 to-red-600', '#9a3412'],
  [/ofensiva|sequencia|streak/i, Flame, 'from-orange-400 to-red-500', '#c2410c'],
  // rotina
  [/almoco|jantar|refeicao|cafe/i, Utensils, 'from-orange-300 to-amber-500', '#b45309'],
  [/descanso|leve|pausa/i, Moon, 'from-indigo-500 to-slate-700', '#312e81'],
  [/dormir|sono|noite/i, Bed, 'from-slate-500 to-indigo-800', '#1e1b4b'],
  [/organizacao|ambiente|limpeza/i, Sparkles, 'from-cyan-400 to-sky-600', '#0369a1'],
  [/caminho|chegar|desloca|transporte/i, Car, 'from-lime-400 to-green-600', '#15803d'],
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
const OFFSETS = [0, -68, -104, -68, 0, 68, 104, 68];

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

/** A parada que ainda não chegou: a MESMA MOEDA das outras, só que apagada.
 *  A ordem do dono: "no seu parece que estou vendo lateral" — e estava
 *  mesmo. A elipse antiga era 3,5:1 (rx 46 / ry 13), que é o disco visto
 *  DE LADO. Visto DE CIMA, um disco aparece quase circular: é por isso que
 *  no Duolingo (e na moeda que ele aprovou) a peça é redonda, com só um
 *  lábio 3D embaixo. Agora a parada trancada é essa mesma moeda:
 *    • 74 × 70 — a mesma da parada de agora e da feita, trilha consistente;
 *    • lábio de 7px embaixo = a espessura, o único traço de perspectiva;
 *    • BOLEADO POR DENTRO: luz interna em cima e sombra interna embaixo
 *      dão o abaulado de quem olha de cima;
 *    • o desenho fica DENTRO, em relevo (a luz branca por baixo do traço),
 *      sem achatamento — o achatamento era o que fazia parecer de lado. */
function ParadaNaMesa({ Icone }) {
  return (
    <span className="relative block">
      {/* a sombra do chão: só acende quando a peça levanta no hover */}
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 w-[58px] h-[11px] rounded-[50%] bg-slate-900/0 blur-[3px] transition-colors duration-200 ease-out group-hover:bg-slate-900/25" />
      <span
        className="relative block w-[74px] h-[70px] rounded-[50%] bg-gradient-to-b from-slate-200 to-slate-300"
        style={{
          boxShadow: [
            '0 7px 0 0 #94A3B8',
            'inset 0 4px 9px rgba(255,255,255,0.85)',
            'inset 0 -5px 12px rgba(15,23,42,0.12)',
          ].join(', '),
        }}
      >
        <Icone
          className="absolute left-1/2 top-1/2 w-[34px] h-[34px] text-slate-400"
          style={{
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 1.5px 0 rgba(255,255,255,0.9))',
          }}
          fill="currentColor"
          strokeWidth={1.3}
        />
      </span>
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
        <span className="xeos-cru absolute -top-11 z-10 animate-bounce whitespace-nowrap rounded-xl bg-white text-emerald-600 text-[11px] font-extrabold tracking-[0.14em] px-3.5 py-1.5 shadow-lg border border-black/5">
          COMEÇAR
          <span className="xeos-cru absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-white" />
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
            style={{
              boxShadow: [
                `0 7px 0 0 ${borda}`,
                'inset 0 4px 9px rgba(255,255,255,0.38)',
                'inset 0 -6px 13px rgba(2,6,23,0.16)',
              ].join(', '),
            }}
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
function MoedaGrande({ titulo, perdido }) {
  const { Icone, grad, borda } = seloDa(titulo);
  return (
    <span
      className={[
        'relative w-32 h-[120px] rounded-[50%] flex items-center justify-center',
        perdido ? 'bg-gradient-to-b from-slate-300 to-slate-400' : `bg-gradient-to-b ${grad}`,
      ].join(' ')}
      style={{
        boxShadow: [
          `0 11px 0 0 ${perdido ? '#64748b' : borda}`,
          'inset 0 6px 14px rgba(255,255,255,0.42)',
          'inset 0 -9px 20px rgba(2,6,23,0.18)',
        ].join(', '),
      }}
    >
      <Icone className="w-14 h-14 text-white drop-shadow" fill="currentColor" strokeWidth={1.2} />
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
      <div className="w-full">
        <style>{'@keyframes xgHalo { 0% { transform: scale(1); opacity: .8 } 70% { transform: scale(1.3); opacity: 0 } 100% { transform: scale(1.3); opacity: 0 } }'}</style>

        {/* o banner da "unidade" (como o cartão verde do Duolingo) — agora
            flutua no meio da tela, sem moldura em volta da jornada */}
        <div className={`sticky top-3 z-20 mx-auto max-w-md rounded-2xl bg-gradient-to-r ${gradBanner} px-5 py-3.5 flex items-center justify-between gap-3 shadow-xl`}>
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
                className="xeos-cru rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold tracking-wide px-3 py-2"
              >IR PRO AGORA</button>
            )}
            <button type="button" onClick={() => setExpandida(false)} className="xeos-cru rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-extrabold tracking-wide px-3 py-2">
              RECOLHER
            </button>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-9 px-1 sm:px-4 pb-16 pt-12">
          {/* o troféu no TOPO do dia */}
          <div className="relative flex flex-col items-center mb-2">
            {completou ? (
              <span
                className="w-[74px] h-[70px] rounded-[50%] flex items-center justify-center bg-gradient-to-b from-amber-400 to-yellow-500 animate-bounce"
                style={{ boxShadow: '0 7px 0 0 #b45309, inset 0 4px 9px rgba(255,255,255,0.42), inset 0 -6px 13px rgba(2,6,23,0.16)' }}
              >
                <Trophy className="w-9 h-9 text-white drop-shadow-sm" />
              </span>
            ) : (
              /* troféu ainda trancado: o desenho em cima da mesinha redonda */
              <ParadaNaMesa Icone={Trophy} />
            )}
            <p className={`mt-2 text-[10px] font-extrabold tracking-[0.16em] ${completou ? 'text-amber-500' : 'text-nz-tinta-fraca'}`}>{completou ? 'DIA PERFEITO!' : 'O TOPO DO DIA'}</p>
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
                      style={{ boxShadow: '0 7px 0 0 #b45309, inset 0 4px 9px rgba(255,255,255,0.42), inset 0 -6px 13px rgba(2,6,23,0.16)' }}
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
                <div className="w-full max-w-sm flex items-center gap-4 py-5">
                  <span className="flex-1 border-t border-nz-borda" />
                  <span className="text-[10px] font-extrabold tracking-[0.24em] text-nz-tinta-fraca">{g.rotulo}</span>
                  <span className="flex-1 border-t border-nz-borda" />
                </div>
              </React.Fragment>
            );
          })}

          {/* o amanhecer na BASE: é daqui que o dia sobe */}
          <span
            className="w-[66px] h-[62px] rounded-[50%] bg-gradient-to-b from-amber-400 to-orange-500 flex items-center justify-center"
            style={{ boxShadow: '0 7px 0 0 #c2410c, inset 0 4px 9px rgba(255,255,255,0.40), inset 0 -6px 13px rgba(2,6,23,0.16)' }}
          >
            <Sunrise className="w-8 h-8 text-white drop-shadow-sm" />
          </span>
        </div>
      </div>
    );
  }

  // ══ O MOMENTO — SEM MOLDURA: a tela inteira é o momento ══
  //   Ordem do dono: "sem esses dois quadrados, limpo, pegando a tela
  //   toda". Saiu o cartão de fora E o cartão de dentro; o que segura a
  //   composição agora é só o ar. As cores usam os tokens nz-* porque o
  //   palco escuro (.xeos-palco) só repinta esses — slate cru ficava
  //   preto no preto (era o "Boa noite" quase invisível).
  const estado = foco?.estado?.id;
  return (
    <div className="relative w-full overflow-hidden">
      {/* A CAPA DO MOMENTO: a cena que representa a tarefa, de marca d'água.
          Vem mascarada num radial — se dissolve no fundo, sem moldura. */}
      {foco && <XGameCapa titulo={foco.titulo} capaUrl={foco.capa_url} />}

      <div className="relative mx-auto max-w-2xl px-4 sm:px-5 py-14 sm:py-24 text-center">
        <p className="text-3xl sm:text-4xl font-bold tracking-tight text-nz-tinta">
          {saudacao(agoraMin)}, {nome || 'campeão'}.
        </p>
        <p className="mt-2 text-xs font-medium tracking-wide text-nz-tinta-fraca">
          {fogo?.dias > 0 ? `${fogo.dias} ${fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva · ` : ''}
          {feitas.length} de {tarefas.length} passos hoje
        </p>

        {completou || !foco ? (
          <div className="mt-16 flex flex-col items-center gap-5">
            <span
              className="w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-b from-amber-400 to-yellow-500 animate-bounce"
              style={{ boxShadow: '0 10px 0 0 #b45309, inset 0 6px 12px rgba(255,255,255,0.45), inset 0 -8px 18px rgba(2,6,23,0.18)' }}
            >
              <Trophy className="w-16 h-16 text-white drop-shadow" fill="currentColor" strokeWidth={1.2} />
            </span>
            <p className="text-2xl font-bold text-nz-tinta">DIA PERFEITO — BRILHANTE!</p>
            <p className="text-sm text-nz-tinta-fraca">Você subiu a jornada inteira. Amanhã o sol nasce de novo.</p>
          </div>
        ) : (
          <div className="mt-14 flex flex-col items-center">
            {/* o selo do momento: a mesma moeda da trilha, em tamanho de herói */}
            <MoedaGrande titulo={foco.titulo} perdido={estado === 'PERDIDO'} />

            <p className={`mt-8 text-[11px] font-extrabold uppercase tracking-[0.22em] ${estado === 'PERDIDO' ? 'text-nz-tinta-fraca' : estado === 'ATRASADO' ? 'text-nz-fogo' : 'text-nz-verde'}`}>
              {estado === 'PERDIDO' ? 'ainda dá pra comprovar' : estado === 'ATRASADO' ? 'tá na hora — corre' : 'o seu momento agora'}
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight text-nz-tinta max-w-lg">
              {foco.titulo}
            </h2>
            <p className="mt-2 text-sm font-bold tracking-wide text-nz-tinta-fraca">{foco.hora}</p>
            {foco.detalhe && (
              <p className="mt-5 max-w-md text-sm leading-relaxed text-nz-tinta-fraca">{foco.detalhe}</p>
            )}

            {acaoExtra && acaoExtra(foco) && (
              <a
                href={acaoExtra(foco).href}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-sky-500 hover:underline"
              ><CalendarDays className="w-3.5 h-3.5" /> {acaoExtra(foco).rotulo}</a>
            )}

            <button
              type="button"
              onClick={() => onTarefa(foco)}
              className="mt-10 w-full max-w-sm inline-flex items-center justify-center gap-2.5 rounded-2xl bg-nz-verde hover:bg-nz-verde-claro active:translate-y-[3px] text-white text-base font-extrabold tracking-wide py-4 transition-transform"
              style={{ boxShadow: '0 6px 0 0 #14532d' }}
            ><Play className="w-5 h-5" fill="currentColor" strokeWidth={0} /> Viver esse momento</button>
          </div>
        )}

        {feitas.length > 0 && (
          <div className="mt-16">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-nz-tinta-fraca/70">o seu rastro de hoje</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {[...feitas].reverse().map((t) => {
                const { Icone, grad, borda } = seloDa(t.titulo);
                return (
                  <span
                    key={t.id}
                    title={`${t.hora} — ${t.titulo}`}
                    className="inline-flex items-center gap-2 rounded-full border border-nz-borda text-nz-tinta-fraca text-[11px] font-bold pl-1.5 pr-3 py-1.5"
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-b ${grad}`}
                      style={{ boxShadow: `0 2px 0 0 ${borda}` }}
                    >
                      <Icone className="w-3 h-3 text-white" fill="currentColor" strokeWidth={1.4} />
                    </span>
                    {t.hora}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpandida(true)}
          className="mt-14 text-[11px] font-extrabold uppercase tracking-[0.16em] text-nz-tinta-fraca hover:text-nz-tinta transition-colors"
        >
          expandir a jornada · {pendentes.length} {pendentes.length === 1 ? 'passo' : 'passos'} pela frente
        </button>
      </div>
    </div>
  );
}
