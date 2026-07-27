import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Users, MousePointerClick, CalendarDays, RefreshCw, Zap, Lock, Search } from 'lucide-react';

// Inteligência das Indicações — dashboard do admin (v1).
// Mostra tudo que o schema atual permite: impactados (cliques no link) por participante
// e por período, último clique e data de cadastro. As colunas de funil completo
// (entrou no grupo / saiu / converteu / gastou) ativam com a migração de rastreamento.

const fmtDT = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
};
const fmtD = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return '—'; }
};
const zapLink = (w) => (w ? `https://wa.me/55${String(w).replace(/\D/g, '')}` : null);
const money = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Stat({ icon: Ic, label, value, tint = '#f5c451' }) {
  return (
    <div className="rounded-2xl p-3.5 bg-black/25 border border-white/10 flex items-center gap-3 min-w-0">
      <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `${tint}22`, color: tint }}><Ic className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></span>
      <div className="min-w-0">
        <p className="text-xl font-black leading-none" style={{ color: tint }}>{value}</p>
        <p className="text-[10px] text-white/50 uppercase tracking-wide font-bold mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function AdminInsights({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/concurso?action=admin_stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
      if (r.ok) setData(await r.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const t = data?.totais;
  const lista = (data?.participantes || []).filter((p) => !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || String(p.whatsapp || '').includes(busca.replace(/\D/g, '')));

  return (
    <div className="rounded-2xl p-4 border mb-4" style={{ background: 'rgba(245,196,81,.05)', borderColor: 'rgba(245,196,81,.3)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-2 text-yellow-200">
          <span className="w-6 h-6 rounded-lg grid place-items-center" style={{ background: 'rgba(245,196,81,.16)', color: '#f5c451' }}><BarChart3 className="w-3.5 h-3.5" /></span>
          Inteligência das indicações
        </p>
        <button onClick={load} disabled={loading} className="text-[11px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-yellow-100 disabled:opacity-50" style={{ background: 'rgba(245,196,81,.14)', border: '1px solid rgba(245,196,81,.35)' }}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {!data && loading && <p className="text-white/40 text-sm py-6 text-center">Carregando inteligência…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-4">
            <Stat icon={Users} label="Participantes" value={t.participantes} tint="#f5c451" />
            <Stat icon={MousePointerClick} label="Impactados (cliques)" value={t.impactados} tint="#22c55e" />
            <Stat icon={Zap} label="Cliques hoje" value={t.cliques_dia} tint="#4ade80" />
            <Stat icon={CalendarDays} label="Na semana" value={t.cliques_semana} tint="#86efac" />
            <Stat icon={CalendarDays} label="No mês" value={t.cliques_mes} tint="#a7f3d0" />
            <Stat icon={Users} label="Divulgadores ativos 7d" value={t.ativos_7d} tint="#e9d5ff" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
            <Stat icon={Users} label="Com conta na plataforma" value={t.convertidos ?? 0} tint="#38bdf8" />
            <Stat icon={BarChart3} label="Compras dos participantes" value={t.compras_total ?? 0} tint="#f5c451" />
            <Stat icon={BarChart3} label="Gasto total (loja + adesão)" value={money(t.gasto_total)} tint="#4ade80" />
          </div>

          {data.rastreamento_completo ? (
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Stat icon={Users} label="Entraram no grupo" value={t.entraram ?? 0} tint="#4ade80" />
              <Stat icon={Users} label="Saíram (ponto perdido)" value={t.sairam ?? 0} tint="#f87171" />
            </div>
          ) : (
            <div className="rounded-xl px-3.5 py-2.5 mb-4 flex items-start gap-2.5 text-[12px] leading-relaxed" style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.35)', color: '#ddd6fe' }}>
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span><b>Funil completo bloqueado:</b> entrou no grupo · saiu · converteu na plataforma · gasto por indicado · rede 2º nível. Ativa com a migração <code className="text-purple-200">db/rank-premiado-tracking.sql</code> + acesso ao Supabase do projeto (pendente com o Gabriel).</span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou zap…" className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-yellow-400/60 placeholder:text-white/30" />
            </div>
            <span className="text-[11px] text-white/40">{lista.length} de {data.participantes.length}</span>
          </div>

          {/* MOBILE — cards por participante (a tabela de 12+ colunas é só desktop) */}
          <div className="md:hidden space-y-2 overflow-y-auto rounded-xl" style={{ maxHeight: 480 }}>
            {lista.map((p, i) => (
              <div key={p.code} className="rounded-xl p-3 bg-black/25 border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-white/35 w-5 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white/90 text-sm truncate">{p.nome}</p>
                    <p className="text-[10px] text-white/35 font-mono">{p.code}</p>
                  </div>
                  {p.convertido && <span className="text-sky-300 font-black text-sm shrink-0" title="Tem conta na plataforma">✓ conta</span>}
                  {p.whatsapp && (
                    <a href={zapLink(p.whatsapp)} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-emerald-300" style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.35)' }}>Zap</a>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center">
                  {[['Hoje', p.dia, '#f5c451'], ['Semana', p.semana, '#fff'], ['Mês', p.mes, '#fff'], ['Total', p.cliques, '#4ade80']].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg py-1.5 bg-black/30 border border-white/5">
                      <p className="text-sm font-black leading-none" style={{ color: v ? c : 'rgba(255,255,255,.25)' }}>{v || '·'}</p>
                      <p className="text-[9px] uppercase font-bold text-white/40 mt-1">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-white/45">
                  <span>{(p.gasto + p.adesao) > 0 ? <b className="text-emerald-400">{money(p.gasto + p.adesao)} gastos</b> : 'Sem compras'}{p.compras ? ` · ${p.compras} compra${p.compras > 1 ? 's' : ''}` : ''}</span>
                  <span>Últ. clique: {fmtDT(p.ultimo_clique)}</span>
                </div>
              </div>
            ))}
            {!lista.length && <p className="px-3 py-8 text-center text-white/35 text-sm">Nada encontrado.</p>}
          </div>

          <div className="hidden md:block overflow-auto rounded-xl border border-white/10" style={{ maxHeight: 420 }}>
            <table className="w-full text-sm" style={{ minWidth: 960 }}>
              <thead className="sticky top-0 z-10" style={{ background: '#1c1233' }}>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/45">
                  <th className="px-3 py-2.5 font-bold">#</th>
                  <th className="px-3 py-2.5 font-bold">Participante</th>
                  <th className="px-3 py-2.5 font-bold">WhatsApp</th>
                  <th className="px-3 py-2.5 font-bold text-right">Hoje</th>
                  <th className="px-3 py-2.5 font-bold text-right">Semana</th>
                  <th className="px-3 py-2.5 font-bold text-right">Mês</th>
                  <th className="px-3 py-2.5 font-bold text-right">Total</th>
                  {data.rastreamento_completo && <th className="px-3 py-2.5 font-bold text-right text-emerald-300">Entrou</th>}
                  {data.rastreamento_completo && <th className="px-3 py-2.5 font-bold text-right text-red-300">Saiu</th>}
                  <th className="px-3 py-2.5 font-bold text-center">Conta</th>
                  <th className="px-3 py-2.5 font-bold text-right">Compras</th>
                  <th className="px-3 py-2.5 font-bold text-right">Gastou</th>
                  <th className="px-3 py-2.5 font-bold">Último clique</th>
                  <th className="px-3 py-2.5 font-bold">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr key={p.code} className="border-t border-white/5 hover:bg-white/[.03]">
                    <td className="px-3 py-2 text-white/35 text-xs">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-white/90 truncate block max-w-[180px]" title={p.nome}>{p.nome}</span>
                      <span className="text-[10px] text-white/35 font-mono">{p.code}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {p.whatsapp ? <a href={zapLink(p.whatsapp)} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline text-xs font-semibold">{p.whatsapp}</a> : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-yellow-300">{p.dia || '·'}</td>
                    <td className="px-3 py-2 text-right font-bold text-white/80">{p.semana || '·'}</td>
                    <td className="px-3 py-2 text-right font-bold text-white/70">{p.mes || '·'}</td>
                    <td className="px-3 py-2 text-right font-black text-emerald-300">{p.cliques}</td>
                    {data.rastreamento_completo && <td className="px-3 py-2 text-right font-black text-emerald-400">{p.entrou || '·'}</td>}
                    {data.rastreamento_completo && <td className="px-3 py-2 text-right font-black text-red-400">{p.saiu || '·'}</td>}
                    <td className="px-3 py-2 text-center">{p.convertido ? <span className="text-sky-300 font-black" title="Tem conta na plataforma">✓</span> : <span className="text-white/25">—</span>}</td>
                    <td className="px-3 py-2 text-right font-bold text-white/80">{p.compras || '·'}</td>
                    <td className="px-3 py-2 text-right font-bold whitespace-nowrap" style={{ color: (p.gasto + p.adesao) > 0 ? '#4ade80' : 'rgba(255,255,255,.3)' }}>{(p.gasto + p.adesao) > 0 ? money(p.gasto + p.adesao) : '·'}</td>
                    <td className="px-3 py-2 text-xs text-white/55 whitespace-nowrap">{fmtDT(p.ultimo_clique)}</td>
                    <td className="px-3 py-2 text-xs text-white/45 whitespace-nowrap">{fmtD(p.cadastro)}</td>
                  </tr>
                ))}
                {!lista.length && (
                  <tr><td colSpan={data.rastreamento_completo ? 14 : 12} className="px-3 py-8 text-center text-white/35">Nada encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
