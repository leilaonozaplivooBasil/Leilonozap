import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";

export default function ProductSelector({ onSelect, selectedProduct }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.Product.filter({ catalog_active: true });
      setProducts(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = products.filter(p =>
    p.description?.toLowerCase().includes(search.toLowerCase()) ||
    p.lot?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar produto do catálogo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando produtos...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map(product => (
            <button
              key={product.id}
              onClick={() => onSelect(product)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                selectedProduct?.id === product.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              {product.image_urls?.[0] ? (
                <img
                  src={product.image_urls[0]}
                  alt={product.description}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{product.description}</p>
                <p className="text-xs text-gray-400 mt-1">Lote: {product.lot || "N/A"}</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  R$ {(product.price_catalog || product.selling_price_retail || 0).toFixed(2)}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              Nenhum produto encontrado no catálogo
            </div>
          )}
        </div>
      )}
    </div>
  );
}