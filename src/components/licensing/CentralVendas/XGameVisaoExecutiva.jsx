import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Trophy, Flame, TrendingDown, Users, Coins, ArrowUpDown } from 'lucide-react';
import { LIGAS, ligaDoToken, OFENSIVA_META, inicioCicloOficial, dataISO, nomeExibicao } from '@/lib/xgame';

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

export default function XGameVisaoExecutiva() {
  const [linhas, setLinhas] = useState(null); // null = carregando
  const [ordem, setOrdem] = useState('token');
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
    supabase
      .from('xgame_diario')
      .select('user_id,data,tarefas_total,tarefas_feitas,mvm_dia,token_dia,pontos,detalhes')
      .eq('ciclo_inicio', ini)
      .then(async ({ data }) => {
        if (!vivo) return;
        const por = {};
        (data || []).forEach((d) => {
          const r = por[d.user_id] || (por[d.user_id] = {
            user_id: d.user_id, dias: 0, token: 0, mvm: 0, pontos: 0, xpay: 0, perdido: 0, dias_fechados: 0, hoje: null, porData: {},
          });
          const total = Number(d.tarefas_total) || 0;
          const feitas = Number(d.tarefas_feitas) || 0;
          const fatia = total > 0 ? feitas / total : 0;
          r.dias += 1;
          r.token += Number(d.token_dia) || 0;
          r.mvm += Number(d.mvm_dia) || 0;
          r.pontos += Number(d.pontos) || 0;
          r.xpay += Number(d.detalhes?.xpay_ganho) || 0;
          r.perdido += Number(d.detalhes?.xpay_perdido) || 0;
          if (fatia >= OFENSIVA_META) r.dias_fechados += 1;
          r.porData[d.data] = fatia;
          if (d.data === hoje) r.hoje = { fatia, total, feitas, mvm: Number(d.mvm_dia) || 0 };
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
          return {
            ...r,
            token: r.token / r.dias,
            mvm: r.mvm / r.dias,
            regularidade: r.dias_fechados / r.dias,
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
    };
  }, [linhas]);

  const podio = useMemo(() => (linhas ? [...linhas].sort((a, b) => b.token - a.token).slice(0, 3) : []), [linhas]);

  // 🚨 O RADAR: quem precisa de atenção, com o motivo escrito
  const radar = useMemo(() => {
    if (!linhas) return [];
    return linhas
      .map((l) => {
        const motivos = [];
        if (l.fogo === 0) motivos.push('ofensiva apagada');
        if (l.mvm < 4) motivos.push(`MvM ${fmt(l.mvm, 1)} — abaixo de 4`);
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

  return (
    <div className="border-t border-nz-borda/40 pt-5 space-y-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-nz-tinta-fraca">A X-GAME da equipe</p>
        <p className="text-[11px] text-nz-tinta-fraca">o ciclo corrente, {time.pessoas} {time.pessoas === 1 ? 'pessoa' : 'pessoas'} em jogo</p>
      </div>

      {/* ── 1. O PULSO ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
        <Pulso Icone={Trophy} rotulo="Token médio" valor={fmt(time.tokenMedio)} nota={`${ligaTime.emoji} ${ligaTime.label.toLowerCase()} · teto 22,22`} />
        <Pulso Icone={Users} rotulo="O dia de hoje" valor={pct(time.diaHoje)} nota={`fecha em ${Math.round(OFENSIVA_META * 100)}%`} cor={time.diaHoje >= OFENSIVA_META ? 'text-nz-verde' : 'text-nz-tinta'} />
        <Pulso Icone={Flame} rotulo="Ofensivas acesas" valor={`${time.fogos}/${time.pessoas}`} nota="dias seguidos fechados" cor={time.fogos > 0 ? 'text-nz-fogo' : 'text-nz-tinta'} />
        <Pulso Icone={Coins} rotulo="X-Pay do ciclo" valor={brl(time.xpay)} nota={time.perdido > 0 ? `${brl(time.perdido)} perdidos por atraso` : 'nada perdido por atraso'} cor="text-nz-verde" />
      </div>

      {/* ── 2. O PÓDIO ── */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-nz-tinta-fraca mb-3">O pódio do ciclo</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {podio.map((l, i) => {
            const liga = ligaDoToken(l.token);
            const cor = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-amber-600'][i];
            const borda = ['#b45309', '#64748b', '#9a3412'][i];
            return (
              <div key={l.user_id} className="flex items-center gap-3">
                <span
                  className={`shrink-0 w-12 h-11 rounded-[50%] flex items-center justify-center bg-gradient-to-b ${cor} text-white font-extrabold text-lg`}
                  style={{ boxShadow: `0 5px 0 0 ${borda}, inset 0 3px 7px rgba(255,255,255,0.4)` }}
                >{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-nz-tinta truncate">{l.nome}</p>
                  <p className="text-[11px] text-nz-tinta-fraca tabular-nums">
                    {liga.emoji} {fmt(l.token)} · MvM {fmt(l.mvm, 1)}
                    {l.fogo > 0 && <span className="text-nz-fogo font-semibold"> · {l.fogo}d de fogo</span>}
                  </p>
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
          <p className="text-xs text-nz-verde font-semibold">Ninguém no radar — o time inteiro está de pé. 🎯</p>
        ) : (
          <div className="space-y-2">
            {radar.map((l) => (
              <div key={l.user_id} className="flex items-start justify-between gap-3 border-b border-nz-borda/30 pb-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-nz-tinta truncate">{l.nome}</p>
                  <p className="text-[11px] text-nz-fogo">{l.motivos.join(' · ')}</p>
                </div>
                <p className="shrink-0 text-[11px] text-nz-tinta-fraca tabular-nums">token {fmt(l.token)}</p>
              </div>
            ))}
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
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-nz-tinta-fraca text-[10px] uppercase tracking-wide">
                <th className="text-left font-bold pb-2">#</th>
                <th className="text-left font-bold pb-2">Pessoa</th>
                <th className="text-left font-bold pb-2">Liga</th>
                <th className="text-right font-bold pb-2">Token</th>
                <th className="text-right font-bold pb-2">MvM</th>
                <th className="text-right font-bold pb-2">Fogo</th>
                <th className="text-right font-bold pb-2">Dias</th>
                <th className="text-right font-bold pb-2">X-Pay</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((l, i) => {
                const liga = ligaDoToken(l.token);
                return (
                  <tr key={l.user_id} className="border-t border-nz-borda/30">
                    <td className="py-2 text-nz-tinta-fraca tabular-nums">{i + 1}</td>
                    <td className="py-2 font-semibold text-nz-tinta">{l.nome}</td>
                    <td className="py-2 text-nz-tinta-fraca whitespace-nowrap">{liga.emoji} {liga.label.replace('LIGA ', '').toLowerCase()}</td>
                    <td className="py-2 text-right font-bold text-nz-tinta tabular-nums">{fmt(l.token)}</td>
                    <td className={`py-2 text-right tabular-nums ${l.mvm < 4 ? 'text-nz-fogo font-semibold' : 'text-nz-tinta-fraca'}`}>{fmt(l.mvm, 1)}</td>
                    <td className={`py-2 text-right tabular-nums ${l.fogo > 0 ? 'text-nz-fogo font-semibold' : 'text-nz-tinta-fraca'}`}>{l.fogo}</td>
                    <td className="py-2 text-right text-nz-tinta-fraca tabular-nums">{l.dias_fechados}/{l.dias}</td>
                    <td className="py-2 text-right text-nz-verde font-semibold tabular-nums">{brl(l.xpay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-nz-tinta-fraca">
          Token e MvM são a MÉDIA do ciclo · Fogo = dias seguidos fechados ({Math.round(OFENSIVA_META * 100)}% do dia) ·
          Dias = fechados sobre registrados · Ligas: {LIGAS.map((x) => `${x.emoji} ${x.label.replace('LIGA ', '').toLowerCase()}`).join(' · ')}
        </p>
      </div>
    </div>
  );
}
