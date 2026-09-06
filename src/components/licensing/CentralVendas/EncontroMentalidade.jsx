import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Brain, Play, Pause, SkipForward, Sparkles, Presentation, X, ChevronLeft, ChevronRight, Send, Loader2, Users, CheckCheck, RotateCcw } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { segundaDaSemana, proximaSegunda } from '@/lib/xperformance';
import {
  BLOCOS, MINUTOS_TOTAL, cronometroInicial, iniciarBloco, pausar, avancar, estadoDoCronometro, fmtTempo,
  pautasDoTexto, promptDoRoteiro, SCHEMA_ROTEIRO, roteiroLocal, normalizarRoteiro,
  sugerirResponsavel, sextaDaSemana, demandaDoTopico, producaoDaSemana, slidesDoEncontro,
} from '@/lib/encontro';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { mentalidadeDe } from '@/lib/mentalidades';
import { faseDoMes } from '@/lib/documentoOficial';
import { PROGRAMA_PADRAO, programaJunto, rotuloDoMes } from '@/lib/programaMentoria';
import { mesDe } from '@/lib/metasPessoa';

// 🧠 O ENCONTRO DA MENTALIDADE — a segunda-feira num espaço só (dono, 06/09/2026).
//
// "Um lugar estratégico, não na parte administrativa, junto com os 8 Hábitos.
// Quando eu clicar: a apresentação da reunião com o tópico. Uma IA pra eu
// digitar as pautas e ela gerar o tópico. O cronômetro: 15 de leitura, 45 de
// treinamento, 2 horas de reunião estratégica. E conforme a reunião vai
// acontecendo, as pautas já vão direcionando pra cada um as demandas, gerando
// no painel de cada um, numa visão executiva de produção pra ser concluído
// durante a semana. Um espaço só, não três."
//
// A tela, de cima pra baixo:
//   1. o cabeçalho — a segunda, a fase do ciclo, o tema, quem conduz e quem
//      treina, e o botão APRESENTAR (tela cheia, com o cronômetro grande);
//   2. o cronômetro — os três blocos, começa/pausa/próximo; o estado vai pro
//      banco e vale em qualquer aparelho;
//   3. as pautas → o tópico — digita, a IA gera (ou a régua local, quando a IA
//      não está ligada); leitura, treinamento e os tópicos da reunião;
//   4. direcionar — cada tópico vira demanda pra alguém, com prazo até sexta,
//      e cai RECEBIDA no Painel Corporativo da pessoa (xperf_demandas);
//   5. a visão executiva — o que saiu desta reunião e como está em cada um.

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-white/40';
const fmtDia = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
};
const nomeCurto = (n) => String(n || '').split(' ')[0];

/** ⏱️ o anel do bloco atual */
function Anel({ pct, cor, children }) {
  const r = 54; const c = 2 * Math.PI * r;
  return (
    <div className="relative w-[136px] h-[136px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={cor} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export default function EncontroMentalidade({ currentUser, hojeISO, podeConduzir = false }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const dataEncontro = useMemo(() => segundaDaSemana(hoje), [hoje]);
  const mes = mesDe(dataEncontro);
  const fase = faseDoMes(mes);

  const [carregando, setCarregando] = useState(true);
  const [encontro, setEncontro] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [programaBanco, setProgramaBanco] = useState([]);
  const [demandas, setDemandas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [cards, setCards] = useState([]);
  const [pautas, setPautas] = useState('');
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [apresentando, setApresentando] = useState(false);
  const [slide, setSlide] = useState(0);
  const [agora, setAgora] = useState(() => new Date().toISOString());
  const [escolhas, setEscolhas] = useState({}); // por tópico: {pessoa, prazo, hora, titulo}
  const [livre, setLivre] = useState({ titulo: '', pessoa: '', prazo: '', hora: '18:00' });

  // o relógio da tela: só pra desenhar; a verdade do tempo está no banco
  useEffect(() => { const t = setInterval(() => setAgora(new Date().toISOString()), 1000); return () => clearInterval(t); }, []);

  const carregar = useCallback(async () => {
    const [enc, u, p, pr] = await Promise.all([
      supabase.from('xperf_encontros').select('*').eq('data', dataEncontro).maybeSingle(),
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.from('xgame_participantes').select('user_id,funcao_titulo,cargo').eq('ativo', true),
      supabase.from('xperf_programa').select('*').order('ordem'),
    ]);
    setEncontro(enc.data || null);
    setUsuarios(u.data || []);
    setParticipantes(p.data || []);
    setProgramaBanco(pr.data || []);
    if (enc.data?.pautas != null) setPautas(enc.data.pautas);
    if (enc.data?.id) {
      const d = await supabase.from('xperf_demandas').select('*').eq('encontro_id', enc.data.id).order('created_at');
      setDemandas(d.data || []);
      const ids = (d.data || []).map((x) => x.tarefa_id).filter(Boolean);
      const cids = (d.data || []).map((x) => x.card_id).filter(Boolean);
      const [t, c] = await Promise.all([
        ids.length ? supabase.from('metodo_tarefas').select('id,feito,conferido,pronto_em,data').in('id', ids) : Promise.resolve({ data: [] }),
        cids.length ? supabase.from('metodo_quadro').select('id,coluna').in('id', cids) : Promise.resolve({ data: [] }),
      ]);
      setTarefas(t.data || []); setCards(c.data || []);
    } else { setDemandas([]); setTarefas([]); setCards([]); }
    setCarregando(false);
  }, [dataEncontro]);
  useEffect(() => { carregar(); }, [carregar]);

  // 👥 o time com a função de cada um (posição do painel + função escolhida/sugerida)
  const time = useMemo(() => timeCorporativo(usuarios).map((p) => {
    const part = participantes.find((x) => x.user_id === p.id);
    const { funcao } = funcaoDaPessoaComOrigem({ funcaoTitulo: part?.funcao_titulo, nivel: p.nivel, nome: p.nome });
    return { ...p, funcaoId: funcao?.id || null, funcaoCurta: funcao?.curto || funcao?.nome || null };
  }), [usuarios, participantes]);
  const pessoaDe = (id) => time.find((p) => p.id === id) || null;

  const programa = useMemo(() => programaJunto(PROGRAMA_PADRAO, programaBanco), [programaBanco]);
  const mesDoPrograma = programa.find((m) => m.mes === mes) || null;
  const temaDoMes = encontro?.tema || (mesDoPrograma ? `${mesDoPrograma.tema}` : '');
  const roteiro = encontro?.roteiro || null;
  const cron = encontro?.cronometro && Object.keys(encontro.cronometro).length ? encontro.cronometro : cronometroInicial();
  const estado = estadoDoCronometro(cron, agora);
  const conduzidoPor = encontro?.conduzido_por_nome ?? (currentUser?.full_name || currentUser?.nickname || '');
  const treinamentoPor = encontro?.treinamento_por_nome || '';

  // 💾 gravar o encontro (uma linha por segunda; a primeira gravação cria)
  const salvarEncontro = async (patch) => {
    const linha = { data: dataEncontro, trilha: encontro?.trilha || 'diretor', blocos: encontro?.blocos || {}, ...patch, updated_at: new Date().toISOString(), criado_por_id: encontro?.criado_por_id || currentUser?.id || null, criado_por_nome: encontro?.criado_por_nome || currentUser?.full_name || null };
    const { data, error } = await supabase.from('xperf_encontros').upsert(linha, { onConflict: 'data' }).select();
    if (error) { toast.error('Não gravou o encontro'); return null; }
    const salvo = Array.isArray(data) ? data[0] : data;
    setEncontro((e) => ({ ...(e || {}), ...linha, ...(salvo || {}) }));
    return salvo || linha;
  };

  // ⏱️ o cronômetro
  const mexerNoTempo = async (fn) => { const novo = fn(cron, new Date().toISOString()); await salvarEncontro({ cronometro: novo }); };
  const comecar = () => mexerNoTempo((c, t) => iniciarBloco(c, estado.atual?.id || estado.proximo?.id || BLOCOS[0].id, t));
  const pausarAgora = () => mexerNoTempo((c, t) => pausar(c, t));
  const proximoBloco = () => mexerNoTempo((c, t) => avancar(c, t));
  const zerar = () => { if (window.confirm('Zerar o cronômetro deste encontro?')) salvarEncontro({ cronometro: cronometroInicial() }); };

  // ✨ as pautas viram o tópico: pela IA, ou pela régua local
  const gerarTopico = async () => {
    const lista = pautasDoTexto(pautas);
    if (!lista.length) { toast.error('Digite as pautas primeiro — uma por linha.'); return; }
    setGerando(true);
    const contexto = { pautas: lista, mes, tema: temaDoMes, habitosDoMes: mesDoPrograma?.habitos || [], time, conduzidoPor, treinamentoPor };
    let novo = null; let origem = 'local';
    try {
      const r = await plataforma.integrations.Core.InvokeLLM({ prompt: promptDoRoteiro(contexto), response_json_schema: SCHEMA_ROTEIRO, max_tokens: 3000 });
      if (r && r.ok !== false && (r.reuniao || r.tema)) { novo = normalizarRoteiro(r, contexto); origem = 'ia'; }
      else if (r?.needs_key) toast.message('IA não conectada — o tópico saiu pela régua da casa.');
      else toast.message('A IA não respondeu — o tópico saiu pela régua da casa.');
    } catch { toast.message('A IA não respondeu — o tópico saiu pela régua da casa.'); }
    if (!novo) novo = { ...roteiroLocal(contexto), origem: 'local' };
    await salvarEncontro({ pautas, roteiro: novo, roteiro_origem: origem, tema: temaDoMes || novo.tema, conduzido_por_nome: conduzidoPor, treinamento_por_nome: treinamentoPor });
    setGerando(false);
    toast.success(origem === 'ia' ? `Tópico gerado pela IA: ${novo.reuniao.topicos.length} tópicos` : `Tópico montado: ${novo.reuniao.topicos.length} tópicos`);
  };

  // 📥 direcionar: a demanda cai RECEBIDA no Painel Corporativo da pessoa
  const direcionar = async (topico, i) => {
    const e = escolhas[i] || {};
    const pessoaId = e.pessoa || sugerirResponsavel(topico, time)?.id;
    const p = pessoaDe(pessoaId);
    if (!p) { toast.error('Escolha quem leva esta demanda.'); return; }
    let enc = encontro?.id ? encontro : await salvarEncontro({});
    const linha = demandaDoTopico({ ...topico, demanda: e.titulo || topico.demanda }, {
      pessoaId: p.id, pessoaNome: p.nome, criadoPorId: currentUser?.id, criadoPorNome: currentUser?.full_name || null,
      encontroId: enc?.id || null, origem: 'encontro', prazoDia: e.prazo || sextaDaSemana(dataEncontro), prazoHora: e.hora || '18:00',
    });
    if (!linha) return;
    setSalvando(true);
    const { data, error } = await supabase.from('xperf_demandas').insert(linha).select();
    setSalvando(false);
    if (error) { toast.error('Não direcionou — tenta de novo'); return; }
    setDemandas((l) => [...l, ...(Array.isArray(data) ? data : [data])]);
    toast.success(`No Painel Corporativo de ${nomeCurto(p.nome)}: "${linha.titulo}" · até ${fmtDia(String(linha.prazo_em).slice(0, 10)).split(',')[1]?.trim() || 'sexta'}`);
  };
  const direcionarLivre = async () => {
    if (!livre.titulo.trim()) return;
    await direcionar({ titulo: livre.titulo.trim(), demanda: livre.titulo.trim() }, 'livre');
    setLivre((l) => ({ ...l, titulo: '' }));
  };
  useEffect(() => { setEscolhas((e) => ({ ...e, livre: { pessoa: livre.pessoa, prazo: livre.prazo, hora: livre.hora, titulo: livre.titulo } })); }, [livre]);

  const producao = useMemo(() => producaoDaSemana({ demandas, tarefas, cards, hojeISO: hoje }), [demandas, tarefas, cards, hoje]);
  const slides = useMemo(() => slidesDoEncontro({ data: fmtDia(dataEncontro), roteiro, mes, conduzidoPor, treinamentoPor, demandas }), [dataEncontro, roteiro, mes, conduzidoPor, treinamentoPor, demandas]);

  // 🎞️ a apresentação: setas e ESC
  useEffect(() => {
    if (!apresentando) return undefined;
    const onKey = (ev) => {
      if (ev.key === 'Escape') setApresentando(false);
      if (ev.key === 'ArrowRight' || ev.key === ' ') setSlide((s) => Math.min(slides.length - 1, s + 1));
      if (ev.key === 'ArrowLeft') setSlide((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apresentando, slides.length]);
  const abrirApresentacao = () => { const i = slides.findIndex((s) => s.bloco === estado.atual?.id); setSlide(i >= 0 ? i : 0); setApresentando(true); };

  const ehHoje = dataEncontro === hoje;
  const corAtual = estado.atual?.cor || 'rgba(255,255,255,0.35)';

  if (carregando) return <p className="text-[12px] text-white/50 py-6 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> abrindo o encontro…</p>;

  return (
    <div className="space-y-4 text-white" data-teste="encontro" data-data={dataEncontro}>
      {/* ── 1. o cabeçalho ── */}
      <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(217,70,239,0.12) 60%, rgba(0,0,0,0))' }}>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className={titulo}><Brain className="w-3 h-3 inline mr-1" />Encontro da Mentalidade · Executivo · Diretor · CEO</p>
            <p className="mt-1 text-[18px] sm:text-[22px] font-extrabold leading-tight" data-teste="encontro-titulo">{fmtDia(dataEncontro)}{' '}{ehHoje ? <span className="text-nz-verde text-[12px] font-bold ml-2">é hoje</span> : <span className="text-white/35 text-[12px] font-medium ml-2">próxima segunda {fmtDia(proximaSegunda(hoje)).split(',')[1]}</span>}</p>
            <p className="text-[12px] text-white/60 mt-0.5">{fase ? <><span className="text-white/85 font-bold">{fase.fase}</span> · {fase.foco}</> : 'fora do ciclo oficial'}{mesDoPrograma ? <span className="text-white/40"> · {rotuloDoMes(mes)}: {mesDoPrograma.tema} (H{mesDoPrograma.habitos.join(', H')})</span> : null}</p>
          </div>
          <Button onClick={abrirApresentacao} className="bg-white text-black hover:bg-white/90 h-9 font-extrabold" data-teste="apresentar"><Presentation className="w-4 h-4 mr-1.5" /> Apresentar</Button>
        </div>
        <div className="mt-3 grid sm:grid-cols-3 gap-2">
          <label className="text-[10px] text-white/45 uppercase tracking-wider">tema do encontro
            <Input defaultValue={temaDoMes} key={`tema-${encontro?.id || 'novo'}`} placeholder={mesDoPrograma?.tema || 'o tema de hoje'} disabled={!podeConduzir} onBlur={(ev) => { if (ev.target.value !== (encontro?.tema || '')) salvarEncontro({ tema: ev.target.value }); }} className="mt-0.5 h-8 border-white/15 bg-white/[0.06] text-white text-[12px] normal-case" data-teste="tema" />
          </label>
          <label className="text-[10px] text-white/45 uppercase tracking-wider">quem conduz
            <Input defaultValue={conduzidoPor} key={`cond-${encontro?.id || 'novo'}`} disabled={!podeConduzir} onBlur={(ev) => salvarEncontro({ conduzido_por_nome: ev.target.value })} className="mt-0.5 h-8 border-white/15 bg-white/[0.06] text-white text-[12px] normal-case" data-teste="conduz" />
          </label>
          <label className="text-[10px] text-white/45 uppercase tracking-wider">quem dá o treinamento (45 min)
            <Input defaultValue={treinamentoPor} key={`trein-${encontro?.id || 'novo'}`} placeholder="nome de quem treina" disabled={!podeConduzir} onBlur={(ev) => salvarEncontro({ treinamento_por_nome: ev.target.value })} className="mt-0.5 h-8 border-white/15 bg-white/[0.06] text-white text-[12px] normal-case" data-teste="treina" />
          </label>
        </div>
      </div>

      {/* ── 2. o cronômetro ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="cronometro" data-bloco={estado.atual?.id || ''} data-rodando={estado.rodando ? 'sim' : 'nao'}>
        <div className="flex items-center gap-4 flex-wrap">
          <Anel pct={estado.atual ? estado.atual.pct : estado.terminado ? 1 : 0} cor={corAtual}>
            <p className="text-[22px] font-extrabold tabular-nums leading-none" data-teste="tempo-bloco">{estado.atual ? (estado.atual.estourou ? `+${fmtTempo(estado.atual.estouro)}` : fmtTempo(estado.atual.restante)) : estado.terminado ? 'fim' : fmtTempo(BLOCOS[0].minutos * 60)}</p>
            <p className="text-[9px] text-white/45 uppercase tracking-wider mt-1">{estado.atual ? estado.atual.nome : estado.terminado ? 'encontro fechado' : 'pronto pra começar'}</p>
          </Anel>
          <div className="flex-1 min-w-[220px]">
            <div className="flex gap-1" data-teste="blocos">
              {estado.blocos.map((b) => (
                <div key={b.id} className="flex-1 min-w-0" data-bloco={b.id} data-feito={b.feito ? 'sim' : 'nao'} data-estourou={b.estourou ? 'sim' : 'nao'}>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full" style={{ width: `${Math.round(b.pct * 100)}%`, background: b.estourou ? '#ef4444' : b.cor, transition: 'width 0.9s linear' }} />
                  </div>
                  <p className={`mt-1 text-[11px] font-bold truncate ${b.rodando ? 'text-white' : b.feito ? 'text-white/60' : 'text-white/40'}`}>{b.n}. {b.nome} <span className="font-medium text-white/40">{b.minutos} min</span></p>
                  <p className="text-[10px] text-white/40 tabular-nums">{b.decorrido ? `${fmtTempo(b.decorrido)}${b.estourou ? ` · estourou ${fmtTempo(b.estouro)}` : ''}` : b.descricao}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {podeConduzir && !estado.terminado && (estado.rodando
                ? <Button size="sm" onClick={pausarAgora} className="bg-white/10 hover:bg-white/20 text-white h-8" data-teste="pausar"><Pause className="w-3.5 h-3.5 mr-1" /> pausar</Button>
                : <Button size="sm" onClick={comecar} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 font-bold" data-teste="comecar"><Play className="w-3.5 h-3.5 mr-1" /> {estado.comecou ? `retomar ${estado.atual?.nome?.toLowerCase() || ''}` : `começar: ${BLOCOS[0].nome.toLowerCase()} (${BLOCOS[0].minutos} min)`}</Button>)}
              {podeConduzir && estado.comecou && !estado.terminado && <Button size="sm" onClick={proximoBloco} className="bg-white/10 hover:bg-white/20 text-white h-8" data-teste="proximo"><SkipForward className="w-3.5 h-3.5 mr-1" /> {estado.proximo ? `próximo: ${estado.proximo.nome.toLowerCase()} (${estado.proximo.minutos} min)` : 'fechar o encontro'}</Button>}
              {podeConduzir && estado.comecou && <button type="button" onClick={zerar} className="text-[11px] text-white/35 hover:text-white inline-flex items-center gap-1" data-teste="zerar"><RotateCcw className="w-3 h-3" /> zerar</button>}
              <p className="ml-auto text-[11px] text-white/45 tabular-nums">total {fmtTempo(estado.totalDecorrido)} de {MINUTOS_TOTAL / 60}h{estado.terminado ? ' · encontro fechado' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. as pautas → o tópico ── */}
      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 rounded-xl border border-white/10 p-3" style={caixa} data-teste="pautas">
          <p className={titulo}>As pautas <span className="normal-case tracking-normal text-white/30">— uma por linha</span></p>
          <Textarea value={pautas} onChange={(ev) => setPautas(ev.target.value)} disabled={!podeConduzir} rows={9} placeholder={'dite do seu jeito — a IA organiza, corrige o português e dá o tempo de cada um. ex.:\nLuciano fala sobre a meta de parceiro de compra\nAline fala sobre o financeiro, 30 min\nLuiz fala sobre o X-Game e a Top College, pelo menos 1 hora'} className="mt-1.5 border-white/15 bg-white/[0.06] text-white text-[12px] leading-relaxed" data-teste="pautas-texto" />
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {podeConduzir && <Button size="sm" onClick={gerarTopico} disabled={gerando} className="h-8 font-bold text-white" style={{ background: 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' }} data-teste="gerar-topico">{gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />} gerar o tópico com a IA</Button>}
            <span className="text-[10px] text-white/35">{pautasDoTexto(pautas).length} pauta{pautasDoTexto(pautas).length === 1 ? '' : 's'}{encontro?.roteiro_origem ? ` · tópico atual: ${encontro.roteiro_origem === 'ia' ? 'gerado pela IA' : 'régua local'}` : ''}</span>
          </div>
        </div>
        <div className="lg:col-span-3 rounded-xl border border-white/10 p-3" style={caixa} data-teste="topico">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className={titulo}>O tópico do encontro</p>
            {roteiro && <span className="text-[12px] font-extrabold text-white">{roteiro.tema}</span>}
          </div>
          {!roteiro ? (
            <p className="mt-2 text-[12px] text-white/45">Digite as pautas e gere o tópico: a leitura de 15 minutos, o treinamento de 45 e os tópicos das 2 horas de reunião, cada um com objetivo, decisão esperada, minutos e a demanda que sai dele.</p>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${BLOCOS[0].cor}` }} data-teste="topico-leitura">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">1 · Leitura · 15 min</p>
                <p className="text-[12px] font-bold text-white">{roteiro.leitura?.titulo}</p>
                <p className="text-[11px] text-white/65 mt-0.5 italic">“{roteiro.leitura?.trecho}”</p>
                <ul className="mt-1 text-[11px] text-white/60">{(roteiro.leitura?.perguntas || []).map((q) => <li key={q}>• {q}</li>)}</ul>
                {roteiro.leitura?.aplicacao && <p className="text-[11px] text-white/50 mt-0.5">→ {roteiro.leitura.aplicacao}</p>}
              </div>
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${BLOCOS[1].cor}` }} data-teste="topico-treinamento">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">2 · Treinamento · 45 min{treinamentoPor ? ` · ${treinamentoPor}` : ''}</p>
                <p className="text-[12px] font-bold text-white">{roteiro.treinamento?.tema}</p>
                <p className="text-[11px] text-white/60">{roteiro.treinamento?.objetivo}</p>
                <ol className="mt-1 text-[11px] text-white/60">{(roteiro.treinamento?.passos || []).map((q, i) => <li key={q}>{i + 1}. {q}</li>)}</ol>
                {roteiro.treinamento?.pratica && <p className="text-[11px] text-white/50 mt-0.5">prática: {roteiro.treinamento.pratica}</p>}
              </div>
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${BLOCOS[2].cor}` }} data-teste="topico-reuniao">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">3 · Reunião estratégica · 120 min · {roteiro.reuniao?.topicos?.length || 0} tópicos</p>
                <ol className="mt-1 space-y-1.5">
                  {(roteiro.reuniao?.topicos || []).map((t, i) => (
                    <li key={`${t.titulo}-${i}`} className="text-[11px]" data-teste="topico-item">
                      <p className="text-white font-bold">{i + 1}. {t.titulo} <span className="text-white/40 font-medium tabular-nums">· {t.minutos} min{t.apresentador ? ` · apresenta: ${t.apresentador}` : ''} · {mentalidadeDe(t.mentalidade)?.nome?.replace('Mentalidade do ', '')}{t.habito ? ` · H${t.habito}` : ''}</span></p>
                      <p className="text-white/60">{t.objetivo}</p>
                      {t.decisao && <p className="text-white/45">decisão: {t.decisao}</p>}
                    </li>
                  ))}
                </ol>
                {roteiro.fechamento && <p className="mt-2 text-[11px] text-white/70 italic">“{roteiro.fechamento}”</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. direcionar as demandas ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="direcionar">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={titulo}><Send className="w-3 h-3 inline mr-1" />Direcionar as demandas</p>
          <span className="text-[10px] text-white/35">· cada tópico vira demanda pra alguém e cai no Painel Corporativo da pessoa, até sexta · {demandas.length} direcionada{demandas.length === 1 ? '' : 's'}</span>
        </div>
        {!time.length && <p className="mt-2 text-[11px] text-amber-300/80">Ninguém do time corporativo (executivo ao embaixador) no painel de controle ainda.</p>}
        <ul className="mt-2 space-y-1.5">
          {(roteiro?.reuniao?.topicos || []).map((t, i) => {
            const e = escolhas[i] || {};
            const sug = sugerirResponsavel(t, time);
            const pessoa = e.pessoa || sug?.id || '';
            const ja = demandas.filter((d) => d.titulo === (e.titulo || t.demanda));
            return (
              <li key={`${t.titulo}-${i}`} className="rounded-lg border border-white/10 px-2.5 py-2 flex items-center gap-2 flex-wrap" data-teste="linha-demanda">
                <span className="text-[10px] text-white/35 tabular-nums w-5">{i + 1}.</span>
                <Input value={e.titulo ?? t.demanda} onChange={(ev) => setEscolhas((x) => ({ ...x, [i]: { ...e, titulo: ev.target.value } }))} disabled={!podeConduzir} className="h-8 flex-1 min-w-[200px] border-white/15 bg-white/[0.06] text-white text-[12px]" data-teste="demanda-titulo" />
                <select value={pessoa} onChange={(ev) => setEscolhas((x) => ({ ...x, [i]: { ...e, pessoa: ev.target.value } }))} disabled={!podeConduzir} className={campo} data-teste="demanda-pessoa">
                  <option value="">quem leva…</option>
                  {time.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.funcaoCurta ? ` · ${p.funcaoCurta}` : ''}{sug?.id === p.id ? ' (sugerido)' : ''}</option>)}
                </select>
                <input type="date" value={e.prazo || sextaDaSemana(dataEncontro)} onChange={(ev) => setEscolhas((x) => ({ ...x, [i]: { ...e, prazo: ev.target.value } }))} disabled={!podeConduzir} className={campo} data-teste="demanda-prazo" />
                <input type="time" value={e.hora || '18:00'} onChange={(ev) => setEscolhas((x) => ({ ...x, [i]: { ...e, hora: ev.target.value } }))} disabled={!podeConduzir} className={campo} />
                {podeConduzir && <Button size="sm" onClick={() => direcionar(t, i)} disabled={salvando || !pessoa} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 font-bold" data-teste="demanda-direcionar"><Send className="w-3.5 h-3.5 mr-1" /> pro painel {pessoa ? `de ${nomeCurto(pessoaDe(pessoa)?.nome)}` : ''}</Button>}
                {ja.length > 0 && <span className="text-[10px] text-nz-verde font-bold inline-flex items-center gap-1"><CheckCheck className="w-3 h-3" /> {ja.map((d) => nomeCurto(d.pessoa_nome)).join(', ')}</span>}
              </li>
            );
          })}
        </ul>
        {podeConduzir && (
          <div className="mt-2 rounded-lg border border-dashed border-white/15 px-2.5 py-2 flex items-center gap-2 flex-wrap" data-teste="demanda-livre">
            <span className="text-[10px] text-white/35">+ demanda que surgiu na hora</span>
            <Input value={livre.titulo} onChange={(ev) => setLivre((l) => ({ ...l, titulo: ev.target.value }))} onKeyDown={(ev) => { if (ev.key === 'Enter') direcionarLivre(); }} placeholder="ex.: Mandar a proposta pro fornecedor da lista nova" className="h-8 flex-1 min-w-[200px] border-white/15 bg-white/[0.06] text-white text-[12px]" data-teste="livre-titulo" />
            <select value={livre.pessoa} onChange={(ev) => setLivre((l) => ({ ...l, pessoa: ev.target.value }))} className={campo} data-teste="livre-pessoa">
              <option value="">quem leva…</option>
              {time.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.funcaoCurta ? ` · ${p.funcaoCurta}` : ''}</option>)}
            </select>
            <input type="date" value={livre.prazo || sextaDaSemana(dataEncontro)} onChange={(ev) => setLivre((l) => ({ ...l, prazo: ev.target.value }))} className={campo} />
            <Button size="sm" onClick={direcionarLivre} disabled={salvando || !livre.titulo.trim() || !livre.pessoa} className="bg-white/10 hover:bg-white/20 text-white h-8" data-teste="livre-direcionar"><Send className="w-3.5 h-3.5 mr-1" /> direcionar</Button>
          </div>
        )}
      </div>

      {/* ── 5. a visão executiva da semana ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="visao-executiva">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={titulo}><Users className="w-3 h-3 inline mr-1" />Visão executiva da semana</p>
          <span className="text-[10px] text-white/35">· o que saiu deste encontro e como está em cada um</span>
          <span className="ml-auto text-[12px] font-extrabold tabular-nums" data-teste="producao-total">{producao.concluidas} de {producao.total} <span className="text-white/40 font-medium">concluídas · {producao.pct}%</span></span>
        </div>
        {producao.total === 0 ? (
          <p className="mt-2 text-[11px] text-white/40">Nenhuma demanda direcionada ainda neste encontro.</p>
        ) : (
          <ul className="mt-2 space-y-1.5" data-teste="producao-pessoas">
            {producao.pessoas.map((p) => (
              <li key={p.pessoaId} className="rounded-lg border border-white/10 px-2.5 py-2" data-pessoa={p.pessoaId}>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-bold text-white">{p.nome}</span>
                  <span className="text-white/40">{pessoaDe(p.pessoaId)?.funcaoCurta || ''}</span>
                  <span className="ml-auto tabular-nums text-white/70">{p.concluidas}/{p.total}{p.recebidas ? <span className="text-amber-300/80"> · {p.recebidas} sem agendar</span> : null}{p.atrasadas ? <span className="text-red-300"> · {p.atrasadas} atrasada{p.atrasadas > 1 ? 's' : ''}</span> : null}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full" style={{ width: `${p.pct}%`, background: 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' }} /></div>
                <ul className="mt-1 text-[10px] text-white/55 space-y-0.5">
                  {p.itens.map((d) => <li key={d.id} className="flex gap-2"><span className={`shrink-0 ${d.estado.cor}`}>{d.estado.rotulo}</span><span className="truncate">{d.titulo}</span></li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 🎞️ a apresentação em tela cheia ── */}
      {apresentando && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: 'var(--xeos-preto, #00020C)' }} data-teste="apresentacao" data-slide={slides[slide]?.id}>
          <div className="flex items-center gap-3 px-4 sm:px-8 pt-4">
            <p className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase">Encontro da Mentalidade · {fmtDia(dataEncontro)}</p>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-[26px] sm:text-[34px] font-extrabold tabular-nums leading-none" style={{ color: estado.atual?.estourou ? '#f87171' : corAtual }} data-teste="apresentacao-tempo">{estado.atual ? (estado.atual.estourou ? `+${fmtTempo(estado.atual.estouro)}` : fmtTempo(estado.atual.restante)) : estado.terminado ? 'fim' : '—'}</p>
                <p className="text-[10px] text-white/45 uppercase tracking-wider">{estado.atual ? `${estado.atual.n}. ${estado.atual.nome}` : 'cronômetro parado'}</p>
              </div>
              {podeConduzir && !estado.terminado && (estado.rodando
                ? <button type="button" onClick={pausarAgora} className="rounded-full border border-white/20 p-2 hover:bg-white/10" aria-label="pausar"><Pause className="w-4 h-4" /></button>
                : <button type="button" onClick={comecar} className="rounded-full border border-white/20 p-2 hover:bg-white/10" aria-label="começar"><Play className="w-4 h-4" /></button>)}
              {podeConduzir && estado.comecou && !estado.terminado && <button type="button" onClick={proximoBloco} className="rounded-full border border-white/20 p-2 hover:bg-white/10" aria-label="próximo bloco"><SkipForward className="w-4 h-4" /></button>}
              <button type="button" onClick={() => setApresentando(false)} className="rounded-full border border-white/20 p-2 hover:bg-white/10" aria-label="fechar apresentação" data-teste="apresentacao-fechar"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center px-6 sm:px-16 py-6 overflow-y-auto">
            {slides[slide] && (
              <div className="max-w-4xl w-full">
                {slides[slide].bloco && <p className="text-[11px] font-bold tracking-[0.3em] uppercase mb-3" style={{ color: BLOCOS.find((b) => b.id === slides[slide].bloco)?.cor }}>{BLOCOS.find((b) => b.id === slides[slide].bloco)?.n}. {BLOCOS.find((b) => b.id === slides[slide].bloco)?.nome}</p>}
                <h2 className="text-[30px] sm:text-[48px] font-extrabold leading-[1.05] tracking-tight" data-teste="slide-titulo">{slides[slide].titulo}</h2>
                {slides[slide].sub && <p className="mt-2 text-[14px] sm:text-[18px] text-white/55">{slides[slide].sub}</p>}
                <div className="mt-6 space-y-3">
                  {slides[slide].corpo.map((linha, i) => <p key={i} className={`leading-snug ${i === 0 ? 'text-[18px] sm:text-[26px] text-white/90' : 'text-[15px] sm:text-[20px] text-white/70'}`}>{linha}</p>)}
                </div>
                {slides[slide].rodape && <p className="mt-8 text-[12px] text-white/35 uppercase tracking-wider">{slides[slide].rodape}</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 sm:px-8 pb-4">
            <button type="button" onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0} className="rounded-full border border-white/20 p-2 hover:bg-white/10 disabled:opacity-30" aria-label="anterior" data-teste="slide-anterior"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 flex gap-1">{slides.map((s, i) => <button key={s.id} type="button" onClick={() => setSlide(i)} className={`h-1.5 flex-1 rounded-full ${i === slide ? 'bg-white' : i < slide ? 'bg-white/40' : 'bg-white/15'}`} aria-label={s.titulo} />)}</div>
            <p className="text-[11px] text-white/40 tabular-nums">{slide + 1}/{slides.length}</p>
            <button type="button" onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))} disabled={slide >= slides.length - 1} className="rounded-full border border-white/20 p-2 hover:bg-white/10 disabled:opacity-30" aria-label="próximo" data-teste="slide-proximo"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
