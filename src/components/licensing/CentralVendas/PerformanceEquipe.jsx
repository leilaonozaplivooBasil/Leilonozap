import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Users, Sun, CalendarRange, Inbox } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { getLevel } from '@/lib/careerLevels';
import { visaoExecutiva } from '@/lib/encontro';
import { segundaDaSemana } from '@/lib/xperformance';
import PainelCorporativo from '@/components/licensing/CentralVendas/PainelCorporativo';

// 📊 PERFORMANCE — a versão SEM administração (dono, 06/09/2026):
// "não quero na parte administrativa, quero junto do fluxo, onde tem os 8
// Hábitos: o performance ali dentro sem função administrativa. E dentro dele
// os dados, como uma visão executiva de todo mundo — quem fez a produção,
// quem não fez — e o painel corporativo de cada um."
//
// Então: em cima, TODO MUNDO numa tabela (semáforo, hoje, a semana, as
// demandas); clica na pessoa e o Painel Corporativo dela abre embaixo. Sem
// dinheiro, sem fixo, sem distribuir: isso continua na gestão (X-Performance).

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const COR = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function PerformanceEquipe({ currentUser, hojeISO, gestao = false }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const segunda = segundaDaSemana(hoje);
  const domingo = somaDias(segunda, 6);
  const [usuarios, setUsuarios] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [demandas, setDemandas] = useState([]);
  const [tarefasDasDemandas, setTarefasDasDemandas] = useState([]);
  const [cards, setCards] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pessoaId, setPessoaId] = useState(currentUser?.id || null);
  const [versao, setVersao] = useState(0); // recarrega quando o painel de baixo mexe

  const carregar = useCallback(async () => {
    const [u, p, t, d] = await Promise.all([
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.from('xgame_participantes').select('user_id,funcao_titulo,cargo').eq('ativo', true),
      supabase.from('metodo_tarefas').select('id,user_id,data,feito,conferido,origem,prazo_em,pronto_em').gte('data', segunda).lte('data', domingo),
      supabase.from('xperf_demandas').select('*').gte('created_at', `${segunda}T00:00:00`).order('created_at'),
    ]);
    setUsuarios(u.data || []); setParticipantes(p.data || []); setTarefas(t.data || []); setDemandas(d.data || []);
    const idsT = (d.data || []).map((x) => x.tarefa_id).filter(Boolean);
    const idsC = (d.data || []).map((x) => x.card_id).filter(Boolean);
    const [tt, ct] = await Promise.all([
      idsT.length ? supabase.from('metodo_tarefas').select('id,feito,conferido,pronto_em').in('id', idsT) : Promise.resolve({ data: [] }),
      idsC.length ? supabase.from('metodo_quadro').select('id,coluna').in('id', idsC) : Promise.resolve({ data: [] }),
    ]);
    setTarefasDasDemandas(tt.data || []); setCards(ct.data || []);
    setCarregando(false);
  }, [segunda, domingo]);
  useEffect(() => { carregar(); }, [carregar, versao]);

  const time = useMemo(() => timeCorporativo(usuarios).map((p) => {
    const part = participantes.find((x) => x.user_id === p.id);
    const { funcao } = funcaoDaPessoaComOrigem({ funcaoTitulo: part?.funcao_titulo, nivel: p.nivel, nome: p.nome });
    return { ...p, funcaoId: funcao?.id || null, funcaoCurta: funcao?.curto || funcao?.nome || null };
  }), [usuarios, participantes]);
  useEffect(() => { if (time.length && !time.some((p) => p.id === pessoaId) && pessoaId !== currentUser?.id) setPessoaId(time[0].id); }, [time, pessoaId, currentUser?.id]);

  const visao = useMemo(() => visaoExecutiva({ time, tarefas, demandas, tarefasDasDemandas, cards, hojeISO: hoje, segunda }), [time, tarefas, demandas, tarefasDasDemandas, cards, hoje, segunda]);

  return (
    <div className="space-y-4 text-white" data-teste="performance-equipe">
      <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={caixa} data-teste="visao-todos">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={titulo}><Users className="w-3 h-3 inline mr-1" />Visão executiva de todo mundo</p>
          <span className="text-[10px] text-white/35">· semana de {fmtDia(segunda)} a {fmtDia(domingo)} · quem fez a produção e quem não fez · clique na pessoa pra abrir o painel dela</span>
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
            {visao.linhas.length === 0 ? <p className="mt-2 text-[11px] text-amber-300/80">Ninguém do time corporativo (executivo ao embaixador) no painel de controle ainda.</p> : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-[11px]" data-teste="visao-tabela">
                  <thead>
                    <tr className="text-[9px] text-white/35 uppercase tracking-wider text-left">
                      <th className="py-1 pr-2 font-bold">quem</th>
                      <th className="py-1 pr-2 font-bold">hoje</th>
                      <th className="py-1 pr-2 font-bold">semana</th>
                      <th className="py-1 pr-2 font-bold">demandas</th>
                      <th className="py-1 font-bold">produção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visao.linhas.map((l) => (
                      <tr key={l.pessoaId} onClick={() => setPessoaId(l.pessoaId)} className={`cursor-pointer border-t border-white/10 hover:bg-white/[0.04] ${l.pessoaId === pessoaId ? 'bg-white/[0.06]' : ''}`} data-teste="visao-linha" data-pessoa={l.pessoaId} data-cor={l.cor} data-produziu={l.produziu ? 'sim' : 'nao'}>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2"><span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${COR[l.cor]}`} /><span className="font-bold text-white truncate">{l.nome}</span></div>
                          <p className="text-[10px] text-white/40 pl-[18px]">{l.nivel ? getLevel(l.nivel).name : ''}{l.funcaoCurta ? ` · ${l.funcaoCurta}` : ''}</p>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🏢 o painel corporativo de quem foi clicado */}
      <PainelCorporativo key={pessoaId || 'ninguem'} currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={setPessoaId} />
    </div>
  );
}
