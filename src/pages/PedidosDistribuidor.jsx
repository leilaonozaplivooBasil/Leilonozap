import React, { useState, useEffect } from 'react';
import { money } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  ArrowLeft, Truck, Package, Loader2, MapPin, Plus, Trash2, Check, Clock,
  PackageCheck, Send, Box, RefreshCw, ShoppingBag, X
} from 'lucide-react';


// fluxo de status do pedido
const FLOW = ['paid', 'preparando', 'saiu_entrega', 'entregue'];
const STATUS_META = {
  paid: { label: 'Pago', next: 'preparando', nextLabel: 'Preparar pedido', color: 'bg-blue-500/15 text-blue-300', icon: Clock },
  preparando: { label: 'Preparando', next: 'saiu_entrega', nextLabel: 'Saiu para entrega', color: 'bg-yellow-500/15 text-yellow-300', icon: Box },
  saiu_entrega: { label: 'Saiu para entrega', next: 'entregue', nextLabel: 'Marcar entregue', color: 'bg-purple-500/15 text-purple-300', icon: Send },
  entregue: { label: 'Entregue', next: null, nextLabel: null, color: 'bg-green-500/15 text-green-300', icon: PackageCheck },
  cancelado: { label: 'Cancelado', next: null, nextLabel: null, color: 'bg-red-500/15 text-red-300', icon: X },
};
const TIPO_LABEL = { correios: 'Correios', melhor_envio: 'Melhor Envio', proprio: 'Caminhão/Frota própria', transportadora: 'Transportadora', motoboy: 'Motoboy', retirada: 'Retirada no local' };

export default function PedidosDistribuidor() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('pedidos');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [busy, setBusy] = useState('');
  const [newCarrier, setNewCarrier] = useState({ nome: '', tipo: 'correios', prazo_dias: '', observacao: '' });

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    reload(u);
     
  }, []);

  const reload = async (u = user) => {
    setLoading(true);
    try {
      // pedidos de PRODUTO (exclui adesão de cargo), pagos e em fulfillment.
      // Cada um vê SÓ os seus pedidos (seller_id = você); admin/super_admin vê todos.
      const isAdmin = ['admin', 'super_admin'].includes(u?.role);
      // inclui vendas com kind NULL (catálogo normal) — neq sozinho exclui null no SQL
      let qy = supabase.from('catalog_sales').select('*').or('kind.is.null,kind.neq.adesao');
      if (!isAdmin) qy = qy.eq('seller_id', u?.id);
      const { data } = await qy.order('created_at', { ascending: false }).limit(500);
      setOrders((data || []).filter((o) => ['paid', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'].includes(o.status)));

      const c = await base44.functions.invoke('manageCarriers', { action: 'list', ownerId: u?.id });
      setCarriers(c?.carriers || []);
      setTableMissing(!!c?.table_missing);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const advance = async (order, toStatus) => {
    setBusy(order.id);
    try {
      const r = await base44.functions.invoke('updateOrderStatus', { actorId: user.id, saleId: order.id, status: toStatus });
      if (!r?.success) { toast.error(r?.error || 'Falha ao atualizar'); setBusy(''); return; }
      toast.success('Status atualizado!');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: toStatus } : o)));
    } catch (e) { toast.error('Erro'); }
    setBusy('');
  };

  const addCarrier = async () => {
    if (!newCarrier.nome.trim()) { toast.error('Dê um nome à transportadora.'); return; }
    setBusy('add-carrier');
    try {
      const r = await base44.functions.invoke('manageCarriers', {
        action: 'add', actorId: user.id, ownerId: user.id,
        nome: newCarrier.nome.trim(), tipo: newCarrier.tipo,
        prazo_dias: newCarrier.prazo_dias ? Number(newCarrier.prazo_dias) : null,
        observacao: newCarrier.observacao || null,
      });
      if (r?.table_missing) { setTableMissing(true); toast.error('Tabela de envio ainda não foi criada no banco.'); setBusy(''); return; }
      if (!r?.success) { toast.error(r?.error || 'Falha ao salvar'); setBusy(''); return; }
      toast.success('Empresa de envio cadastrada!');
      setCarriers((prev) => [r.carrier, ...prev]);
      setNewCarrier({ nome: '', tipo: 'correios', prazo_dias: '', observacao: '' });
    } catch (e) { toast.error('Erro'); }
    setBusy('');
  };

  const removeCarrier = async (id) => {
    setBusy(id);
    try {
      await base44.functions.invoke('manageCarriers', { action: 'remove', actorId: user.id, id });
      setCarriers((prev) => prev.filter((c) => c.id !== id));
    } catch (e) { toast.error('Erro'); }
    setBusy('');
  };

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  const countBy = (s) => orders.filter((o) => o.status === s).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* header */}
      <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/painel')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><ArrowLeft className="w-4 h-4" /> Voltar</button>
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center"><Truck className="w-5 h-5 text-green-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-none">Pedidos & Envio</h1>
              <p className="text-xs text-gray-500 mt-0.5">{orders.length} pedido(s)</p>
            </div>
          </div>
          <button onClick={() => reload()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('pedidos')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'pedidos' ? 'bg-green-600' : 'bg-gray-800 text-gray-300'}`}>📦 Pedidos</button>
          <button onClick={() => setTab('envio')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'envio' ? 'bg-green-600' : 'bg-gray-800 text-gray-300'}`}>🚚 Empresas de Envio</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…</div>
        ) : tab === 'pedidos' ? (
          <>
            {/* resumo por status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {FLOW.map((s) => {
                const M = STATUS_META[s]; const Icon = M.icon;
                return (
                  <div key={s} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><Icon className="w-3.5 h-3.5" /> {M.label}</div>
                    <div className="text-2xl font-black">{countBy(s)}</div>
                  </div>
                );
              })}
            </div>

            {orders.length === 0 ? (
              <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-10 text-center text-gray-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Nenhum pedido de cliente ainda. Quando alguém comprar na sua loja, o pedido aparece aqui para você despachar.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => {
                  const M = STATUS_META[o.status] || STATUS_META.paid;
                  const Icon = M.icon;
                  return (
                    <div key={o.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold flex items-center gap-2">
                            <Package className="w-4 h-4 text-green-400" /> {o.product_title || 'Pedido'}
                            {o.source === 'loja_online' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">🛒 Loja online</span>}
                          </div>
                          <div className="text-sm text-gray-400 mt-0.5">{o.buyer_name || o.buyer_email || 'Cliente'} · {o.quantity || 1}x · <strong className="text-white">{money(o.total_amount)}</strong></div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{(o.created_at || o.created_date) ? new Date(o.created_at || o.created_date).toLocaleString('pt-BR') : ''} {o.carrier ? `· ${o.carrier}` : ''} {o.tracking_code ? `· ${o.tracking_code}` : ''}</div>
                          {(o.buyer_address || o.buyer_cep || o.buyer_phone) && (
                            <div className="text-[12px] text-gray-300 mt-2 bg-gray-900/60 rounded-lg px-3 py-2 space-y-0.5">
                              {o.buyer_phone && <div className="flex items-center gap-1.5"><Send className="w-3 h-3 text-emerald-400" /> <a href={`https://wa.me/55${String(o.buyer_phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">{o.buyer_phone}</a></div>}
                              {(o.buyer_address || o.buyer_cep) && <div className="flex items-start gap-1.5"><MapPin className="w-3 h-3 text-emerald-400 mt-0.5" /> <span>{o.buyer_address || ''}{o.buyer_cep ? ` — CEP ${o.buyer_cep}` : ''}</span></div>}
                            </div>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${M.color}`}><Icon className="w-3.5 h-3.5" /> {M.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {M.next && (
                          <button onClick={() => advance(o, M.next)} disabled={busy === o.id} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center gap-1.5">
                            {busy === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {M.nextLabel}
                          </button>
                        )}
                        {o.status !== 'entregue' && o.status !== 'cancelado' && (
                          <button onClick={() => advance(o, 'cancelado')} disabled={busy === o.id} className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-red-600/40 text-sm text-gray-300 flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> Cancelar</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ENVIO */
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-green-400" /> Cadastrar empresa de envio</h2>
              {tableMissing && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs rounded-lg p-3 mb-3">
                  ⚠️ A tabela de envio ainda não foi criada no banco. Avise o admin pra rodar a migração <code>shipping_carriers</code>.
                </div>
              )}
              <div className="space-y-3 bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <input value={newCarrier.nome} onChange={(e) => setNewCarrier({ ...newCarrier, nome: e.target.value })} placeholder="Nome (ex: Correios PAC)" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                <select value={newCarrier.tipo} onChange={(e) => setNewCarrier({ ...newCarrier, tipo: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500">
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newCarrier.prazo_dias} onChange={(e) => setNewCarrier({ ...newCarrier, prazo_dias: e.target.value.replace(/\D/g, '') })} placeholder="Prazo (dias)" className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <input value={newCarrier.observacao} onChange={(e) => setNewCarrier({ ...newCarrier, observacao: e.target.value })} placeholder="Observação" className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                </div>
                <button onClick={addCarrier} disabled={busy === 'add-carrier'} className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold flex items-center justify-center gap-2">
                  {busy === 'add-carrier' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
                </button>
              </div>
            </div>

            <div>
              <h2 className="font-bold mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-green-400" /> Empresas cadastradas ({carriers.length})</h2>
              {carriers.length === 0 ? (
                <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">Nenhuma empresa de envio cadastrada.</div>
              ) : (
                <div className="space-y-2">
                  {carriers.map((c) => (
                    <div key={c.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center"><MapPin className="w-4 h-4 text-green-400" /></span>
                        <div>
                          <div className="font-semibold text-sm">{c.nome}</div>
                          <div className="text-[11px] text-gray-400">{TIPO_LABEL[c.tipo] || c.tipo}{c.prazo_dias ? ` · ${c.prazo_dias} dias` : ''}{c.observacao ? ` · ${c.observacao}` : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => removeCarrier(c.id)} disabled={busy === c.id} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
