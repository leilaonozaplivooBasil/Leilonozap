import React from "react";
import { ShoppingCart } from "lucide-react";

export default function CatalogInternalHeader({ cartCount = 0 }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-4 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
      <div className="flex items-center justify-between h-12">
        {/* Identidade */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <span className="text-white font-bold text-sm sm:text-base tracking-tight">
            Leilão NoZap
          </span>
        </div>

        {/* Carrinho */}
        <button
          type="button"
          aria-label="Carrinho"
          className="relative p-2 text-gray-300 hover:text-white transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
