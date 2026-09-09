import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Check, BookOpen, HelpCircle, Type, Compass } from 'lucide-react';
import TiraDuvidas from '@/components/licensing/TiraDuvidas';
import MoedaPizza from '@/components/licensing/CentralVendas/MoedaPizza';
import {
  AULAS, PERGUNTAS, DICIONARIO, HABITOS, CORES_DA_TAREFA, FAIXAS, PAPEIS,
  ENDERECOS, FRASES_DO_RODAPE, MAPA_TOP_COLLEGE, DICA_TELA_INICIAL, progressoDasAulas,
} from '@/lib/guiaXGame';
import { vibrar, VIBRA_TOQUE, TOKEN_MAX, ligaDoToken, pesosDoPerfil } from '@/lib/xgame';

// 🪙 09/09/2026 — dono: "a moeda tem que aparecer aqui... como modelo, pra
// explicar o modelo, pra ensinar as pessoas — ela tem que ter algum lugar."
// A moeda CHEIA do modelo (perfil padrão), pros 5 pesos no valor MÁXIMO —
// igual ao print de prova que já foi mandado pro dono, só que agora
// morando de verdade no Guia, não só num teste local.
const PESOS_MODELO = pesosDoPerfil('estrategico');
const MOEDA_MODELO = { mvm: PESOS_MODELO.mvm, producao: PESOS_MODELO.producao, realtime: PESOS_MODELO.realtime, bonus: PESOS_MODELO.bonus, vendas: PESOS_MODELO.ptVenda };

// 🎓 COMO JOGAR — o guia do X-GAME dentro da plataforma (07/09/2026).
//
// Era um arquivo solto que alguém precisava achar e mandar. Virou página: quem
// travou abre a aba e está lá, com o Tira Dúvidas no topo pra quando o guia
// não bastar.
//
// TRÊS DECISÕES DE ACESSIBILIDADE, porque o público-alvo é gente sem
// intimidade com tela (inclusão digital, palavra do dono):
//  1. O TAMANHO DA LETRA é um botão, não uma configuração escondida. Fica
//     salvo no aparelho.
//  2. UMA AULA ABERTA POR VEZ. Oito seções abertas de uma vez viram um paredão
//     de texto que a pessoa fecha sem ler.
//  3. "LI ESTA AULA" É DELA, não do sistema: marca o que já entendeu e a barra
//     do topo mostra o quanto falta. Não vale ponto, não vira tarefa do Método
//     — o dono foi explícito: "o guia não deve virar tarefa do método".
//
// O conteúdo mora em src/lib/guiaXGame.js. Aqui só se desenha.

const CHAVE_LIDAS = 'guia_xgame_lidas';
const CHAVE_LETRA = 'guia_xgame_letra';
const LETRAS = [
  { id: 'p', rotulo: 'A', classe: 'text-[13px]' },
  { id: 'm', rotulo: 'A', classe: 'text-[15px]' },
  { id: 'g', rotulo: 'A', classe: 'text-[17px]' },
];

const ler = (chave, padrao) => {
  try { const v = JSON.parse(localStorage.getItem(chave)); return v ?? padrao; } catch { return padrao; }
};
const gravar = (chave, valor) => {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem storage */ }
};

const TONS = {
  dica: { borda: 'border-emerald-400/25', fundo: 'bg-emerald-500/[0.07]', titulo: 'text-emerald-200' },
  atencao: { borda: 'border-amber-400/25', fundo: 'bg-amber-500/[0.07]', titulo: 'text-amber-200' },
  mapa: { borda: 'border-white/12', fundo: 'bg-white/[0.04]', titulo: 'text-white/70' },
  // 🧯 08/09/2026 — "atencao" (âmbar) já servia pra alerta comum; a regra da
  // votação é mais grave que isso (zera o dia inteiro) e pediu um tom
  // próprio, mais forte — reutilizável pra qualquer outra regra do mesmo peso.
  perigo: { borda: 'border-red-500/40', fundo: 'bg-red-500/[0.10]', titulo: 'text-red-300' },
};

function Caixa({ tom = 'mapa', titulo, linhas = [] }) {
  const t = TONS[tom] || TONS.mapa;
  return (
    <div className={`rounded-xl border ${t.borda} ${t.fundo} px-3 py-2.5`}>
      <p className={`text-[11px] font-bold uppercase tracking-wide ${t.titulo} mb-1`}>{titulo}</p>
      {linhas.map((l, i) => <p key={i} className="text-white/75 leading-relaxed">{l}</p>)}
    </div>
  );
}

function Aula({ aula, aberta, onAbrir, lida, onLida }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden" data-teste={`aula-${aula.id}`}>
      <button
        type="button"
        onClick={() => { vibrar(VIBRA_TOQUE); onAbrir(aberta ? null : aula.id); }}
        aria-expanded={aberta}
        className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left hover:bg-white/[0.03]"
      >
        <span className={`shrink-0 grid place-items-center w-8 h-8 rounded-full text-[13px] font-bold ${lida ? 'bg-emerald-500/25 text-emerald-200' : 'bg-white/10 text-white/70'}`}>
          {lida ? <Check className="w-4 h-4" /> : aula.n}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-white leading-tight">{aula.titulo}</span>
          {!aberta && <span className="block text-white/45 text-[12px] mt-0.5 line-clamp-2">{aula.resumo}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-white/40 transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>

      {aberta && (
        <div className="px-3 sm:px-4 pb-4 space-y-3">
          <p className="text-white/80 leading-relaxed">{aula.resumo}</p>

          {aula.link && (
            <a href={aula.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white">
              abrir <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {aula.passos?.length > 0 && (
            <ol className="space-y-2">
              {aula.passos.map((p, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0 grid place-items-center w-5 h-5 mt-0.5 rounded-full bg-white/10 text-[11px] font-bold text-white/70">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-white/90">{p.faca}</span>
                    {p.detalhe && <span className="block text-white/50 text-[12px] mt-0.5">{p.detalhe}</span>}
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-sky-300 hover:text-sky-200 mt-0.5">
                        abrir <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {aula.habitos && (
            <div className="grid gap-1.5">
              {HABITOS.map((h) => (
                <div key={h.n} className={`flex gap-2.5 rounded-lg px-2.5 py-1.5 ${h.destaque ? 'bg-emerald-500/10 border border-emerald-400/25' : 'bg-white/[0.04]'}`}>
                  <span className="shrink-0 w-5 text-center font-bold text-white/60">{h.n}</span>
                  <span className="min-w-0">
                    <span className="font-semibold text-white">{h.nome}</span>
                    <span className="block text-white/55 text-[12px]">{h.frase}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {aula.cores && (
            <div className="grid gap-1.5">
              {CORES_DA_TAREFA.map((c) => (
                <div key={c.id} className="flex gap-2.5 items-start rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                  <span className="shrink-0 mt-1 w-3 h-3 rounded-full" style={{ background: c.cor }} aria-hidden />
                  <span className="min-w-0">
                    <span className="font-bold text-white text-[12px] tracking-wide">{c.rotulo}</span>
                    <span className="block text-white/60 text-[12px]">{c.o_que_e}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 👥 09/09/2026 — "quem é administrativo, quem é executivo" — a
              mesma matriz de src/lib/visibilidadePorPapel.js, em português
              simples, com um cartão por papel. */}
          {aula.papeis && (
            <div className="grid gap-2">
              {PAPEIS.map((p) => (
                <div key={p.id} className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
                  <p className="font-bold text-white text-[13px]">{p.rotulo}</p>
                  <p className="text-white/50 text-[12px] italic mt-0.5">{p.quemE}</p>
                  <ul className="mt-1.5 space-y-1">
                    {p.capacidades.map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-white/70 text-[12px] leading-relaxed">
                        <span className="shrink-0 text-white/30">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {aula.numeros?.map((n) => (
            <div key={n.nome} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <p className="font-bold text-white">{n.nome} <span className="font-normal text-white/45">— “{n.pergunta}”</span></p>
              <p className="text-white/70 leading-relaxed mt-0.5">{n.explica}</p>
              {n.faixas && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FAIXAS.map((f) => (
                    <span key={f.id} className="rounded-lg bg-black/25 border border-white/10 px-2 py-1 text-[12px] text-white/75">
                      {f.medalha} <strong className="text-white">{f.label}</strong> {f.intervalo}
                    </span>
                  ))}
                </div>
              )}
              {n.moedaModelo && (
                <div className="mt-3 rounded-xl bg-white p-3 sm:p-4">
                  <p className="text-[12px] font-bold text-nz-tinta">🪙 A Moeda — de onde vem cada ponto do Human Token</p>
                  <p className="text-[11px] text-nz-tinta-fraca mt-0.5">a moeda CHEIA do modelo — não é o seu progresso, é o peso máximo de cada fatia no ciclo</p>
                  <div className="mt-2">
                    <MoedaPizza componentes={MOEDA_MODELO} total={TOKEN_MAX} max={TOKEN_MAX} liga={ligaDoToken(TOKEN_MAX)} />
                  </div>
                  <p className="text-[11px] font-semibold text-nz-verde mt-2">"Recrutamos caráter e treinamos habilidade" — o MvM é portão, não só peso: abaixo de 7 trava tudo em Bronze; abaixo de 8, sem Platina.</p>
                </div>
              )}
            </div>
          ))}

          {aula.checklist && <ChecklistDoPrimeiroDia itens={aula.checklist} />}

          {aula.caixas?.map((c, i) => <Caixa key={i} {...c} />)}

          <button
            type="button"
            onClick={() => { vibrar(VIBRA_TOQUE); onLida(aula.id); }}
            data-teste={`li-${aula.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${lida ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <Check className="w-3.5 h-3.5" /> {lida ? 'aula lida' : 'li esta aula'}
          </button>
        </div>
      )}
    </section>
  );
}

// os quadradinhos do primeiro dia ficam salvos no aparelho: a pessoa vai
// marcando ao longo do dia e não perde ao trocar de tela
function ChecklistDoPrimeiroDia({ itens }) {
  const [feitos, setFeitos] = useState(() => ler('guia_xgame_primeiro_dia', []));
  const virar = (i) => setFeitos((f) => {
    const nova = f.includes(i) ? f.filter((x) => x !== i) : [...f, i];
    gravar('guia_xgame_primeiro_dia', nova);
    return nova;
  });
  return (
    <div className="space-y-1.5">
      {itens.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => { vibrar(VIBRA_TOQUE); virar(i); }}
          className="w-full flex gap-2.5 text-left rounded-lg bg-white/[0.04] hover:bg-white/[0.07] px-2.5 py-2"
        >
          <span className={`shrink-0 mt-0.5 grid place-items-center w-4 h-4 rounded border ${feitos.includes(i) ? 'bg-emerald-500 border-emerald-400' : 'border-white/30'}`}>
            {feitos.includes(i) && <Check className="w-3 h-3 text-white" />}
          </span>
          <span className={`text-[13px] ${feitos.includes(i) ? 'text-white/45 line-through' : 'text-white/80'}`}>{t}</span>
        </button>
      ))}
    </div>
  );
}

export default function GuiaXGame({ currentUser = null }) {
  const [aberta, setAberta] = useState(AULAS[0]?.id || null);
  const [lidas, setLidas] = useState(() => ler(CHAVE_LIDAS, []));
  const [letra, setLetra] = useState(() => ler(CHAVE_LETRA, 'm'));
  const [pergunta, setPergunta] = useState(null);

  const marcarLida = useCallback((id) => {
    setLidas((l) => {
      const nova = l.includes(id) ? l.filter((x) => x !== id) : [...l, id];
      gravar(CHAVE_LIDAS, nova);
      return nova;
    });
  }, []);

  useEffect(() => { gravar(CHAVE_LETRA, letra); }, [letra]);

  const progresso = useMemo(() => progressoDasAulas(lidas), [lidas]);
  const classeLetra = LETRAS.find((l) => l.id === letra)?.classe || 'text-[15px]';

  return (
    <div className={`space-y-3 ${classeLetra}`} data-teste="guia-xgame">
      {/* ── o hero: o Tira Dúvidas vem ANTES do guia, de propósito ──
          quem chega aqui geralmente já está travado em alguma coisa. Fazer a
          pessoa procurar a resposta em oito aulas antes de poder perguntar é
          desenhar pra quem não precisa de ajuda. */}
      <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.07] to-transparent p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Top College · X-EOS</p>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Guia do Usuário</h2>
            <p className="text-white/60 mt-0.5">
              Suas tarefas do dia, como marcar o que fez e o que significa cada número da sua pontuação.
            </p>
          </div>
          {/* tamanho da letra: botão à vista, não configuração escondida */}
          <div className="flex items-center gap-1 shrink-0" title="tamanho da letra">
            <Type className="w-3.5 h-3.5 text-white/35" />
            {LETRAS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLetra(l.id)}
                aria-pressed={letra === l.id}
                data-teste={`letra-${l.id}`}
                className={`w-7 h-7 rounded-lg font-bold ${l.classe} ${letra === l.id ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/50 hover:bg-white/10'}`}
              >{l.rotulo}</button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <TiraDuvidas usuario={currentUser} pagina="Guia do Usuário" />
        </div>
      </div>

      {/* quanto do guia já foi lido */}
      <div className="flex items-center gap-2.5">
        <BookOpen className="w-3.5 h-3.5 text-white/35 shrink-0" />
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-400/70 transition-all" style={{ width: `${progresso.pct}%` }} />
        </div>
        <span className="text-[11px] text-white/45 shrink-0" data-teste="progresso-aulas">{progresso.feitas} de {progresso.total} aulas</span>
      </div>

      {/* 🧭 ONDE FICA CADA COISA — o mapa das seções vizinhas, herdado da
          antiga Aula 2. Fica como CONSULTA, não como aula: quem está lendo
          isto já entrou e já está na Top College; não há passo a passo a
          seguir, só um lugar pra conferir onde mora o resto. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 space-y-2" data-teste="guia-atalhos">
        <p className="font-bold text-white flex items-center gap-1.5"><Compass className="w-4 h-4 text-white/40" /> Onde fica cada coisa</p>
        <div className="grid gap-1.5">
          {MAPA_TOP_COLLEGE.map((m) => (
            <div key={m.nome} className={`flex flex-col sm:flex-row sm:gap-3 rounded-lg px-2.5 py-1.5 ${m.destaque ? 'bg-emerald-500/10 border border-emerald-400/25' : 'bg-white/[0.04]'}`}>
              <span className="font-semibold text-white sm:w-40 shrink-0">
                {m.nome}{m.aqui && <span className="ml-1.5 text-[10px] font-normal text-white/35">você está aqui</span>}
              </span>
              <span className="text-white/60">{m.o_que_e}</span>
            </div>
          ))}
        </div>
        <Caixa tom="dica" titulo={DICA_TELA_INICIAL.titulo} linhas={DICA_TELA_INICIAL.linhas} />
      </section>

      {AULAS.map((a) => (
        <Aula key={a.id} aula={a} aberta={aberta === a.id} onAbrir={setAberta} lida={lidas.includes(a.id)} onLida={marcarLida} />
      ))}

      {/* ── perguntas que todo mundo faz ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 space-y-2" data-teste="guia-perguntas">
        <p className="font-bold text-white flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-white/40" /> Perguntas que todo mundo faz</p>
        {PERGUNTAS.map((q, i) => (
          <div key={i} className="rounded-xl bg-white/[0.04] overflow-hidden">
            <button
              type="button"
              onClick={() => setPergunta(pergunta === i ? null : i)}
              aria-expanded={pergunta === i}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/[0.04]"
            >
              <span className="flex-1 text-white/85">{q.p}</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-white/35 transition-transform ${pergunta === i ? 'rotate-180' : ''}`} />
            </button>
            {pergunta === i && <p className="px-2.5 pb-2.5 text-white/65 leading-relaxed">{q.r}</p>}
          </div>
        ))}
      </section>

      {/* ── dicionário ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4" data-teste="guia-dicionario">
        <p className="font-bold text-white mb-2">Dicionário</p>
        <div className="grid gap-1.5">
          {DICIONARIO.map((d) => (
            <div key={d.palavra} className="flex flex-col sm:flex-row sm:gap-3 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
              <span className="font-semibold text-white sm:w-44 shrink-0">{d.palavra}</span>
              <span className="text-white/60">{d.significa}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 pt-1">
        <a href={`https://${ENDERECOS.metodo}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px] text-center rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 font-bold text-white">Tarefas do dia</a>
        <a href={`https://${ENDERECOS.placar}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px] text-center rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 font-bold text-white">Placar e ranking</a>
      </div>
      <p className="text-center text-[11px] text-white/30 tracking-wide pt-1">{FRASES_DO_RODAPE}</p>
    </div>
  );
}
