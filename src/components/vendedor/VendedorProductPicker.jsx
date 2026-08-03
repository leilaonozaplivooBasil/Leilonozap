import React from "react";
import { Plus, Minus } from "lucide-react";
import { fmtBR } from "@/lib/money";

// 🛒 Grid de escolha de produtos — Etapa 3 (gastar o saldo da adesão).
export default function VendedorProductPicker({ products = [], cart, onAdd, onRemove }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((p) => {
        const qty = cart[p.id]?.qty || 0;
        // 📦 Estoque real do produto (Product.quantity) — nunca deixa adicionar mais do que existe.
        const stock = Math.max(0, Number(p.quantity) || 0);
        const esgotado = stock <= 0;
        const noLimite = !esgotado && qty >= stock;
        return (
          <div key={p.id} className="rounded-xl border border-nz-borda overflow-hidden bg-white flex flex-col">
            <div className="relative">
              <img
                src={p.image_urls?.[0] || "https://via.placeholder.com/200x200?text=Produto"}
                alt=""
                className={`w-full aspect-square object-cover ${esgotado ? "opacity-40" : ""}`}
              />
              {esgotado && (
                <span className="absolute top-1.5 left-1.5 bg-nz-tinta text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Esgotado
                </span>
              )}
            </div>
            <div className="p-2.5 flex-1 flex flex-col">
              <p className="text-xs text-nz-tinta font-semibold line-clamp-2 flex-1">{p.description}</p>
              <p className="text-sm text-nz-verde font-bold mt-1">R$ {fmtBR(p.price_catalog || 0)}</p>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => onRemove(p)}
                  disabled={qty === 0}
                  className="w-8 h-8 rounded-lg border border-nz-borda flex items-center justify-center disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-nz-tinta w-6 text-center">{qty}</span>
                <button
                  onClick={() => onAdd(p)}
                  disabled={esgotado || noLimite}
                  title={noLimite ? `Estoque disponível: ${stock}` : undefined}
                  className="w-8 h-8 rounded-lg bg-nz-verde text-white flex items-center justify-center disabled:opacity-30 disabled:bg-nz-tinta-fraca"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}