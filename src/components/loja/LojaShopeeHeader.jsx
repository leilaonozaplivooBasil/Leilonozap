import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import RotatingBanner from '@/components/banner/RotatingBanner';
import { RatingBadge } from './StarRating';

const WHATSAPP = '5521984072064';
const SOCIAL = {
  instagram: 'https://instagram.com/leilaonozap',
  tiktok: 'https://tiktok.com/@leilaonozap',
  whatsapp: `https://wa.me/${WHATSAPP}`,
};

async function mostrarCupons() {
  try {
    const { data } = await supabase.from('coupons').select('code,tipo,valor,min_order').eq('active', true).is('seller_id', null).order('created_at', { ascending: false }).limit(3);
    if (!data || !data.length) { toast('Nenhum cupom ativo no momento.'); return; }
    const c = data[0];
    const off = c.tipo === 'percent' ? `${c.valor}% OFF` : `R$ ${Number(c.valor).toFixed(2)} OFF`;
    const min = Number(c.min_order) > 0 ? ` (mín. R$ ${Number(c.min_order).toFixed(2)})` : '';
    toast.success(`🎟️ Cupom ${c.code}: ${off}${min} — use no carrinho!`, { duration: 6000 });
  } catch (_) { toast('Confira os cupons no carrinho.'); }
}
import {
  Search, ShoppingCart, Store, Smartphone, Instagram, MessageCircle, Music2,
  HelpCircle, Ticket, Truck, BadgeCheck, Gavel, ScanSearch, Home, Cpu, ShoppingBasket, Shirt
} from 'lucide-react';

const LOGO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';

// Ícone redondo do rail de categorias (estilo Shopee, cores Leila)
function RailIcon({ icon: Icon, label, onClick, accent = 'green' }) {
  const bg = accent === 'gold'
    ? 'linear-gradient(135deg,#f5c451,#e0a92e)'
    : 'linear-gradient(135deg,#22c55e,#16a34a)';
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group w-[88px] shrink-0">
      <span className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:-translate-y-0.5"
        style={{ background: bg, boxShadow: '0 6px 16px rgba(22,163,74,.28)' }}>
        <Icon className="w-7 h-7 text-white" />
      </span>
      <span className="text-[11px] text-gray-300 text-center leading-tight">{label}</span>
    </button>
  );
}

export default function LojaShopeeHeader({ searchTerm, setSearchTerm, categories = [], onSelectCategory, banners = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = React.useState(searchTerm || '');
  React.useEffect(() => { setQ(searchTerm || ''); }, [searchTerm]);

  const [cartCount, setCartCount] = React.useState(0);
  React.useEffect(() => {
    const read = () => {
      try { const c = JSON.parse(localStorage.getItem('catalogCart') || '[]'); setCartCount(c.reduce((s, i) => s + (i.quantity || 1), 0)); }
      catch { setCartCount(0); }
    };
    read();
    window.addEventListener('cartUpdated', read);
    return () => window.removeEventListener('cartUpdated', read);
  }, []);

  // avaliação da loja (resolve o lojista pelo ref e busca a média)
  const [rating, setRating] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const urlRef = new URLSearchParams(window.location.search).get('ref');
        const ref = urlRef || sessionStorage.getItem('referralCode');
        if (!ref) return;
        const { data: u } = await supabase.from('app_users').select('id').eq('referral_code', ref).limit(1).maybeSingle();
        if (!u?.id) return;
        const { data } = await supabase.rpc('avaliacao_loja', { _seller: u.id });
        if (alive && data) setRating(data);
      } catch (_) { /* sem avaliação */ }
    })();
    return () => { alive = false; };
  }, []);

  const doSearch = () => setSearchTerm?.(q);
  const trending = categories.slice(0, 6);

  // ícones fixos do rail (diferenciais + atalhos). Categorias reais entram depois.
  const railFixed = [
    { icon: ScanSearch, label: 'Comparai', accent: 'gold', onClick: () => window.dispatchEvent(new Event('openComparai')) },
    { icon: Gavel, label: 'Leilões ao vivo', onClick: () => navigate(createPageUrl('Home')) },
    { icon: Ticket, label: 'Cupons', accent: 'gold', onClick: mostrarCupons },
    { icon: Truck, label: 'Frete Grátis', onClick: () => toast('🚚 Frete combinado direto no WhatsApp da loja.') },
    { icon: BadgeCheck, label: 'Lojas Oficiais', onClick: () => navigate(createPageUrl('Catalog')) },
  ];
  const catIconByName = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('eletr') && n.includes('ô')) return Cpu;
    if (n.includes('eletro')) return Home;
    if (n.includes('moda')) return Shirt;
    if (n.includes('cozinha') || n.includes('casa')) return Home;
    if (n.includes('tecnolog') || n.includes('notebook')) return Cpu;
    return ShoppingBasket;
  };
  const railCats = categories.slice(0, 5).map((c) => ({
    icon: catIconByName(c.name), label: c.name, onClick: () => onSelectCategory?.(c.id),
  }));

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 mb-6">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      {/* 1) Barra utilitária */}
      <div className="text-[12px] text-green-50/90" style={{ background: 'linear-gradient(90deg,#15803d,#16a34a)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('LojistaDashboard'))} className="flex items-center gap-1 hover:underline"><Store className="w-3.5 h-3.5" /> Central do Vendedor</button>
            <span className="opacity-40">|</span>
            <button onClick={() => navigate(createPageUrl('Cadastro'))} className="hover:underline">Vender na Loja</button>
            <span className="opacity-40">|</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> Baixe o App</span>
            <span className="opacity-40">|</span>
            <span className="flex items-center gap-1.5">Siga-nos
              <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="hover:opacity-80" title="Instagram"><Instagram className="w-4 h-4" /></a>
              <a href={SOCIAL.whatsapp} target="_blank" rel="noreferrer" className="hover:opacity-80" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
              <a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" className="hover:opacity-80" title="TikTok"><Music2 className="w-4 h-4" /></a>
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Ajuda</span>
            <span className="opacity-40">|</span>
            <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="font-bold hover:underline">Entrar</button>
          </div>
        </div>
      </div>

      {/* 2) Header de busca */}
      <div style={{ background: 'linear-gradient(90deg,#16a34a,#15803d)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(createPageUrl('Catalog'))} className="shrink-0">
            <img src={LOGO} alt="Leilão NoZap" className="h-10 w-auto drop-shadow" />
          </button>
          <div className="flex-1">
            <div className="flex bg-white rounded-md overflow-hidden shadow-md">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="Buscar na loja…"
                className="flex-1 px-4 py-2.5 text-sm text-gray-800 outline-none"
              />
              <button onClick={doSearch} className="px-6 flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)' }}>
                <Search className="w-5 h-5" />
              </button>
            </div>
            {/* buscas em alta + avaliação da loja */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12px] text-green-50/90">
              {trending.map((c) => (
                <button key={c.id} onClick={() => onSelectCategory?.(c.id)} className="hover:underline">{c.name}</button>
              ))}
              {rating && (
                <span className="ml-auto bg-black/15 rounded-full px-2.5 py-0.5"><RatingBadge media={rating.media} total={rating.total} size={13} /></span>
              )}
            </div>
          </div>
          <button onClick={() => navigate(createPageUrl('Cart'))} className="relative shrink-0 text-white p-2">
            <ShoppingCart className="w-7 h-7" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-green-900 text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* 3) Hero: banner + 2 cards promo */}
      <div className="max-w-[1280px] mx-auto px-4 pt-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 relative rounded-xl overflow-hidden min-h-[200px] flex flex-col items-center justify-center text-white p-8"
            style={{ background: 'linear-gradient(120deg,#15803d,#16a34a,#22c55e)' }}>
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-center">CATÁLOGO LEILÃO NOZAP</span>
            <span className="mt-2 text-green-50">Até <b className="text-yellow-300">70% OFF</b> · Entrega Full</span>
            {banners.length > 0 && (
              <div className="absolute inset-0">
                <RotatingBanner banners={banners} heightClass="h-full" rounded={false} />
              </div>
            )}
          </div>
          <div className="grid grid-rows-2 gap-3">
            <div className="rounded-xl p-5 text-white flex flex-col justify-center" style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
              <Ticket className="w-7 h-7 text-yellow-300 mb-2" />
              <p className="font-black leading-tight">APROVEITE CUPONS DE DESCONTO E FRETE GRÁTIS</p>
            </div>
            <button onClick={() => window.dispatchEvent(new Event('openComparai'))}
              className="rounded-xl p-5 text-left text-white flex flex-col justify-center"
              style={{ background: 'linear-gradient(135deg,#e0a92e,#b8860b)' }}>
              <ScanSearch className="w-7 h-7 text-white mb-2" />
              <p className="font-black leading-tight">COMPARAI</p>
              <p className="text-[12px] text-yellow-50">Compare o preço antes de comprar — só aqui.</p>
            </button>
          </div>
        </div>

        {/* 4) Rail de ícones redondos */}
        <div className="flex gap-1 overflow-x-auto py-5 no-scrollbar">
          {railFixed.map((r, i) => <RailIcon key={'f' + i} {...r} />)}
          {railCats.map((r, i) => <RailIcon key={'c' + i} {...r} />)}
        </div>
      </div>
    </div>
  );
}
