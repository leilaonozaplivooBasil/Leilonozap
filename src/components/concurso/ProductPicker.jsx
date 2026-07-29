import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Loader2, Package } from 'lucide-react';

const Product = base44.entities.Product;
const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

/**
 * Seletor de produtos da Loja Virtual.
 * O admin busca/clica num produto do catálogo e ele preenche o slot do sorteio.
 *
 * Props:
 *  - onSelect(product): chamado quando o admin clica num produto
 *  - onClose(): fecha o modal
 */
export default function ProductPicker({ onSelect, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Carrega produtos ativos do catálogo
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await Product.filter({ catalog_active: true }, '-created_date', 60);
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtra por busca (local, por palavras)
  const filtered = (() => {
    if (!search.trim()) return products;
    const termos = search.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!termos.length) return products;
    return products.filter((p) => {
      const desc = (p.description || '').toLowerCase();
      return termos.every((t) => desc.includes(t));
    });
  })();

  const handlePick = (p) => {
    onSelect({
      nome: p.description || 'Produto',
      foto: (Array.isArray(p.image_urls) && p.image_urls[0]) || '',
      valor: p.price_catalog || p.selling_price_retail || 0,
      link: `/CatalogProductDetails?id=${p.id}`,
    });
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
          <h3 className="font-black text-white flex-1">Escolher produto da Loja Virtual</h3>
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
              <p className="text-sm">{search ? 'Nenhum produto encontrado.' : 'Nenhum produto ativo no catálogo.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className="text-left rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/60 transition-all hover:scale-[1.02] active:scale-[.98]"
                  style={{ background: 'rgba(255,255,255,.04)' }}
                >
                  <div className="aspect-square bg-black/30 grid place-items-center overflow-hidden">
                    {(Array.isArray(p.image_urls) && p.image_urls[0]) ? (
                      <img src={p.image_urls[0]} alt={p.description} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Package className="w-8 h-8 text-white/30" />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-white line-clamp-2 leading-tight min-h-[2.2em]">{p.description || 'Sem nome'}</p>
                    <p className="text-sm font-black text-yellow-300 mt-1">{money(p.price_catalog || p.selling_price_retail || 0)}</p>
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