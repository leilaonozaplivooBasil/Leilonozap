import React, { useEffect, useState, useCallback } from 'react';
import { money } from '@/lib/format';
import { copyLink } from '@/lib/clipboard';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ComparaiModal from '@/components/comparai/ComparaiModal';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, X, Loader2, Store as StoreIcon,
  ShieldCheck, Share2, MessageCircle, Copy, CheckCircle2, Package,
} from 'lucide-react';

const firstImg = (images) => {
  if (Array.isArray(images)) return images[0] || '';
  if (typeof images === 'string') { try { const a = JSON.parse(images); return Array.isArray(a) ? a[0] : images; } catch { return images; } }
  return '';
};
const CARGO_LABEL = { loja_fisica: 'Loja Física', ponto_retirada: 'Ponto de Retirada', parceiro: 'Parceiro', distribuidor: 'Distribuidor Oficial' };

export default function LojaVitrine() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const [data, setData] = useState(undefined); // undefined=carregando, null=não existe
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState({}); // { product_id: {title, price, image, qty, max} }
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [comparaiItem, setComparaiItem] = useState(null); // produto aberto no Comparaí
  const cartKey = `lnz_cart_${slug}`;

  // carrega vitrine
  const load = useCallback(async (term = '') => {
    const { data: r, error } = await supabase.rpc('loja_vitrine', { _slug: slug, q: term, lim: 60 });
    if (error) { setData(null); return; }
    setData(r || null);
  }, [slug]);

  useEffect(() => { setData(undefined); load(''); }, [load]);

  // restaura carrinho
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(cartKey) || '{}'); setCart(s && typeof s === 'object' ? s : {}); } catch { setCart({}); } }, [cartKey]);
  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(cart)); }, [cart, cartKey]);

  // busca com debounce (server-side)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (data === undefined) return;
    setSearching(true);
    load(debouncedQ).finally(() => setSearching(false));
     
  }, [debouncedQ]);

  // confirmação de pagamento via cartão (volta da Stripe)
  useEffect(() => { if (sp.get('pago')) { setCart({}); toast.success('Pagamento confirmado! Pedido ' + sp.get('pago')); } }, [sp]);

  const store = data?.store;
  const items = data?.items || [];
  const cartItems = Object.entries(cart).map(([id, v]) => ({ id, ...v }));
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const add = (it) => {
    setCart((c) => {
      const cur = c[it.product_id];
      const qty = Math.min((cur?.qty || 0) + 1, it.quantity);
      return { ...c, [it.product_id]: { title: it.title, price: it.price, image: firstImg(it.images), qty, max: it.quantity } };
    });
    setCartOpen(true);
  };
  const setQty = (id, delta) => setCart((c) => {
    const cur = c[id]; if (!cur) return c;
    const qty = Math.max(0, Math.min(cur.qty + delta, cur.max || 99));
    if (qty === 0) { const { [id]: _, ...rest } = c; return rest; }
    return { ...c, [id]: { ...cur, qty } };
  });
  const removeItem = (id) => setCart((c) => { const { [id]: _, ...rest } = c; return rest; });

  // ---------- ESTADOS DE PÁGINA ----------
  if (data === undefined) {
    return <div className="min-h-screen bg-[#0a0e0c] flex items-center justify-center text-emerald-300"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando loja…</div>;
  }
  if (data === null || !store) {
    return (
      <div className="min-h-screen bg-[#0a0e0c] flex flex-col items-center justify-center text-center px-6">
        <StoreIcon className="w-14 h-14 text-gray-600 mb-4" />
        <h1 className="text-xl font-bold text-white">Loja não encontrada</h1>
        <p className="text-gray-400 mt-1">O link <span className="text-emerald-400">/loja/{slug}</span> não existe ou foi desativado.</p>
        <a href="/Loja-Virtual" className="mt-6 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Ver catálogo geral</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e0c] text-gray-100">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-[#0a0e0c]/95 backdrop-blur border-b border-emerald-900/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center font-black text-white text-lg shrink-0">
            {(store.name || 'L').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-white leading-tight truncate">{store.name}</h1>
            <div className="flex items-center gap-2 text-[11px] text-emerald-300/90">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Loja oficial · Leilão NoZap</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">{CARGO_LABEL[store.career] || 'Loja'}</span>
            </div>
          </div>
          <button onClick={async () => { const ok = await copyLink(window.location.href); ok ? toast.success('Link da loja copiado!') : toast.error('Não consegui copiar. Copie da barra de endereço.'); }} className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300" title="Compartilhar">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-400 text-black text-[11px] font-black flex items-center justify-center">{cartCount}</span>}
          </button>
        </div>
        {/* busca */}
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            {searching && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar em ${data.count?.toLocaleString('pt-BR') || ''} produtos…`}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:border-emerald-600" />
          </div>
        </div>
      </header>

      {/* GRID */}
      <main className="max-w-6xl mx-auto px-4 py-5">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-20"><Package className="w-10 h-10 mx-auto mb-3 opacity-50" />Nenhum produto encontrado{debouncedQ ? ` para “${debouncedQ}”` : ''}.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((it) => {
              const img = firstImg(it.images);
              const inCart = cart[it.product_id]?.qty || 0;
              return (
                <div key={it.product_id} className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden flex flex-col hover:border-emerald-700/60 transition">
                  <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
                    {img ? <img src={img} alt={it.title} loading="lazy" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      : <Package className="w-10 h-10 text-gray-700" />}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-[13px] leading-snug text-gray-200 line-clamp-2 min-h-[34px]">{it.title}</p>
                    <div className="mt-1.5 text-lg font-black text-emerald-400">{money(it.price)}</div>
                    <div className="text-[10px] text-gray-500 mb-2">{it.quantity} em estoque</div>
                    <button onClick={() => add(it)} disabled={inCart >= it.quantity}
                      className="mt-auto w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                      {inCart > 0 ? <><CheckCircle2 className="w-4 h-4" /> {inCart} no carrinho</> : <><Plus className="w-4 h-4" /> Adicionar</>}
                    </button>
                    <button onClick={() => setComparaiItem(it)}
                      className="mt-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                      <img src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/d36767bcd_image.png" alt="Comparaí" className="w-4 h-4" /> Comparar Preços
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CARRINHO (drawer) */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md bg-[#0c1310] border-l border-gray-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-400" /> Seu carrinho</h2>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? <p className="text-gray-500 text-center py-12">Carrinho vazio.</p> : cartItems.map((i) => (
                <div key={i.id} className="flex gap-3 bg-gray-900/60 rounded-xl p-2.5">
                  <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">{i.image ? <img src={i.image} className="w-full h-full object-contain" /> : <Package className="w-6 h-6 text-gray-700" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] line-clamp-2">{i.title}</p>
                    <div className="text-emerald-400 font-bold text-sm">{money(i.price * i.qty)}</div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(i.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg">
                      <button onClick={() => setQty(i.id, -1)} className="p-1.5 hover:text-emerald-400"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="text-sm w-5 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, +1)} disabled={i.qty >= (i.max || 99)} className="p-1.5 hover:text-emerald-400 disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-gray-800">
                <div className="flex justify-between text-sm mb-1 text-gray-400"><span>Total</span><span className="text-2xl font-black text-emerald-400">{money(cartTotal)}</span></div>
                <button onClick={() => { setCartOpen(false); setCheckout(true); }} className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white">Finalizar compra</button>
              </div>
            )}
          </div>
        </div>
      )}

      {checkout && <Checkout slug={slug} store={store} cartItems={cartItems} total={cartTotal} onClose={() => setCheckout(false)} onPaid={() => { setCart({}); setCheckout(false); }} />}

      {comparaiItem && (
        <ComparaiModal
          auction={{ id: comparaiItem.product_id, title: comparaiItem.title, current_price: comparaiItem.price, starting_price: comparaiItem.price, image_urls: comparaiItem.images }}
          isProduct
          onClose={() => setComparaiItem(null)}
        />
      )}

      <footer className="text-center text-[11px] text-gray-600 py-8">Leilão NoZap · Pagamento seguro via PIX ou Cartão</footer>
    </div>
  );
}

// ---------- CHECKOUT ----------
function Checkout({ slug, store, cartItems, total, onClose, onPaid }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', cep: '', address: '' });
  const [gateway, setGateway] = useState('pix');
  const [step, setStep] = useState('form'); // form | pix
  const [sending, setSending] = useState(false);
  const [pix, setPix] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pay = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Preencha nome e WhatsApp'); return; }
    setSending(true);
    try {
      const items = cartItems.map((i) => ({ product_id: i.id, quantity: i.qty }));
      const r = await base44.functions.invoke('createStoreOrder', { slug, gateway, items, customer: form });
      if (!r?.success) { toast.error(r?.error || 'Falha ao criar pedido'); setSending(false); return; }
      if (gateway === 'card' && r.url) { window.location.href = r.url; return; }
      setPix(r); setStep('pix');
    } catch (e) { toast.error('Erro ao processar'); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#0c1310] border border-gray-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#0c1310]">
          <h2 className="font-bold">{step === 'pix' ? 'Pague com PIX' : `Finalizar — ${store.name}`}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>

        {step === 'form' && (
          <div className="p-4 space-y-3">
            <div className="bg-gray-900/60 rounded-xl p-3 text-sm flex justify-between"><span className="text-gray-400">{cartItems.length} item(ns)</span><span className="font-black text-emerald-400 text-lg">{money(total)}</span></div>
            <Field label="Nome completo *" value={form.name} onChange={set('name')} placeholder="Seu nome" />
            <Field label="WhatsApp *" value={form.phone} onChange={set('phone')} placeholder="(21) 99999-9999" />
            <Field label="E-mail" value={form.email} onChange={set('email')} placeholder="opcional (recibo)" type="email" />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1"><Field label="CEP" value={form.cep} onChange={set('cep')} placeholder="00000-000" /></div>
              <div className="col-span-2"><Field label="Endereço de entrega" value={form.address} onChange={set('address')} placeholder="Rua, nº, bairro" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setGateway('pix')} className={`py-3.5 rounded-xl border-2 font-bold text-sm ${gateway === 'pix' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-400'}`}>💚 PIX</button>
              <button onClick={() => setGateway('card')} className={`py-3.5 rounded-xl border-2 font-bold text-sm ${gateway === 'card' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-400'}`}>💳 Cartão</button>
            </div>
            <button onClick={pay} disabled={sending} className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {gateway === 'pix' ? 'Gerar PIX agora' : 'Pagar com Cartão'}
            </button>
            <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Pagamento seguro · seus dados protegidos</p>
          </div>
        )}

        {step === 'pix' && pix && (
          <div className="p-5 text-center space-y-3">
            <p className="text-emerald-400 font-semibold">💚 Escaneie ou copie o código PIX</p>
            {pix.qr_code_base64 && <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR PIX" className="w-56 h-56 mx-auto bg-white rounded-xl p-2" />}
            <div className="text-3xl font-black text-emerald-400">{money(pix.amount)}</div>
            <button onClick={() => { navigator.clipboard?.writeText(pix.pix_code || ''); toast.success('Código PIX copiado!'); }} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Copiar código PIX</button>
            <p className="text-[12px] text-gray-400">Pedido <b className="text-emerald-300">{pix.tracking}</b>. Assim que o pagamento cair, a loja recebe e prepara o envio. Você pode fechar esta tela.</p>
            <a href={`https://wa.me/55${(store.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Acabei de fazer o pedido ' + pix.tracking + ' na sua loja.')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-300"><MessageCircle className="w-4 h-4" /> Falar com a loja</a>
            <button onClick={onPaid} className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm">Concluir</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] text-gray-400">{label}</span>
      <input {...props} className="w-full mt-0.5 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
    </label>
  );
}
