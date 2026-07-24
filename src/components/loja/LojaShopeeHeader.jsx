import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import RotatingBanner from '@/components/banner/RotatingBanner';
import { RatingBadge } from './StarRating';
// 🖼️ Banners oficiais da loja (rotativos). Empacotados no app para garantir exibição
// imediata em produção. Formato 16:5 (1920×600) — mostrados com fit=contain, sem cortar.
import bannerCat1 from '@/assets/banners/banner1.webp';
import bannerCat2 from '@/assets/banners/banner2.webp';
import bannerCat3 from '@/assets/banners/banner3.webp';
import bannerCat4 from '@/assets/banners/banner4.webp';
import bannerCat5 from '@/assets/banners/banner5.webp';

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
  HelpCircle, Ticket, Truck, BadgeCheck, Gavel, ScanSearch, Home, Cpu, ShoppingBasket, Shirt,
  ChevronDown, MapPin, Play, User
} from 'lucide-react';

// Botão "AO VIVO AGORA" abre o feed da Livoo Live (mesma URL do FAB da loja)
const LIVOO_FEED = 'https://livoolive.com.br/app';

const LOGO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';

// Banners oficiais da loja (rotativos). Cada um entra como desktop + mobile para
// aparecer em qualquer dispositivo. Os de licenciado (4 e 5) linkam para /Licensing.
const CATALOG_BANNERS = [
  { image_url: bannerCat1, title: 'Catálogo Leilão NoZap — até 70% OFF · Entrega Full' },
  { image_url: bannerCat2, title: 'Ferramentas Entrega Full — até 85% de desconto' },
  { image_url: bannerCat3, title: '+500 produtos testados — 85% OFF + Frete Grátis' },
  { image_url: bannerCat4, title: 'Torne-se um Licenciado — receba até 20% de comissão', link_url: createPageUrl('Licensing') },
  { image_url: bannerCat5, title: 'Seja um Licenciado — venda no catálogo e ganhe de casa', link_url: createPageUrl('Licensing') },
].flatMap((b, i) => [
  { ...b, id: `nz-banner-${i}-d`, device_type: 'desktop' },
  { ...b, id: `nz-banner-${i}-m`, device_type: 'mobile' },
]);

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
    { icon: ScanSearch, label: 'Compare', accent: 'gold', onClick: () => window.dispatchEvent(new Event('openComparai')) },
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

      {/* 1) TOP NAV escuro (padrão Base44) */}
      <div className="bg-[#0e1522] border-b border-white/5">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center gap-6">
          <button onClick={() => navigate(createPageUrl('Catalog'))} className="shrink-0">
            <img src={LOGO} alt="Leilão NoZap" className="h-9 w-auto" />
          </button>
          <nav className="hidden md:flex items-center gap-6 ml-2 flex-1">
            <button onClick={() => navigate(createPageUrl('Catalog'))} className="flex items-center gap-1 text-sm font-semibold text-gray-200 hover:text-white transition-colors">Comprar <ChevronDown className="w-4 h-4 opacity-60" /></button>
            <button onClick={() => navigate(createPageUrl('Home'))} className="flex items-center gap-1 text-sm font-semibold text-gray-200 hover:text-white transition-colors">Leilões <ChevronDown className="w-4 h-4 opacity-60" /></button>
            <button onClick={() => navigate(createPageUrl('Licensing'))} className="flex items-center gap-1 text-sm font-semibold text-gray-200 hover:text-white transition-colors">Ganhe Dinheiro <ChevronDown className="w-4 h-4 opacity-60" /></button>
            <a href={LIVOO_FEED} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-2 text-white text-sm font-extrabold px-4 py-2 rounded-full shadow-lg" style={{ background: 'linear-gradient(90deg,#ec4899,#f97316)' }}>
              <Play className="w-4 h-4 fill-white" /> AO VIVO AGORA
            </a>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <button onClick={() => navigate(createPageUrl('Cart'))} className="relative text-gray-200 hover:text-white">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-gray-900 text-[10px] font-black rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">{cartCount}</span>
              )}
            </button>
            <span className="hidden sm:block w-px h-6 bg-white/10" />
            <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2 rounded-lg shadow" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
              <User className="w-4 h-4" /> Entrar
            </button>
          </div>
        </div>
        {/* nav mobile (deslizante) */}
        <div className="md:hidden max-w-[1280px] mx-auto px-4 pb-2.5 flex items-center gap-5 overflow-x-auto no-scrollbar text-sm font-semibold text-gray-200">
          <button onClick={() => navigate(createPageUrl('Catalog'))} className="whitespace-nowrap">Comprar</button>
          <button onClick={() => navigate(createPageUrl('Home'))} className="whitespace-nowrap">Leilões</button>
          <button onClick={() => navigate(createPageUrl('Licensing'))} className="whitespace-nowrap">Ganhe Dinheiro</button>
          <a href={LIVOO_FEED} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white font-extrabold px-3 py-1 rounded-full whitespace-nowrap" style={{ background: 'linear-gradient(90deg,#ec4899,#f97316)' }}><Play className="w-3.5 h-3.5 fill-white" /> AO VIVO</a>
        </div>
      </div>

      {/* 2) SUB-BARRA: Enviar para / status */}
      <div className="bg-[#0b1018] border-b border-white/5 text-[12px]">
        <div className="max-w-[1280px] mx-auto px-4 py-2 flex items-center justify-between text-gray-400">
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-500" /> Enviar para: <b className="text-gray-200">Brasil</b></span>
          <span className="flex items-center gap-2">Loja Virtual <span className="inline-flex items-center gap-1 text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online</span></span>
        </div>
      </div>

      {/* 3) HERO: banner full-width rotativo */}
      <div className="max-w-[1280px] mx-auto px-4 pt-4">
        <div className="relative rounded-2xl overflow-hidden aspect-[16/5] bg-[#0f172a]">
          <RotatingBanner banners={CATALOG_BANNERS} heightClass="h-full" rounded={false} fit="contain" />
        </div>
      </div>
    </div>
  );
}
