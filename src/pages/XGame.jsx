import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import {
  resumoDoDia, dataISO, inicioCicloOficial, inicioDaSemana, fimCiclo, CICLO_DIAS_UTEIS, FRASES,
  VIRTUDES, podeSerVotado, votouEmTodosOsColegas,
  ofensiva, OFENSIVA_META, missoesDaSemana,
} from '@/lib/xgame';
import { DIAS_FIXO } from '@/lib/distribuicaoFixo';
import { BarraProgresso } from '@/components/licensing/CentralVendas/VerificacaoUI';
import XGameVisaoExecutiva from '@/components/licensing/CentralVendas/XGameVisaoExecutiva';

// X-GAME — o ESPAÇO DEDICADO da gamificação do Método (DIR-97, 08/09/2026).
// Até aqui esta página era órfã — ninguém no app linkava pra ela — e tinha
// ficado pra trás: mostrava Human Token e MvM, mas nunca ganhou X-Pay,
// ofensiva (fogo) nem missões da semana, que o Compromisso (CrmMetodo.jsx)
// já tinha. Pior — o retrato que ela gravava em xgame_diario nunca incluía
// xpay_ganho/xpay_perdido (o mesmo bug que o Compromisso já tinha corrigido
// no seu próprio grava-placar), então visitar esta página escreveria dado
// incompleto por cima do que o Compromisso gravou. Agora ela busca o mesmo
// participante/ciclo oficial, calcula com a MESMA função pura (resumoDoDia)
// que o Compromisso usa, e a seção do time é a MESMA XGameVisaoExecutiva
// que já existe dentro da Verificação do Progresso — nada duplicado, só o
// individual reunido com o time num espaço só. Estética X-EOS: preto + branco-gelo.
//
// O que fica de fora, de propósito: votar nas 10 Virtudes (isso já mora no
// Compromisso, onde a ação faz sentido) e o Human Token OFICIAL do ciclo
// (que soma a votação dos pares — precisaria repetir aquele cálculo inteiro
// aqui). Esta página é o retrato rico do que já está gravado, não mais um
// lugar pra agir.

const fmt2 = (n) => Number(n ?? 0).toFixed(2).replace('.', ',');

export default function XGame() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [diasCiclo, setDiasCiclo] = useState([]);
  const [participante, setParticipante] = useState(null);
  const [cicloConfig, setCicloConfig] = useState(null);
  const [historicoOfensiva, setHistoricoOfensiva] = useState([]);
  const [votosDias, setVotosDias] = useState([]);
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
        const [{ data: part }, { data: cfg }, { data: tf }, { data: parts }, { data: vh }] = await Promise.all([
          supabase.from('xgame_participantes').select('*').eq('user_id', u.id).maybeSingle(),
          supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle(),
          supabase.from('metodo_tarefas').select('*').eq('user_id', u.id).eq('data', dataISO(hoje)).order('ordem'),
          supabase.from('xgame_participantes').select('user_id,aceita_ser_votado').eq('ativo', true),
          supabase.from('xgame_votos_mvm').select('votado_id,virtude').eq('votante_id', u.id).eq('data', dataISO(hoje)),
        ]);
        setParticipante(part || null);
        setCicloConfig(cfg?.ciclo_inicio || null);
        setTarefas(tf || []);

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

        const ini = dataISO(inicioCicloOficial(cfg?.ciclo_inicio || null, hoje));
        const iniSemana = dataISO(inicioDaSemana(hoje));
        const [{ data: dc }, { data: hist }, { data: vd }] = await Promise.all([
          supabase.from('xgame_diario').select('*').eq('user_id', u.id).eq('ciclo_inicio', ini).lt('data', dataISO(hoje)).order('data'),
          supabase.from('xgame_diario').select('data,tarefas_total,tarefas_feitas,mvm_dia,detalhes').eq('user_id', u.id).lt('data', dataISO(hoje)).order('data', { ascending: false }).limit(90),
          supabase.from('xgame_votos_mvm').select('data').eq('votante_id', u.id).gte('data', iniSemana),
        ]);
        setDiasCiclo(dc || []);
        setHistoricoOfensiva(hist || []);
        setVotosDias([...new Set((vd || []).map((v) => String(v.data).slice(0, 10)))]);
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
    () => resumoDoDia({ tarefas, agoraMin, diasCiclo, hoje: agora, participante, cicloConfigISO: cicloConfig, votouEmTodos }),
    [tarefas, agoraMin, diasCiclo, agora, participante, cicloConfig, votouEmTodos],
  );

  // 🔥 Ofensiva: hoje entra na conta assim que fecha 80%+ do Master Task.
  const hojeFechou = resumo.tarefas_total > 0 && resumo.tarefas_feitas / resumo.tarefas_total >= OFENSIVA_META;
  const fogo = useMemo(() => ofensiva(historicoOfensiva, agora, hojeFechou), [historicoOfensiva, agora, hojeFechou]);

  // 🎯 Missões da semana — mesmo cálculo do Compromisso, com o histórico +
  // o dia de hoje somado na hora.
  const missoes = useMemo(() => {
    const iniSemana = dataISO(inicioDaSemana(agora));
    const votou = new Set(votosDias);
    const dias = historicoOfensiva
      .filter((d) => String(d.data).slice(0, 10) >= iniSemana)
      .map((d) => ({
        pct: Number(d.tarefas_total) > 0 ? Number(d.tarefas_feitas) / Number(d.tarefas_total) : 0,
        leitura: !!d.detalhes?.leitura_feita,
        mvm: Number(d.mvm_dia) || 0,
        votou: votou.has(String(d.data).slice(0, 10)),
      }))
      .reverse();
    if (resumo.tarefas_total > 0) {
      dias.push({
        pct: resumo.tarefas_feitas / resumo.tarefas_total,
        leitura: resumo.leitura_feita,
        mvm: resumo.mvm_dia,
        votou: votou.has(dataISO(agora)),
      });
    }
    return missoesDaSemana(dias, agora);
  }, [historicoOfensiva, votosDias, resumo, agora]);

  // Fotografia do dia: grava/atualiza o placar sem bloquear a tela. Mesmo
  // formato de `detalhes` do Compromisso — inclui xpay_ganho/xpay_perdido,
  // que o time (XGameVisaoExecutiva) lê pro X-Pay do ciclo.
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
      detalhes: {
        leitura_feita: resumo.leitura_feita, estudo_em_dia: resumo.estudo_em_dia, dia_util: resumo.dia_util,
        xpay_ganho: resumo.xpay?.ganho || 0, xpay_perdido: resumo.xpay?.perdido || 0,
        ...resumo.contagens,
      },
      updated_at: new Date().toISOString(),
    };
    supabase.from('xgame_diario').upsert(linha, { onConflict: 'user_id,data' })
      .then(({ error }) => { if (error) console.error('[X-GAME] placar', error); });
  }, [user?.id, loading, resumo.pontos, resumo.tarefas_feitas, resumo.token_dia]);

  if (loading) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Carregando o X-GAME…</div>;
  if (!user?.id) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Entre na sua conta pra jogar o X-GAME.</div>;

  const fim = fimCiclo(resumo.ciclo_inicio);
  const pctDia = resumo.tarefas_total ? (resumo.tarefas_feitas / resumo.tarefas_total) * 100 : 0;
  const meuNome = user.nickname || user.full_name || 'Guerreiro(a)';

  return (
    <div className="min-h-screen bg-[#00020C] text-[#F4F4F4]">
      {/* 🏛️ DIR-97.1 — a tela era uma coluna estreita (max-w-3xl) num app
          que promete "executivo". Agora ocupa a largura de ponta a ponta
          (ordem do dono: "a página tem que pegar tudo"), com o SEU dia
          num hero cheio no topo e O TIME num painel largo embaixo — as
          duas metades que ele pediu pra enxergar lado a lado, não uma
          atrás da outra escondida numa coluna. */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">

        {/* 🧭 08/09/2026 — "o botão pra eu ir pras outras áreas não pode
            sair" (ordem do dono, olhando o preview): /XGame é uma rota
            própria, fora do painel do Top College — não herda o menu
            lateral de lá. Sem isto, chegar aqui pelo banner "Visão
            Executiva X-GAME" virava rua sem saída. */}
        <button
          type="button"
          onClick={() => navigate('/Licensing?tab=catalogo&catalogTab=catalogo-crm')}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#C1BECA] hover:text-[#F4F4F4] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar pro Top College
        </button>

        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B2B2B] pb-5">
          <div>
            <div className="text-[11px] tracking-[0.28em] text-[#817E8C] uppercase font-semibold">To The Top · X-EOS · Visão Executiva</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">X-GAME</h1>
            <div className="text-sm text-[#C1BECA] mt-1">Boa {new Date().getHours() < 12 ? 'manhã' : new Date().getHours() < 18 ? 'tarde' : 'noite'}, {meuNome} — {FRASES.antecipacao.toLowerCase()} · dia {resumo.dia_util} de {CICLO_DIAS_UTEIS} · cotação {fmt2(resumo.cotacao)}</div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] px-5 py-3 self-start sm:self-auto">
            <div className="text-4xl leading-none">{resumo.faixa.medalha}</div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#817E8C]">faixa do dia</div>
              <div className="text-sm font-extrabold">{resumo.faixa.label}</div>
            </div>
          </div>
        </header>

        {/* 🧯 08/09/2026 — mesma regra explícita do Compromisso: não votar em
            todo mundo até as 22h zera a MvM do Dia. */}
        {resumo.perdeu_por_nao_votar && (
          <div className="rounded-xl border-2 border-red-500 bg-red-950/40 px-4 py-3 text-center">
            <p className="text-sm font-extrabold text-red-400">🗳️ MvM DO DIA ZERADA — você não votou em todos os colegas até as 22h</p>
            <p className="text-[11px] text-red-300 mt-0.5">Votar em todo mundo, todo dia, não é opcional. Amanhã dá pra recomeçar.</p>
          </div>
        )}

        {/* ══ SEU DIA — o hero, cheio de largura ══ */}
        <section data-teste="xgame-meu-dia">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#817E8C]">Seu dia</span>
            <span className="h-px flex-1 bg-[#2B2B2B]" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card titulo="Human Token" valor={fmt2(resumo.token_dia)} sub={`teto 22,22${resumo.estudo_em_dia ? '' : ' · trava 17,77 (estude!)'}`} />
            <Card titulo="MvM do Dia" valor={fmt2(resumo.mvm_dia)} sub={resumo.frase_mvm} destaque={resumo.mvm_dia < 4} />
            <Card
              titulo="X-Pay de hoje" valor={resumo.xpay ? `R$ ${fmt2(resumo.xpay.ganho)}` : '—'}
              sub={resumo.xpay?.perdido > 0 ? `− R$ ${fmt2(resumo.xpay.perdido)} perdido` : `R$ ${fmt2(resumo.xpay?.emJogo || 0)} em jogo`}
              destaque={resumo.xpay?.perdido > 0}
              dica={`O seu fixo ÷ ${DIAS_FIXO} dias de operação, repartido pelo peso de cada tarefa. Tarefa perdida é dinheiro que sai do resultado.`}
            />
            <Card titulo="Pontos de hoje" valor={String(resumo.pontos)} sub={`${resumo.tarefas_feitas}/${resumo.tarefas_total} tarefas`} />
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-4 mt-4">
            {/* Master Task — a coluna principal, agora larga de verdade */}
            <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4 sm:p-5">
              <h2 className="text-xs uppercase tracking-widest text-[#817E8C] mb-3">Master Task — tempo real</h2>
              {resumo.tarefas.length === 0 && (
                <div className="text-sm text-[#C1BECA] border border-[#2B2B2B] rounded-lg p-4">
                  Nenhuma tarefa gerada pra hoje. Abra o Método e gere seu dia a partir da Rotina Perfeita.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-2">
                {resumo.tarefas.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 border border-[#1c1f28] rounded-lg px-3 py-2">
                    <span className="w-12 text-xs text-[#817E8C] tabular-nums shrink-0">{t.hora || '—'}</span>
                    <span className={`flex-1 min-w-0 truncate text-sm ${t.feito ? 'line-through text-[#817E8C]' : ''}`}>{t.titulo}</span>
                    <span className={`text-[11px] font-bold shrink-0 ${t.estado.cor}`}>{t.estado.id === 'PERDIDO' ? 'PERDIDO' : t.estado.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar — ofensiva + progresso + missões, sempre à vista */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4">
                <p className="text-sm font-bold">
                  🔥 {fogo.dias} {fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva
                  {fogo.congelou && <span className="ml-2 text-[10px] font-semibold text-sky-400">🧊 congelador usado</span>}
                </p>
                <p className="text-[11px] text-[#817E8C] mt-1">
                  {hojeFechou ? 'hoje FECHADO ✔ — o fogo continua' : `feche ${Math.round(OFENSIVA_META * 100)}% do dia pra ${fogo.dias > 0 ? 'manter' : 'acender'} o fogo`}
                </p>
                <div className="flex justify-between text-[11px] text-[#817E8C] mt-3 mb-1">
                  <span>Progresso do dia</span>
                  <span>{Math.round(pctDia)}%</span>
                </div>
                <BarraProgresso pct={pctDia} dialeto="escuro" altura="media" corClasse="bg-[#F4F4F4]" trilhoClasse="bg-[#2B2B2B]" />
              </div>

              <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4" data-teste="missoes-da-semana">
                <h2 className="text-xs uppercase tracking-widest text-[#817E8C] mb-3">Missões da semana</h2>
                <div className="space-y-2.5">
                  {missoes.map((m) => (
                    <div key={m.id} data-teste="missao">
                      <p className="text-xs font-semibold flex items-center justify-between">
                        <span>{m.emoji} {m.nome} {m.ok ? '✅' : ''}</span>
                        <span className="text-[10px] text-[#817E8C] tabular-nums">{m.atual}/{m.alvo}</span>
                      </p>
                      <div className="mt-1.5"><BarraProgresso pct={(m.atual / m.alvo) * 100} dialeto="escuro" altura="fina" corClasse={m.ok ? 'bg-emerald-400' : 'bg-[#F4F4F4]'} trilhoClasse="bg-[#2B2B2B]" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ O TIME — a mesma visão executiva da equipe que já mora dentro
            da Verificação do Progresso, agora também aqui: pulso, pódio,
            radar e a tabela inteira, sem duplicar cálculo nenhum. Painel
            largo, ocupando a página inteira. ══ */}
        <section className="xeos-palco" data-teste="xgame-o-time">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#817E8C]">Todo mundo</span>
            <span className="h-px flex-1 bg-[#2B2B2B]" />
          </div>
          <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4 sm:p-6">
            <XGameVisaoExecutiva />
          </div>
        </section>

        <footer className="text-center text-xs text-[#4c4a56] pt-4 border-t border-[#1c1f28]">
          {FRASES.reacao} · {FRASES.realtime} · até {fim.toLocaleDateString('pt-BR')}
        </footer>
      </div>
    </div>
  );
}

function Card({ titulo, valor, sub, destaque = false, dica }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${destaque ? 'border-red-500/60' : 'border-[#2B2B2B]'} bg-[#0b0d14]`} title={dica}>
      <div className="text-[11px] uppercase tracking-wider text-[#817E8C]">{titulo}</div>
      <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-1">{valor}</div>
      <div className={`text-[11px] mt-1 ${destaque ? 'text-red-400 font-bold' : 'text-[#C1BECA]'}`}>{sub}</div>
    </div>
  );
}
