import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Inbox, CalendarPlus, LayoutGrid, Undo2, Loader2, Target, Users, Eye, Send } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { getLevel } from '@/lib/careerLevels';
import { progressoDasMetas, mesDe, semaforo } from '@/lib/metasPessoa';
import { tarefaDaDemanda, cardDaDemanda, estadoDaDemanda, producaoDaSemana } from '@/lib/encontro';
import { segundaDaSemana } from '@/lib/xperformance';
import { filaDoPronto, rotuloDoPrazo } from '@/lib/pronto';
import { planejamentoDoDia, mentalidadeDe } from '@/lib/mentalidades';
import {
  fmtReais, dataISO, inicioCicloOficial, tokenDoCiclo, formacaoExecutivoIdeal, proporcoesExecutivoIdeal,
  EIXOS_EXECUTIVO_IDEAL, TOKEN_MAX, ligaComPortoesDoCiclo, proximaLiga, mvmManual, vendasEquivalentesAltoValor, TICKET_MEDIO_VENDA,
  estudoEmDia, estudoFdsEmDia, travarTopoPorEstudo, ehTarefaDeGratidao,
} from '@/lib/xgame';
import { textoEFonte } from '@/lib/diarioDeBolso';
import OuvirGratidao from '@/components/common/OuvirGratidao';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { isVendaReal } from '@/lib/dinheiroReal';
import { ehFechada, aporteExternoValido } from '@/lib/esteiraCaptacao';
import { filtroOrDonoDaVenda } from '@/lib/vendasDoCiclo';
import { relatorioDoExecutivo, nomeBonito, primeiroNome } from '@/lib/relatorioExecutivo';
import PdfExecutivo from '@/components/licensing/CentralVendas/PdfExecutivo';
import { DistribuirTarefaSozinho } from '@/components/licensing/CentralVendas/DistribuirTarefa';

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
//
// 🎡 09/09/2026 — DIR-112, dono: "o PDF do executivo está muito raso... tem
// que mostrar qual a posição dele do dia." Além do que já existia, o
// relatório ganha a MESMA conta de liga/Human Token/roda que o X-Game
// mostra pra própria pessoa (tokenDoCiclo/formacaoExecutivoIdeal/
// proporcoesExecutivoIdeal/ligaDoToken, em xgame.js) — calculada de novo
// aqui pra QUALQUER pessoa que a gestão abrir, não só pra quem está
// logada. Usa o ciclo JÁ FECHADO (dias antes de hoje, `xgame_diario`) —
// sem tentar recalcular a régua radical do dia corrente (zerar por não
// votar, atraso no pronto...) pra alguém que não é quem está olhando a
// tela: é uma FOTO da posição no ciclo, não o placar ao vivo de hoje.

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-white outline-none focus:border-white/40 lista-escura';
// 🌑 `lista-escura` (index.css) é pro <select>: sem ela a LISTA que ele abre
// vira branca com texto branco — o fundo `bg-white/[0.06]` é translúcido, e
// o sistema desenha a lista a partir do fundo do próprio campo.
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const amanha = (iso) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ORIGEM = { encontro: 'do encontro de segunda', ceo: 'do CEO', diretor: 'de um diretor', gestao: 'da gestão' };

// `embutido`: dentro do detalhamento da X-Performance, que já mostra quem é, o
// seletor, o PDF e a semana de todo mundo — aqui só metas e demandas.
export default function PainelCorporativo({ currentUser, hojeISO, gestao = false, pessoaInicial = null, onPessoa = null, onMudou = null, onRelatorio = null, habitos = null, periodo = null, embutido = false }) {
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
  const [salvando, setSalvando] = useState(false);
  // 🎡 DIR-112 — a posição do dia: liga, ciclo e a roda da vida da pessoa aberta
  const [cicloConfig, setCicloConfig] = useState(null);
  const [diasCicloPessoa, setDiasCicloPessoa] = useState([]);
  const [mvmRecebidoCiclo, setMvmRecebidoCiclo] = useState([]);
  const [vendasCiclo, setVendasCiclo] = useState(null);

  // 🐛 09/09/2026 — achado na auditoria pré-publicação: trocar de pessoa
  // rápido no seletor "painel de" (uso avulso, fora do X-Performance) podia
  // misturar dado de duas pessoas — nenhuma busca descartava a resposta
  // antiga quando `pessoaId` mudava no meio do caminho. `pessoaIdRef`
  // guarda sempre o ID mais recente; cada busca assíncrona confere, ao
  // terminar, se ainda é a pessoa que estava selecionada quando ela
  // começou — senão, descarta a resposta em vez de aplicar no estado.
  const pessoaIdRef = useRef(pessoaId);
  useEffect(() => { pessoaIdRef.current = pessoaId; }, [pessoaId]);

  const carregarTime = useCallback(async () => {
    const [u, p, cfg] = await Promise.all([
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.from('xgame_participantes').select('user_id,funcao_titulo,cargo,fixo_mes,perfil').eq('ativo', true),
      supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle(),
    ]);
    setUsuarios(u.data || []); setParticipantes(p.data || []);
    setCicloConfig(cfg.data?.ciclo_inicio || null);
  }, []);

  // 🎡 DIR-112 — a posição do dia depende de QUEM está aberto (pessoaId) e de
  // quando o ciclo oficial começou (cicloConfig, carregado uma vez pro time
  // inteiro em carregarTime) — mesma conta de vendasCiclo/diasCiclo que o
  // X-Game já faz pra própria pessoa, aqui repetida pra pessoa selecionada.
  useEffect(() => {
    if (!pessoaId) { setDiasCicloPessoa([]); setMvmRecebidoCiclo([]); setVendasCiclo(null); return; }
    const pessoaDaBusca = pessoaId;
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    Promise.all([
      supabase.from('xgame_diario').select('detalhes').eq('user_id', pessoaId).eq('ciclo_inicio', ini).lt('data', dataISO(new Date())).order('data'),
      supabase.from('xgame_votos_mvm').select('virtude,nota').eq('votado_id', pessoaId).gte('data', ini),
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount')
        .or(filtroOrDonoDaVenda(pessoaId))
        .gte('created_date', `${ini}T00:00:00`),
      supabase.from('captacao_oportunidades').select('estagio,aporte_externo,fechado_em')
        .eq('responsavel_id', pessoaId)
        .gte('fechado_em', `${ini}T00:00:00`),
    ]).then(([dc, vr, sales, oport]) => {
      if (pessoaIdRef.current !== pessoaDaBusca) return; // a pessoa trocou antes desta resposta chegar
      setDiasCicloPessoa(dc.data || []);
      setMvmRecebidoCiclo(vr.data || []);
      if (sales.error || oport.error) { setVendasCiclo(null); return; }
      const pagas = (sales.data || []).filter(isSalePago);
      const reais = (sales.data || []).filter(isVendaReal);
      const aporteExterno = (oport.data || [])
        .filter((o) => ehFechada(o) && aporteExternoValido(o))
        .reduce((soma, o) => soma + (Number(o.aporte_externo.valor) || 0), 0) / TICKET_MEDIO_VENDA;
      setVendasCiclo(pagas.filter(isVendaMercadoria).length + vendasEquivalentesAltoValor(reais) + aporteExterno);
    });
  }, [pessoaId, cicloConfig]);
  // 🔴 o spinner de "abrindo o painel" SÓ na primeira carga: nas recargas (agendou,
  // distribuiu, devolveu) a tela fica montada e os dados trocam no lugar — desmontar
  // aqui matava o estado do Distribuir embutido (a pessoa e o dia escolhidos).
  const primeiraCarga = useRef(true);
  const carregarPessoa = useCallback(async () => {
    if (!pessoaId) { setCarregando(false); return; }
    const pessoaDaBusca = pessoaId;
    if (primeiraCarga.current) setCarregando(true);
    const [d, t, c, m, v, td] = await Promise.all([
      supabase.from('xperf_demandas').select('*').eq('pessoa_id', pessoaId).order('created_at', { ascending: false }).limit(120),
      supabase.from('metodo_tarefas').select('id,data,hora,titulo,feito,conferido,pronto_em,prazo_em,devolvida_motivo,habito,origem,demanda_id,categoria,comprovacao').eq('user_id', pessoaId).gte('data', `${mes}-01`),
      supabase.from('metodo_quadro').select('id,coluna,titulo,prazo,demanda_id').eq('user_id', pessoaId),
      supabase.from('xperf_metas').select('*').eq('user_id', pessoaId).eq('mes', mes).order('created_at'),
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount,product_id,quantity').or(filtroOrDonoDaVenda(pessoaId)).gte('created_date', `${mes}-01T00:00:00`),
      supabase.from('xperf_demandas').select('*').gte('created_at', `${segunda}T00:00:00`).order('created_at'),
    ]);
    // a pessoa trocou antes desta resposta chegar — descarta em vez de
    // misturar o dado de uma pessoa com o cabeçalho de outra
    if (pessoaIdRef.current !== pessoaDaBusca) return;
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
    if (pessoaIdRef.current !== pessoaDaBusca) return;
    setTarefasTodas(tt.data || []); setCardsTodas(ct.data || []);
    primeiraCarga.current = false;
    setCarregando(false);
  }, [pessoaId, mes, segunda]);
  useEffect(() => { carregarTime(); }, [carregarTime]);
  useEffect(() => { carregarPessoa(); }, [carregarPessoa]);
  // quem está por fora (a Performance) acompanha a pessoa escolhida aqui
  useEffect(() => { if (pessoaInicial && pessoaInicial !== pessoaId) setPessoaId(pessoaInicial); }, [pessoaInicial]);  
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

  // 🎡 DIR-112 — a MESMA conta do X-Game (tokenDoCiclo/formacaoExecutivoIdeal/
  // proporcoesExecutivoIdeal/ligaDoToken), calculada aqui pra pessoa aberta.
  const participanteAtual = useMemo(() => participantes.find((x) => x.user_id === pessoaId) || null, [participantes, pessoaId]);
  const mvmRecebidoMedia = useMemo(() => mvmManual(mvmRecebidoCiclo).media, [mvmRecebidoCiclo]);
  const cicloToken = useMemo(() => {
    const r = tokenDoCiclo({ diasCiclo: diasCicloPessoa, mvmVotacao: mvmRecebidoMedia, perfil: participanteAtual?.perfil || 'estrategico', vendasReais: vendasCiclo });
    // 🎓 09/09/2026 — DIR-113: a MESMA trava de topo-só (nunca Ouro) que
    // o X-Game/Compromisso aplicam — sem isso, a "posição do dia" do PDF
    // podia mostrar uma liga diferente da que a própria pessoa vê no jogo.
    const total = travarTopoPorEstudo(r.total, {
      estudoSemanaOk: estudoEmDia(diasCicloPessoa),
      estudoFdsOk: estudoFdsEmDia(diasCicloPessoa),
    });
    return { ...r, total, formacao: formacaoExecutivoIdeal(r.taxas) };
  }, [diasCicloPessoa, mvmRecebidoMedia, participanteAtual, vendasCiclo]);
  const posicaoDoDia = useMemo(() => {
    if (!pessoa) return null;
    const prop = proporcoesExecutivoIdeal(cicloToken.taxas);
    const eixos = EIXOS_EXECUTIVO_IDEAL.map(({ k, rotuloCurto, emoji }) => ({ k, rotuloCurto, emoji, atual: Math.round(prop[k] * 100), alvo: 100 }));
    // 🎖️ DIR-115 — os portões de caráter (MvM) e meta de vendas também
    // decidem a liga aqui, senão o PDF Executivo podia imprimir Platina
    // pra quem os portões ainda travam em Ouro.
    const liga = ligaComPortoesDoCiclo(cicloToken.total, { mvmVotacao: mvmRecebidoMedia, vendasFeitas: cicloToken.vendasFeitas });
    const prox = proximaLiga(cicloToken.total);
    return {
      liga,
      proxima: prox ? { label: prox.liga.label, emoji: prox.liga.emoji, falta: prox.falta } : null,
      tokenCiclo: cicloToken.total,
      tokenMax: TOKEN_MAX,
      formacaoPct: cicloToken.formacao.pct,
      formacaoMensagem: cicloToken.formacao.mensagem,
      eixos,
    };
  }, [pessoa, cicloToken]);

  // 🎙️ DIR-123 — dono: "transcrever o áudio automático pra ele ter isso no
  // seu histórico e vermos isso também." A transcrição já cai no Diário de
  // Bolso da PRÓPRIA pessoa (comprovacao.entrega); aqui é a mesma conta
  // (textoEFonte, diarioDeBolso.js), só que pro GESTOR ver sem precisar
  // abrir o diário de cada um — a gratidão MAIS RECENTE de quem está aberto.
  const gratidaoRecente = useMemo(() => {
    const feitas = tarefas
      .filter((t) => t.feito && ehTarefaDeGratidao(t.titulo) && t.comprovacao)
      .sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const ultima = feitas[0];
    if (!ultima) return null;
    const { texto } = textoEFonte(ultima);
    if (!texto) return null;
    return {
      data: ultima.data,
      texto,
      audioPath: ultima.comprovacao?.audio_gratidao_path || null,
      audioSeg: Number(ultima.comprovacao?.audio_gratidao_seg) || 0,
    };
  }, [tarefas]);

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
    periodo, habitos, metas: progresso,
    demandas: demandas.map((d) => ({ ...d, estado: estadoDaDemanda(d, { tarefas, cards, hojeISO: hoje }) })),
    producao: minhaProducao, semaforo: sem, posicao: posicaoDoDia, hojeISO: hoje, mes, geradoPor: currentUser?.full_name || null,
  })), [pessoa, carregando, periodo, habitos, progresso, demandas, tarefas, cards, hoje, minhaProducao, sem, posicaoDoDia, mes, currentUser?.full_name]);
  // quem está por fora (o detalhamento da X-Performance) também gera o PDF — recebe o relatório pronto
  useEffect(() => { if (onRelatorio) onRelatorio(relatorio); }, [relatorio, onRelatorio]);

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

  return (
    <div className={embutido ? 'text-white' : 'rounded-xl border border-white/15 p-3 sm:p-4 text-white'} style={embutido ? undefined : { background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }} data-teste="painel-corporativo" data-pessoa={pessoaId || ''} data-embutido={embutido ? 'sim' : 'nao'}>
      {!embutido && (
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
      )}

      {carregando || !pessoa ? <p className="mt-3 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> abrindo o painel…</p> : (
        <>
          {!embutido && (<>
          {/* quem é */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-block h-3 w-3 rounded-full ${COR[sem.cor]}`} title={sem.motivos.join(' · ') || 'tudo em dia'} data-teste="painel-semaforo" data-cor={sem.cor} />
            <p className="text-[16px] font-extrabold">{nomeBonito(pessoa.nome)}</p>
            <p className="text-[11px] text-white/50">{pessoa.nivel ? getLevel(pessoa.nivel).name : '—'}{pessoa.funcaoCurta ? ` · ${pessoa.funcaoCurta}` : ''}{pessoa.fixo ? ` · fixo ${fmtReais(pessoa.fixo)}` : ''}</p>
            <p className="text-[11px] text-white/40 flex-1 min-w-[140px] truncate">{sem.motivos.length ? sem.motivos.join(' · ') : 'tudo em dia'}</p>
          </div>

          {/* 🎙️ DIR-123 — dono: "transcrever o áudio automático pra ele ter
              isso no seu histórico e vermos isso também." O ÁUDIO em si
              continua só do dono dele (api/functions/audioDoDitado.js barra
              qualquer actorId que não seja o dono do caminho, de propósito —
              "nem gestão ouve por aqui"); o que a gestão passa a ver aqui é
              só a TRANSCRIÇÃO, a mesma que já cai no Diário de Bolso da
              pessoa. O play só aparece quando é a própria pessoa olhando. */}
          {gratidaoRecente && (
            <div className="mt-2 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="painel-gratidao">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">🙏 Gratidão · {new Date(`${gratidaoRecente.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
              <p className="text-[12px] text-white/80 mt-0.5">{gratidaoRecente.texto}</p>
              {ehMeu && gratidaoRecente.audioPath && (
                <div className="mt-1"><OuvirGratidao caminho={gratidaoRecente.audioPath} uid={pessoaId} dia={gratidaoRecente.data} segundos={gratidaoRecente.audioSeg} tom="escuro" /></div>
              )}
            </div>
          )}
          </>)}

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
                <p className={titulo}><Inbox className="w-3 h-3 inline mr-1" />Demandas · recebidas e distribuídas</p>
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
                <details className="mt-2 rounded-lg border border-dashed border-white/15" data-teste="distribuir-dobra" open>
                  <summary className="cursor-pointer select-none px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 hover:text-white/80">
                    <Send className="w-3 h-3 inline mr-1" /> Distribuir tarefa pra {primeiroNome(pessoa?.nome)} — igual à ADM X-Game
                  </summary>
                  {/* 🎯 07/09 (dono): "esse aí precisa ficar igual o distribuir do admin — puxar o admin pra cá
                      e fazer a junção da demanda recebida com o enviar a demanda". É a MESMA peça da ADM X-Game. */}
                  <div className="px-2.5 pb-2.5">
                    <DistribuirTarefaSozinho currentUser={currentUser} hojeISO={hoje} equipe={time} pessoaFixa={pessoaId} onDistribuiu={recarregar} />
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* 👀 todo mundo: um fica tomando conta do outro */}
          {!embutido && producaoGeral.total > 0 && (
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
