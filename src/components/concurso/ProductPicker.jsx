import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Loader2, Package, Gavel, Store } from 'lucide-react';

const Product = base44.entities.Product;
const Auction = base44.entities.Auction;
const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

/**
 * Seletor de produtos combinados: Loja Virtual (Product) + Leilão (Auction).
 * O admin busca/clica num produto de qualquer fonte e ele preenche o slot do sorteio.
 *
 * Props:
 *  - onSelect(product): chamado quando o admin clica num produto
 *  - onClose(): fecha o modal
 */
export default function ProductPicker({ onSelect, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Carrega produtos da Loja Virtual + Leilões ativos em paralelo
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodList, auctionList] = await Promise.all([
        Product.filter({ catalog_active: true }, '-created_date', 50).catch(() => []),
        Auction.filter({ status: 'active' }, '-created_date', 50).catch(() => []),
      ]);

      // Loja Virtual → entidade Product
      const prods = (Array.isArray(prodList) ? prodList : []).map((p) => ({
        id: p.id,
        _source: 'loja',
        nome: p.description || 'Produto',
        foto: (Array.isArray(p.image_urls) && p.image_urls[0]) || '',
        valor: p.price_catalog || p.selling_price_retail || 0,
        link: `/CatalogProductDetails?id=${p.id}`,
      }));

      // Leilão → entidade Auction (exclui planos de investimento e leilões de teste)
      const auctions = (Array.isArray(auctionList) ? auctionList : [])
        .filter((a) => !a.is_investment_plan && !a.is_test_auction)
        .map((a) => ({
          id: a.id,
          _source: 'leilao',
          nome: a.title || 'Leilão',
          foto: (Array.isArray(a.image_urls) && a.image_urls[0]) || '',
          valor: a.current_price || a.buy_now_price || a.starting_price || 0,
          link: `/AuctionDetails?id=${a.id}`,
        }));

      // Combina e ordena por nome (alfabético)
      const combined = [...prods, ...auctions].sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      );
      setItems(combined);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtra por busca (local, por palavras)
  const filtered = (() => {
    if (!search.trim()) return items;
    const termos = search.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!termos.length) return items;
    return items.filter((p) => {
      const desc = (p.nome || '').toLowerCase();
      return termos.every((t) => desc.includes(t));
    });
  })();

  const handlePick = (p) => {
    onSelect({ nome: p.nome, foto: p.foto, valor: p.valor, link: p.link });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(180deg,#1a1030,#120a24)', border: '1px solid rgba(139,92,246,.5)' }}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'rgba(139,92,246,.3)' }}>
          <Package className="w-5 h-5 text-purple-300 shrink-0" />
          <h3 className="font-black text-white flex-1">Escolher produto (Loja + Leilão)</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Busca */}
        <div className="shrink-0 px-4 py-3 border-b" style={{ borderColor: 'rgba(139,92,246,.2)' }}>
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              placeholder="Buscar produto pelo nome..."
              className="w-full bg-black/30 border border-white/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-purple-400/70 placeholder:text-white/35"
            />
          </div>
          {/* Contadores por fonte */}
          <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Store className="w-3 h-3" /> {items.filter((i) => i._source === 'loja').length} na Loja
            </span>
            <span className="inline-flex items-center gap-1 text-yellow-300">
              <Gavel className="w-3 h-3" /> {items.filter((i) => i._source === 'leilao').length} em Leilão
            </span>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando produtos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{search ? 'Nenhum produto encontrado.' : 'Nenhum produto ativo.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <button
                  key={`${p._source}-${p.id}`}
                  onClick={() => handlePick(p)}
                  className="text-left rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/60 transition-all hover:scale-[1.02] active:scale-[.98] relative"
                  style={{ background: 'rgba(255,255,255,.04)' }}
                >
                  <div className="aspect-square bg-black/30 grid place-items-center overflow-hidden relative">
                    {p.foto ? (
                      <img src={p.foto} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Package className="w-8 h-8 text-white/30" />
                    )}
                    {/* Selo da fonte: LOJA (verde) ou LEILO (dourado) */}
                    <span
                      className="absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                      style={
                        p._source === 'loja'
                          ? { background: 'linear-gradient(90deg,#22c55e,#16a34a)', color: '#052e16' }
                          : { background: 'linear-gradient(90deg,#f5c451,#e0a920)', color: '#1a1205' }
                      }
                    >
                      {p._source === 'loja' ? 'Loja' : 'Leilão'}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-white line-clamp-2 leading-tight min-h-[2.2em]">{p.nome || 'Sem nome'}</p>
                    <p className="text-sm font-black text-yellow-300 mt-1">{money(p.valor)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}