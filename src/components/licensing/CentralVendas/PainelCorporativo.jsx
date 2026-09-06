import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Inbox, CalendarPlus, LayoutGrid, Undo2, Loader2, Target, Users, Send, Eye } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { getLevel } from '@/lib/careerLevels';
import { progressoDasMetas, mesDe, semaforo } from '@/lib/metasPessoa';
import { tarefaDaDemanda, cardDaDemanda, estadoDaDemanda, producaoDaSemana, sextaDaSemana, demandaDoTopico } from '@/lib/encontro';
import { segundaDaSemana } from '@/lib/xperformance';
import { filaDoPronto, rotuloDoPrazo } from '@/lib/pronto';
import { planejamentoDoDia, mentalidadeDe } from '@/lib/mentalidades';
import { fmtReais } from '@/lib/xgame';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { relatorioDoExecutivo, nomeBonito } from '@/lib/relatorioExecutivo';
import PdfExecutivo from '@/components/licensing/CentralVendas/PdfExecutivo';

// 🏢 O PAINEL CORPORATIVO — a visão geral de cada um (dono, 06/09/2026).
//
// "Dentro de cada um, o painel corporativo — ou painel do executivo. Não é o
// Compromisso, não é o quadro: é a visão geral dele. Um painel onde ele vê as
// suas metas, RECEBE as demandas — da reunião de diretoria, do CEO, dos
// diretores — e dali direciona pro seu quadro, de acordo com os seus
// horários. Entra como visão geral pra todo mundo: um fica tomando conta do
// outro."
//
// Então:
//   • a demanda chega RECEBIDA (xperf_demandas) — quem mandou, até quando,
//     com o ensinamento;
//   • a pessoa AGENDA: escolhe o dia e a hora → vira tarefa do dia dela
//     (metodo_tarefas, com o valor do fixo) e/ou card do quadro (metodo_quadro);
//     ou DEVOLVE com motivo;
//   • as metas do mês ficam em cima, lidas do que ela fez;
//   • a produção da semana dela — e a de todo mundo, porque todo mundo vê.
// Quem pode agendar: a própria pessoa e a gestão. Quem pode mandar demanda
// daqui: a gestão (CEO) e quem tem posição de diretoria.
//
// 📄 E o PDF do executivo (06/09): o botão no cabeçalho gera o relatório de
// quem está aberto — 8 Hábitos (quando a X-Performance passa `habitos`),
// metas, demandas e produção — pra compartilhar no WhatsApp.

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-white outline-none focus:border-white/40';
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const amanha = (iso) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ORIGEM = { encontro: 'do encontro de segunda', ceo: 'do CEO', diretor: 'de um diretor', gestao: 'da gestão' };

export default function PainelCorporativo({ currentUser, hojeISO, gestao = false, pessoaInicial = null, onPessoa = null, onMudou = null, habitos = null, periodo = null }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const mes = mesDe(hoje);
  const segunda = segundaDaSemana(hoje);
  const [usuarios, setUsuarios] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [pessoaId, setPessoaId] = useState(pessoaInicial || currentUser?.id || null);
  const [demandas, setDemandas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [cards, setCards] = useState([]);
  const [metas, setMetas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [todas, setTodas] = useState([]); // as demandas da semana de todo mundo
  const [tarefasTodas, setTarefasTodas] = useState([]); // …e as tarefas/cards que elas viraram (de qualquer pessoa)
  const [cardsTodas, setCardsTodas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [agendando, setAgendando] = useState(null); // {id, dia, hora, destino}
  const [devolvendo, setDevolvendo] = useState(null); // {id, motivo}
  const [nova, setNova] = useState({ titulo: '', pessoa: '', prazo: '' });
  const [salvando, setSalvando] = useState(false);

  const carregarTime = useCallback(async () => {
    const [u, p] = await Promise.all([
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.from('xgame_participantes').select('user_id,funcao_titulo,cargo,fixo_mes').eq('ativo', true),
    ]);
    setUsuarios(u.data || []); setParticipantes(p.data || []);
  }, []);
  const carregarPessoa = useCallback(async () => {
    if (!pessoaId) { setCarregando(false); return; }
    setCarregando(true);
    const [d, t, c, m, v, td] = await Promise.all([
      supabase.from('xperf_demandas').select('*').eq('pessoa_id', pessoaId).order('created_at', { ascending: false }).limit(120),
      supabase.from('metodo_tarefas').select('id,data,hora,titulo,feito,conferido,pronto_em,prazo_em,devolvida_motivo,habito,origem,demanda_id,categoria').eq('user_id', pessoaId).gte('data', `${mes}-01`),
      supabase.from('metodo_quadro').select('id,coluna,titulo,prazo,demanda_id').eq('user_id', pessoaId),
      supabase.from('xperf_metas').select('*').eq('user_id', pessoaId).eq('mes', mes).order('created_at'),
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount,product_id,quantity').or(`seller_id.eq.${pessoaId},licensee_id.eq.${pessoaId},anchor_id.eq.${pessoaId},owner_id.eq.${pessoaId}`).gte('created_date', `${mes}-01T00:00:00`),
      supabase.from('xperf_demandas').select('*').gte('created_at', `${segunda}T00:00:00`).order('created_at'),
    ]);
    setDemandas(d.data || []); setTarefas(t.data || []); setCards(c.data || []); setMetas(m.data || []);
    setVendas((v.data || []).filter((s) => isSalePago(s) && isVendaMercadoria(s) && mesDe(String(s.created_date)) === mes));
    setTodas(td.data || []);
    // o estado de cada demanda de todo mundo vem da tarefa/card que ela virou — de qualquer pessoa
    const idsT = (td.data || []).map((x) => x.tarefa_id).filter(Boolean);
    const idsC = (td.data || []).map((x) => x.card_id).filter(Boolean);
    const [tt, ct] = await Promise.all([
      idsT.length ? supabase.from('metodo_tarefas').select('id,feito,conferido,pronto_em').in('id', idsT) : Promise.resolve({ data: [] }),
      idsC.length ? supabase.from('metodo_quadro').select('id,coluna').in('id', idsC) : Promise.resolve({ data: [] }),
    ]);
    setTarefasTodas(tt.data || []); setCardsTodas(ct.data || []);
    setCarregando(false);
  }, [pessoaId, mes, segunda]);
  useEffect(() => { carregarTime(); }, [carregarTime]);
  useEffect(() => { carregarPessoa(); }, [carregarPessoa]);
  // quem está por fora (a Performance) acompanha a pessoa escolhida aqui
  useEffect(() => { if (pessoaInicial && pessoaInicial !== pessoaId) setPessoaId(pessoaInicial); }, [pessoaInicial]); // eslint-disable-line react-hooks/exhaustive-deps
  const escolher = (id) => { setPessoaId(id); if (onPessoa) onPessoa(id); };
  const recarregar = () => { carregarPessoa(); if (onMudou) onMudou(); };

  const time = useMemo(() => timeCorporativo(usuarios).map((p) => {
    const part = participantes.find((x) => x.user_id === p.id);
    const { funcao } = funcaoDaPessoaComOrigem({ funcaoTitulo: part?.funcao_titulo, nivel: p.nivel, nome: p.nome });
    return { ...p, funcaoId: funcao?.id || null, funcaoCurta: funcao?.curto || funcao?.nome || null, fixo: part?.fixo_mes || null };
  }), [usuarios, participantes]);
  // quem não está no time (ex.: o dono sem nível no painel) também aparece, se for o próprio
  useEffect(() => { if (!pessoaId && time.length) setPessoaId(time[0].id); }, [time, pessoaId]);
  const pessoa = time.find((p) => p.id === pessoaId) || (pessoaId === currentUser?.id ? { id: currentUser.id, nome: currentUser.full_name || currentUser.nickname || 'você', nivel: null, funcaoCurta: null } : null);
  const ehMeu = pessoaId === currentUser?.id;
  const podeAgendar = ehMeu || gestao;
  const minhaPosicao = time.find((p) => p.id === currentUser?.id);
  const podeMandar = gestao || ['diretoria_operacao', 'diretoria_executiva', 'ceo'].includes(minhaPosicao?.nivel);
  const origemDeQuemManda = gestao || minhaPosicao?.nivel === 'ceo' ? 'ceo' : 'diretor';

  // 🎯 as metas do mês, lidas do que ela fez
  const tarefasDoMes = useMemo(() => tarefas.filter((t) => mesDe(String(t.data)) === mes), [tarefas, mes]);
  const progresso = useMemo(() => progressoDasMetas({ metas, tarefasDoMes, vendasDoMes: vendas, pessoaId, mes, hojeISO: hoje }), [metas, tarefasDoMes, vendas, pessoaId, mes, hoje]);
  const doHoje = tarefas.filter((t) => String(t.data).slice(0, 10) === hoje);
  const fila = filaDoPronto(tarefas);
  const sem = semaforo({ planejou: planejamentoDoDia(doHoje).gerado || doHoje.length === 0, atrasadas: fila.filter((f) => f.estado.id === 'atrasada').length, metasForaDoRitmo: progresso.filter((m) => !m.noRitmo).length, devolvidas: fila.filter((f) => f.estado.id === 'devolvida').length });
  const COR = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };

  const recebidas = demandas.filter((d) => d.status === 'recebida');
  const emAndamento = demandas.filter((d) => d.status === 'agendada').map((d) => ({ ...d, estado: estadoDaDemanda(d, { tarefas, cards, hojeISO: hoje }) })).filter((d) => d.estado.id !== 'conferida');
  const concluidas = demandas.filter((d) => d.status === 'agendada').map((d) => ({ ...d, estado: estadoDaDemanda(d, { tarefas, cards, hojeISO: hoje }) })).filter((d) => d.estado.id === 'conferida');
  const devolvidas = demandas.filter((d) => d.status === 'devolvida');
  const minhaProducao = useMemo(() => producaoDaSemana({ demandas: demandas.filter((d) => String(d.created_at) >= `${segunda}`), tarefas, cards, hojeISO: hoje }), [demandas, tarefas, cards, hoje, segunda]);
  const producaoGeral = useMemo(() => producaoDaSemana({ demandas: todas, tarefas: tarefasTodas, cards: cardsTodas, hojeISO: hoje }), [todas, tarefasTodas, cardsTodas, hoje]);
  // 📄 o relatório desta pessoa, pronto pro PDF
  const relatorio = useMemo(() => (!pessoa || carregando ? null : relatorioDoExecutivo({
    pessoa: { id: pessoa.id, nome: pessoa.nome, posicao: pessoa.nivel ? getLevel(pessoa.nivel).name : null, funcaoCurta: pessoa.funcaoCurta, fixo: pessoa.fixo },
    periodo, habitos: habitos || [], metas: progresso,
    demandas: demandas.map((d) => ({ ...d, estado: estadoDaDemanda(d, { tarefas, cards, hojeISO: hoje }) })),
    producao: minhaProducao, semaforo: sem, hojeISO: hoje, mes, geradoPor: currentUser?.full_name || null,
  })), [pessoa, carregando, periodo, habitos, progresso, demandas, tarefas, cards, hoje, minhaProducao, sem, mes, currentUser?.full_name]);

  // 📅 agendar: vira tarefa do dia (e/ou card), e a demanda guarda os vínculos
  const agendar = async (d) => {
    const a = agendando?.id === d.id ? agendando : { dia: amanha(hoje), hora: '09:00', destino: 'ambos' };
    if (!a.dia) { toast.error('Escolha o dia.'); return; }
    setSalvando(true);
    let tarefaId = null; let cardId = null;
    if (a.destino !== 'quadro') {
      const ordem = tarefas.filter((t) => String(t.data).slice(0, 10) === a.dia).length;
      const { data, error } = await supabase.from('metodo_tarefas').insert(tarefaDaDemanda(d, { dia: a.dia, hora: a.hora || null, ordem })).select();
      if (error) { setSalvando(false); toast.error('Não agendou — tenta de novo'); return; }
      tarefaId = (Array.isArray(data) ? data[0] : data)?.id || null;
    }
    if (a.destino !== 'dia') {
      const { data, error } = await supabase.from('metodo_quadro').insert(cardDaDemanda(d, { tarefaId, responsavelNome: d.criado_por_nome })).select();
      if (!error) cardId = (Array.isArray(data) ? data[0] : data)?.id || null;
    }
    const patch = { status: 'agendada', agendada_para: a.destino === 'quadro' ? null : a.dia, hora: a.destino === 'quadro' ? null : (a.hora || null), tarefa_id: tarefaId, card_id: cardId, updated_at: new Date().toISOString() };
    await supabase.from('xperf_demandas').update(patch).eq('id', d.id);
    setSalvando(false); setAgendando(null);
    toast.success(a.destino === 'quadro' ? `"${d.titulo}" no quadro de ${pessoa?.nome?.split(' ')[0]}` : `"${d.titulo}" agendada pra ${fmtDia(a.dia)}${a.hora ? ` às ${a.hora}` : ''}${a.destino === 'ambos' ? ' e no quadro' : ''}`);
    recarregar();
  };
  const devolver = async (d) => {
    const motivo = (devolvendo?.id === d.id ? devolvendo.motivo : '').trim();
    if (!motivo) { toast.error('Diga o motivo da devolução.'); return; }
    await supabase.from('xperf_demandas').update({ status: 'devolvida', devolvida_motivo: motivo, updated_at: new Date().toISOString() }).eq('id', d.id);
    setDevolvendo(null); toast.message(`Devolvida: "${d.titulo}"`); recarregar();
  };
  // 📤 mandar uma demanda daqui (o CEO ou um diretor)
  const mandar = async () => {
    const alvo = time.find((p) => p.id === (nova.pessoa || pessoaId));
    if (!nova.titulo.trim() || !alvo) { toast.error('Diga a demanda e pra quem.'); return; }
    const linha = demandaDoTopico({ titulo: nova.titulo.trim(), demanda: nova.titulo.trim() }, { pessoaId: alvo.id, pessoaNome: alvo.nome, criadoPorId: currentUser?.id, criadoPorNome: currentUser?.full_name || null, origem: origemDeQuemManda, prazoDia: nova.prazo || sextaDaSemana(hoje) });
    setSalvando(true);
    const { error } = await supabase.from('xperf_demandas').insert(linha);
    setSalvando(false);
    if (error) { toast.error('Não mandou — tenta de novo'); return; }
    toast.success(`Demanda no painel de ${alvo.nome.split(' ')[0]}: "${linha.titulo}"`);
    setNova({ titulo: '', pessoa: nova.pessoa, prazo: '' });
    recarregar();
  };

  return (
    <div className="rounded-xl border border-white/15 p-3 sm:p-4 text-white" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }} data-teste="painel-corporativo" data-pessoa={pessoaId || ''}>
      <div className="flex items-center gap-2 flex-wrap">
        <p className={titulo}><Users className="w-3 h-3 inline mr-1" />Painel Corporativo</p>
        <span className="text-[10px] text-white/35">· metas, demandas recebidas e a produção da semana — todo mundo vê todo mundo</span>
        <label className="ml-auto text-[10px] text-white/45 uppercase tracking-wider inline-flex items-center gap-1"><Eye className="w-3 h-3" /> painel de
          <select value={pessoaId || ''} onChange={(ev) => escolher(ev.target.value)} className={`ml-1 ${campo} normal-case`} data-teste="painel-pessoa">
            {!time.some((p) => p.id === currentUser?.id) && currentUser?.id && <option value={currentUser.id}>{nomeBonito(currentUser.full_name) || 'você'} (você)</option>}
            {time.map((p) => <option key={p.id} value={p.id}>{nomeBonito(p.nome)}{p.id === currentUser?.id ? ' (você)' : ''}{p.funcaoCurta ? ` · ${p.funcaoCurta}` : ''}</option>)}
          </select>
        </label>
        <PdfExecutivo relatorio={relatorio} />
      </div>

      {carregando || !pessoa ? <p className="mt-3 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> abrindo o painel…</p> : (
        <>
          {/* quem é */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-block h-3 w-3 rounded-full ${COR[sem.cor]}`} title={sem.motivos.join(' · ') || 'tudo em dia'} data-teste="painel-semaforo" data-cor={sem.cor} />
            <p className="text-[16px] font-extrabold">{nomeBonito(pessoa.nome)}</p>
            <p className="text-[11px] text-white/50">{pessoa.nivel ? getLevel(pessoa.nivel).name : '—'}{pessoa.funcaoCurta ? ` · ${pessoa.funcaoCurta}` : ''}{pessoa.fixo ? ` · fixo ${fmtReais(pessoa.fixo)}` : ''}</p>
            <p className="text-[11px] text-white/40 flex-1 min-w-[140px] truncate">{sem.motivos.length ? sem.motivos.join(' · ') : 'tudo em dia'}</p>
          </div>

          <div className="mt-3 grid lg:grid-cols-5 gap-3">
            {/* 🎯 metas */}
            <div className="lg:col-span-2 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="painel-metas">
              <p className={titulo}><Target className="w-3 h-3 inline mr-1" />Metas de {mes.slice(5)}/{mes.slice(0, 4)}</p>
              {progresso.length === 0 ? <p className="mt-1 text-[11px] text-white/40">sem meta neste mês — a gestão define no Quadro Geral</p> : (
                <ul className="mt-1 space-y-1">
                  {progresso.map((m) => (
                    <li key={m.id} className="text-[11px]" data-teste="painel-meta">
                      <div className="flex items-center gap-2"><span className="text-white/80 truncate">{m.rotulo}</span><span className={`ml-auto tabular-nums shrink-0 ${m.noRitmo ? 'text-nz-verde' : 'text-amber-300'}`}>{m.unidade === 'R$' ? fmtReais(m.feito) : m.feito} / {m.unidade === 'R$' ? fmtReais(m.alvo) : m.alvo} · {m.pct}%</span></div>
                      <div className="mt-0.5 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, m.pct)}%`, background: m.noRitmo ? 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' : 'rgba(251,191,36,0.7)' }} /></div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className={titulo}>Produção da semana</p>
                <p className="text-[12px] font-bold tabular-nums" data-teste="painel-producao">{minhaProducao.concluidas} de {minhaProducao.total} demanda{minhaProducao.total === 1 ? '' : 's'} concluída{minhaProducao.concluidas === 1 ? '' : 's'} <span className="text-white/40 font-medium">· {minhaProducao.pct}%</span>{minhaProducao.semAgendar ? <span className="text-amber-300/80 font-medium"> · {minhaProducao.semAgendar} sem agendar</span> : null}</p>
              </div>
            </div>

            {/* 📥 demandas */}
            <div className="lg:col-span-3 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="painel-demandas">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={titulo}><Inbox className="w-3 h-3 inline mr-1" />Demandas recebidas</p>
                <span className="text-[10px] text-white/35">· {recebidas.length} pra agendar · {emAndamento.length} em andamento · {concluidas.length} conferida{concluidas.length === 1 ? '' : 's'}</span>
              </div>
              {recebidas.length === 0 && <p className="mt-1 text-[11px] text-white/40">nada esperando — o que chegar do encontro, do CEO ou dos diretores aparece aqui</p>}
              <ul className="mt-1 space-y-1.5" data-teste="recebidas">
                {recebidas.map((d) => {
                  const a = agendando?.id === d.id ? agendando : null;
                  return (
                    <li key={d.id} className="rounded-lg border border-amber-400/30 px-2.5 py-2" style={{ background: 'rgba(251,191,36,0.05)' }} data-teste="demanda-recebida" data-id={d.id}>
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-white">{d.titulo}</p>
                          <p className="text-[10px] text-white/45">{ORIGEM[d.origem] || d.origem}{d.criado_por_nome ? ` · ${d.criado_por_nome}` : ''}{d.prazo_em ? ` · ${rotuloDoPrazo(d.prazo_em, hoje) || `até ${fmtDia(String(d.prazo_em).slice(0, 10))}`}` : ''}{d.mentalidade ? ` · ${mentalidadeDe(d.mentalidade)?.nome?.replace('Mentalidade do ', '')}` : ''}{d.habito ? ` · H${d.habito}` : ''} · peso {d.peso}</p>
                          {d.detalhe && <p className="mt-0.5 text-[10px] text-white/40 line-clamp-2">{d.detalhe}</p>}
                        </div>
                        {podeAgendar && !a && (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => setAgendando({ id: d.id, dia: amanha(hoje), hora: '09:00', destino: 'ambos' })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[11px] font-bold" data-teste="agendar"><CalendarPlus className="w-3 h-3 mr-1" /> agendar</Button>
                            <button type="button" onClick={() => setDevolvendo({ id: d.id, motivo: '' })} className="text-[11px] text-white/40 hover:text-red-300 inline-flex items-center gap-1 px-1" data-teste="devolver"><Undo2 className="w-3 h-3" /> devolver</button>
                          </div>
                        )}
                      </div>
                      {a && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap" data-teste="agendar-form">
                          <span className="text-[10px] text-white/45 uppercase tracking-wider">no meu horário:</span>
                          <input type="date" value={a.dia} onChange={(ev) => setAgendando({ ...a, dia: ev.target.value })} className={campo} data-teste="agendar-dia" />
                          <input type="time" value={a.hora} onChange={(ev) => setAgendando({ ...a, hora: ev.target.value })} className={campo} data-teste="agendar-hora" />
                          <select value={a.destino} onChange={(ev) => setAgendando({ ...a, destino: ev.target.value })} className={campo} data-teste="agendar-destino">
                            <option value="ambos">no dia e no quadro</option><option value="dia">só no dia</option><option value="quadro">só no quadro</option>
                          </select>
                          <Button size="sm" onClick={() => agendar(d)} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[11px] font-bold" data-teste="agendar-confirmar"><LayoutGrid className="w-3 h-3 mr-1" /> confirmar</Button>
                          <button type="button" onClick={() => setAgendando(null)} className="text-[11px] text-white/40 hover:text-white">cancelar</button>
                        </div>
                      )}
                      {devolvendo?.id === d.id && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap" data-teste="devolver-form">
                          <Input value={devolvendo.motivo} onChange={(ev) => setDevolvendo({ ...devolvendo, motivo: ev.target.value })} placeholder="por que devolve?" className="h-7 flex-1 min-w-[160px] border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="devolver-motivo" />
                          <Button size="sm" onClick={() => devolver(d)} className="bg-red-500/80 hover:bg-red-500 text-white h-7 text-[11px]" data-teste="devolver-confirmar">devolver</Button>
                          <button type="button" onClick={() => setDevolvendo(null)} className="text-[11px] text-white/40 hover:text-white">cancelar</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {emAndamento.length > 0 && (
                <>
                  <p className={`${titulo} mt-2`}>Em andamento</p>
                  <ul className="mt-1 space-y-0.5 text-[11px]" data-teste="andamento">
                    {emAndamento.map((d) => <li key={d.id} className="flex gap-2 items-center" data-teste="demanda-andamento"><span className={`shrink-0 text-[10px] ${d.estado.cor}`}>{d.estado.rotulo}</span><span className="truncate text-white/80">{d.titulo}</span><span className="ml-auto text-[10px] text-white/35 shrink-0">{ORIGEM[d.origem] || d.origem}</span></li>)}
                  </ul>
                </>
              )}
              {(concluidas.length > 0 || devolvidas.length > 0) && (
                <p className="mt-2 text-[10px] text-white/35">{concluidas.length ? `${concluidas.length} conferida${concluidas.length > 1 ? 's' : ''} ✔✔` : ''}{concluidas.length && devolvidas.length ? ' · ' : ''}{devolvidas.length ? `${devolvidas.length} devolvida${devolvidas.length > 1 ? 's' : ''}` : ''}</p>
              )}
              {podeMandar && (
                <div className="mt-2 rounded-lg border border-dashed border-white/15 px-2.5 py-2 flex items-center gap-2 flex-wrap" data-teste="mandar-demanda">
                  <Send className="w-3 h-3 text-white/40" />
                  <Input value={nova.titulo} onChange={(ev) => setNova((n) => ({ ...n, titulo: ev.target.value }))} onKeyDown={(ev) => { if (ev.key === 'Enter') mandar(); }} placeholder={`mandar uma demanda ${origemDeQuemManda === 'ceo' ? 'do CEO' : 'de diretor'}…`} className="h-7 flex-1 min-w-[180px] border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="nova-demanda-titulo" />
                  <select value={nova.pessoa || pessoaId || ''} onChange={(ev) => setNova((n) => ({ ...n, pessoa: ev.target.value }))} className={campo} data-teste="nova-demanda-pessoa">
                    {time.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <input type="date" value={nova.prazo || sextaDaSemana(hoje)} onChange={(ev) => setNova((n) => ({ ...n, prazo: ev.target.value }))} className={campo} data-teste="nova-demanda-prazo" />
                  <Button size="sm" onClick={mandar} disabled={salvando || !nova.titulo.trim()} className="bg-white/10 hover:bg-white/20 text-white h-7 text-[11px]" data-teste="nova-demanda-mandar">mandar</Button>
                </div>
              )}
            </div>
          </div>

          {/* 👀 todo mundo: um fica tomando conta do outro */}
          {producaoGeral.total > 0 && (
            <div className="mt-3 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="painel-todos">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={titulo}>A semana de todo mundo</p>
                <span className="text-[10px] text-white/35">· desde {fmtDia(segunda)} · {producaoGeral.concluidas} de {producaoGeral.total} concluídas · {producaoGeral.pct}%{producaoGeral.semAgendar ? ` · ${producaoGeral.semAgendar} sem agendar` : ''}{producaoGeral.atrasadas ? ` · ${producaoGeral.atrasadas} atrasada${producaoGeral.atrasadas > 1 ? 's' : ''}` : ''}</span>
              </div>
              <div className="mt-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
                {producaoGeral.pessoas.map((p) => (
                  <button type="button" key={p.pessoaId} onClick={() => escolher(p.pessoaId)} className={`text-left rounded-md border px-2 py-1 hover:border-white/30 ${p.pessoaId === pessoaId ? 'border-white/30' : 'border-white/10'}`} data-teste="todos-pessoa" data-pessoa={p.pessoaId}>
                    <div className="flex items-center gap-2 text-[11px]"><span className="font-bold text-white truncate">{nomeBonito(p.nome)}</span><span className="ml-auto tabular-nums text-white/60">{p.concluidas}/{p.total}</span></div>
                    <div className="mt-0.5 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full" style={{ width: `${p.pct}%`, background: p.atrasadas ? '#ef4444' : 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' }} /></div>
                    <p className="text-[10px] text-white/35">{p.recebidas ? `${p.recebidas} sem agendar` : ''}{p.recebidas && p.atrasadas ? ' · ' : ''}{p.atrasadas ? `${p.atrasadas} atrasada${p.atrasadas > 1 ? 's' : ''}` : ''}{!p.recebidas && !p.atrasadas ? 'em dia' : ''}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
