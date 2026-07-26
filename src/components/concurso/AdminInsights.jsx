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

          <div className="rounded-xl px-3.5 py-2.5 mb-4 flex items-start gap-2.5 text-[12px] leading-relaxed" style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.35)', color: '#ddd6fe' }}>
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span><b>Funil completo bloqueado:</b> entrou no grupo · saiu · converteu na plataforma · gasto por indicado · rede 2º nível. Ativa com a migração <code className="text-purple-200">db/rank-premiado-tracking.sql</code> + acesso ao Supabase do projeto (pendente com o Gabriel).</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou zap…" className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-yellow-400/60 placeholder:text-white/30" />
            </div>
            <span className="text-[11px] text-white/40">{lista.length} de {data.participantes.length}</span>
          </div>

          <div className="overflow-auto rounded-xl border border-white/10" style={{ maxHeight: 420 }}>
            <table className="w-full text-sm" style={{ minWidth: 720 }}>
              <thead className="sticky top-0 z-10" style={{ background: '#1c1233' }}>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/45">
                  <th className="px-3 py-2.5 font-bold">#</th>
                  <th className="px-3 py-2.5 font-bold">Participante</th>
                  <th className="px-3 py-2.5 font-bold">WhatsApp</th>
                  <th className="px-3 py-2.5 font-bold text-right">Hoje</th>
                  <th className="px-3 py-2.5 font-bold text-right">Semana</th>
                  <th className="px-3 py-2.5 font-bold text-right">Mês</th>
                  <th className="px-3 py-2.5 font-bold text-right">Total</th>
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
                    <td className="px-3 py-2 text-xs text-white/55 whitespace-nowrap">{fmtDT(p.ultimo_clique)}</td>
                    <td className="px-3 py-2 text-xs text-white/45 whitespace-nowrap">{fmtD(p.cadastro)}</td>
                  </tr>
                ))}
                {!lista.length && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-white/35">Nada encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
