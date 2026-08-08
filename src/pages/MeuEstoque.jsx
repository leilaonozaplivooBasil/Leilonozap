import React, { useState, useEffect } from 'react';
import { money } from '@/lib/format';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Package, Loader2, Search, Plus, Minus, Trash2,
  Box, RefreshCw
} from 'lucide-react';
// 🧭 Estoque virou UMA tela só: o que é meu, comprar e pedir consignado.
import AbasEstoque from '@/components/estoque/AbasEstoque';
import PedirConsignado from '@/components/estoque/PedirConsignado';
import ComprarEstoque from '@/pages/ComprarEstoque';


export default function MeuEstoque() {
  const [user, setUser] = useState(null);
  // aba vem da URL: quem chega por /painel/estoque?aba=comprar cai direto na compra
  const [aba, setAba] = useState(() => {
    const a = new URLSearchParams(window.location.search).get('aba');
    return ['meu', 'comprar', 'consignado'].includes(a) ? a : 'meu';
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState('');

  const trocarAba = (nova) => {
    setAba(nova);
    // mantém a aba na URL para o link ser compartilhável e o voltar funcionar
    window.history.replaceState(null, '', nova === 'meu' ? '/painel/estoque' : `/painel/estoque?aba=${nova}`);
  };

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
      const lista = data || [];
      // 🏷️ Origem de cada peça: COMPRADO (já é dele) ou CONSIGNADO (ainda deve).
      // Vem do store_inventory e casa pela linha (inv_id). Se não casar, o item
      // aparece sem selo — nunca some da lista.
      const { data: inv } = await supabase
        .from('store_inventory').select('id,origem,divida_aberta').eq('owner_id', u.id);
      const porId = {}; (inv || []).forEach((r) => { porId[r.id] = r; });
      setItems(lista.map((it) => {
        const r = porId[it.inv_id];
        return { ...it, origem: r?.origem || null, divida: Number(r?.divida_aberta) || 0 };
      }));
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

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  const ativos = items.filter((i) => i.ativo).length;
  const semEstoque = items.filter((i) => Number(i.quantidade) === 0).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* ↩️ Voltar removido: navegação pela lateral de ícones */}
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center"><Box className="w-5 h-5 text-green-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-none">Meu Estoque</h1>
              <p className="text-xs text-gray-500 mt-0.5">{user.store_name || user.full_name} · {items.length} itens · {ativos} ativos{semEstoque ? ` · ${semEstoque} sem estoque` : ''}</p>
            </div>
          </div>
          <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5">
          <AbasEstoque aba={aba} onAba={trocarAba} />
        </div>

        {aba === 'consignado' && <PedirConsignado user={user} />}

        {aba === 'meu' && (
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
                            <div className="min-w-0">
                              <span className="block max-w-[320px] truncate">{it.descricao}</span>
                              {/* 🏷️ de quem é a peça: comprada (dele) ou consignada (ainda devendo) */}
                              {it.origem === 'consignado' ? (
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                  CONSIGNADO{it.divida > 0 ? ` · devo ${money(it.divida)}` : ''}
                                </span>
                              ) : it.origem === 'comprado' ? (
                                <span className="text-[10px] font-bold text-green-300 bg-green-500/15 px-1.5 py-0.5 rounded mt-0.5 inline-block">COMPRADO</span>
                              ) : null}
                            </div>
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

        {/* 🛒 A compra virou aba: mesma tela de sempre, agora sem sair do estoque */}
        {aba === 'comprar' && <ComprarEstoque embutido />}

      </div>
    </div>
  );
}