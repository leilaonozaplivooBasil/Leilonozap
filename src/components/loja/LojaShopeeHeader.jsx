import React from 'react';
import { fmtBR } from '@/lib/money';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import RotatingBanner from '@/components/banner/RotatingBanner';
import { WHATSAPP_OFICIAL } from '@/lib/whatsappOficial';

const WHATSAPP = WHATSAPP_OFICIAL;
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
    const off = c.tipo === 'percent' ? `${c.valor}% OFF` : `R$ ${fmtBR(Number(c.valor))} OFF`;
    const min = Number(c.min_order) > 0 ? ` (mín. R$ ${fmtBR(Number(c.min_order))})` : '';
    toast.success(`🎟️ Cupom ${c.code}: ${off}${min} — use no carrinho!`, { duration: 6000 });
  } catch (_) { toast('Confira os cupons no carrinho.'); }
}
import { getReferral } from '@/lib/referral';
import {
  Search, Ticket, Truck, BadgeCheck, Gavel, ScanSearch, Home, Cpu, ShoppingBasket, Shirt, MapPin, X
} from 'lucide-react';

// Botão "AO VIVO AGORA" abre o feed da Livoo Live (mesma URL do FAB da loja)
const LIVOO_FEED = 'https://livoolive.com.br/app';

const LOGO = '/brand/icon-3d.webp';

// 🖼️ 15/09/2026 — A LOJA NÃO TEM MAIS BANNER FIXO NO CÓDIGO.
// Antes daqui saíam 4 artes empacotadas no app + 3 vídeos institucionais
// intercalados. O dono subiu artes novas pelo Painel de Mídia e a loja continuava
// mostrando as velhas, porque a lista fixa ganhava da prop `banners` que a página
// já entregava. Ordem do dono: "apenas eles como banners".
// Quem manda agora é Admin › Painel de Mídia (seção "Loja Virtual"): ordem,
// arte, link e dispositivo. Para trocar banner NÃO se mexe mais em código.

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

// `modoBusca` (15/09/2026): com texto na busca o HERO some — a página inteira vira
// "caixa de busca + resultados", pra ninguém achar que a busca não funcionou.
export default function LojaShopeeHeader({ searchTerm, setSearchTerm, categories = [], onSelectCategory, banners = [], modoBusca = false }) {
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
        const ref = urlRef || getReferral();
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
    { icon: Truck, label: 'Frete', onClick: () => toast('🚚 O frete é calculado no carrinho pelo seu CEP.') },
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
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={searchTerm}
              onChange={(e) => setSearchTerm?.(e.target.value)}
              // Enter/“Buscar” no teclado do celular: fecha o teclado pra mostrar os resultados
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="O que você procura hoje?"
              aria-label="Buscar produtos na Loja Virtual"
              className={`w-full bg-gray-800/80 border rounded-xl pl-11 pr-11 py-2.5 sm:py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors [&::-webkit-search-cancel-button]:hidden ${modoBusca ? 'border-green-500/70' : 'border-gray-700'}`}
            />
            {modoBusca && (
              <button
                type="button"
                onClick={() => setSearchTerm?.('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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

      {/* HERO: banner full-bleed (borda a borda), SEMPRE na proporção nativa das
          artes — nada cortado, nada esticado. O princípio é de 07/09 e segue
          valendo; o que mudou em 15/09 foi a proporção das artes.

          🖼️ 15/09/2026 — AS ARTES NOVAS SÃO 16:9 (1920×1080), e a ordem do dono
          foi "viabilizar com o tamanho que elas possuem mesmo". Então a moldura
          passa a 16:9, em vez de pedir redesenho das artes.

          O TETO DE 520px é o preço do 16:9 no desktop: sem ele, a 1440px de tela
          o banner teria 810px de altura e empurraria a loja inteira pra fora da
          primeira tela. Com o teto, a arte aparece INTEIRA e centralizada
          (924×520), e as laterais ficam com o desfoque da própria arte
          (`ambient`) — o mesmo recurso que a loja já usava. No celular o teto
          nem chega a valer: a 390px o 16:9 dá 219px. */}
      {!modoBusca && banners.length > 0 && (
      <div className="ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] w-screen">
        {/* 🖼️ 17/09/2026 — mesma decisão da Home: a moldura tem o tamanho da
            arte, centralizada, em vez de ir de borda a borda com desfoque nas
            laterais. Numa tela de 1920px a faixa lateral era 491px de CADA
            lado — mais da metade do banner era desfoque. 924 = 520 × 16/9;
            abaixo disso o `max-w` não morde e o celular fica igual. */}
        <div className="relative w-full" data-teste="moldura-banner-loja">
          {/* `banners` vem do Painel de Mídia (seção "Loja Virtual"), já ordenado
              e normalizado por Catalog.jsx. Sem banner cadastrado, a moldura nem
              aparece — é melhor a loja começar na vitrine do que numa faixa preta. */}
          <RotatingBanner banners={banners} heightClass="" molduraSegueArte rounded={false} fit="contain" ambient />
          {/* degradê (estilo Mercado Livre): a base funde no fundo escuro da loja pra a caixa
              de ofertas subir e sobrepor com opacidade, criando o efeito de camadas do ML. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 sm:h-24 bg-gradient-to-t from-gray-900 to-transparent" aria-hidden />
        </div>
      </div>
      )}
    </div>
  );
}