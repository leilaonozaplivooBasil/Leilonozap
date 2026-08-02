import React from "react";

// 🎬 Vitrine decorativa — produtos da Loja Virtual passando automaticamente.
// NÃO clicável de propósito: é só pra mostrar que a loja é boa, sem tirar o
// usuário do ambiente de pagamento.
export default function VendedorProductStrip({ products = [] }) {
  if (!products.length) return null;
  const loop = [...products, ...products];

  return (
    <div className="relative w-full overflow-hidden py-2" style={{ pointerEvents: "none" }}>
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent z-10" />
      <div className="flex gap-3 vendedor-strip-track">
        {loop.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-nz-borda bg-white"
          >
            <img
              src={p.image_urls?.[0] || "https://via.placeholder.com/200x200?text=Produto"}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      <style>{`
        .vendedor-strip-track {
          width: max-content;
          animation: vendedorStripScroll 30s linear infinite;
        }
        @keyframes vendedorStripScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vendedor-strip-track { animation: none; }
        }
      `}</style>
    </div>
  );
}