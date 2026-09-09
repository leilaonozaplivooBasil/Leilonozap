import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Trophy, Flame, TrendingDown, Users, Coins, ArrowUpDown, Crown, ClipboardList, Handshake } from 'lucide-react';
import { LIGAS, ligaDoToken, OFENSIVA_META, inicioCicloOficial, dataISO, nomeExibicao, mvmManual } from '@/lib/xgame';

/** ANA SOUZA → AS. Pra quando ainda não tem foto — o círculo do pódio/tabela nunca fica vazio. */
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// 🎖️ X-GAME — A VISÃO EXECUTIVA DA EQUIPE (ordem do dono: "quero a
// gamificação de todos na visão executiva, muito bem organizada").
//
// POR QUE NÃO É SÓ UM RANKING: ranking premia quem já está ganhando. Quem
// dirige precisa das DUAS pontas — quem está voando e, principalmente,
// QUEM ESTÁ CAINDO, antes de perder a pessoa. Por isso a tela tem quatro
// camadas, nesta ordem de leitura:
//   1. O PULSO — o time em quatro números, pra saber em 2 segundos se o
//      dia está de pé;
//   2. O PÓDIO — os três primeiros do ciclo, com a liga;
//   3. O RADAR — quem precisa de você HOJE, com o motivo escrito;
//   4. A TABELA — todo mundo, ordenável, pra quem quer o detalhe.
//
// A fonte é a mesma do jogo: o retrato diário (xgame_diario) do ciclo
// corrente. Nada é recalculado aqui — a visão só lê e organiza.

const fmt = (n, casas = 2) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const brl = (v) => `R$ ${fmt(v)}`;
const pct = (n) => `${Math.round((Number(n) || 0) * 100)}%`;
/** Sem voto recebido no ciclo ainda, mostra "—" — não é zero, é "não sei". */
const mvmTexto = (mvm) => (mvm === null ? '—' : fmt(mvm, 1));

/** Um número grande do pulso: rótulo em cima, valor gigante, nota embaixo. */
function Pulso({ Icone, rotulo, valor, nota, cor = 'text-nz-tinta' }) {
  return (
    <div className="py-1">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-nz-tinta-fraca">
        <Icone className="w-3.5 h-3.5" /> {rotulo}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${cor}`}>{valor}</p>
      {nota && <p className="text-[10px] text-nz-tinta-fraca">{nota}</p>}
    </div>
  );
}

// 🎨 08/09/2026 — dono: "esse ranking com emoji está muito feio... deixa
// mais clean, mais Vale do Silício." Troca 💠🥇🥈🥉 por um ponto de cor —
// mesma informação (a liga), sem o visual de figurinha. Cor só existe
// aqui (não mexe em LIGAS, que outras telas do app ainda usam com emoji).
const COR_LIGA = { diamante: '#67E8F9', ouro: '#FBBF24', prata: '#CBD5E1', bronze: '#D08A56' };
function SeloLiga({ liga, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: COR_LIGA[liga.id] || '#94a3b8' }} />
      {liga.label.replace('LIGA ', '').toLowerCase()}
    </span>
  );
}

export default function XGameVisaoExecutiva() {
  const [linhas, setLinhas] = useState(null); // null = carregando
  const [ordem, setOrdem] = useState('token');
  // 🎯 08/09/2026 — "quero ver onde EU estou" (ordem do dono): a tela
  // sempre foi só do time, sem marcar quem é o dono da sessão. Mesmo jeito
  // de achar o usuário que XGame.jsx já usa — direto do localStorage, sem
  // precisar de prop nova em quem já monta este componente.
  const [meuId, setMeuId] = useState(null);
  useEffect(() => {
    try { setMeuId(JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null); } catch { setMeuId(null); }
  }, []);
  // o início oficial do ciclo é do jogo, não da tela: busca direto na
  // config, do mesmo jeito que o Compromisso faz
  const [cicloConfig, setCicloConfig] = useState(undefined); // undefined = ainda buscando
  useEffect(() => {
    let vivo = true;
    supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle()
      .then(({ data }) => { if (vivo) setCicloConfig(data?.ciclo_inicio || null); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (cicloConfig === undefined) return undefined;
    let vivo = true;
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    const hoje = dataISO(new Date());
    Promise.all([
      supabase.from('xgame_diario').select('user_id,data,tarefas_total,tarefas_feitas,token_dia,pontos,detalhes').eq('ciclo_inicio', ini),
      // 🗳️ 08/09/2026 — dono: "o MVM é só votação... tem gente que nem foi
      // votada com MVM alto." Esta coluna usava a MÉDIA do mvm_dia AUTOMÁTICO
      // (10 menos desconto por tarefa atrasada) — real time disfarçado de
      // MVM. Agora vem só da votação de verdade (xgame_votos_mvm) do ciclo.
      supabase.from('xgame_votos_mvm').select('votado_id,virtude,nota').gte('data', ini),
    ]).then(async ([{ data }, { data: votos }]) => {
        if (!vivo) return;
        const votosPor = {};
        (votos || []).forEach((v) => { (votosPor[v.votado_id] ||= []).push(v); });

        const por = {};
        (data || []).forEach((d) => {
          const r = por[d.user_id] || (por[d.user_id] = {
            user_id: d.user_id, dias: 0, token: 0, pontos: 0, xpay: 0, perdido: 0, dias_fechados: 0, hoje: null, porData: {},
          });
          const total = Number(d.tarefas_total) || 0;
          const feitas = Number(d.tarefas_feitas) || 0;
          const fatia = total > 0 ? feitas / total : 0;
          r.dias += 1;
          r.token += Number(d.token_dia) || 0;
          r.pontos += Number(d.pontos) || 0;
          // 💰 08/09/2026 — a recuperação de fim de semana devolve o X-Pay de
          // uma tarefa PERDIDA sem reescrever o dia em si: soma direto aqui.
          r.xpay += (Number(d.detalhes?.xpay_ganho) || 0) + (Number(d.detalhes?.xpay_recuperado) || 0);
          r.perdido += Number(d.detalhes?.xpay_perdido) || 0;
          if (fatia >= OFENSIVA_META) r.dias_fechados += 1;
          r.porData[d.data] = fatia;
          // 📊 09/09/2026 — dono: "eu quero esse alcance" — o % de reunião
          // também aqui. Vem de `detalhes.reunioes_*`, gravado pelo mesmo
          // `contagens` que resumoDoDia já calcula — sem query nova.
          if (d.data === hoje) {
            r.hoje = {
              fatia, total, feitas,
              reunioesTotal: Number(d.detalhes?.reunioes_total) || 0,
              reunioesFeitas: Number(d.detalhes?.reunioes_feitas) || 0,
            };
          }
        });
        // gente com voto recebido mas sem nenhum dia registrado ainda —
        // sem isso, ela nunca aparece na tabela pra mostrar o MvM dela
        Object.keys(votosPor).forEach((uid) => {
          if (!por[uid]) por[uid] = { user_id: uid, dias: 0, token: 0, pontos: 0, xpay: 0, perdido: 0, dias_fechados: 0, hoje: null, porData: {} };
        });

        const lista = Object.values(por).map((r) => {
          // a ofensiva: dias seguidos fechados, contando de hoje pra trás
          let fogo = 0;
          const d = new Date(`${hoje}T12:00:00`);
          for (let i = 0; i < 60; i += 1) {
            const chave = dataISO(d);
            const fatia = r.porData[chave];
            if (fatia === undefined) { if (i > 0) break; }
            else if (fatia >= OFENSIVA_META) fogo += 1;
            else break;
            d.setDate(d.getDate() - 1);
          }
          const votosRecebidos = votosPor[r.user_id];
          return {
            ...r,
            token: r.dias ? r.token / r.dias : 0,
            mvm: votosRecebidos ? mvmManual(votosRecebidos).media : null,
            regularidade: r.dias ? r.dias_fechados / r.dias : 0,
            fogo,
          };
        });

        const ids = lista.map((l) => l.user_id);
        if (ids.length) {
          const { data: us } = await supabase.from('app_users').select('id,full_name,nickname').in('id', ids);
          const nomes = {};
          (us || []).forEach((u) => { nomes[u.id] = nomeExibicao(u); });
          lista.forEach((l) => { l.nome = nomes[l.user_id] || l.user_id.slice(0, 6); });
        }
        if (vivo) setLinhas(lista);
      });
    return () => { vivo = false; };
  }, [cicloConfig]);

  const time = useMemo(() => {
    if (!linhas?.length) return null;
    const n = linhas.length;
    const comHoje = linhas.filter((l) => l.hoje);
    return {
      pessoas: n,
      tokenMedio: linhas.reduce((a, l) => a + l.token, 0) / n,
      diaHoje: comHoje.length ? comHoje.reduce((a, l) => a + l.hoje.fatia, 0) / comHoje.length : 0,
      xpay: linhas.reduce((a, l) => a + l.xpay, 0),
      perdido: linhas.reduce((a, l) => a + l.perdido, 0),
      fogos: linhas.filter((l) => l.fogo > 0).length,
      // 📊 08/09/2026 — dono: "quero a quantidade de tarefas do grupo — X
      // pessoas, Y tarefas, quantas o time concluiu, qual o percentual."
      // Mesma conta do ADM X-Game (XPerformanceGestao), só que a partir do
      // retrato já gravado em xgame_diario, não da tabela ao vivo.
      tarefasHojeTotal: comHoje.reduce((a, l) => a + (l.hoje.total || 0), 0),
      tarefasHojeFeitas: comHoje.reduce((a, l) => a + (l.hoje.feitas || 0), 0),
      // 📊 09/09/2026 — dono: "eu quero esse alcance" — o % de reunião do
      // time também na Verificação do Progresso, não só no ADM X-Game.
      reunioesHojeTotal: comHoje.reduce((a, l) => a + (l.hoje.reunioesTotal || 0), 0),
      reunioesHojeFeitas: comHoje.reduce((a, l) => a + (l.hoje.reunioesFeitas || 0), 0),
    };
  }, [linhas]);

  const rankPorToken = useMemo(() => (linhas ? [...linhas].sort((a, b) => b.token - a.token) : []), [linhas]);
  const podio = useMemo(() => rankPorToken.slice(0, 3), [rankPorToken]);
  // 📍 08/09/2026 — dono, três vezes: "você esqueceu de botar pessoal meu."
  // A tabela já marcava "VOCÊ" (verde, discreto), mas enterrado lá embaixo
  // numa lista de 10+ linhas não é "botar" — é escutar que ele nunca olha
  // até lá. Isto aqui é o cartão que aparece primeiro, antes de qualquer
  // outra coisa do time.
  const meuLinha = useMemo(() => linhas?.find((l) => l.user_id === meuId) || null, [linhas, meuId]);
  const minhaPosicao = useMemo(() => {
    const i = rankPorToken.findIndex((l) => l.user_id === meuId);
    return i >= 0 ? i + 1 : null;
  }, [rankPorToken, meuId]);

  // 🚨 O RADAR: quem precisa de atenção, com o motivo escrito
  const radar = useMemo(() => {
    if (!linhas) return [];
    return linhas
      .map((l) => {
        const motivos = [];
        if (l.fogo === 0) motivos.push('ofensiva apagada');
        if (l.mvm === null) motivos.push('ninguém votou nela ainda');
        else if (l.mvm < 4) motivos.push(`MvM ${fmt(l.mvm, 1)} — abaixo de 4`);
        if (l.regularidade < 0.5) motivos.push(`fechou só ${pct(l.regularidade)} dos dias`);
        if (l.hoje && l.hoje.fatia < 0.3) motivos.push(`hoje em ${pct(l.hoje.fatia)}`);
        if (!l.hoje) motivos.push('sem registro hoje');
        return { ...l, motivos };
      })
      .filter((l) => l.motivos.length > 0)
      .sort((a, b) => b.motivos.length - a.motivos.length || a.token - b.token)
      .slice(0, 6);
  }, [linhas]);

  const ordenadas = useMemo(() => {
    if (!linhas) return [];
    const l = [...linhas];
    if (ordem === 'nome') l.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    else l.sort((a, b) => (b[ordem] || 0) - (a[ordem] || 0));
    return l;
  }, [linhas, ordem]);

  if (linhas === null) {
    return <p className="border-t border-nz-borda/40 pt-4 text-xs text-nz-tinta-fraca">Carregando o placar da equipe…</p>;
  }
  if (!linhas.length) {
    return (
      <div className="border-t border-nz-borda/40 pt-4">
        <p className="text-xs text-nz-tinta-fraca">
          Ninguém pontuou neste ciclo ainda. Assim que o time começar a fechar tarefas no Compromisso, o placar aparece aqui.
        </p>
      </div>
    );
  }

  const ligaTime = ligaDoToken(time.tokenMedio);
  // pódio em ordem de PALCO (2º · 1º · 3º), não de ranking — é assim que um
  // pódio de verdade se lê da esquerda pra direita
  const palco = [podio[1], podio[0], podio[2]];
  const ALTURA_PALCO = ['h-16 sm:h-20', 'h-24 sm:h-32', 'h-10 sm:h-12'];
  const COR_PALCO = ['from-slate-300 to-slate-400', 'from-amber-300 to-yellow-500', 'from-orange-400 to-amber-700'];
  const BORDA_PALCO = ['#64748b', '#b45309', '#9a3412'];
  const POSICAO_PALCO = [2, 1, 3];

  return (
    <div className="border-t border-nz-borda/40 pt-5 space-y-8">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-nz-tinta-fraca">A X-GAME da equipe</p>
        <p className="text-[11px] text-nz-tinta-fraca">o ciclo corrente, {time.pessoas} {time.pessoas === 1 ? 'pessoa' : 'pessoas'} em jogo</p>
      </div>

      {/* ── 0. VOCÊ — antes de qualquer coisa do time, a sua própria posição ── */}
      {meuLinha && (
        <div data-teste="sua-posicao" className="rounded-2xl border border-nz-verde/30 bg-nz-verde/[0.06] p-4 sm:p-5 flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center bg-nz-verde/15 border border-nz-verde/40 text-nz-verde font-black text-lg">
            {iniciais(meuLinha.nome)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-nz-verde">Sua posição no ciclo</p>
            <p className="text-2xl font-black text-nz-tinta leading-tight tabular-nums">
              {minhaPosicao}º<span className="text-sm font-semibold text-nz-tinta-fraca"> de {time.pessoas}</span>
            </p>
            <SeloLiga liga={ligaDoToken(meuLinha.token)} className="text-[11px] font-semibold text-nz-tinta-fraca mt-0.5" />
          </div>
          <div className="flex items-center gap-5 sm:gap-7 ml-auto">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wide text-nz-tinta-fraca">Token</p>
              <p className="text-lg font-bold tabular-nums text-nz-tinta">{fmt(meuLinha.token)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wide text-nz-tinta-fraca">X-Pay</p>
              <p className="text-lg font-bold tabular-nums text-nz-verde">{brl(meuLinha.xpay)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wide text-nz-tinta-fraca">Ofensiva</p>
              <p className="text-lg font-bold tabular-nums text-nz-tinta flex items-center justify-end gap-1">
                {meuLinha.fogo > 0 && <Flame className="w-3.5 h-3.5 text-nz-fogo" />}{meuLinha.fogo}d
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. O PULSO ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-nz-borda bg-white/[0.02] p-3.5">
          <Pulso Icone={Trophy} rotulo="Token médio" valor={fmt(time.tokenMedio)} nota={<SeloLiga liga={ligaTime} className="text-nz-tinta-fraca" />} />
        </div>
        <div className="rounded-xl border border-nz-borda bg-white/[0.02] p-3.5">
          <Pulso Icone={Users} rotulo="O dia de hoje" valor={pct(time.diaHoje)} nota={`fecha em ${Math.round(OFENSIVA_META * 100)}%`} cor={time.diaHoje >= OFENSIVA_META ? 'text-nz-verde' : 'text-nz-tinta'} />
        </div>
        {/* 📊 08/09/2026 — dono: "quero a quantidade de tarefas do grupo —
            quantas o time tem, quanto concluiu, qual o percentual." */}
        <div className="rounded-xl border border-nz-borda bg-white/[0.02] p-3.5">
          <Pulso Icone={ClipboardList} rotulo="Tarefas do time hoje" valor={`${time.tarefasHojeFeitas}/${time.tarefasHojeTotal}`} nota={`${time.tarefasHojeTotal ? Math.round((time.tarefasHojeFeitas / time.tarefasHojeTotal) * 100) : 0}% concluído`} cor={time.tarefasHojeTotal && time.tarefasHojeFeitas / time.tarefasHojeTotal >= OFENSIVA_META ? 'text-nz-verde' : 'text-nz-tinta'} />
        </div>
        {/* 📊 09/09/2026 — dono: "eu quero esse alcance" — o percentual de
            reunião do time também aqui, não só no ADM X-Game. */}
        <div className="rounded-xl border border-nz-borda bg-white/[0.02] p-3.5">
          <Pulso Icone={Handshake} rotulo="Reuniões do time hoje" valor={`${time.reunioesHojeFeitas}/${time.reunioesHojeTotal}`} nota={`${time.reunioesHojeTotal ? Math.round((time.reunioesHojeFeitas / time.reunioesHojeTotal) * 100) : 0}% concluído`} cor={time.reunioesHojeTotal && time.reunioesHojeFeitas / time.reunioesHojeTotal >= OFENSIVA_META ? 'text-nz-verde' : 'text-nz-tinta'} />
        </div>
        <div className="rounded-xl border border-nz-borda bg-white/[0.02] p-3.5">
          <Pulso Icone={Flame} rotulo="Ofensivas acesas" valor={`${time.fogos}/${time.pessoas}`} nota="dias seguidos fechados" cor={time.fogos > 0 ? 'text-nz-fogo' : 'text-nz-tinta'} />
        </div>
        <div className="rounded-xl border border-nz-borda bg-white/[0.02] p-3.5">
          <Pulso Icone={Coins} rotulo="X-Pay do ciclo" valor={brl(time.xpay)} nota={time.perdido > 0 ? `${brl(time.perdido)} perdidos por atraso` : 'nada perdido por atraso'} cor="text-nz-verde" />
        </div>
      </div>

      {/* ── 2. O PÓDIO — um palco de verdade, 2º·1º·3º, com quem é "você" ── */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-nz-tinta-fraca mb-4">O pódio do ciclo</p>
        <div className="flex items-end justify-center gap-3 sm:gap-5 max-w-xl mx-auto">
          {palco.map((l, i) => {
            if (!l) return <div key={i} className="flex-1 max-w-[180px]" />;
            const liga = ligaDoToken(l.token);
            const souEu = l.user_id === meuId;
            return (
              <div key={l.user_id} className="flex-1 max-w-[180px] flex flex-col items-center">
                {i === 1 && <Crown className="w-5 h-5 text-amber-300 mb-1" />}
                <div
                  className={`relative shrink-0 w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-b ${COR_PALCO[i]} text-white font-extrabold text-lg ${souEu ? 'ring-2 ring-nz-verde ring-offset-2 ring-offset-[#05060c]' : ''}`}
                  style={{ boxShadow: `0 4px 0 0 ${BORDA_PALCO[i]}, inset 0 3px 7px rgba(255,255,255,0.4)` }}
                >
                  {iniciais(l.nome)}
                </div>
                <p className="text-sm font-bold text-nz-tinta mt-2 truncate max-w-full text-center">
                  {l.nome}{souEu && <span className="ml-1 text-[9px] font-black text-nz-verde align-middle">VOCÊ</span>}
                </p>
                <p className="flex items-center justify-center gap-1 text-[11px] text-nz-tinta-fraca tabular-nums text-center">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: COR_LIGA[liga.id] || '#94a3b8' }} />
                  {fmt(l.token)} · MvM {mvmTexto(l.mvm)}
                  {l.fogo > 0 && <span className="flex items-center gap-0.5 text-nz-fogo font-semibold"> · <Flame className="w-3 h-3" />{l.fogo}d</span>}
                </p>
                <div className={`w-full ${ALTURA_PALCO[i]} rounded-t-lg bg-gradient-to-b ${COR_PALCO[i]} mt-2 flex items-start justify-center pt-1.5`}>
                  <span className="text-white font-black text-xl drop-shadow">{POSICAO_PALCO[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. O RADAR ── */}
      <div>
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-nz-tinta-fraca mb-3">
          <TrendingDown className="w-3.5 h-3.5" /> Quem precisa de você
        </p>
        {radar.length === 0 ? (
          <p className="text-xs text-nz-verde font-semibold">Ninguém no radar — o time inteiro está de pé.</p>
        ) : (
          <div className="space-y-2">
            {radar.map((l) => {
              const souEu = l.user_id === meuId;
              return (
                <div key={l.user_id} className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 ${souEu ? 'bg-nz-verde/10 border border-nz-verde/30' : 'border-b border-nz-borda/30'}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-nz-tinta truncate">{l.nome}{souEu && <span className="ml-1.5 text-[9px] font-black text-nz-verde align-middle">VOCÊ</span>}</p>
                    <p className="text-[11px] text-nz-fogo">{l.motivos.join(' · ')}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-nz-tinta-fraca tabular-nums">token {fmt(l.token)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. A TABELA ── */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-nz-tinta-fraca">
            <ArrowUpDown className="w-3.5 h-3.5" /> Todo mundo
          </p>
          {[['token', 'Token'], ['mvm', 'MvM'], ['fogo', 'Ofensiva'], ['xpay', 'X-Pay'], ['nome', 'Nome']].map(([id, rot]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrdem(id)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${ordem === id ? 'bg-nz-verde text-white' : 'text-nz-tinta-fraca hover:text-nz-tinta'}`}
            >{rot}</button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-nz-borda">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nz-tinta-fraca text-[10px] uppercase tracking-wide bg-white/[0.03]">
                <th className="text-left font-bold py-2.5 px-3">#</th>
                <th className="text-left font-bold py-2.5">Pessoa</th>
                <th className="text-left font-bold py-2.5">Liga</th>
                <th className="text-right font-bold py-2.5">Token</th>
                <th className="text-right font-bold py-2.5">MvM</th>
                <th className="text-right font-bold py-2.5">Fogo</th>
                <th className="text-right font-bold py-2.5">Dias</th>
                <th className="text-right font-bold py-2.5 px-3">X-Pay</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((l, i) => {
                const liga = ligaDoToken(l.token);
                const souEu = l.user_id === meuId;
                return (
                  <tr key={l.user_id} className={`border-t border-nz-borda/30 transition-colors ${souEu ? 'bg-nz-verde/10' : 'hover:bg-white/[0.03]'}`}>
                    <td className="py-2.5 px-3 text-nz-tinta-fraca tabular-nums">{i + 1}</td>
                    <td className="py-2.5 font-semibold text-nz-tinta">
                      {l.nome}{souEu && <span className="ml-1.5 text-[9px] font-black text-nz-verde align-middle">VOCÊ</span>}
                    </td>
                    <td className="py-2.5 text-nz-tinta-fraca whitespace-nowrap"><SeloLiga liga={liga} /></td>
                    <td className="py-2.5 text-right font-bold text-nz-tinta tabular-nums">{fmt(l.token)}</td>
                    <td className={`py-2.5 text-right tabular-nums ${l.mvm !== null && l.mvm < 4 ? 'text-nz-fogo font-semibold' : 'text-nz-tinta-fraca'}`}>{mvmTexto(l.mvm)}</td>
                    <td className={`py-2.5 text-right tabular-nums ${l.fogo > 0 ? 'text-nz-fogo font-semibold' : 'text-nz-tinta-fraca'}`}>{l.fogo}</td>
                    <td className="py-2.5 text-right text-nz-tinta-fraca tabular-nums">{l.dias_fechados}/{l.dias}</td>
                    <td className="py-2.5 text-right text-nz-verde font-semibold tabular-nums px-3">{brl(l.xpay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-nz-tinta-fraca">
          <span>Token e MvM são a MÉDIA do ciclo · Fogo = dias seguidos fechados ({Math.round(OFENSIVA_META * 100)}% do dia) · Dias = fechados sobre registrados · Ligas:</span>
          {LIGAS.map((x, i) => (
            <span key={x.id} className="inline-flex items-center gap-1">
              <SeloLiga liga={x} />{i < LIGAS.length - 1 && <span>·</span>}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
