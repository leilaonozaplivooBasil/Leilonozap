import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, Loader2, Check,
  Package, User as UserIcon, Phone, CreditCard, Banknote, QrCode, Store, Truck
} from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const priceOf = (p) => Number(p.price_catalog || p.selling_price_retail || 0);

export default function TirarPedido() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [payment, setPayment] = useState('dinheiro');
  const [delivered, setDelivered] = useState(true); // retirada no balcão por padrão
  const [processing, setProcessing] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    loadToday(u);
  }, []);

  const loadToday = async (u = user) => {
    if (!u?.id) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('catalog_sales').select('total_amount').eq('source', 'pdv').gte('created_at', start.toISOString());
    const list = data || [];
    setTodayCount(list.length);
    setTodayTotal(list.reduce((s, x) => s + (Number(x.total_amount) || 0), 0));
  };

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('id,description,price_catalog,selling_price_retail,quantity,lot,image_urls')
        .or(`description.ilike.%${q}%,lot.ilike.%${q}%`)
        .limit(20);
      setResults(data || []);
    } catch (e) { console.error(e); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(term), 350);
    return () => clearTimeout(t);
  }, [term, doSearch]);

  const addToCart = (p) => {
    setCart((prev) => {
      const ex = prev.find((x) => x.id === p.id);
      if (ex) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { id: p.id, description: p.description, price: priceOf(p), qty: 1, stock: Number(p.quantity) || 0 }];
    });
    setTerm(''); setResults([]);
  };
  const setQty = (id, qty) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const setPrice = (id, price) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, price: Number(price) || 0 } : x)));
  const remove = (id) => setCart((prev) => prev.filter((x) => x.id !== id));

  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);

  const finalize = async () => {
    if (!user?.id) { toast.error('Faça login.'); return; }
    if (!cart.length) { toast.error('Adicione produtos ao pedido.'); return; }
    setProcessing(true);
    try {
      const r = await base44.functions.invoke('createPdvOrder', {
        actorId: user.id,
        items: cart.map((x) => ({ product_id: x.id, quantity: x.qty, price: x.price })),
        customer: { name: customer.name, phone: customer.phone },
        payment_method: payment,
        delivered,
      });
      if (!r?.success) { toast.error(r?.error || 'Falha ao finalizar'); setProcessing(false); return; }
      toast.success(`Pedido fechado! ${money(r.total)}`);
      setCart([]); setCustomer({ name: '', phone: '' });
      loadToday();
    } catch (e) { toast.error('Erro ao finalizar'); }
    setProcessing(false);
  };

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* header */}
      <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/painel')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><ArrowLeft className="w-4 h-4" /> Voltar</button>
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-green-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-none">PDV — Tirar Pedido</h1>
              <p className="text-xs text-gray-500 mt-0.5">Distribuidor 01 · {user.full_name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-500 uppercase">Vendas hoje</div>
            <div className="text-lg font-black text-green-400">{money(todayTotal)} <span className="text-xs text-gray-500">· {todayCount}</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_380px] gap-6">
        {/* busca + resultados */}
        <div>
          <div className="relative mb-4">
            <Search className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar produto por nome ou SKU/lote…"
              className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-11 pr-4 py-3.5 text-white outline-none focus:border-green-500"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>

          {results.length > 0 && (
            <div className="space-y-2 mb-4">
              {results.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center gap-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded-xl p-3 text-left transition-colors">
                  <span className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image_urls?.[0] ? <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.description}</div>
                    <div className="text-[11px] text-gray-500">{p.lot || ''} · estoque {Number(p.quantity) || 0}</div>
                  </div>
                  <div className="text-sm font-bold text-green-400">{money(priceOf(p))}</div>
                  <Plus className="w-4 h-4 text-green-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
          {term.length >= 2 && !searching && results.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum produto encontrado.</p>
          )}
          {!term && cart.length === 0 && (
            <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-10 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Busque um produto para começar o pedido.
            </div>
          )}
        </div>

        {/* carrinho / fechamento */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 h-fit lg:sticky lg:top-28">
          <h2 className="font-bold mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-green-400" /> Pedido ({cart.length})</h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">Carrinho vazio.</p>
          ) : (
            <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
              {cart.map((x) => (
                <div key={x.id} className="bg-gray-900/60 rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium flex-1 min-w-0 truncate">{x.description}</div>
                    <button onClick={() => remove(x.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(x.id, x.qty - 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-8 text-center text-sm font-bold">{x.qty}</span>
                      <button onClick={() => setQty(x.id, x.qty + 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-gray-500 text-xs">R$</span>
                      <input value={x.price} onChange={(e) => setPrice(x.id, e.target.value.replace(',', '.'))} className="w-20 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-right text-sm outline-none focus:border-green-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* cliente */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Cliente (opcional)" className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </div>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="WhatsApp (opcional)" className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </div>
          </div>

          {/* pagamento */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[['dinheiro', 'Dinheiro', Banknote], ['pix', 'PIX', QrCode], ['cartao', 'Cartão', CreditCard]].map(([k, label, Icon]) => (
              <button key={k} onClick={() => setPayment(k)} className={`py-2.5 rounded-lg border-2 text-xs font-semibold flex flex-col items-center gap-1 ${payment === k ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-300'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* entrega */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setDelivered(true)} className={`py-2.5 rounded-lg border-2 text-xs font-semibold flex items-center justify-center gap-1.5 ${delivered ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-300'}`}><Store className="w-4 h-4" /> Retirada no balcão</button>
            <button onClick={() => setDelivered(false)} className={`py-2.5 rounded-lg border-2 text-xs font-semibold flex items-center justify-center gap-1.5 ${!delivered ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-300'}`}><Truck className="w-4 h-4" /> Entregar depois</button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400">Total</span>
            <span className="text-2xl font-black text-green-400">{money(total)}</span>
          </div>

          <button onClick={finalize} disabled={processing || !cart.length} className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 font-black flex items-center justify-center gap-2">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Fechar pedido
          </button>
        </div>
      </div>
    </div>
  );
}
