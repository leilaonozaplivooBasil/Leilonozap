import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  resumoDoDia, dataISO, inicioCiclo, fimCiclo, CICLO_DIAS_UTEIS, FRASES,
  VIRTUDES, podeSerVotado, votouEmTodosOsColegas,
} from '@/lib/xgame';

// X-GAME — o painel da gamificação do Método (v1, somente leitura).
// Lê o Master Task do dia (metodo_tarefas), calcula MvM do Dia, Aplicabilidade,
// Human Token e pontos com a cotação do dia, grava a fotografia em xgame_diario
// e mostra o ranking do ciclo. Estética X-EOS: preto + branco-gelo.

const fmt2 = (n) => Number(n ?? 0).toFixed(2).replace('.', ',');

export default function XGame() {
  const [user, setUser] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [diasCiclo, setDiasCiclo] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [nomes, setNomes] = useState({});
  const [agora, setAgora] = useState(new Date());
  const [loading, setLoading] = useState(true);
  // 🧯 08/09/2026 — esta tela também grava xgame_diario (linha 78 abaixo);
  // sem o mesmo gate do Compromisso, ela reescreveria por cima uma MvM que
  // já tinha zerado por falta de voto — a régua da votação PRECISA valer
  // nas duas telas, senão a punição vale só numa e some na outra.
  const [colegasVotaveis, setColegasVotaveis] = useState([]);
  const [votosHoje, setVotosHoje] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    (async () => {
      try {
        const hoje = new Date();
        const ini = dataISO(inicioCiclo(hoje));
        const [{ data: tf }, { data: dc }, { data: rk }, { data: parts }, { data: vh }] = await Promise.all([
          supabase.from('metodo_tarefas').select('*').eq('user_id', u.id).eq('data', dataISO(hoje)).order('ordem'),
          supabase.from('xgame_diario').select('*').eq('user_id', u.id).eq('ciclo_inicio', ini).lt('data', dataISO(hoje)).order('data'),
          supabase.from('xgame_ranking_ciclo').select('*').eq('ciclo_inicio', ini).order('pontos', { ascending: false }).limit(10),
          supabase.from('xgame_participantes').select('user_id,aceita_ser_votado').eq('ativo', true),
          supabase.from('xgame_votos_mvm').select('votado_id,virtude').eq('votante_id', u.id).eq('data', dataISO(hoje)),
        ]);
        setTarefas(tf || []);
        setDiasCiclo(dc || []);
        setRanking(rk || []);
        const ids = (rk || []).map((r) => r.user_id);
        if (ids.length) {
          const { data: us } = await supabase.from('app_users').select('id,full_name,nickname').in('id', ids);
          const m = {}; (us || []).forEach((x) => { m[x.id] = x.nickname || x.full_name || 'Guerreiro(a)'; });
          setNomes(m);
        }
        // 🧯 08/09 — os mesmos colegas votáveis (sem Super Admin fechado) e os
        // mesmos votos de hoje que o Compromisso usa — a régua da votação não
        // pode divergir de tela pra tela.
        const linhas = (parts || []).filter((p) => p.user_id !== u.id);
        if (linhas.length) {
          const idsColegas = linhas.map((p) => p.user_id);
          const { data: usColegas } = await supabase.from('app_users').select('id,role').in('id', idsColegas);
          const porId = new Map((usColegas || []).map((x) => [x.id, x]));
          setColegasVotaveis(linhas.filter((p) => podeSerVotado({ role: porId.get(p.user_id)?.role, aceita_ser_votado: p.aceita_ser_votado })).map((p) => p.user_id));
        }
        setVotosHoje(vh || []);
      } catch (e) { console.error('[X-GAME] carregar', e); }
      setLoading(false);
    })();
  }, []);

  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const votouEmTodos = useMemo(() => {
    const completos = colegasVotaveis.filter((id) => votosHoje.filter((v) => v.votado_id === id).length >= VIRTUDES.length);
    return votouEmTodosOsColegas(colegasVotaveis, completos);
  }, [colegasVotaveis, votosHoje]);
  const resumo = useMemo(
    () => resumoDoDia({ tarefas, agoraMin, diasCiclo, hoje: agora, votouEmTodos }),
    [tarefas, agoraMin, diasCiclo, agora, votouEmTodos],
  );

  // Fotografia do dia: grava/atualiza o placar sem bloquear a tela.
  useEffect(() => {
    if (!user?.id || loading || !tarefas.length) return;
    const linha = {
      user_id: user.id,
      data: dataISO(agora),
      ciclo_inicio: dataISO(resumo.ciclo_inicio),
      tarefas_total: resumo.tarefas_total,
      tarefas_feitas: resumo.tarefas_feitas,
      mvm_dia: resumo.mvm_dia,
      aplicabilidade: resumo.aplicabilidade,
      token_dia: resumo.token_dia,
      cotacao: resumo.cotacao,
      pontos: resumo.pontos,
      detalhes: { leitura_feita: resumo.leitura_feita, estudo_em_dia: resumo.estudo_em_dia, dia_util: resumo.dia_util },
      updated_at: new Date().toISOString(),
    };
    supabase.from('xgame_diario').upsert(linha, { onConflict: 'user_id,data' })
      .then(({ error }) => { if (error) console.error('[X-GAME] placar', error); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading, resumo.pontos, resumo.tarefas_feitas, resumo.token_dia]);

  if (loading) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Carregando o X-GAME…</div>;
  if (!user?.id) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Entre na sua conta pra jogar o X-GAME.</div>;

  const fim = fimCiclo(resumo.ciclo_inicio);

  return (
    <div className="min-h-screen bg-[#00020C] text-[#F4F4F4]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <header className="flex items-end justify-between border-b border-[#2B2B2B] pb-4">
          <div>
            <div className="text-xs tracking-widest text-[#817E8C] uppercase">To The Top · X-EOS</div>
            <h1 className="text-3xl font-extrabold">X-GAME</h1>
            <div className="text-sm text-[#C1BECA]">{FRASES.antecipacao} — dia {resumo.dia_util} de {CICLO_DIAS_UTEIS} · cotação {fmt2(resumo.cotacao)}</div>
          </div>
          <div className="text-right">
            <div className="text-4xl">{resumo.faixa.medalha}</div>
            <div className="text-xs text-[#817E8C]">{resumo.faixa.label}</div>
          </div>
        </header>

        {/* 🧯 08/09/2026 — mesma regra explícita do Compromisso: não votar em
            todo mundo até as 22h zera a MvM do Dia. */}
        {resumo.perdeu_por_nao_votar && (
          <div className="rounded-lg border-2 border-red-500 bg-red-950/40 px-3 py-2.5 text-center">
            <p className="text-sm font-extrabold text-red-400">🗳️ MvM DO DIA ZERADA — você não votou em todos os colegas até as 22h</p>
            <p className="text-[11px] text-red-300 mt-0.5">Votar em todo mundo, todo dia, não é opcional. Amanhã dá pra recomeçar.</p>
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card titulo="Human Token" valor={fmt2(resumo.token_dia)} sub={`teto 22,22${resumo.estudo_em_dia ? '' : ' · trava 17,77 (estude!)'}`} />
          <Card titulo="MvM do Dia" valor={fmt2(resumo.mvm_dia)} sub={resumo.frase_mvm} destaque={resumo.mvm_dia < 4} />
          <Card titulo="Aplicabilidade" valor={fmt2(resumo.aplicabilidade)} sub="constância no ciclo" />
          <Card titulo="Pontos de hoje" valor={String(resumo.pontos)} sub={`${resumo.tarefas_feitas}/${resumo.tarefas_total} tarefas`} />
        </section>

        <section>
          <div className="flex justify-between text-xs text-[#817E8C] mb-1">
            <span>Progresso do dia</span>
            <span>{resumo.tarefas_total ? Math.round((resumo.tarefas_feitas / resumo.tarefas_total) * 100) : 0}%</span>
          </div>
          <div className="h-2 rounded bg-[#2B2B2B] overflow-hidden">
            <div className="h-full bg-[#F4F4F4]" style={{ width: `${resumo.tarefas_total ? (resumo.tarefas_feitas / resumo.tarefas_total) * 100 : 0}%` }} />
          </div>
        </section>

        <section className="space-y-1">
          <h2 className="text-sm uppercase tracking-widest text-[#817E8C] mb-2">Master Task — tempo real</h2>
          {resumo.tarefas.length === 0 && (
            <div className="text-sm text-[#C1BECA] border border-[#2B2B2B] rounded p-4">
              Nenhuma tarefa gerada pra hoje. Abra o Método e gere seu dia a partir da Rotina Perfeita.
            </div>
          )}
          {resumo.tarefas.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border border-[#1c1f28] rounded px-3 py-2">
              <span className="w-12 text-xs text-[#817E8C] tabular-nums">{t.hora || '—'}</span>
              <span className={`flex-1 text-sm ${t.feito ? 'line-through text-[#817E8C]' : ''}`}>{t.titulo}</span>
              <span className={`text-xs font-bold ${t.estado.cor}`}>{t.estado.id === 'PERDIDO' ? `PERDIDO · ${FRASES.impacto}` : t.estado.label}</span>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-[#817E8C] mb-2">Ranking do ciclo · até {fim.toLocaleDateString('pt-BR')}</h2>
          {ranking.length === 0 && <div className="text-sm text-[#C1BECA]">Ninguém pontuou neste ciclo ainda. Seja o primeiro.</div>}
          {ranking.map((r, i) => (
            <div key={r.user_id} className={`flex items-center gap-3 px-3 py-2 rounded ${r.user_id === user.id ? 'bg-[#14161c] border border-[#2B2B2B]' : ''}`}>
              <span className="w-6 text-sm text-[#817E8C] tabular-nums">{i + 1}º</span>
              <span className="flex-1 text-sm">{nomes[r.user_id] || '—'}</span>
              <span className="text-xs text-[#817E8C]">token {fmt2(r.token_medio)}</span>
              <span className="text-sm font-bold tabular-nums">{r.pontos} pts</span>
            </div>
          ))}
        </section>

        <footer className="text-center text-xs text-[#4c4a56] pt-4 border-t border-[#1c1f28]">
          {FRASES.reacao} · {FRASES.realtime}
        </footer>
      </div>
    </div>
  );
}

function Card({ titulo, valor, sub, destaque = false }) {
  return (
    <div className={`rounded border p-3 ${destaque ? 'border-red-500/60' : 'border-[#2B2B2B]'} bg-[#0b0d14]`}>
      <div className="text-[11px] uppercase tracking-wider text-[#817E8C]">{titulo}</div>
      <div className="text-2xl font-extrabold tabular-nums">{valor}</div>
      <div className={`text-[11px] mt-0.5 ${destaque ? 'text-red-400 font-bold' : 'text-[#C1BECA]'}`}>{sub}</div>
    </div>
  );
}
