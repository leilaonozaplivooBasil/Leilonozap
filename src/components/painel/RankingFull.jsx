import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Crown, Package, Layers, TrendingUp, Loader2 } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CARGO = { distribuidor: 'Distribuidor', loja_fisica: 'Loja Física', ponto_retirada: 'Ponto', parceiro: 'Parceiro', licenciado: 'Licenciado', licenciado_catalogo: 'Lic. Catálogo', licenciado_aplicativo: 'Lic. App', vendedor: 'Vendedor', influenciador: 'Influenciador', plano_lider: 'Líder', trainee: 'Trainee', usuario: 'Usuário', fundador: 'Fundador', ceo: 'CEO', socio: 'Sócio' };
const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`);
const PERIODS = [{ id: 'dia', label: 'Hoje' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }];

// Aba Ranking — campeões por período (dia/semana/mês): vendedor, produto e categoria.
export default function RankingFull({ userId }) {
  const [period, setPeriod] = useState('dia');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let alive = true; setLoading(true);
    supabase.rpc('ranking_periodo', { _owner: userId, _period: period })
      .then(({ data }) => { if (alive) { setData(data || null); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId, period]);

  const vendedores = data?.vendedor_campeao || [];
  const produtos = data?.produto_campeao || [];
  const categorias = data?.categoria_campeao || [];

  return (
    <div>
      {/* seletor de período */}
      <div className="inline-flex bg-gray-800/70 border border-gray-700 rounded-xl p-1 mb-5">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-5 py-2 rounded-lg text-sm font-bold transition ${period === p.id ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:text-white'}`}>{p.label}</button>
        ))}
      </div>

      <div className="mb-5 text-sm text-gray-400">Total no período: <strong className="text-emerald-400">{money(data?.total || 0)}</strong> · {data?.pedidos || 0} pedido(s)</div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando ranking…</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <RankCol title="Vendedor campeão" icon={Crown} items={vendedores} render={(v) => ({ main: v.nome, sub: `${CARGO[v.cargo] || v.cargo || '—'} · ${v.pedidos} pedido(s)`, val: v.total })} />
          <RankCol title="Produto campeão" icon={Package} items={produtos} render={(p) => ({ main: p.produto, sub: `${Number(p.qtd) || 0} un. vendida(s)`, val: p.total })} />
          <RankCol title="Categoria campeã" icon={Layers} items={categorias} render={(c) => ({ main: c.categoria, sub: `${Number(c.qtd) || 0} un. vendida(s)`, val: c.total })} />
        </div>
      )}
    </div>
  );
}

function RankCol({ title, icon: Icon, items, render }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 text-emerald-300 font-bold"><Icon className="w-4 h-4" /> {title}</div>
      {items.length === 0 ? <p className="text-sm text-gray-500 py-6 text-center">Sem dados no período.</p> : (
        <div className="space-y-1.5">
          {items.slice(0, 10).map((it, i) => {
            const r = render(it);
            return (
              <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i === 0 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/30' : 'bg-gray-900/50'}`}>
                <span className="text-lg w-7 text-center shrink-0">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.main}</div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {r.sub}</div>
                </div>
                <div className={`text-sm font-black ${i === 0 ? 'text-yellow-300' : 'text-emerald-400'}`}>{money(r.val)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
