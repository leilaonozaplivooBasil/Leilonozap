import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2, AlertTriangle, ShieldAlert, Search } from 'lucide-react';

// 🕵️ AUDITORIA DE CADASTROS (12/08/2026) — pedido do Gabriel após suspeita de que uma
// ação/campanha gerou vários cadastros SEM rastreio de indicação (foram parar direto
// no Site Oficial, "sem saber de onde vieram"). Esta tela é só LEITURA: lista TODOS os
// cadastros já existentes, agrupados por dia, destacando quantos daquele dia ficaram
// sem indicador válido — pra achar o dia/ação exata da falha. Nenhum dado é alterado aqui.
export default function AuditoriaCadastros() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');
  const [diaFiltro, setDiaFiltro] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id,full_name,email,phone,referral_code,referred_by_id,created_date')
          .order('created_date', { ascending: false })
          .limit(5000);
        if (error) throw error;
        setUsers(data || []);
      } catch (e) {
        setError(e?.message || 'Erro ao carregar cadastros');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { rows, dayStats, totalSuspeitos } = useMemo(() => {
    const byId = {};
    users.forEach((u) => { byId[u.id] = u; });
    const site = users.find((u) => u.referral_code === 'leilaonozap');
    const siteId = site?.id || null;

    const rows = users.map((u) => {
      const referrer = u.referred_by_id ? byId[u.referred_by_id] : null;
      const isSite = !!siteId && u.referred_by_id === siteId;
      const semIndicador = !u.referred_by_id;
      const suspeito = isSite || semIndicador;
      const dia = (u.created_date || '').slice(0, 10) || 'sem-data';
      return {
        ...u,
        dia,
        referrerName: referrer ? (referrer.full_name || referrer.email) : null,
        motivo: semIndicador ? 'Sem indicador (referred_by_id vazio)' : isSite ? 'Foi pro Site Oficial' : null,
        suspeito,
      };
    });

    const dayMap = {};
    rows.forEach((r) => {
      if (!dayMap[r.dia]) dayMap[r.dia] = { total: 0, semRastreio: 0 };
      dayMap[r.dia].total += 1;
      if (r.suspeito) dayMap[r.dia].semRastreio += 1;
    });
    const dayStats = Object.entries(dayMap)
      .map(([dia, v]) => ({ dia, ...v, pct: v.total ? Math.round((v.semRastreio / v.total) * 100) : 0 }))
      .sort((a, b) => (a.dia < b.dia ? 1 : -1));

    return { rows, dayStats, totalSuspeitos: rows.filter((r) => r.suspeito).length };
  }, [users]);

  const listaFiltrada = rows
    .filter((r) => r.suspeito)
    .filter((r) => !diaFiltro || r.dia === diaFiltro)
    .filter((r) => {
      if (!busca.trim()) return true;
      const b = busca.trim().toLowerCase();
      return (r.full_name || '').toLowerCase().includes(b) || (r.email || '').toLowerCase().includes(b) || (r.phone || '').includes(b);
    });

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando cadastros…</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 p-6 text-center">Erro ao carregar: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-red-400" />
          <h1 className="text-2xl font-black">Auditoria de Cadastros</h1>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Lista TODOS os cadastros já feitos, agrupados por dia. "Sem rastreio" = cadastro que caiu
          sem indicador válido (foi pro Site Oficial ou ficou com referred_by_id vazio). Só leitura —
          nada aqui é alterado automaticamente.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">Total de cadastros</div>
            <div className="text-2xl font-black">{rows.length}</div>
          </div>
          <div className="bg-gray-900 border border-red-900/50 rounded-xl p-4">
            <div className="text-xs text-red-400">Sem rastreio</div>
            <div className="text-2xl font-black text-red-400">{totalSuspeitos}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500">% sem rastreio</div>
            <div className="text-2xl font-black">{rows.length ? Math.round((totalSuspeitos / rows.length) * 100) : 0}%</div>
          </div>
        </div>

        {/* Tabela por dia — clique num dia pra filtrar a lista abaixo */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-800 font-semibold text-sm text-gray-300">Cadastros por dia (clique num dia pra filtrar)</div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 text-gray-400 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Dia</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">Sem rastreio</th>
                  <th className="text-right px-4 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {dayStats.map((d) => (
                  <tr
                    key={d.dia}
                    onClick={() => setDiaFiltro(diaFiltro === d.dia ? null : d.dia)}
                    className={`cursor-pointer border-t border-gray-800 hover:bg-gray-800/50 ${diaFiltro === d.dia ? 'bg-green-900/30' : ''} ${d.pct >= 50 ? 'text-red-300' : ''}`}
                  >
                    <td className="px-4 py-2">{d.dia}</td>
                    <td className="px-4 py-2 text-right">{d.total}</td>
                    <td className="px-4 py-2 text-right">{d.semRastreio}</td>
                    <td className="px-4 py-2 text-right font-bold">{d.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista dos cadastros suspeitos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 flex-wrap">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-semibold text-sm text-gray-300">
              Cadastros sem rastreio {diaFiltro ? `— dia ${diaFiltro}` : '(todos)'} ({listaFiltrada.length})
            </span>
            {diaFiltro && (
              <button onClick={() => setDiaFiltro(null)} className="text-xs text-green-400 underline">limpar filtro de dia</button>
            )}
            <div className="flex items-center gap-2 ml-auto bg-gray-950 border border-gray-700 rounded-lg px-2">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, e-mail ou telefone" className="bg-transparent py-1.5 text-xs outline-none w-56" />
            </div>
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 text-gray-400 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Nome</th>
                  <th className="text-left px-4 py-2">E-mail</th>
                  <th className="text-left px-4 py-2">Telefone</th>
                  <th className="text-left px-4 py-2">Criado em</th>
                  <th className="text-left px-4 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((r) => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="px-4 py-2">{r.full_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-400">{r.email || '—'}</td>
                    <td className="px-4 py-2 text-gray-400">{r.phone || '—'}</td>
                    <td className="px-4 py-2 text-gray-400">{r.created_date ? String(r.created_date).replace('T', ' ').slice(0, 19) : '—'}</td>
                    <td className="px-4 py-2 text-red-300">{r.motivo}</td>
                  </tr>
                ))}
                {listaFiltrada.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum cadastro sem rastreio encontrado com esse filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}