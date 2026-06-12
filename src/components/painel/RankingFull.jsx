import React, { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { Crown, Package, Layers, TrendingUp, Loader2, Calendar, Copy, Check, MessageCircle } from 'lucide-react';

const CARGO = { distribuidor: 'Distribuidor', loja_fisica: 'Loja Física', ponto_retirada: 'Ponto', parceiro: 'Parceiro', licenciado: 'Licenciado', licenciado_catalogo: 'Lic. Catálogo', licenciado_aplicativo: 'Lic. App', vendedor: 'Vendedor', influenciador: 'Influenciador', plano_lider: 'Líder', trainee: 'Trainee', usuario: 'Usuário', fundador: 'Fundador', ceo: 'CEO', socio: 'Sócio' };
const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`);
const PERIODS = [{ id: 'dia', label: 'Hoje' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtData = (d) => d.toLocaleDateString('pt-BR');
// rótulo grande e específico do período: dia da semana + data, ou intervalo, ou mês/ano
function rotuloPeriodo(period) {
  const now = new Date();
  if (period === 'dia') return `${cap(now.toLocaleDateString('pt-BR', { weekday: 'long' }))}, ${fmtData(now)}`;
  if (period === 'semana') {
    const dow = now.getDay(); // 0=dom
    const seg = new Date(now); seg.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    return `${fmtData(seg)} a ${fmtData(dom)}`;
  }
  return cap(now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })); // ex: Junho de 2026
}
const sub = (period) => (period === 'dia' ? 'Ranking do dia' : period === 'semana' ? 'Ranking da semana (seg → dom)' : 'Melhor do mês');

// Aba Ranking — campeões por período (dia/semana/mês): vendedor, produto e categoria.
export default function RankingFull({ userId, onSeller }) {
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

  const [copied, setCopied] = useState(false);
  const vendedores = data?.vendedor_campeao || [];
  const produtos = data?.produto_campeao || [];
  const categorias = data?.categoria_campeao || [];

  // texto bonito e motivador do ranking, pronto pra colar nos grupos
  const montarTexto = () => {
    const linha = (i, nome, val) => `${medal(i)} ${nome} — ${money(val)}`;
    const L = [];
    L.push(`🏆 *RANKING LEILÃO NOZAP*`);
    L.push(`📅 ${rotuloPeriodo(period)}`);
    L.push(`💰 ${money(data?.total || 0)} · ${data?.pedidos || 0} vendas`);
    L.push('');
    L.push('👑 *VENDEDORES CAMPEÕES*');
    vendedores.slice(0, 8).forEach((v, i) => L.push(linha(i, v.nome, v.total)));
    L.push('');
    L.push('📦 *PRODUTOS MAIS VENDIDOS*');
    produtos.slice(0, 5).forEach((p, i) => L.push(linha(i, p.produto, p.total)));
    L.push('');
    L.push('🔥 Bora pra cima, time! Cada venda conta. 🚀');
    return L.join('\n');
  };
  const copiar = () => { navigator.clipboard?.writeText(montarTexto()); setCopied(true); toast.success('Ranking copiado! Cole no grupo 🎉'); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      {/* seletor de período + data específica em paralelo */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="inline-flex bg-gray-800/70 border border-gray-700 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-5 py-2 rounded-lg text-sm font-bold transition ${period === p.id ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:text-white'}`}>{p.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-xl md:text-2xl font-black text-white leading-none">{rotuloPeriodo(period)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{sub(period)}</div>
          </div>
        </div>
        {/* compartilhar o ranking pros grupos */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={copiar} className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-semibold flex items-center gap-1.5 hover:border-emerald-500">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado' : 'Copiar ranking'}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(montarTexto())}`} target="_blank" rel="noreferrer" className="px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-bold flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Enviar no grupo</a>
        </div>
      </div>

      <div className="mb-5 text-sm text-gray-400">Total no período: <strong className="text-emerald-400">{money(data?.total || 0)}</strong> · {data?.pedidos || 0} pedido(s)</div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Carregando ranking…</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <RankCol title="Vendedor campeão" icon={Crown} items={vendedores} onItemClick={(v) => v.id && onSeller && onSeller(v.id)} render={(v) => ({ main: v.nome, sub: `${CARGO[v.cargo] || v.cargo || '—'} · ${v.pedidos} pedido(s)${v.id && onSeller ? ' · ver vendas →' : ''}`, val: v.total })} />
          <RankCol title="Produto campeão" icon={Package} items={produtos} render={(p) => ({ main: p.produto, sub: `${Number(p.qtd) || 0} un. vendida(s)`, val: p.total })} />
          <RankCol title="Categoria campeã" icon={Layers} items={categorias} render={(c) => ({ main: c.categoria, sub: `${Number(c.qtd) || 0} un. vendida(s)`, val: c.total })} />
        </div>
      )}
    </div>
  );
}

function RankCol({ title, icon: Icon, items, render, onItemClick }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 text-emerald-300 font-bold"><Icon className="w-4 h-4" /> {title}</div>
      {items.length === 0 ? <p className="text-sm text-gray-500 py-6 text-center">Sem dados no período.</p> : (
        <div className="space-y-1.5">
          {items.slice(0, 10).map((it, i) => {
            const r = render(it);
            const clickable = !!onItemClick;
            const Tag = clickable ? 'button' : 'div';
            return (
              <Tag key={i} {...(clickable ? { onClick: () => onItemClick(it) } : {})}
                className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2 transition ${i === 0 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/30' : 'bg-gray-900/50'} ${clickable ? 'hover:bg-gray-800 cursor-pointer' : ''}`}>
                <span className="text-lg w-7 text-center shrink-0">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.main}</div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {r.sub}</div>
                </div>
                <div className={`text-sm font-black ${i === 0 ? 'text-yellow-300' : 'text-emerald-400'}`}>{money(r.val)}</div>
              </Tag>
            );
          })}
        </div>
      )}
    </div>
  );
}
