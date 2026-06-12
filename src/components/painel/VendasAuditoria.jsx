import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  Search, Loader2, ChevronDown, ChevronRight, Package, User as UserIcon, Calendar,
  Filter, Truck, Store, X, MapPin, Receipt, Tag,
} from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (s) => (s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const catOf = (titulo) => {
  const w = String(titulo || '').trim().split(/\s+/).slice(0, 1).join(' ');
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '—';
};
const STATUS = { paid: 'Pago', preparando: 'Preparando', saiu_entrega: 'Saiu p/ entrega', entregue: 'Entregue', cancelado: 'Cancelado', pending_payment: 'Aguardando pgto' };
const itemsOf = (row) => {
  let it = row.itens;
  if (typeof it === 'string') { try { it = JSON.parse(it); } catch { it = null; } }
  if (Array.isArray(it) && it.length) return it;
  return [{ title: row.produto, qty: row.qtd, unit: row.valor / Math.max(1, Number(row.qtd) || 1) }];
};

// Auditoria de vendas (admin): vê tudo o que foi lançado, quem lançou, baixa no estoque,
// com busca e filtros por vendedor, data, categoria, origem e status. Tudo clicável.
export default function VendasAuditoria({ userId, initialSeller = '' }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [seller, setSeller] = useState(initialSeller);
  const [cat, setCat] = useState('');
  const [origem, setOrigem] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.rpc('vendas_auditoria', { _owner: userId, _lim: 500 })
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [userId]);

  // quando vem de um clique no ranking, já aplica o filtro do vendedor
  useEffect(() => { setSeller(initialSeller || ''); }, [initialSeller]);

  const sellers = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((r) => { if (r.vendedor_id) m.set(r.vendedor_id, r.vendedor_nome || r.vendedor_id); });
    return [...m.entries()].map(([id, nome]) => ({ id, nome }));
  }, [rows]);
  const cats = useMemo(() => {
    const s = new Set();
    (rows || []).forEach((r) => itemsOf(r).forEach((it) => s.add(catOf(it.title))));
    return [...s].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const ql = q.trim().toLowerCase();
    const fromT = from ? new Date(from + 'T00:00:00').getTime() : null;
    const toT = to ? new Date(to + 'T23:59:59').getTime() : null;
    return rows.filter((r) => {
      if (seller && r.vendedor_id !== seller) return false;
      if (origem && r.origem !== origem) return false;
      if (status && r.status !== status) return false;
      if (cat && !itemsOf(r).some((it) => catOf(it.title) === cat)) return false;
      if (fromT || toT) { const t = new Date(r.data).getTime(); if (fromT && t < fromT) return false; if (toT && t > toT) return false; }
      if (ql) {
        const hay = `${r.produto || ''} ${r.vendedor_nome || ''} ${r.operador_nome || ''} ${r.buyer_name || ''} ${r.tracking_code || ''}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, seller, cat, origem, status, from, to]);

  const totalFiltrado = filtered.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const limpar = () => { setQ(''); setSeller(''); setCat(''); setOrigem(''); setStatus(''); setFrom(''); setTo(''); };
  const temFiltro = q || seller || cat || origem || status || from || to;

  if (rows === null) return <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando vendas…</div>;

  return (
    <div>
      {/* BUSCA + FILTROS */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-3 mb-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por produto, vendedor, quem lançou, cliente ou rastreio…" className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Sel icon={UserIcon} value={seller} onChange={setSeller} label="Vendedor"><option value="">Todos vendedores</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</Sel>
          <Sel icon={Tag} value={cat} onChange={setCat} label="Categoria"><option value="">Toda categoria</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</Sel>
          <Sel icon={Store} value={origem} onChange={setOrigem} label="Origem"><option value="">Toda origem</option><option value="PDV">PDV</option><option value="Online">Loja online</option><option value="Histórico">Histórico</option></Sel>
          <Sel icon={Filter} value={status} onChange={setStatus} label="Status"><option value="">Todo status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Sel>
          <div className="flex items-center gap-1">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-xs outline-none focus:border-emerald-600" title="De" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-xs outline-none focus:border-emerald-600" title="Até" />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400"><strong className="text-white">{filtered.length}</strong> venda(s) · <strong className="text-emerald-400">{money(totalFiltrado)}</strong></span>
          {temFiltro && <button onClick={limpar} className="flex items-center gap-1 text-gray-400 hover:text-white"><X className="w-3 h-3" /> Limpar filtros</button>}
        </div>
      </div>

      {/* TABELA */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">Nenhuma venda com esses filtros.</div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-950 text-gray-400 text-[11px] uppercase">
                <tr>
                  <th className="text-left px-3 py-3 w-6"></th>
                  <th className="text-left px-3 py-3">Data/hora</th>
                  <th className="text-left px-3 py-3">Origem</th>
                  <th className="text-left px-3 py-3">Produto</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Quem lançou</th>
                  <th className="text-left px-3 py-3 hidden md:table-cell">Vendedor</th>
                  <th className="text-left px-3 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-right px-3 py-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const open = expanded === r.sale_id;
                  const items = itemsOf(r);
                  return (
                    <React.Fragment key={r.sale_id}>
                      <tr onClick={() => setExpanded(open ? null : r.sale_id)} className="border-t border-gray-800 hover:bg-gray-800/40 cursor-pointer">
                        <td className="px-3 py-3 text-gray-500">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                        <td className="px-3 py-3 text-gray-300 whitespace-nowrap">{dt(r.data)}</td>
                        <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.origem === 'PDV' ? 'bg-green-500/15 text-green-300' : r.origem === 'Online' ? 'bg-blue-500/15 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>{r.origem}</span></td>
                        <td className="px-3 py-3 max-w-[240px] truncate">{r.produto || '—'}{items.length > 1 && <span className="text-[10px] text-gray-500"> +{items.length - 1}</span>}</td>
                        <td className="px-3 py-3 text-gray-400 hidden lg:table-cell truncate max-w-[140px]">{r.operador_nome || '—'}</td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          {r.vendedor_nome ? <button onClick={(e) => { e.stopPropagation(); setSeller(r.vendedor_id); }} className="text-emerald-300 hover:underline truncate max-w-[140px] text-left">{r.vendedor_nome}</button> : <span className="text-gray-600">casa</span>}
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell text-gray-300 text-xs">{STATUS[r.status] || r.status}</td>
                        <td className="px-3 py-3 text-right font-semibold text-green-400 whitespace-nowrap">{money(r.valor)}</td>
                      </tr>
                      {open && (
                        <tr className="bg-gray-900/60 border-t border-gray-800/60">
                          <td></td>
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-[11px] text-gray-400 font-semibold mb-1.5 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Itens · baixa no estoque</div>
                                <div className="space-y-1">
                                  {items.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 text-xs bg-gray-950/60 rounded px-2.5 py-1.5">
                                      <span className="truncate">{it.title}</span>
                                      <span className="text-gray-400 shrink-0">{Number(it.qty) || 1} × {money(it.unit)} <span className="text-red-300">· −{Number(it.qty) || 1} estoque</span></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="text-xs text-gray-300 space-y-1">
                                <div className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-gray-500" /> Quem lançou: <strong>{r.operador_nome || '—'}</strong></div>
                                <div className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-gray-500" /> Vendedor (comissão): <strong>{r.vendedor_nome || 'casa (distribuidor)'}</strong>{r.vendedor_cargo ? ` · ${r.vendedor_cargo}` : ''}</div>
                                <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-gray-500" /> Pagamento: <strong>{r.pagamento || '—'}</strong> · Comissão paga: <strong className="text-yellow-300">{money(r.comissao)}</strong></div>
                                {r.buyer_name && <div className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-gray-500" /> Cliente: <strong>{r.buyer_name}</strong>{r.buyer_phone ? ` · ${r.buyer_phone}` : ''}</div>}
                                {r.tracking_code && <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-gray-500" /> Rastreio: <strong>{r.tracking_code}</strong></div>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Sel({ icon: Icon, value, onChange, label, children }) {
  return (
    <div className="relative">
      <Icon className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`w-full bg-gray-950 border rounded-lg pl-8 pr-2 py-2 text-xs outline-none focus:border-emerald-600 ${value ? 'border-emerald-600/60 text-emerald-200' : 'border-gray-700 text-gray-300'}`}>
        {children}
      </select>
    </div>
  );
}
