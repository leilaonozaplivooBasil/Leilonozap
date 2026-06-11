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
// aceita "69,80", "69.80", "1.234,56", "6980" → número
const parseBRL = (s) => {
  if (typeof s === 'number') return s;
  let t = String(s ?? '').trim().replace(/[^\d.,]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); // vírgula = separador decimal
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};
const toText = (n) => (Number(n) || 0).toFixed(2).replace('.', ','); // 69.8 → "69,80"
const CARGO_LABEL = {
  distribuidor: 'Distribuidor', loja_fisica: 'Loja Física', ponto_retirada: 'Ponto de Retirada', parceiro: 'Parceiro',
  licenciado: 'Licenciado', licenciado_catalogo: 'Licenciado Catálogo', licenciado_aplicativo: 'Licenciado App',
  vendedor: 'Vendedor', influenciador: 'Influenciador', plano_lider: 'Líder', trainee: 'Trainee', usuario: 'Usuário',
};
const cargoLabel = (c) => CARGO_LABEL[c] || c || '—';

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
  // 🧑‍💼 vincular a um vendedor (comissão) — opcional
  const [sellers, setSellers] = useState([]);
  const [sellerQuery, setSellerQuery] = useState('');
  const [vendedor, setVendedor] = useState(null); // { id, full_name, primary_career_level }
  const isStore = user && ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(user.primary_career_level);

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    loadToday(u);
    // carrega a rede do distribuidor pra poder vincular a venda a um vendedor
    if (u?.id && !['loja_fisica', 'ponto_retirada', 'parceiro'].includes(u.primary_career_level)) {
      supabase.rpc('distribuidor_rede', { dist_id: u.id })
        .then(({ data }) => setSellers(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, []);

  const loadToday = async (u = user) => {
    if (!u?.id) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('catalog_sales').select('total_amount').eq('source', 'pdv').eq('seller_id', u.id).gte('created_at', start.toISOString());
    const list = data || [];
    setTodayCount(list.length);
    setTodayTotal(list.reduce((s, x) => s + (Number(x.total_amount) || 0), 0));
  };

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const u = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();
      const isStore = u && ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(u.primary_career_level);
      if (isStore) {
        // dono de loja vende do PRÓPRIO estoque (store_inventory)
        const { data } = await supabase.rpc('loja_estoque', { _owner: u.id, q, lim: 20 });
        setResults((data || []).filter((x) => x.ativo && Number(x.quantidade) > 0).map((x) => ({
          id: x.product_id, description: x.descricao, price_catalog: x.preco, quantity: x.quantidade, lot: '', image_urls: x.imagem ? [x.imagem] : [],
        })));
      } else {
        const { data } = await supabase
          .from('products')
          .select('id,description,price_catalog,selling_price_retail,quantity,lot,image_urls')
          .or(`description.ilike.%${q}%,lot.ilike.%${q}%`)
          .limit(20);
        setResults(data || []);
      }
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
      return [...prev, { id: p.id, description: p.description, priceText: toText(priceOf(p)), qty: 1, stock: Number(p.quantity) || 0 }];
    });
    setTerm(''); setResults([]);
    toast.success('Item adicionado. Pode buscar e adicionar mais.');
  };
  const setQty = (id, qty) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  // mantém o texto cru (aceita vírgula) — só converte pra número no total/fechamento
  const setPriceText = (id, raw) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, priceText: String(raw).replace(/[^\d.,]/g, '') } : x)));
  const remove = (id) => setCart((prev) => prev.filter((x) => x.id !== id));

  const total = cart.reduce((s, x) => s + parseBRL(x.priceText) * x.qty, 0);
  const sellerOptions = sellers.filter((s) => {
    const q = sellerQuery.trim().toLowerCase();
    return !q || (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.primary_career_level || '').toLowerCase().includes(q);
  });

  const finalize = async () => {
    if (!user?.id) { toast.error('Faça login.'); return; }
    if (!cart.length) { toast.error('Adicione produtos ao pedido.'); return; }
    setProcessing(true);
    try {
      const r = await base44.functions.invoke('createPdvOrder', {
        actorId: user.id,
        items: cart.map((x) => ({ product_id: x.id, quantity: x.qty, price: parseBRL(x.priceText) })),
        customer: { name: customer.name, phone: customer.phone },
        payment_method: payment,
        delivered,
        vendedor_id: vendedor?.id || null,
      });
      if (!r?.success) { toast.error(r?.error || 'Falha ao finalizar'); setProcessing(false); return; }
      toast.success(`Pedido fechado! ${money(r.total)}${r.comissao ? ` · comissão ${money(r.comissao)}` : ''}`);
      setCart([]); setCustomer({ name: '', phone: '' }); setVendedor(null); setSellerQuery('');
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
          {!term && cart.length > 0 && (
            <p className="text-[12px] text-green-400/80 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Busque acima pra adicionar <strong>mais itens</strong> no mesmo pedido.</p>
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
                      <input
                        inputMode="decimal"
                        value={x.priceText}
                        onChange={(e) => setPriceText(x.id, e.target.value)}
                        onBlur={(e) => setPriceText(x.id, toText(parseBRL(e.target.value)))}
                        placeholder="0,00"
                        className="w-24 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-right text-sm outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* quem vendeu? (comissão) — só pro distribuidor/operador, não pra dono de loja */}
          {!isStore && (
            <div className="mb-3">
              <label className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1"><UserIcon className="w-3 h-3" /> Quem vendeu? (comissão entra pra esse login) — opcional</label>
              {vendedor ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                  <span className="text-sm text-green-200 truncate">{vendedor.full_name} <span className="text-[10px] text-green-400/70">· {cargoLabel(vendedor.primary_career_level)}</span></span>
                  <button onClick={() => { setVendedor(null); setSellerQuery(''); }} className="text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ) : (
                <div>
                  <input value={sellerQuery} onChange={(e) => setSellerQuery(e.target.value)} placeholder="Filtrar por nome, e-mail ou cargo…" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 mb-1" />
                  <div className="border border-gray-800 rounded-lg max-h-56 overflow-y-auto bg-gray-950/60">
                    {sellerOptions.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-gray-500">{sellers.length ? 'Nenhum login encontrado.' : 'Carregando logins da rede…'}</div>
                    ) : sellerOptions.map((s) => (
                      <button key={s.id} onClick={() => { setVendedor(s); setSellerQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm border-b border-gray-800/60 last:border-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{s.full_name || s.email}</div>
                          <div className="text-[10px] text-gray-500 truncate">{s.email}</div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 shrink-0">{cargoLabel(s.primary_career_level)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">{sellers.length} logins vinculados ao distribuidor · sem seleção, a venda fica na casa.</p>
                </div>
              )}
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
