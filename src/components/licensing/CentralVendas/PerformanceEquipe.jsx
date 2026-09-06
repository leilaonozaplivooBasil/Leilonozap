import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Users, Sun, CalendarRange, Inbox, Trophy, ChevronDown, ChevronUp, Award, Sparkles, Phone, HandCoins } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { getLevel } from '@/lib/careerLevels';
import { visaoExecutiva } from '@/lib/encontro';
import { habitosDoTime, periodoDe } from '@/lib/habitosDoTime';
import { segundaDaSemana } from '@/lib/xperformance';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { nomeBonito, primeiroNome, habitosDaPessoa } from '@/lib/relatorioExecutivo';
import PainelCorporativo from '@/components/licensing/CentralVendas/PainelCorporativo';
import PdfExecutivo from '@/components/licensing/CentralVendas/PdfExecutivo';

// 🏆 X-PERFORMANCE — a versão SEM administração (dono, 06/09/2026):
// "a X-Performance vai abrir os oito hábitos do sucesso do time, numa visão
// executiva… quem vendeu, quem não vendeu. Expor mesmo, com riqueza de
// detalhes, sem ficar sujo. E o painel corporativo de cada um." O
// administrativo (X-Game, distribuir tarefa) ficou na ADM X-Game.
//
// A ORGANIZAÇÃO (dono, 06/09, depois de ver 16 pessoas na tela): "em cima não
// vamos fazer o resumo de todo mundo, não — a gente bota os NÚMEROS da equipe
// toda, sem colocar nome, bem organizado, bem executivo. E embaixo vem o
// detalhamento de cada um, já com uma prévia na primeira linha; quando clicar
// abre tudo dele — quadro dos sonhos, convite, tudo — e dali gera o PDF."
//
// Então, de cima pra baixo:
//   1. OS NÚMEROS DO TIME — o período (hoje · semana · mês), seis números do
//      time, os 8 Hábitos em oito cartões só com número e barra (nenhum nome),
//      e os quatro números da semana (planejaram, produziram, demandas, semáforo).
//   2. O DETALHAMENTO POR PESSOA — uma linha por pessoa (a prévia: semáforo,
//      hábitos em bolinhas, hoje, semana, demandas, produção). Clicou, abre
//      embaixo da linha: os 8 Hábitos DELA com o detalhe (fez / não fez e o
//      porquê), o botão do PDF e o Painel Corporativo dela (metas, demandas,
//      a semana de todo mundo — que também tem o PDF).

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const COR = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const CORES_HABITO = ['#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#e879f9'];

/** Um número do time: rótulo pequeno em cima, número grande embaixo. Nenhum nome. */
function Numero({ rotulo, valor, cor = 'text-white', Icone = null, apoio = null, tamanho = 'text-[18px]' }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2.5" style={caixa}>
      <p className="text-[9px] text-white/35 uppercase tracking-wider truncate">{Icone ? <Icone className="w-3 h-3 inline mr-1" /> : null}{rotulo}</p>
      <p className={`mt-0.5 ${tamanho} font-black tabular-nums leading-none ${cor}`}>{valor}</p>
      {apoio && <p className="mt-0.5 text-[10px] text-white/40 truncate">{apoio}</p>}
    </div>
  );
}

/** Um Hábito do time em número: quantos de quantos, a barra, o total. Sem nome. */
function HabitoDoTime({ h, cor }) {
  return (
    <div className="rounded-xl border border-white/10 p-3" style={caixa} data-teste="habito" data-n={h.n} data-quantos={h.quantos}>
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[14px] font-black tabular-nums" style={{ background: `${cor}22`, color: cor }}>{h.n}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold leading-tight text-white truncate" title={h.nome}>{h.nome}</p>
          <p className="text-[10px] text-white/40 truncate" title={h.pergunta}>{h.sub}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <p className="text-[22px] font-black tabular-nums leading-none" style={{ color: cor }} data-teste="habito-quantos">{h.quantos}<span className="text-[11px] font-bold text-white/35"> de {h.deQuantos}</span></p>
        <p className="text-[11px] font-bold tabular-nums text-white/60">{h.pct}%</p>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className="h-full rounded-full transition-[width]" style={{ width: `${h.pct}%`, background: cor }} /></div>
      <p className="mt-1.5 text-[10px] text-white/45 tabular-nums truncate">{h.totalRotulo} no time</p>
    </div>
  );
}

/** Os 8 Hábitos de UMA pessoa, com o detalhe: fez (e quanto) ou não fez (e por quê). */
function HabitosDaPessoa({ habitos }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5" data-teste="habitos-pessoa">
      {habitos.map((h) => {
        const cor = CORES_HABITO[h.n - 1];
        return (
          <div key={h.n} className={`rounded-lg border px-2.5 py-2 ${h.fez ? 'border-white/10' : 'border-red-400/20'}`} style={{ background: h.fez ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.05)' }} data-teste="habito-pessoa" data-n={h.n} data-fez={h.fez ? 'sim' : 'nao'}>
            <div className="flex items-center gap-1.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-black tabular-nums" style={{ background: `${cor}22`, color: cor }}>{h.n}</span>
              <p className="text-[11px] font-bold text-white truncate flex-1" title={h.nome}>{h.curto || h.nome}</p>
              <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${h.fez ? (h.fraco ? 'bg-amber-400' : 'bg-nz-verde') : 'bg-red-500'}`} />
            </div>
            <p className={`mt-1 text-[10.5px] leading-snug ${h.fez ? (h.fraco ? 'text-amber-200/80' : 'text-white/65') : 'text-red-200/70'}`}>{h.texto}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function PerformanceEquipe({ currentUser, hojeISO, gestao = false }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const segunda = segundaDaSemana(hoje);
  const domingo = somaDias(segunda, 6);
  const [periodoTipo, setPeriodoTipo] = useState('hoje');
  const periodo = useMemo(() => periodoDe(periodoTipo, hoje), [periodoTipo, hoje]);
  const [usuarios, setUsuarios] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [demandas, setDemandas] = useState([]);
  const [tarefasDasDemandas, setTarefasDasDemandas] = useState([]);
  const [cards, setCards] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [entregaveis, setEntregaveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pessoaId, setPessoaId] = useState(currentUser?.id || null); // quem está aberto no detalhamento
  const [relatorio, setRelatorio] = useState(null); // o relatório de quem está aberto (vem do painel, pro PDF do cabeçalho)
  const [versao, setVersao] = useState(0); // recarrega quando o painel de baixo mexe

  // a janela de tarefas cobre a semana E o período escolhido (o mês pode ser maior)
  const de = periodo.de < segunda ? periodo.de : segunda;
  const ate = periodo.ate > domingo ? periodo.ate : domingo;

  const carregar = useCallback(async () => {
    const [u, p, t, d, pf, cl, v, o, e] = await Promise.all([
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.from('xgame_participantes').select('user_id,funcao_titulo,cargo').eq('ativo', true),
      supabase.from('metodo_tarefas').select('id,user_id,data,hora,titulo,habito,feito,conferido,origem,prazo_em,pronto_em,categoria').gte('data', de).lte('data', ate),
      supabase.from('xperf_demandas').select('*').gte('created_at', `${segunda}T00:00:00`).order('created_at'),
      supabase.from('metodo_perfil').select('user_id,sonhos'),
      supabase.from('customers').select('id,created_by_id,assigned_seller,qualificacao_network,contatos_metodo'),
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount,seller_id,licensee_id,anchor_id,owner_id').gte('created_date', `${de}T00:00:00`),
      supabase.from('captacao_oportunidades').select('id,responsavel_id,estagio,valor_previsto,fechado_em,reuniao_em'),
      supabase.from('xperf_entregaveis').select('id,dono_id,habito,coluna,validado_em'),
    ]);
    setUsuarios(u.data || []); setParticipantes(p.data || []); setTarefas(t.data || []); setDemandas(d.data || []);
    setPerfis(pf.data || []); setClientes(cl.data || []);
    setVendas((v.data || []).filter((s) => isSalePago(s) && isVendaMercadoria(s)));
    setOportunidades(o.data || []); setEntregaveis(e.data || []);
    const idsT = (d.data || []).map((x) => x.tarefa_id).filter(Boolean);
    const idsC = (d.data || []).map((x) => x.card_id).filter(Boolean);
    const [tt, ct] = await Promise.all([
      idsT.length ? supabase.from('metodo_tarefas').select('id,feito,conferido,pronto_em').in('id', idsT) : Promise.resolve({ data: [] }),
      idsC.length ? supabase.from('metodo_quadro').select('id,coluna').in('id', idsC) : Promise.resolve({ data: [] }),
    ]);
    setTarefasDasDemandas(tt.data || []); setCards(ct.data || []);
    setCarregando(false);
  }, [segunda, de, ate]);
  useEffect(() => { carregar(); }, [carregar, versao]);

  const time = useMemo(() => timeCorporativo(usuarios).map((p) => {
    const part = participantes.find((x) => x.user_id === p.id);
    const { funcao } = funcaoDaPessoaComOrigem({ funcaoTitulo: part?.funcao_titulo, nivel: p.nivel, nome: p.nome });
    return { ...p, funcaoId: funcao?.id || null, funcaoCurta: funcao?.curto || funcao?.nome || null };
  }), [usuarios, participantes]);
  const abrir = (id) => { setRelatorio(null); setPessoaId((atual) => (atual === id ? null : id)); };
  const trocar = (id) => { setRelatorio(null); setPessoaId(id); };
  const proprioForaDoTime = !!currentUser?.id && !time.some((p) => p.id === currentUser.id);

  const tarefasDaSemana = useMemo(() => tarefas.filter((t) => String(t.data).slice(0, 10) >= segunda && String(t.data).slice(0, 10) <= domingo), [tarefas, segunda, domingo]);
  const visao = useMemo(() => visaoExecutiva({ time, tarefas: tarefasDaSemana, demandas, tarefasDasDemandas, cards, hojeISO: hoje, segunda }), [time, tarefasDaSemana, demandas, tarefasDasDemandas, cards, hoje, segunda]);
  const oito = useMemo(() => habitosDoTime({ time, tarefas, perfis, clientes, vendas, oportunidades, entregaveis, periodo, hojeISO: hoje }), [time, tarefas, perfis, clientes, vendas, oportunidades, entregaveis, periodo, hoje]);
  const r = oito.resumo;
  const rotuloPeriodo = periodoTipo !== 'hoje' ? `${oito.periodo.rotulo} (${fmtDia(oito.periodo.de)} a ${fmtDia(oito.periodo.ate)})` : `hoje · ${fmtDia(hoje)}`;

  return (
    <div className="space-y-4 text-white" data-teste="performance-equipe" data-periodo={periodoTipo}>
      {/* ── 1. os números do time (nenhum nome) ── */}
      <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(217,70,239,0.10) 60%, rgba(0,0,0,0))' }} data-teste="oito-habitos">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={titulo}><Trophy className="w-3 h-3 inline mr-1" />X-Performance · os números do time</p>
          <span className="text-[10px] text-white/35">· {r.pessoas} pessoa{r.pessoas === 1 ? '' : 's'} · {rotuloPeriodo}</span>
          <div className="ml-auto flex gap-1" role="tablist" data-teste="periodo">
            {[['hoje', 'hoje'], ['semana', 'semana'], ['mes', 'mês']].map(([id, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={periodoTipo === id} onClick={() => setPeriodoTipo(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${periodoTipo === id ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`} data-periodo={id}>{rotulo}</button>
            ))}
          </div>
        </div>
        {carregando ? <p className="mt-2 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo o time…</p> : time.length === 0 ? <p className="mt-2 text-[11px] text-amber-300/80">Ninguém do time corporativo (executivo ao embaixador) no painel de controle ainda.</p> : (
          <>
            {/* os seis números */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5" data-teste="oito-resumo">
              <Numero rotulo="média de hábitos" valor={`${r.mediaHabitos.toLocaleString('pt-BR')} de 8`} cor={r.mediaHabitos >= 6 ? 'text-nz-verde' : r.mediaHabitos >= 3 ? 'text-amber-300' : 'text-red-300'} Icone={Sparkles} apoio="por pessoa" />
              <Numero rotulo="com os 8 inteiros" valor={String(r.inteiros.length)} cor={r.inteiros.length ? 'text-nz-verde' : 'text-white/50'} Icone={Award} apoio={`de ${r.pessoas}`} />
              <Numero rotulo="sem nenhum hábito" valor={String(r.zerados.length)} cor={r.zerados.length ? 'text-red-300' : 'text-nz-verde'} Icone={Users} apoio={`de ${r.pessoas}`} />
              <Numero rotulo="acordaram às 5" valor={`${r.acordaram} de ${r.pessoas}`} cor={r.acordaram < r.pessoas ? 'text-amber-300' : 'text-nz-verde'} Icone={Sun} />
              <Numero rotulo="contatos feitos" valor={String(r.contatos)} Icone={Phone} apoio="no time" />
              <Numero rotulo="venderam ou fecharam" valor={`${r.venderam} de ${r.pessoas}`} cor={r.venderam ? 'text-nz-verde' : 'text-red-300'} Icone={HandCoins} />
            </div>

            {/* os oito Hábitos em número */}
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2" data-teste="oito-cartoes">
              {oito.habitos.map((h) => <HabitoDoTime key={h.n} h={h} cor={CORES_HABITO[h.n - 1]} />)}
            </div>

            {/* a semana em número */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-teste="visao-resumo">
              <Numero rotulo="planejaram hoje" valor={`${visao.planejaramHoje} de ${visao.linhas.length}`} cor={visao.semPlanejarHoje ? 'text-amber-300' : 'text-nz-verde'} Icone={Sun} />
              <Numero rotulo="produziram na semana" valor={`${visao.produziram} de ${visao.linhas.length}`} cor={visao.naoProduziram ? 'text-amber-300' : 'text-nz-verde'} Icone={CalendarRange} apoio={`${fmtDia(segunda)} a ${fmtDia(domingo)}`} />
              <Numero rotulo="demandas concluídas" valor={`${visao.demandas.concluidas} de ${visao.demandas.total} · ${visao.demandas.pct}%`} cor={visao.demandas.atrasadas ? 'text-red-300' : 'text-white'} Icone={Inbox} apoio={visao.demandas.atrasadas ? `${visao.demandas.atrasadas} atrasada${visao.demandas.atrasadas > 1 ? 's' : ''}` : 'na semana'} />
              <Numero rotulo="semáforo" valor={`${visao.verdes} 🟢 · ${visao.amarelos} 🟡 · ${visao.vermelhos} 🔴`} tamanho="text-[15px]" />
            </div>
          </>
        )}
      </div>

      {/* ── 2. o detalhamento por pessoa ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="visao-todos">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={titulo}><Users className="w-3 h-3 inline mr-1" />Detalhamento por pessoa</p>
          <span className="text-[10px] text-white/35">· a prévia na linha; clique pra abrir os 8 Hábitos, as metas, as demandas e o PDF</span>
        </div>
        {carregando ? <p className="mt-2 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo a semana…</p> : visao.linhas.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[11px]" data-teste="visao-tabela">
              <thead>
                <tr className="text-[9px] text-white/35 uppercase tracking-wider text-left">
                  <th className="py-1 pr-2 font-bold">quem</th>
                  <th className="py-1 pr-2 font-bold">hábitos {oito.periodo.rotulo}</th>
                  <th className="py-1 pr-2 font-bold">hoje</th>
                  <th className="py-1 pr-2 font-bold">semana</th>
                  <th className="py-1 pr-2 font-bold">demandas</th>
                  <th className="py-1 pr-2 font-bold">produção</th>
                  <th className="py-1 w-6" />
                </tr>
              </thead>
              <tbody>
                {visao.linhas.map((l) => {
                  const hab = r.porPessoa.find((p) => p.pessoaId === l.pessoaId)?.habitos || 0;
                  const aberto = l.pessoaId === pessoaId;
                  return (
                    <React.Fragment key={l.pessoaId}>
                      <tr onClick={() => abrir(l.pessoaId)} className={`cursor-pointer border-t border-white/10 hover:bg-white/[0.04] ${aberto ? 'bg-white/[0.06]' : ''}`} data-teste="visao-linha" data-pessoa={l.pessoaId} data-cor={l.cor} data-produziu={l.produziu ? 'sim' : 'nao'} data-aberto={aberto ? 'sim' : 'nao'}>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${COR[l.cor]}`} /><span className="font-bold text-white truncate">{nomeBonito(l.nome)}</span></div>
                          <p className="text-[10px] text-white/40 pl-[18px]">{l.nivel ? getLevel(l.nivel).name : ''}{l.funcaoCurta ? ` · ${l.funcaoCurta}` : ''}</p>
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          <div className="flex items-center gap-1.5"><span className={`font-bold ${hab >= 6 ? 'text-nz-verde' : hab >= 3 ? 'text-amber-300' : 'text-red-300'}`}>{hab}/8</span>
                            <span className="flex gap-0.5">{oito.habitos.map((h) => <span key={h.n} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: h.fizeram.some((f) => f.pessoaId === l.pessoaId) ? CORES_HABITO[h.n - 1] : 'rgba(255,255,255,0.12)' }} title={h.nome} />)}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">{l.hoje.vazio ? <span className="text-white/30">dia vazio</span> : <><span className={l.hoje.planejou ? 'text-white/80' : 'text-amber-300'}>{l.hoje.planejou ? 'planejou' : 'não planejou'}</span><span className="text-white/45"> · {l.hoje.feitas}/{l.hoje.total} feitas</span></>}</td>
                        <td className="py-1.5 pr-2 tabular-nums"><span className="text-white/80">{l.semana.feitas}/{l.semana.total}</span><span className="text-white/45"> · {l.semana.pct}%</span>{l.semana.atrasadas ? <span className="text-red-300"> · {l.semana.atrasadas} atrasada{l.semana.atrasadas > 1 ? 's' : ''}</span> : null}</td>
                        <td className="py-1.5 pr-2 tabular-nums">{l.demandas.total ? <><span className="text-white/80">{l.demandas.concluidas}/{l.demandas.total}</span>{l.demandas.semAgendar ? <span className="text-amber-300"> · {l.demandas.semAgendar} sem agendar</span> : null}{l.demandas.atrasadas ? <span className="text-red-300"> · {l.demandas.atrasadas} atrasada{l.demandas.atrasadas > 1 ? 's' : ''}</span> : null}</> : <span className="text-white/30">—</span>}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden"><div className="h-full" style={{ width: `${Math.max(l.semana.pct, l.demandas.pct)}%`, background: l.produziu ? 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' : 'rgba(255,255,255,0.2)' }} /></div>
                            <span className={`text-[10px] font-bold ${l.produziu ? 'text-nz-verde' : 'text-red-300'}`}>{l.produziu ? 'fez' : 'não fez'}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-white/40">{aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                      </tr>
                      {aberto && (
                        <tr className="border-t border-white/10" data-teste="detalhe-pessoa" data-pessoa={l.pessoaId}>
                          <td colSpan={7} className="p-0">
                            <div className="my-2 rounded-xl border border-white/15 p-3 sm:p-4 space-y-3" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-block h-3 w-3 rounded-full ${COR[l.cor]}`} />
                                <p className="text-[16px] font-extrabold">{nomeBonito(l.nome)}</p>
                                <p className="text-[11px] text-white/50">{l.nivel ? getLevel(l.nivel).name : ''}{l.funcaoCurta ? ` · ${l.funcaoCurta}` : ''}</p>
                                <span className="text-[10px] text-white/35">· {hab} de 8 Hábitos {oito.periodo.rotulo}</span>
                                <div className="ml-auto flex items-center gap-2">
                                  <PdfExecutivo relatorio={relatorio} />
                                  <button type="button" onClick={() => abrir(l.pessoaId)} className="text-[10px] text-white/40 hover:text-white inline-flex items-center gap-0.5" data-teste="fechar-detalhe"><ChevronUp className="w-3 h-3" /> fechar</button>
                                </div>
                              </div>
                              <div>
                                <p className={`${titulo} mb-1.5`}>Os 8 Hábitos de {primeiroNome(l.nome)} · {rotuloPeriodo}</p>
                                <HabitosDaPessoa habitos={habitosDaPessoa(oito, l.pessoaId)} />
                              </div>
                              <PainelCorporativo key={l.pessoaId} currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={l.pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={trocar} onRelatorio={setRelatorio} habitos={habitosDaPessoa(oito, l.pessoaId)} periodo={periodo} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* quem está por fora do time corporativo (ex.: o dono sem nível no painel) ainda vê o próprio painel */}
        {!carregando && proprioForaDoTime && pessoaId === currentUser.id && (
          <div className="mt-3">
            <PainelCorporativo key="proprio" currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={trocar} periodo={periodo} />
          </div>
        )}
      </div>
    </div>
  );
}
