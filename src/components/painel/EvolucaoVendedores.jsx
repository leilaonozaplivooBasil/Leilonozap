import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { money } from '@/lib/format';
import { ComposedChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Trophy, CalendarDays, Activity } from 'lucide-react';

const META_DIA = 8000;
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// paleta por vendedor (Outros sempre cinza, definido na hora)
const CORES = ['#10b981', '#e0a92e', '#38bdf8', '#a78bfa', '#fb7185', '#f59e0b'];
const COR_OUTROS = '#6b7280';
const corDe = (nome, i) => (nome === 'Outros' ? COR_OUTROS : CORES[i % CORES.length]);

function TT({ active, payload, label, series }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const linhas = series.map((s) => ({ nome: s.nome, cor: s.cor, val: Number(d[s.nome] || 0) })).filter((x) => x.val > 0).sort((a, b) => b.val - a.val);
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs min-w-[180px]">
      <div className="font-bold text-white mb-1">{d.dia} · {DOW[d.dow]}</div>
      {linhas.length === 0 ? <div className="text-gray-500">sem vendas</div> : linhas.map((l) => (
        <div key={l.nome} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-gray-300"><span className="inline-block w-2 h-2 rounded-full" style={{ background: l.cor }} />{l.nome}</span>
          <span className="font-semibold text-white">{money(l.val)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 mt-1 pt-1 border-t border-gray-800">
        <span className="text-gray-400">Total do dia</span>
        <span className={`font-black ${Number(d.total) >= META_DIA ? 'text-emerald-400' : 'text-yellow-300'}`}>{money(d.total)}</span>
      </div>
    </div>
  );
}

// Evolução dos VENDEDORES dia a dia do mês (barras empilhadas por vendedor) — espelha a planilha NEXUS.
export default function EvolucaoVendedores({ userId }) {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('evolucao_vendedores_diaria', { _owner: userId })
      .then(({ data }) => setPayload(data && typeof data === 'object' ? data : { vendedores: [], dias: [] }))
      .catch(() => setPayload({ vendedores: [], dias: [] }));
  }, [userId]);

  if (!payload) return null;
  const vendedores = Array.isArray(payload.vendedores) ? payload.vendedores : [];
  const dias = Array.isArray(payload.dias) ? payload.dias : [];
  // séries na ordem do total do mês; Outros sempre por último
  const ordenados = [...vendedores].sort((a, b) => (a.nome === 'Outros' ? 1 : b.nome === 'Outros' ? -1 : 0));
  const series = ordenados.map((v, i) => ({ nome: v.nome, cor: corDe(v.nome, i) }));
  // achata vals pra dentro da linha (recharts lê dataKey direto)
  const data = dias.map((x) => ({ ...x, ...(x.vals || {}) }));

  const ativos = vendedores.filter((v) => Number(v.total) > 0 && v.nome !== 'Outros').length;
  const campeao = vendedores.filter((v) => v.nome !== 'Outros').sort((a, b) => Number(b.total) - Number(a.total))[0] || null;
  const totalMes = dias.reduce((s, x) => s + Number(x.total || 0), 0);
  const passados = dias.filter((x) => !x.futuro);
  const melhor = passados.reduce((a, b) => (Number(b.total) > Number(a?.total || -1) ? b : a), null);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Evolução dos vendedores — por dia</h3>
        <span className="text-[11px] text-gray-500">· {ativos} vendedor(es) ativos · meta {money(META_DIA)}/dia</span>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4 pb-2">
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: '#9db5a8', fontSize: 11 }} interval={0} tickFormatter={(v, i) => { const it = data[i]; return it ? `${v}\n${DOW[it.dow][0]}` : v; }} height={34} />
              <YAxis tick={{ fill: '#9db5a8', fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={40} />
              <Tooltip content={<TT series={series} />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <ReferenceLine y={META_DIA} stroke="#f5c451" strokeDasharray="5 4" label={{ value: 'meta 8k', position: 'right', fill: '#f5c451', fontSize: 10 }} />
              {series.map((s, i) => (
                <Bar key={s.nome} dataKey={s.nome} stackId="v" fill={s.cor} maxBarSize={26}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* legenda dos vendedores com total do mês */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 pt-3 pb-1">
          {series.map((s) => {
            const v = vendedores.find((x) => x.nome === s.nome);
            return (
              <span key={s.nome} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.cor }} />
                <span className="text-gray-300 font-medium">{s.nome}</span>
                <span className="text-gray-500">{money(v?.total || 0)}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><Trophy className="w-3.5 h-3.5" /> Campeão do mês</div>
          <div className="text-base font-black text-yellow-300 truncate">{campeao ? campeao.nome : '—'}</div>
          <div className="text-[10px] text-gray-500">{campeao ? money(campeao.total) : ''}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5" /> Vendedores ativos</div>
          <div className="text-xl font-black text-emerald-400">{ativos}</div>
          <div className="text-[10px] text-gray-500">com venda no mês</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><CalendarDays className="w-3.5 h-3.5" /> Melhor dia da equipe</div>
          <div className="text-xl font-black text-white">{melhor ? money(melhor.total) : '—'}</div>
          <div className="text-[10px] text-gray-500">{melhor ? `${melhor.dia} · ${DOW[melhor.dow]}` : ''}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5" /> Total do mês</div>
          <div className="text-xl font-black text-emerald-400">{money(totalMes)}</div>
          <div className="text-[10px] text-gray-500">soma da equipe</div>
        </div>
      </div>
    </div>
  );
}
