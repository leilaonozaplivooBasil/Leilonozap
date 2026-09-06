import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Users, Sun, CalendarRange, Inbox, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { getLevel } from '@/lib/careerLevels';
import { visaoExecutiva } from '@/lib/encontro';
import { habitosDoTime, periodoDe } from '@/lib/habitosDoTime';
import { segundaDaSemana } from '@/lib/xperformance';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { nomeBonito, primeiroNome, agruparPorMotivo, habitosDaPessoa } from '@/lib/relatorioExecutivo';
import PainelCorporativo from '@/components/licensing/CentralVendas/PainelCorporativo';

// 🏆 X-PERFORMANCE — a versão SEM administração (dono, 06/09/2026):
// "a X-Performance vai abrir os oito hábitos do sucesso do time, numa visão
// executiva: quantos fizeram quadro dos sonhos, quantos contatos, quem não
// acordou… do primeiro até o oitavo. Quem vendeu, quem não vendeu. Expor
// mesmo, com riqueza de detalhes, sem ficar sujo. E o painel corporativo de
// cada um." O administrativo (X-Game, distribuir tarefa) ficou na ADM X-Game.
//
// De cima pra baixo: o período (hoje · semana · mês) e o resumo; os OITO
// cartões, um por Hábito — número do time, quem fez (com o detalhe) e quem
// não fez (com o motivo); a tabela por pessoa; e o Painel Corporativo de quem
// foi clicado.
//
// 🧼 LIMPEZA (dono, 06/09, com 16 pessoas na tela): "quero mais organizado,
// mais limpo, mais bonito". Então: nome bonito (o painel guarda "JOSÉ AMÂNCIO"
// e "DISTRIBUIDOR"); quem FEZ continua em etiqueta (é o que se quer ver); quem
// NÃO FEZ vira uma linha por MOTIVO — "sem quadro dos sonhos · Jean, Karen,
// Beatriz +6" — com "ver todos" pra abrir. Cada nome é clicável e abre o
// painel da pessoa. E o PDF do executivo sai do Painel Corporativo, embaixo.

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const COR = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const CORES_HABITO = ['#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#e879f9'];

const LIMITE_NOMES = 5;
const LIMITE_CHIPS = 8;

function Chip({ nome, detalhe, fraco, onClick }) {
  return (
    <button type="button" onClick={onClick} title={detalhe ? `${nomeBonito(nome)} · ${detalhe}` : nomeBonito(nome)} className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-tight transition-colors ${fraco ? 'border-amber-400/30 bg-amber-400/[0.06] text-amber-100 hover:bg-amber-400/15' : 'border-white/10 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/[0.08]'}`} data-teste="chip">
      <span className="font-bold truncate">{primeiroNome(nome)}</span>
      {detalhe && <span className={`truncate ${fraco ? 'text-amber-100/60' : 'text-white/45'}`}>· {detalhe}</span>}
    </button>
  );
}

/** Um Hábito do time: o número grande, a barra, quem fez em etiqueta e quem não fez agrupado pelo motivo. */
function CartaoHabito({ h, cor, onPessoa }) {
  const [aberto, setAberto] = useState(false);
  const grupos = useMemo(() => agruparPorMotivo(h.naoFizeram), [h.naoFizeram]);
  const chipsEscondidos = Math.max(0, h.fizeram.length - LIMITE_CHIPS);
  const nomesEscondidos = grupos.reduce((s, g) => s + Math.max(0, g.pessoas.length - LIMITE_NOMES), 0);
  const temMais = chipsEscondidos > 0 || nomesEscondidos > 0;
  const fizeram = aberto ? h.fizeram : h.fizeram.slice(0, LIMITE_CHIPS);
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden" style={caixa} data-teste="habito" data-n={h.n} data-quantos={h.quantos} data-aberto={aberto ? 'sim' : 'nao'}>
      <div className="p-3 pb-2.5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[15px] font-black tabular-nums" style={{ background: `${cor}22`, color: cor }}>{h.n}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold leading-tight text-white sm:truncate">{h.nome}</p>
            <p className="text-[10px] text-white/40 line-clamp-2 sm:line-clamp-1">{h.sub} · {h.pergunta}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[19px] font-black tabular-nums leading-none" style={{ color: cor }} data-teste="habito-quantos">{h.quantos}<span className="text-[11px] font-bold text-white/35"> de {h.deQuantos}</span></p>
            <p className="mt-0.5 text-[10px] text-white/45 tabular-nums">{h.totalRotulo} no time</p>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className="h-full rounded-full transition-[width]" style={{ width: `${h.pct}%`, background: cor }} /></div>
      </div>
      <div className="border-t border-white/[0.06] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1" data-teste="fizeram">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-nz-verde-claro/90">fizeram{h.quantos ? ` (${h.quantos})` : ''}</span>
          {h.fizeram.length === 0 && <span className="text-[10px] text-white/30">ninguém ainda</span>}
          {fizeram.map((f) => <Chip key={f.pessoaId} nome={f.nome} detalhe={f.detalhe} fraco={f.fraco} onClick={() => onPessoa(f.pessoaId)} />)}
          {!aberto && chipsEscondidos > 0 && <button type="button" onClick={() => setAberto(true)} className="text-[10px] font-bold text-white/45 hover:text-white">+{chipsEscondidos}</button>}
        </div>
      </div>
      {h.naoFizeram.length > 0 && (
        <div className="border-t border-white/[0.06] px-3 py-2" data-teste="nao-fizeram">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-red-300/80">não fez ({h.naoFizeram.length})</span>
            {temMais && (
              <button type="button" onClick={() => setAberto((v) => !v)} className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-white/40 hover:text-white" data-teste="ver-todos">
                {aberto ? <><ChevronUp className="w-3 h-3" /> menos</> : <><ChevronDown className="w-3 h-3" /> ver todos</>}
              </button>
            )}
          </div>
          <div className="mt-1 space-y-0.5">
            {grupos.map((g) => {
              const pessoas = aberto ? g.pessoas : g.pessoas.slice(0, LIMITE_NOMES);
              const resto = g.pessoas.length - pessoas.length;
              return (
                <p key={g.motivo} className="text-[11px] leading-snug" data-teste="motivo" data-motivo={g.motivo} data-quantos={g.quantos}>
                  <span className="text-red-200/70">{g.motivo}</span>
                  <span className="text-white/25"> · </span>
                  {pessoas.map((p, i) => (
                    <React.Fragment key={p.pessoaId}>
                      <button type="button" onClick={() => onPessoa(p.pessoaId)} className="font-semibold text-white/80 hover:text-white hover:underline" data-teste="nome" data-pessoa={p.pessoaId}>{primeiroNome(p.nome)}</button>
                      {i < pessoas.length - 1 ? ', ' : ''}
                    </React.Fragment>
                  ))}
                  {resto > 0 && <button type="button" onClick={() => setAberto(true)} className="text-white/40 hover:text-white"> +{resto}</button>}
                </p>
              );
            })}
          </div>
        </div>
      )}
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
  const [pessoaId, setPessoaId] = useState(currentUser?.id || null);
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
  useEffect(() => { if (time.length && !time.some((p) => p.id === pessoaId) && pessoaId !== currentUser?.id) setPessoaId(time[0].id); }, [time, pessoaId, currentUser?.id]);

  const tarefasDaSemana = useMemo(() => tarefas.filter((t) => String(t.data).slice(0, 10) >= segunda && String(t.data).slice(0, 10) <= domingo), [tarefas, segunda, domingo]);
  const visao = useMemo(() => visaoExecutiva({ time, tarefas: tarefasDaSemana, demandas, tarefasDasDemandas, cards, hojeISO: hoje, segunda }), [time, tarefasDaSemana, demandas, tarefasDasDemandas, cards, hoje, segunda]);
  const oito = useMemo(() => habitosDoTime({ time, tarefas, perfis, clientes, vendas, oportunidades, entregaveis, periodo, hojeISO: hoje }), [time, tarefas, perfis, clientes, vendas, oportunidades, entregaveis, periodo, hoje]);

  return (
    <div className="space-y-4 text-white" data-teste="performance-equipe" data-periodo={periodoTipo}>
      {/* ── os 8 Hábitos do time ── */}
      <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(217,70,239,0.10) 60%, rgba(0,0,0,0))' }} data-teste="oito-habitos">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={titulo}><Trophy className="w-3 h-3 inline mr-1" />X-Performance · os 8 Hábitos do time</p>
          <span className="text-[10px] text-white/35">· quem fez, quem não fez — {oito.periodo.rotulo}{periodoTipo !== 'hoje' ? ` (${fmtDia(oito.periodo.de)} a ${fmtDia(oito.periodo.ate)})` : ` · ${fmtDia(hoje)}`}</span>
          <div className="ml-auto flex gap-1" role="tablist" data-teste="periodo">
            {[['hoje', 'hoje'], ['semana', 'semana'], ['mes', 'mês']].map(([id, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={periodoTipo === id} onClick={() => setPeriodoTipo(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${periodoTipo === id ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`} data-periodo={id}>{rotulo}</button>
            ))}
          </div>
        </div>
        {carregando ? <p className="mt-2 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo o time…</p> : time.length === 0 ? <p className="mt-2 text-[11px] text-amber-300/80">Ninguém do time corporativo (executivo ao embaixador) no painel de controle ainda.</p> : (
          <>
            {/* o resumo */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-teste="oito-resumo">
              {[
                ['acordaram', `${oito.resumo.acordaram} de ${oito.resumo.pessoas}`, oito.resumo.acordaram < oito.resumo.pessoas ? 'text-amber-300' : 'text-nz-verde', Sun],
                ['contatos feitos', String(oito.resumo.contatos), 'text-white', Users],
                ['venderam ou fecharam', `${oito.resumo.venderam} de ${oito.resumo.pessoas}`, oito.resumo.venderam ? 'text-nz-verde' : 'text-red-300', Inbox],
                ['média de hábitos por pessoa', `${oito.resumo.mediaHabitos.toLocaleString('pt-BR')} de 8`, oito.resumo.mediaHabitos >= 6 ? 'text-nz-verde' : oito.resumo.mediaHabitos >= 3 ? 'text-amber-300' : 'text-red-300', CalendarRange],
              ].map(([rotulo, valor, cor, Icone]) => (
                <div key={rotulo} className="rounded-lg border border-white/10 px-3 py-2.5" style={caixa}>
                  <p className="text-[9px] text-white/35 uppercase tracking-wider"><Icone className="w-3 h-3 inline mr-1" />{rotulo}</p>
                  <p className={`mt-0.5 text-[18px] font-black tabular-nums leading-none ${cor}`}>{valor}</p>
                </div>
              ))}
            </div>
            {(oito.resumo.inteiros.length > 0 || oito.resumo.zerados.length > 0) && (
              <p className="mt-1.5 text-[11px] text-white/55">
                {oito.resumo.inteiros.length > 0 && <span className="text-nz-verde">🏆 os 8 Hábitos inteiros: {oito.resumo.inteiros.map(primeiroNome).join(', ')}</span>}
                {oito.resumo.inteiros.length > 0 && oito.resumo.zerados.length > 0 && ' · '}
                {oito.resumo.zerados.length > 0 && <span className="text-red-300">nenhum hábito: {oito.resumo.zerados.map(primeiroNome).join(', ')}</span>}
              </p>
            )}

            {/* os oito cartões */}
            <div className="mt-3 grid md:grid-cols-2 gap-2.5" data-teste="oito-cartoes">
              {oito.habitos.map((h) => <CartaoHabito key={h.n} h={h} cor={CORES_HABITO[h.n - 1]} onPessoa={setPessoaId} />)}
            </div>
          </>
        )}
      </div>

      {/* ── por pessoa (a semana) ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="visao-todos">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={titulo}><Users className="w-3 h-3 inline mr-1" />Por pessoa</p>
          <span className="text-[10px] text-white/35">· semana de {fmtDia(segunda)} a {fmtDia(domingo)} · clique na pessoa pra abrir o painel dela</span>
        </div>
        {carregando ? <p className="mt-2 text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo a semana…</p> : (
          <>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-teste="visao-resumo">
              {[
                ['planejaram hoje', `${visao.planejaramHoje} de ${visao.linhas.length}`, visao.semPlanejarHoje ? 'text-amber-300' : 'text-nz-verde', Sun],
                ['produziram na semana', `${visao.produziram} de ${visao.linhas.length}`, visao.naoProduziram ? 'text-amber-300' : 'text-nz-verde', CalendarRange],
                ['demandas concluídas', `${visao.demandas.concluidas} de ${visao.demandas.total} · ${visao.demandas.pct}%`, visao.demandas.atrasadas ? 'text-red-300' : 'text-white', Inbox],
                ['semáforo', `${visao.verdes} 🟢 · ${visao.amarelos} 🟡 · ${visao.vermelhos} 🔴`, 'text-white', null],
              ].map(([rotulo, valor, cor, Icone]) => (
                <div key={rotulo} className="rounded-lg border border-white/10 px-2.5 py-2">
                  <p className="text-[9px] text-white/35 uppercase tracking-wider">{Icone ? <Icone className="w-3 h-3 inline mr-1" /> : null}{rotulo}</p>
                  <p className={`text-[13px] font-extrabold tabular-nums ${cor}`}>{valor}</p>
                </div>
              ))}
            </div>
            {visao.linhas.length > 0 && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-[11px]" data-teste="visao-tabela">
                  <thead>
                    <tr className="text-[9px] text-white/35 uppercase tracking-wider text-left">
                      <th className="py-1 pr-2 font-bold">quem</th>
                      <th className="py-1 pr-2 font-bold">hábitos {oito.periodo.rotulo}</th>
                      <th className="py-1 pr-2 font-bold">hoje</th>
                      <th className="py-1 pr-2 font-bold">semana</th>
                      <th className="py-1 pr-2 font-bold">demandas</th>
                      <th className="py-1 font-bold">produção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visao.linhas.map((l) => {
                      const hab = oito.resumo.porPessoa.find((p) => p.pessoaId === l.pessoaId)?.habitos || 0;
                      return (
                        <tr key={l.pessoaId} onClick={() => setPessoaId(l.pessoaId)} className={`cursor-pointer border-t border-white/10 hover:bg-white/[0.04] ${l.pessoaId === pessoaId ? 'bg-white/[0.06]' : ''}`} data-teste="visao-linha" data-pessoa={l.pessoaId} data-cor={l.cor} data-produziu={l.produziu ? 'sim' : 'nao'}>
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
                          <td className="py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden"><div className="h-full" style={{ width: `${Math.max(l.semana.pct, l.demandas.pct)}%`, background: l.produziu ? 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' : 'rgba(255,255,255,0.2)' }} /></div>
                              <span className={`text-[10px] font-bold ${l.produziu ? 'text-nz-verde' : 'text-red-300'}`}>{l.produziu ? 'fez' : 'não fez'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🏢 o painel corporativo de quem foi clicado */}
      <PainelCorporativo key={pessoaId || 'ninguem'} currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={setPessoaId} habitos={habitosDaPessoa(oito, pessoaId)} periodo={periodo} />
    </div>
  );
}
