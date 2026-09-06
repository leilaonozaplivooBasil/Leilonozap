import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Users, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
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
// A CARA (dono, 06/09, de novo): "está muito colorido, está deixando a mente
// bugada; quero bem clean, bem executivo". Então a regra de cor daqui é uma
// só: número em branco, apoio em cinza, e COR SÓ ONDE É SINAL — o semáforo da
// pessoa (verde/amarelo/vermelho), o "atrasada", o "sem agendar", o "não fez".
// Nenhum hábito tem cor própria; nenhum degradê de fundo.
//
// De cima pra baixo:
//   1. OS NÚMEROS DO TIME — o período (hoje · semana · mês); seis números numa
//      régua; os 8 Hábitos numa grade, só número, % e barra. Nenhum nome.
//   2. O DETALHAMENTO POR PESSOA — a semana em uma linha (planejaram,
//      produziram, demandas, semáforo) e uma linha por pessoa (a prévia).
//      Clicou, abre embaixo da linha: os 8 Hábitos DELA com o detalhe, o PDF
//      (no cabeçalho e no rodapé) e o Painel Corporativo dela embutido (metas
//      e demandas — sem repetir quem é, o seletor nem a semana de todo mundo,
//      que a tabela de cima já mostra).

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const COR = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dois = (n) => String(n).padStart(2, '0');

/** Um número do time na régua: rótulo pequeno, número grande em branco, apoio em cinza. Cor só se for alerta. */
function Numero({ rotulo, valor, apoio = null, alerta = false }) {
  return (
    <div className="px-3 py-2.5 min-w-0">
      <p className="text-[9px] text-white/40 uppercase tracking-wider truncate">{rotulo}</p>
      <p className={`mt-1 text-[20px] font-black tabular-nums leading-none ${alerta ? 'text-red-300' : 'text-white'}`}>{valor}</p>
      {apoio && <p className="mt-1 text-[10px] text-white/35 truncate">{apoio}</p>}
    </div>
  );
}

/** Um Hábito do time em número: quantos de quantos, %, a barra, o total. Sem nome, sem cor própria. */
function HabitoDoTime({ h }) {
  return (
    <div className="p-3 min-w-0" style={{ background: 'var(--xeos-preto, #00020C)' }} data-teste="habito" data-n={h.n} data-quantos={h.quantos}>
      <p className="text-[10px] font-bold text-white/85 truncate" title={h.pergunta}><span className="text-white/35 tabular-nums mr-1.5">{dois(h.n)}</span>{h.nome}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-[22px] font-black tabular-nums leading-none text-white" data-teste="habito-quantos">{h.quantos}<span className="text-[11px] font-semibold text-white/35"> de {h.deQuantos}</span></p>
        <p className="text-[11px] font-semibold tabular-nums text-white/45">{h.pct}%</p>
      </div>
      <div className="mt-2 h-[3px] rounded-full bg-white/[0.08] overflow-hidden"><div className="h-full rounded-full bg-white/70 transition-[width]" style={{ width: `${h.pct}%` }} /></div>
      <p className="mt-1.5 text-[10px] text-white/40 tabular-nums truncate">{h.totalRotulo} no time</p>
    </div>
  );
}

/** Os 8 Hábitos de UMA pessoa, com o detalhe: fez (e quanto) ou não fez (e por quê). O ponto é o único sinal. */
function HabitosDaPessoa({ habitos }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-lg overflow-hidden border border-white/10 bg-white/10" data-teste="habitos-pessoa">
      {habitos.map((h) => (
        <div key={h.n} className="px-2.5 py-2 min-w-0" style={{ background: 'var(--xeos-preto, #00020C)' }} data-teste="habito-pessoa" data-n={h.n} data-fez={h.fez ? 'sim' : 'nao'}>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${h.fez ? (h.fraco ? 'bg-amber-400' : 'bg-nz-verde') : 'bg-red-500'}`} />
            <p className="text-[11px] font-bold text-white truncate flex-1" title={h.nome}><span className="text-white/35 tabular-nums mr-1">{dois(h.n)}</span>{h.curto || h.nome}</p>
          </div>
          <p className={`mt-1 text-[10.5px] leading-snug ${h.fez ? 'text-white/60' : 'text-white/40'}`}>{h.texto}</p>
        </div>
      ))}
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
  const [relatorio, setRelatorio] = useState(null); // o relatório de quem está aberto (vem do painel, pro PDF)
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
  const Stat = ({ rotulo, valor, alerta = false }) => <span className="text-[11px] text-white/45">{rotulo} <b className={`font-bold tabular-nums ${alerta ? 'text-red-300' : 'text-white'}`}>{valor}</b></span>;

  return (
    <div className="space-y-4 text-white" data-teste="performance-equipe" data-periodo={periodoTipo}>
      {/* ── 1. os números do time (nenhum nome, nenhuma cor) ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="oito-habitos">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={titulo}><Trophy className="w-3 h-3 inline mr-1" />X-Performance · os números do time</p>
          <span className="text-[10px] text-white/35">· {r.pessoas} pessoa{r.pessoas === 1 ? '' : 's'} · {rotuloPeriodo}</span>
          <div className="ml-auto flex gap-1" role="tablist" data-teste="periodo">
            {[['hoje', 'hoje'], ['semana', 'semana'], ['mes', 'mês']].map(([id, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={periodoTipo === id} onClick={() => setPeriodoTipo(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${periodoTipo === id ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`} data-periodo={id}>{rotulo}</button>
            ))}
          </div>
        </div>
        {carregando ? <p className="mt-2 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo o time…</p> : time.length === 0 ? <p className="mt-2 text-[11px] text-white/50">Ninguém do time corporativo (executivo ao embaixador) no painel de controle ainda.</p> : (
          <>
            {/* a régua dos seis números */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded-lg border border-white/10 divide-x divide-white/10 [&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(n+3)]:border-t-0 sm:[&>*:nth-child(n+4)]:border-t lg:[&>*]:!border-t-0 [&>*]:border-white/10" data-teste="oito-resumo">
              <Numero rotulo="média de hábitos" valor={`${r.mediaHabitos.toLocaleString('pt-BR')} de 8`} apoio="por pessoa" />
              <Numero rotulo="com os 8 inteiros" valor={String(r.inteiros.length)} apoio={`de ${r.pessoas}`} />
              <Numero rotulo="sem nenhum hábito" valor={String(r.zerados.length)} apoio={`de ${r.pessoas}`} alerta={r.zerados.length > 0} />
              <Numero rotulo="acordaram às 5" valor={`${r.acordaram} de ${r.pessoas}`} />
              <Numero rotulo="contatos feitos" valor={String(r.contatos)} apoio="no time" />
              <Numero rotulo="venderam ou fecharam" valor={`${r.venderam} de ${r.pessoas}`} />
            </div>

            {/* os oito Hábitos em número, numa grade */}
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-lg overflow-hidden border border-white/10 bg-white/10" data-teste="oito-cartoes">
              {oito.habitos.map((h) => <HabitoDoTime key={h.n} h={h} />)}
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
        {!carregando && visao.linhas.length > 0 && (
          <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap rounded-lg border border-white/10 px-3 py-2" data-teste="visao-resumo">
            <span className="text-[10px] text-white/35 uppercase tracking-wider">semana {fmtDia(segunda)} a {fmtDia(domingo)}</span>
            <Stat rotulo="planejaram hoje" valor={`${visao.planejaramHoje} de ${visao.linhas.length}`} />
            <Stat rotulo="produziram na semana" valor={`${visao.produziram} de ${visao.linhas.length}`} />
            <Stat rotulo="demandas concluídas" valor={`${visao.demandas.concluidas} de ${visao.demandas.total} · ${visao.demandas.pct}%${visao.demandas.atrasadas ? ` · ${visao.demandas.atrasadas} atrasada${visao.demandas.atrasadas > 1 ? 's' : ''}` : ''}`} alerta={visao.demandas.atrasadas > 0} />
            <span className="ml-auto inline-flex items-center gap-2 text-[11px] tabular-nums text-white/70" title="semáforo do time">
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-nz-verde" />{visao.verdes}</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />{visao.amarelos}</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />{visao.vermelhos}</span>
            </span>
          </div>
        )}
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
                          <div className="flex items-center gap-1.5"><span className="font-bold text-white">{hab}<span className="text-white/35">/8</span></span>
                            <span className="flex gap-0.5">{oito.habitos.map((h) => <span key={h.n} className={`inline-block h-1.5 w-1.5 rounded-full ${h.fizeram.some((f) => f.pessoaId === l.pessoaId) ? 'bg-white/80' : 'bg-white/[0.12]'}`} title={h.nome} />)}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">{l.hoje.vazio ? <span className="text-white/30">dia vazio</span> : <><span className="text-white/80">{l.hoje.planejou ? 'planejou' : 'não planejou'}</span><span className="text-white/45"> · {l.hoje.feitas}/{l.hoje.total} feitas</span></>}</td>
                        <td className="py-1.5 pr-2 tabular-nums"><span className="text-white/80">{l.semana.feitas}/{l.semana.total}</span><span className="text-white/45"> · {l.semana.pct}%</span>{l.semana.atrasadas ? <span className="text-red-300"> · {l.semana.atrasadas} atrasada{l.semana.atrasadas > 1 ? 's' : ''}</span> : null}</td>
                        <td className="py-1.5 pr-2 tabular-nums">{l.demandas.total ? <><span className="text-white/80">{l.demandas.concluidas}/{l.demandas.total}</span>{l.demandas.semAgendar ? <span className="text-amber-300/90"> · {l.demandas.semAgendar} sem agendar</span> : null}{l.demandas.atrasadas ? <span className="text-red-300"> · {l.demandas.atrasadas} atrasada{l.demandas.atrasadas > 1 ? 's' : ''}</span> : null}</> : <span className="text-white/30">—</span>}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-[3px] w-20 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white/70" style={{ width: `${Math.max(l.semana.pct, l.demandas.pct)}%` }} /></div>
                            <span className={`text-[10px] font-bold ${l.produziu ? 'text-white/70' : 'text-red-300'}`}>{l.produziu ? 'fez' : 'não fez'}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-white/40">{aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                      </tr>
                      {aberto && (
                        <tr className="border-t border-white/10" data-teste="detalhe-pessoa" data-pessoa={l.pessoaId}>
                          <td colSpan={7} className="p-0">
                            <div className="my-2 rounded-xl border border-white/15 p-3 sm:p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
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
                              <PainelCorporativo key={l.pessoaId} currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={l.pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={trocar} onRelatorio={setRelatorio} habitos={habitosDaPessoa(oito, l.pessoaId)} periodo={periodo} embutido />
                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                                <span className="text-[10px] text-white/35">compartilhar este executivo</span>
                                <PdfExecutivo relatorio={relatorio} />
                              </div>
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
