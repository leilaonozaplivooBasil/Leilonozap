import React, { useState, useEffect, useCallback } from 'react';
import { money } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  ArrowLeft, Package, Loader2, Search, Plus, Minus, Trash2, Check,
  Box, RefreshCw, PackagePlus
} from 'lucide-react';


export default function MeuEstoque() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('meu'); // meu | catalogo
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState('');
  // catálogo (solicitar do distribuidor) — só loja_fisica
  const [catTerm, setCatTerm] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  const isLojaFisica = user && (user.primary_career_level === 'loja_fisica' || (Array.isArray(user.career_levels) && user.career_levels.includes('loja_fisica')));

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    load(u, '');
     
  }, []);

  const load = async (u = user, q = term) => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc('loja_estoque', { _owner: u.id, q: q || '', lim: 400 });
      setItems(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (user) { const t = setTimeout(() => load(user, term), 350); return () => clearTimeout(t); } }, [term]);  

  const setQty = async (it, qty) => {
    qty = Math.max(0, qty);
    setItems((p) => p.map((x) => (x.inv_id === it.inv_id ? { ...x, quantidade: qty, ativo: qty > 0 } : x)));
    await base44.functions.invoke('manageStoreInventory', { actorId: user.id, action: 'setQuantity', inv_id: it.inv_id, quantity: qty });
  };
  const toggle = async (it) => {
    const active = !it.ativo;
    setItems((p) => p.map((x) => (x.inv_id === it.inv_id ? { ...x, ativo: active } : x)));
    await base44.functions.invoke('manageStoreInventory', { actorId: user.id, action: 'toggle', inv_id: it.inv_id, active });
  };
  const remove = async (it) => {
    if (!confirm(`Remover "${it.descricao?.slice(0, 40)}" da sua loja?`)) return;
    setBusy(it.inv_id);
    const r = await base44.functions.invoke('manageStoreInventory', { actorId: user.id, action: 'remove', inv_id: it.inv_id });
    if (r?.success) { setItems((p) => p.filter((x) => x.inv_id !== it.inv_id)); toast.success('Removido da sua loja'); }
    else toast.error(r?.error || 'Falha');
    setBusy('');
  };

  // catálogo do distribuidor
  const loadCatalog = useCallback(async (q) => {
    if (!user?.referred_by_id) return;
    setCatLoading(true);
    try {
      const { data } = await supabase.rpc('loja_catalogo', { _owner: user.id, dist_id: user.referred_by_id, q: q || '', lim: 200 });
      setCatalog(data || []);
    } catch (e) { console.error(e); }
    setCatLoading(false);
  }, [user]);
  useEffect(() => { if (tab === 'catalogo' && user) { const t = setTimeout(() => loadCatalog(catTerm), 350); return () => clearTimeout(t); } }, [catTerm, tab, user, loadCatalog]);

  const solicitar = async (c) => {
    setBusy(c.product_id);
    const r = await base44.functions.invoke('manageStoreInventory', { actorId: user.id, action: 'add', owner_id: user.id, product_id: c.product_id, quantity: 1 });
    if (r?.success) { toast.success('Adicionado à sua loja!'); setCatalog((p) => p.map((x) => (x.product_id === c.product_id ? { ...x, na_loja: true } : x))); }
    else toast.error(r?.error || 'Falha');
    setBusy('');
  };

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  const ativos = items.filter((i) => i.ativo).length;
  const semEstoque = items.filter((i) => Number(i.quantidade) === 0).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/painel')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><ArrowLeft className="w-4 h-4" /> Voltar</button>
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center"><Box className="w-5 h-5 text-green-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-none">Meu Estoque</h1>
              <p className="text-xs text-gray-500 mt-0.5">{user.store_name || user.full_name} · {items.length} itens · {ativos} ativos{semEstoque ? ` · ${semEstoque} sem estoque` : ''}</p>
            </div>
          </div>
          <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {isLojaFisica && (
          <div className="flex gap-2 mb-5">
            <button onClick={() => setTab('meu')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'meu' ? 'bg-green-600' : 'bg-gray-800 text-gray-300'}`}>📦 Minha loja</button>
            <button onClick={() => setTab('catalogo')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'catalogo' ? 'bg-green-600' : 'bg-gray-800 text-gray-300'}`}>➕ Solicitar do distribuidor</button>
          </div>
        )}

        {tab === 'meu' && (
          <>
            <div className="relative mb-4 max-w-md">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar no meu estoque…" className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500" />
            </div>
            {!isLojaFisica && <p className="text-[11px] text-gray-500 mb-3">ℹ️ Você ajusta a <b>quantidade</b> do seu estoque (produto zera → fica inativo). Só a Loja Física edita o catálogo.</p>}
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando…</div>
            ) : items.length === 0 ? (
              <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">Nenhum item no seu estoque.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Produto</th>
                      <th className="text-right px-4 py-3">Preço</th>
                      <th className="text-center px-4 py-3">Quantidade</th>
                      <th className="text-center px-4 py-3">Status</th>
                      {isLojaFisica && <th className="text-center px-4 py-3">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.inv_id} className="border-t border-gray-800 hover:bg-gray-800/40">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">{it.imagem ? <img src={it.imagem} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-400" />}</span>
                            <span className="max-w-[320px] truncate">{it.descricao}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-400 font-semibold">{money(it.preco)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setQty(it, Number(it.quantidade) - 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                            <input value={Number(it.quantidade)} onChange={(e) => setQty(it, parseInt(e.target.value.replace(/\D/g, '')) || 0)} className="w-14 bg-gray-950 border border-gray-700 rounded px-1 py-1 text-center text-sm outline-none focus:border-green-500" />
                            <button onClick={() => setQty(it, Number(it.quantidade) + 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => toggle(it)} className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${it.ativo ? 'bg-green-500/15 text-green-300' : 'bg-gray-700 text-gray-400'}`}>{it.ativo ? 'Ativo' : 'Inativo'}</button>
                        </td>
                        {isLojaFisica && (
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => remove(it)} disabled={busy === it.inv_id} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'catalogo' && isLojaFisica && (
          <>
            <p className="text-sm text-gray-400 mb-3">Catálogo do distribuidor. Solicite o que você tem na sua loja mas ainda não está aqui.</p>
            <div className="relative mb-4 max-w-md">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={catTerm} onChange={(e) => setCatTerm(e.target.value)} placeholder="Buscar no catálogo do distribuidor…" className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500" />
            </div>
            {catLoading ? (
              <div className="flex items-center gap-2 text-gray-400 py-8"><Loader2 className="w-5 h-5 animate-spin" /> Carregando…</div>
            ) : (
              <div className="space-y-2">
                {catalog.map((c) => (
                  <div key={c.product_id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">{c.imagem ? <img src={c.imagem} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-400" />}</span>
                    <div className="flex-1 min-w-0"><div className="text-sm truncate">{c.descricao}</div><div className="text-[11px] text-green-400">{money(c.preco)}</div></div>
                    {c.na_loja ? (
                      <span className="text-[11px] text-green-300 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Na minha loja</span>
                    ) : (
                      <button onClick={() => solicitar(c)} disabled={busy === c.product_id} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center gap-1.5"><PackagePlus className="w-4 h-4" /> Solicitar</button>
                    )}
                  </div>
                ))}
                {catalog.length === 0 && <p className="text-gray-500 text-sm">Nada encontrado.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
