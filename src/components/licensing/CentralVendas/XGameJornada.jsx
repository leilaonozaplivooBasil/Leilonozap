import React, { useState } from 'react';

// 🗺️ X-GAME — O MOMENTO + A JORNADA (ordem do dono, 05/09):
//   • O dia começa LIMPO: só a saudação e A TAREFA DO MOMENTO — um momento
//     por vez, sem a porrada de coisa na cara ("meu dia começa vazio").
//   • Conforme faz, vai deixando um RASTRO embaixo (as feitas descem).
//   • Quer ver tudo? EXPANDE a jornada (como um canvas) — e ela é DE BAIXO
//     PRA CIMA: o dia SOBE, do amanhecer (embaixo) ao troféu (no topo).
//   • Clicou numa parada da jornada → recolhe e mostra SÓ ELA (o momento).

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

const OFFSETS = [0, -72, 0, 72]; // o zigue-zague da trilha

export default function XGameJornada({ tarefas = [], nome, pct = 0, fogo, onTarefa }) {
  const [expandida, setExpandida] = useState(false);
  const [focoId, setFocoId] = useState(null);

  const feitas = tarefas.filter((t) => t.feito);
  const pendentes = tarefas.filter((t) => !t.feito);
  const atual = tarefas.find((t) => !t.feito && (t.estado?.id === 'AGORA' || t.estado?.id === 'ATRASADO')) || pendentes[0] || null;
  const foco = tarefas.find((x) => x.id === focoId && !x.feito) || atual;
  const completou = pct >= 100;

  // ══ A JORNADA EXPANDIDA — de baixo pra cima: o dia SOBE ══
  if (expandida) {
    const subida = [...tarefas].reverse(); // último horário no topo, amanhecer embaixo
    return (
      <div className="relative overflow-hidden rounded-2xl border border-nz-borda bg-gradient-to-b from-indigo-200 via-sky-100 to-amber-100">
        {/* no topo (o fim do dia) mora o troféu; embaixo, o sol nasce */}
        <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-300/50 blur-3xl" />
        <div className="relative flex items-center justify-between px-4 pt-3">
          <p className="text-xs font-bold text-gray-700">🗺️ A jornada de hoje — o dia sobe</p>
          <button type="button" onClick={() => setExpandida(false)} className="text-[11px] font-bold text-gray-500 hover:text-gray-800">▾ recolher</button>
        </div>

        <div className="relative flex flex-col items-center gap-5 px-4 pb-6 pt-3">
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-white/80" />

          {/* a chegada, lá no alto */}
          <div className="relative flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${completou ? 'bg-amber-400 ring-4 ring-amber-200 animate-bounce' : 'bg-white/70 ring-2 ring-white'}`}>
              {completou ? '🏆' : '🏁'}
            </div>
            <p className="mt-1 text-[10px] font-bold text-gray-700">{completou ? 'DIA PERFEITO!' : 'o topo do dia'}</p>
          </div>

          {subida.map((t, i) => {
            const est = t.estado?.id;
            const ehAtual = atual && t.id === atual.id;
            return (
              <div key={t.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
                {ehAtual && (
                  <span className="absolute -top-6 whitespace-nowrap rounded-full bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 shadow">VOCÊ ESTÁ AQUI</span>
                )}
                <button
                  type="button"
                  onClick={() => { setFocoId(t.id); setExpandida(false); }}
                  title={`${t.hora} — ${t.titulo}`}
                  className={[
                    'relative w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md transition-transform hover:scale-110',
                    t.feito ? 'bg-emerald-500 ring-4 ring-emerald-200' : '',
                    !t.feito && ehAtual ? 'bg-white ring-4 ring-amber-400 animate-pulse' : '',
                    !t.feito && est === 'PERDIDO' ? 'bg-gray-200 ring-2 ring-gray-300 grayscale opacity-75' : '',
                    !t.feito && !ehAtual && est !== 'PERDIDO' ? 'bg-white/90 ring-2 ring-white' : '',
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

          {/* o amanhecer, na base de tudo */}
          <p className="text-2xl">🌄</p>
        </div>
      </div>
    );
  }

  // ══ O MOMENTO — o dia limpo: só a tarefa da vez + o rastro do que já foi ══
  return (
    <div className="relative overflow-hidden rounded-2xl border border-nz-borda bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100">
      <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-300/50 blur-3xl" />

      <div className="relative px-5 py-6 text-center space-y-4">
        {/* a recepção do dia */}
        <div>
          <p className="text-lg font-bold text-gray-800">{saudacao()}, {nome || 'campeão'}! {completou ? '💎' : '☀️'}</p>
          <p className="text-[11px] text-gray-500">
            {fogo?.dias > 0 ? `🔥 ${fogo.dias} ${fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva · ` : ''}
            {feitas.length} de {tarefas.length} passos dados hoje
          </p>
        </div>

        {/* A TAREFA DO MOMENTO */}
        {completou || !foco ? (
          <div className="py-4 space-y-2">
            <p className="text-6xl animate-bounce">🏆</p>
            <p className="text-base font-bold text-gray-800">DIA PERFEITO — BRILHANTE! PARABÉNS!</p>
            <p className="text-[11px] text-gray-500">Você subiu a jornada inteira. Descansa: amanhã o sol nasce de novo.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-xs rounded-2xl bg-white/80 backdrop-blur shadow-lg px-5 py-5 space-y-3">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow ${foco.estado?.id === 'PERDIDO' ? 'bg-gray-100 ring-4 ring-gray-200' : 'bg-amber-50 ring-4 ring-amber-300 animate-pulse'}`}>
              {emojiDa(foco.titulo)}
            </div>
            <div>
              <p className="text-[11px] font-bold text-nz-verde uppercase tracking-wide">
                {foco.estado?.id === 'PERDIDO' ? 'ainda dá pra comprovar' : foco.estado?.id === 'ATRASADO' ? 'tá na hora — corre!' : 'o seu momento agora'}
              </p>
              <p className="text-sm font-bold text-gray-800">{foco.hora} · {foco.titulo}</p>
              {foco.detalhe && <p className="text-[11px] text-gray-500 mt-1">{foco.detalhe}</p>}
            </div>
            <button
              type="button"
              onClick={() => onTarefa(foco)}
              className="w-full rounded-xl bg-nz-verde hover:bg-nz-verde-claro text-white text-sm font-bold py-3"
            >✨ Viver esse momento</button>
          </div>
        )}

        {/* o rastro do dia — o que você já subiu */}
        {feitas.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">o seu rastro de hoje</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[...feitas].reverse().map((t) => (
                <span key={t.id} title={`${t.hora} — ${t.titulo}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-1">
                  {emojiDa(t.titulo)} {t.hora} ✔
                </span>
              ))}
            </div>
          </div>
        )}

        {/* expandir a jornada, se quiser ver o mapa todo */}
        <button type="button" onClick={() => setExpandida(true)} className="text-[11px] font-bold text-gray-500 hover:text-gray-800">
          🗺️ expandir a jornada ({pendentes.length} {pendentes.length === 1 ? 'passo' : 'passos'} pela frente)
        </button>
      </div>
    </div>
  );
}
