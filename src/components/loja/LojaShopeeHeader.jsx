import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import RotatingBanner from '@/components/banner/RotatingBanner';
import { RatingBadge } from './StarRating';
// 🖼️ Banners oficiais da loja (rotativos). Empacotados no app para garantir exibição
// imediata em produção. Artes novas (25/07) em 1376×768 (~16:9) — mostrados com
// fit=contain + fundo ambiente desfocado, sem cortar nada.
import banner1Desk from '@/assets/banners/banner1-desktop.webp';
import banner1Mob from '@/assets/banners/banner1-mobile.webp';
import banner2Desk from '@/assets/banners/banner2-desktop.webp';
import banner2Mob from '@/assets/banners/banner2-mobile.webp';
import banner3Desk from '@/assets/banners/banner3-desktop.webp';
import banner3Mob from '@/assets/banners/banner3-mobile.webp';
import banner4Desk from '@/assets/banners/banner4-desktop.webp';
import banner4Mob from '@/assets/banners/banner4-mobile.webp';
import banner5Desk from '@/assets/banners/banner5-desktop.webp';
import banner5Mob from '@/assets/banners/banner5-mobile.webp';

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

const LOGO = '/brand/icon-3d.webp';

// Banners oficiais da loja (rotativos), na paleta oficial da logo (#4d724b/#99c198/
// #dabb98/#21222b/#9da7b5). Arte dedicada por dispositivo: desktop 1920×600 (16:5,
// largura total do navegador) e mobile 1344×768. Licenciado (4 e 5) → /Licensing.
const CATALOG_BANNERS = [
  { desktop: banner1Desk, mobile: banner1Mob, title: 'Loja Virtual NoZap — até 70% OFF · Entrega Full' },
  { desktop: banner2Desk, mobile: banner2Mob, title: 'Ferramentas Entrega Full — até 85% de desconto' },
  { desktop: banner3Desk, mobile: banner3Mob, title: '+500 produtos testados — 85% OFF + Frete Grátis' },
  { desktop: banner4Desk, mobile: banner4Mob, title: 'Torne-se um Licenciado — receba até 20% de comissão', link_url: createPageUrl('Licensing') },
  { desktop: banner5Desk, mobile: banner5Mob, title: 'Seja um Licenciado — venda na Loja Virtual e ganhe de casa', link_url: createPageUrl('Licensing') },
].flatMap(({ desktop, mobile, ...b }, i) => [
  { ...b, image_url: desktop, id: `nz-banner-${i}-d`, device_type: 'desktop' },
  { ...b, image_url: mobile, id: `nz-banner-${i}-m`, device_type: 'mobile' },
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

  // Login: se já logado, não mostra o botão "Entrar" (a conta já aparece na navbar de cima)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  React.useEffect(() => {
    const check = () => {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
        setIsLoggedIn(!!(u && u.email) || sessionStorage.getItem('isLoggedIn') === 'true');
      } catch { setIsLoggedIn(false); }
    };
    check();
    window.addEventListener('storage', check);
    window.addEventListener('authChanged', check);
    return () => { window.removeEventListener('storage', check); window.removeEventListener('authChanged', check); };
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
    { icon: ScanSearch, label: 'CompareAQUI', accent: 'gold', onClick: () => window.dispatchEvent(new Event('openComparai')) },
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

      {/* BUSCA no topo da loja (estilo Mercado Livre) — foi movida do corpo da página pra cá */}
      <div className="bg-[#0e1522] border-b border-white/5">
        <div className="max-w-[1280px] mx-auto px-4 py-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm?.(e.target.value)}
              placeholder="O que você procura hoje?"
              className="w-full bg-gray-800/80 border border-gray-700 rounded-xl pl-11 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* SUB-BARRA: Enviar para / status */}
      <div className="bg-[#0b1018] border-b border-white/5 text-[12px]">
        <div className="max-w-[1280px] mx-auto px-4 py-2 flex items-center justify-between text-gray-400">
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-500" /> Enviar para: <b className="text-gray-200">Brasil</b></span>
          <span className="flex items-center gap-2">Loja Virtual <span className="inline-flex items-center gap-1 text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online</span></span>
        </div>
      </div>

      {/* HERO: banner full-bleed (borda a borda) nos dois mundos, SEMPRE na proporção
          nativa das artes — nada cortado, nada esticado, sem sobras laterais.
          Mobile: arte 1344×768, container na mesma proporção → preenche 100% da largura.
          Desktop: arte 1920×600 (16:5), container na mesma proporção → a arte ocupa
          a largura INTEIRA do navegador, sem blur lateral. */}
      <div className="ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] w-screen">
        <div className="relative overflow-hidden bg-[#21222b] aspect-[1344/768] md:aspect-[16/5]">
          <RotatingBanner banners={CATALOG_BANNERS} heightClass="h-full" rounded={false} fit="contain" ambient />
          {/* degradê (estilo Mercado Livre): a base funde no fundo escuro da loja pra a caixa
              de ofertas subir e sobrepor com opacidade, criando o efeito de camadas do ML. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 sm:h-24 bg-gradient-to-t from-gray-900 to-transparent" aria-hidden />
        </div>
      </div>
    </div>
  );
}
