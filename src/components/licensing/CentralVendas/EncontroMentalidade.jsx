import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Brain, Play, Pause, SkipForward, Sparkles, Presentation, X, ChevronLeft, ChevronRight, Send, Loader2, Users, CheckCheck, RotateCcw } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MandarDemanda from '@/components/licensing/CentralVendas/MandarDemanda';
import {
  BLOCOS, MINUTOS_TOTAL, cronometroInicial, iniciarBloco, pausar, avancar, estadoDoCronometro, fmtTempo, blocoDe, aberturaDaMentalidade,
  pautasDoTexto, promptDoRoteiro, SCHEMA_ROTEIRO, roteiroLocal, normalizarRoteiro,
  sugerirResponsavel, sextaDaSemana, demandaDoTopico, producaoDaSemana, slidesDoEncontro,
  ancoraDoEncontro, semanaVizinha, seloDaData, descartesDoRoteiro,
  normalizarTreinamento, temTreinamento, materialEhLink, treinamentoDoTexto, TREINAMENTO_VAZIO,
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
  // 📅 DIR-79 — a tela abre na segunda QUE VEM (hoje, se hoje for segunda), e
  // não na que já passou. `passoSemana` deixa andar pra trás sem perder o
  // registro da semana anterior — que é o que a troca de âncora, sozinha,
  // tornaria inalcançável de terça a sexta.
  const [passoSemana, setPassoSemana] = useState(0);
  // o que a IA inventou e foi descartado — a tela AVISA em vez de exibir
  const [descartes, setDescartes] = useState(null);
  const dataEncontro = useMemo(() => {
    let d = ancoraDoEncontro(hoje);
    for (let i = 0; i < Math.abs(passoSemana); i += 1) d = semanaVizinha(d, Math.sign(passoSemana));
    return d;
  }, [hoje, passoSemana]);
  const selo = seloDaData(dataEncontro, hoje);
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
  // 07/09 — depois de gerado, as pautas recolhem (dono: "esse comando já tem
  // que sumir… precisa ficar mais organizado") e o tópico ganha o espaço;
  // "editando" liga os campos de texto por cima do que a IA/régua rascunhou.
  const [pautasAbertas, setPautasAbertas] = useState(true);
  const [editando, setEditando] = useState(false);
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
  useEffect(() => { setPautasAbertas(!encontro?.roteiro); setEditando(false); }, [encontro?.id]);

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
  // 07/09 — os quatro blocos por NOME, não por posição: a Mentalidade entrou
  // na frente da Leitura, e código que dizia "BLOCOS[1] é o treinamento"
  // ficaria errado sem avisar.
  const blocoMentalidade = blocoDe('mentalidade');
  const blocoLeitura = blocoDe('leitura');
  const blocoTreinamento = blocoDe('treinamento');
  const blocoReuniao = blocoDe('reuniao');
  const aberturaMentalidade = useMemo(() => aberturaDaMentalidade(), []);
  const cron = encontro?.cronometro && Object.keys(encontro.cronometro).length ? encontro.cronometro : cronometroInicial();
  const estado = estadoDoCronometro(cron, agora);
  const conduzidoPor = encontro?.conduzido_por_nome ?? (currentUser?.full_name || currentUser?.nickname || '');
  const treinamentoPor = encontro?.treinamento_por_nome || '';
  // 🎓 DIR-79 — o treinamento como conteúdo do encontro (não só o nome de quem treina)
  const treinamento = useMemo(() => normalizarTreinamento(encontro?.treinamento, { por: treinamentoPor }), [encontro?.treinamento, treinamentoPor]);
  const [importando, setImportando] = useState('');

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
      // 🧯 DIR-79 — o teto subiu porque com pautas longas o JSON estourava, caía
      // no catch e a tela dizia "não respondeu": ela respondeu e foi CORTADA, e
      // ninguém via a causa. Agora as duas coisas são ditas com nomes distintos.
      const r = await plataforma.integrations.Core.InvokeLLM({ prompt: promptDoRoteiro(contexto), response_json_schema: SCHEMA_ROTEIRO, max_tokens: 6000 });
      if (r && r.ok !== false && (r.reuniao || r.tema)) {
        // o que a conferência jogou fora ANTES de normalizar — depois de
        // normalizar já virou nulo e não dá mais pra avisar o dono
        const fora = descartesDoRoteiro(r, contexto);
        novo = normalizarRoteiro(r, contexto); origem = 'ia';
        setDescartes(fora);
      } else if (r?.needs_key) toast.message('IA não conectada — o tópico saiu pela régua da casa.');
      else if (r?.truncated || r?.stop_reason === 'max_tokens') toast.message('A resposta da IA foi cortada no meio (pautas longas) — o tópico saiu pela régua da casa.');
      else toast.message('A IA não respondeu — o tópico saiu pela régua da casa.');
    } catch { toast.message('A IA não respondeu — o tópico saiu pela régua da casa.'); }
    if (!novo) novo = { ...roteiroLocal(contexto), origem: 'local' };
    await salvarEncontro({ pautas, roteiro: novo, roteiro_origem: origem, tema: temaDoMes || novo.tema, conduzido_por_nome: conduzidoPor, treinamento_por_nome: treinamentoPor });
    setGerando(false);
    setPautasAbertas(false);
    toast.success(origem === 'ia' ? `Tópico gerado pela IA: ${novo.reuniao.topicos.length} tópicos` : `Tópico montado: ${novo.reuniao.topicos.length} tópicos`);
  };

  // ✏️ 07/09 — "precisa ter botão de edição, depois que for gerado": o
  // rascunho (IA ou régua) é só o ponto de partida — a palavra final é
  // sempre da pessoa, sem precisar regenerar tudo de novo.
  const mudarLeitura = (campo, valor) => salvarEncontro({ roteiro: { ...roteiro, leitura: { ...roteiro.leitura, [campo]: valor } } });
  const mudarTreinamento = (campo, valor) => salvarEncontro({ roteiro: { ...roteiro, treinamento: { ...roteiro.treinamento, [campo]: valor } } });
  const mudarTopicoReuniao = (i, campo, valor) => {
    const topicos = (roteiro.reuniao?.topicos || []).map((t, idx) => (idx === i ? { ...t, [campo]: valor } : t));
    salvarEncontro({ roteiro: { ...roteiro, reuniao: { ...roteiro.reuniao, topicos } } });
  };
  // 🗑️ "se eu quiser apagar e começar de novo": zera as pautas E o tópico
  // juntos — continuar só com um dos dois apagado deixava a tela pela metade.
  const apagarTudo = () => {
    if (!window.confirm('Apagar as pautas e o tópico gerado, e começar do zero?')) return;
    setPautas('');
    setDescartes(null);
    setEditando(false);
    setPautasAbertas(true);
    salvarEncontro({ pautas: '', roteiro: null, roteiro_origem: null });
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
  const slides = useMemo(() => slidesDoEncontro({ data: fmtDia(dataEncontro), roteiro, mes, conduzidoPor, treinamentoPor, demandas, treinamento }), [dataEncontro, roteiro, mes, conduzidoPor, treinamentoPor, demandas, treinamento]);

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
            <p className="mt-1 text-[18px] sm:text-[22px] font-extrabold leading-tight" data-teste="encontro-titulo">{fmtDia(dataEncontro)}{' '}{selo && (
              <span className={`text-[12px] font-bold ml-2 ${selo.tom === 'agora' ? 'text-nz-verde' : selo.tom === 'perto' ? 'text-amber-300' : 'text-white/35'}`} data-teste="encontro-selo">{selo.texto}</span>
            )}</p>
            {/* ← → entre as semanas: a âncora é a próxima segunda, mas o
                registro da que passou continua alcançável */}
            <div className="flex items-center gap-1 mt-1.5" data-teste="encontro-semanas">
              <button type="button" onClick={() => setPassoSemana((n) => n - 1)} aria-label="semana anterior" data-teste="semana-anterior"
                className="rounded-lg border border-white/15 hover:bg-white/10 p-1"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => setPassoSemana((n) => n + 1)} aria-label="próxima semana" data-teste="semana-proxima"
                className="rounded-lg border border-white/15 hover:bg-white/10 p-1"><ChevronRight className="w-3.5 h-3.5" /></button>
              {passoSemana !== 0 && (
                <button type="button" onClick={() => setPassoSemana(0)} data-teste="semana-voltar"
                  className="ml-1 rounded-lg border border-white/15 hover:bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/70">voltar pra próxima</button>
              )}
            </div>
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
          <label className="text-[10px] text-white/45 uppercase tracking-wider">quem dá o treinamento ({blocoTreinamento.minutos} min)
            <Input defaultValue={treinamentoPor} key={`trein-${encontro?.id || 'novo'}`} placeholder="nome de quem treina" disabled={!podeConduzir} onBlur={(ev) => salvarEncontro({ treinamento_por_nome: ev.target.value })} className="mt-0.5 h-8 border-white/15 bg-white/[0.06] text-white text-[12px] normal-case" data-teste="treina" />
          </label>
          {/* 🎓 DIR-79 — o TREINAMENTO em si. Antes daqui só existia o nome de
              quem treina: o bloco de 45 min ia pra tela vazio, sem nada pra
              importar e nada pra abrir na hora de apresentar. */}
          <div className="mt-2 rounded-lg border border-white/10 p-2.5" data-teste="treinamento-caixa">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-[10px] text-white/45 uppercase tracking-wider">o treinamento ({blocoTreinamento.minutos} min)</p>
              {temTreinamento(treinamento)
                ? <span className="text-[10px] font-bold text-nz-verde" data-teste="treinamento-pronto">pronto · {treinamento.passos.length} passo{treinamento.passos.length === 1 ? '' : 's'}</span>
                : <span className="text-[10px] text-amber-300/80" data-teste="treinamento-vazio">ainda sem material</span>}
            </div>
            {temTreinamento(treinamento) ? (
              <div className="mt-1.5">
                <p className="text-[12px] font-bold text-white">{treinamento.titulo || 'Treinamento'}</p>
                {treinamento.material && (materialEhLink(treinamento.material)
                  ? <a href={treinamento.material} target="_blank" rel="noreferrer" className="text-[11px] text-sky-300 underline break-all" data-teste="treinamento-link">{treinamento.material}</a>
                  : <p className="text-[11px] text-white/60 whitespace-pre-line">{treinamento.material}</p>)}
                {treinamento.passos.length > 0 && (
                  <ol className="mt-1 space-y-0.5">
                    {treinamento.passos.map((passo, i) => (
                      <li key={`${passo}-${i}`} className="text-[11px] text-white/70">{i + 1}. {passo}</li>
                    ))}
                  </ol>
                )}
                {podeConduzir && (
                  <button type="button" onClick={() => salvarEncontro({ treinamento: TREINAMENTO_VAZIO })} className="mt-1.5 text-[10px] text-white/35 hover:text-white" data-teste="treinamento-limpar">trocar o treinamento</button>
                )}
              </div>
            ) : podeConduzir ? (
              <div className="mt-1.5">
                <Textarea value={importando} onChange={(ev) => setImportando(ev.target.value)} rows={4}
                  placeholder={'cole o treinamento ou escreva aqui — a primeira linha é o título, as de baixo viram os passos. Um link no meio vira o material.\nex.:\nScript de abordagem no WhatsApp\nhttps://drive.google.com/...\nAbrir com pergunta\nEscutar 2 minutos'}
                  className="border-white/15 bg-white/[0.06] text-white text-[11px] leading-relaxed" data-teste="treinamento-texto" />
                <Button size="sm" disabled={!importando.trim()} onClick={() => { salvarEncontro({ treinamento: treinamentoDoTexto(importando, { por: treinamentoPor }) }); setImportando(''); }}
                  className="mt-1.5 h-7 bg-white/10 hover:bg-white/20 text-white text-[11px]" data-teste="treinamento-salvar">usar este treinamento</Button>
              </div>
            ) : <p className="mt-1 text-[11px] text-white/40">quem conduz ainda não subiu o material.</p>}
          </div>
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

      {/* ── 3. as pautas → o tópico ──
          07/09 — dono: "está muito bom, são só ajustes: precisa ter botão de
          edição depois que for gerado; se eu quiser apagar e começar de
          novo; quando eu enviar o comando, esse comando já tem que sumir…
          precisa ficar mais organizado." Três mudanças:
            • as pautas COLAPSAM assim que um tópico existe — vira uma tira
              fina ("3 pautas usadas · editar as pautas"), e o tópico (que
              era 3 de 5 colunas) passa a usar a largura toda;
            • um botão "editar" no tópico: liga campos de texto de verdade
              em cima do que foi gerado — a IA/régua dá o rascunho, a
              palavra final é sempre da pessoa;
            • "começar do zero": apaga pautas e tópico juntos, com confirmação. */}
      <div className={pautasAbertas ? 'grid lg:grid-cols-5 gap-3' : 'space-y-3'}>
        {pautasAbertas ? (
          <div className="lg:col-span-2 rounded-xl border border-white/10 p-3" style={caixa} data-teste="pautas">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className={titulo}>As pautas <span className="normal-case tracking-normal text-white/30">— uma por linha</span></p>
              {roteiro && <button type="button" onClick={() => setPautasAbertas(false)} className="ml-auto text-[10px] text-white/35 hover:text-white" data-teste="pautas-recolher">recolher</button>}
            </div>
            <Textarea value={pautas} onChange={(ev) => setPautas(ev.target.value)} disabled={!podeConduzir} rows={9} placeholder={'dite do seu jeito — a IA organiza, corrige o português e dá o tempo de cada um. ex.:\nLuciano fala sobre a meta de parceiro de compra\nAline fala sobre o financeiro, 30 min\nLuiz fala sobre o X-Game e a Top College, pelo menos 1 hora'} className="mt-1.5 border-white/15 bg-white/[0.06] text-white text-[12px] leading-relaxed" data-teste="pautas-texto" />
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {podeConduzir && <Button size="sm" onClick={gerarTopico} disabled={gerando} className="h-8 font-bold text-white" style={{ background: 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' }} data-teste="gerar-topico">{gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />} gerar o tópico com a IA</Button>}
              <span className="text-[10px] text-white/35">{pautasDoTexto(pautas).length} pauta{pautasDoTexto(pautas).length === 1 ? '' : 's'}{encontro?.roteiro_origem ? ` · tópico atual: ${encontro.roteiro_origem === 'ia' ? 'gerado pela IA' : 'régua local'}` : ''}</span>
              {podeConduzir && roteiro && <button type="button" onClick={apagarTudo} className="ml-auto text-[10px] text-white/35 hover:text-red-300" data-teste="comecar-do-zero">apagar e começar do zero</button>}
            </div>
            {/* 🧯 DIR-79 — o que a IA inventou e foi descartado. Silêncio aqui é o
                que fazia a alucinação passar por verdade. */}
            {descartes && (descartes.nomes.length > 0 || descartes.funcoes.length > 0) && (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200" data-teste="aviso-invencao">
                A IA inventou e eu descartei:
                {descartes.nomes.length > 0 && <> gente que não está na sala (<b>{descartes.nomes.join(', ')}</b>)</>}
                {descartes.nomes.length > 0 && descartes.funcoes.length > 0 && ' e'}
                {descartes.funcoes.length > 0 && <> função que não existe (<b>{descartes.funcoes.join(', ')}</b>)</>}
                . O resto do tópico está de pé.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 px-3 py-2 flex items-center gap-2 flex-wrap" style={caixa} data-teste="pautas-colapsadas">
            <p className={titulo}>As pautas</p>
            <span className="text-[11px] text-white/40">{pautasDoTexto(pautas).length} pauta{pautasDoTexto(pautas).length === 1 ? '' : 's'} usada{pautasDoTexto(pautas).length === 1 ? '' : 's'}{encontro?.roteiro_origem ? ` · tópico atual: ${encontro.roteiro_origem === 'ia' ? 'gerado pela IA' : 'régua local'}` : ''}</span>
            {podeConduzir && (
              <div className="ml-auto flex items-center gap-3">
                <button type="button" onClick={() => setPautasAbertas(true)} className="text-[11px] text-white/50 hover:text-white underline" data-teste="pautas-abrir">editar as pautas</button>
                <button type="button" onClick={apagarTudo} className="text-[11px] text-white/35 hover:text-red-300" data-teste="comecar-do-zero">começar do zero</button>
              </div>
            )}
          </div>
        )}
        <div className={pautasAbertas ? 'lg:col-span-3 rounded-xl border border-white/10 p-3' : 'rounded-xl border border-white/10 p-3'} style={caixa} data-teste="topico">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className={titulo}>O tópico do encontro</p>
            {roteiro && <span className="text-[12px] font-extrabold text-white">{roteiro.tema}</span>}
            {roteiro && podeConduzir && (
              <button type="button" onClick={() => setEditando((v) => !v)} className={`ml-auto text-[10px] font-bold rounded-full px-2 py-0.5 ${editando ? 'bg-white text-black' : 'text-white/45 hover:text-white border border-white/15'}`} data-teste="topico-editar">
                {editando ? 'concluir edição' : 'editar'}
              </button>
            )}
          </div>
          {!roteiro ? (
            <p className="mt-2 text-[12px] text-white/45">Digite as pautas e gere o tópico: a mentalidade de {blocoMentalidade.minutos} minutos, a leitura de {blocoLeitura.minutos}, o treinamento de {blocoTreinamento.minutos} e os tópicos das 2 horas de reunião, cada um com objetivo, decisão esperada, minutos e a demanda que sai dele.</p>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${blocoMentalidade.cor}` }} data-teste="topico-mentalidade">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">1 · Mentalidade · {blocoMentalidade.minutos} min</p>
                <p className="text-[12px] font-bold text-white">{aberturaMentalidade.titulo}</p>
                {aberturaMentalidade.corpo.map((linha) => <p key={linha} className="text-[11px] text-white/60 mt-0.5">{linha}</p>)}
                <p className="text-[10px] text-white/30 mt-1">conteúdo fixo da casa — não muda de encontro pra encontro</p>
              </div>
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${blocoLeitura.cor}` }} data-teste="topico-leitura">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">2 · Leitura · {blocoLeitura.minutos} min</p>
                {editando ? (
                  <div className="mt-1 space-y-1.5">
                    <Input defaultValue={roteiro.leitura?.titulo} onBlur={(ev) => mudarLeitura('titulo', ev.target.value)} className="h-7 border-white/15 bg-white/[0.06] text-white text-[12px] font-bold" data-teste="editar-leitura-titulo" />
                    <Textarea defaultValue={roteiro.leitura?.trecho} onBlur={(ev) => mudarLeitura('trecho', ev.target.value)} rows={2} className="border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-leitura-trecho" />
                    <Textarea defaultValue={(roteiro.leitura?.perguntas || []).join('\n')} onBlur={(ev) => mudarLeitura('perguntas', ev.target.value.split('\n').map((l) => l.trim()).filter(Boolean))} rows={2} placeholder="uma pergunta por linha" className="border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-leitura-perguntas" />
                    <Input defaultValue={roteiro.leitura?.aplicacao} onBlur={(ev) => mudarLeitura('aplicacao', ev.target.value)} placeholder="a aplicação" className="h-7 border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-leitura-aplicacao" />
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] font-bold text-white">{roteiro.leitura?.titulo}</p>
                    <p className="text-[11px] text-white/65 mt-0.5 italic">“{roteiro.leitura?.trecho}”</p>
                    <ul className="mt-1 text-[11px] text-white/60">{(roteiro.leitura?.perguntas || []).map((q) => <li key={q}>• {q}</li>)}</ul>
                    {roteiro.leitura?.aplicacao && <p className="text-[11px] text-white/50 mt-0.5">→ {roteiro.leitura.aplicacao}</p>}
                  </>
                )}
              </div>
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${blocoTreinamento.cor}` }} data-teste="topico-treinamento">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">3 · Treinamento · {blocoTreinamento.minutos} min{treinamentoPor ? ` · ${treinamentoPor}` : ''}</p>
                {editando ? (
                  <div className="mt-1 space-y-1.5">
                    <Input defaultValue={roteiro.treinamento?.tema} onBlur={(ev) => mudarTreinamento('tema', ev.target.value)} className="h-7 border-white/15 bg-white/[0.06] text-white text-[12px] font-bold" data-teste="editar-treinamento-tema" />
                    <Textarea defaultValue={roteiro.treinamento?.objetivo} onBlur={(ev) => mudarTreinamento('objetivo', ev.target.value)} rows={2} className="border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-treinamento-objetivo" />
                    <Textarea defaultValue={(roteiro.treinamento?.passos || []).join('\n')} onBlur={(ev) => mudarTreinamento('passos', ev.target.value.split('\n').map((l) => l.trim()).filter(Boolean))} rows={3} placeholder="um passo por linha" className="border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-treinamento-passos" />
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] font-bold text-white">{roteiro.treinamento?.tema}</p>
                    <p className="text-[11px] text-white/60">{roteiro.treinamento?.objetivo}</p>
                    <ol className="mt-1 text-[11px] text-white/60">{(roteiro.treinamento?.passos || []).map((q, i) => <li key={q}>{i + 1}. {q}</li>)}</ol>
                    {roteiro.treinamento?.pratica && <p className="text-[11px] text-white/50 mt-0.5">prática: {roteiro.treinamento.pratica}</p>}
                  </>
                )}
              </div>
              <div className="rounded-lg border border-white/10 p-2.5" style={{ borderLeft: `3px solid ${blocoReuniao.cor}` }} data-teste="topico-reuniao">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">4 · Reunião estratégica · {blocoReuniao.minutos} min · {roteiro.reuniao?.topicos?.length || 0} tópicos</p>
                <ol className="mt-1 space-y-1.5">
                  {(roteiro.reuniao?.topicos || []).map((t, i) => (
                    <li key={`${t.titulo}-${i}`} className="text-[11px]" data-teste="topico-item">
                      {editando ? (
                        <div className="space-y-1">
                          <Input defaultValue={t.titulo} onBlur={(ev) => mudarTopicoReuniao(i, 'titulo', ev.target.value)} className="h-7 border-white/15 bg-white/[0.06] text-white text-[12px] font-bold" data-teste="editar-topico-titulo" />
                          <Textarea defaultValue={t.objetivo} onBlur={(ev) => mudarTopicoReuniao(i, 'objetivo', ev.target.value)} rows={2} className="border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-topico-objetivo" />
                          <Input defaultValue={t.decisao} onBlur={(ev) => mudarTopicoReuniao(i, 'decisao', ev.target.value)} placeholder="a decisão esperada" className="h-7 border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="editar-topico-decisao" />
                        </div>
                      ) : (
                        <>
                          <p className="text-white font-bold">{i + 1}. {t.titulo} <span className="text-white/40 font-medium tabular-nums">· {t.minutos} min{t.apresentador ? ` · apresenta: ${t.apresentador}` : ''} · {mentalidadeDe(t.mentalidade)?.nome?.replace('Mentalidade do ', '')}{t.habito ? ` · H${t.habito}` : ''}</span></p>
                          <p className="text-white/60">{t.objetivo}</p>
                          {t.decisao && <p className="text-white/45">decisão: {t.decisao}</p>}
                        </>
                      )}
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
          <MandarDemanda valor={livre} onChange={setLivre} onMandar={direcionarLivre} time={time} prazoPadrao={sextaDaSemana(dataEncontro)} legenda="+ demanda que surgiu na hora" placeholder="ex.: Mandar a proposta pro fornecedor da lista nova" opcaoVazia="quem leva…" rotuloBotao="direcionar" desabilitado={salvando} prefixoTeste="livre" testeCaixa="demanda-livre" testeBotao="livre-direcionar" />
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
