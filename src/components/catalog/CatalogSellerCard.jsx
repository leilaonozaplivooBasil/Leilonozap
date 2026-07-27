import React from "react";
import { MessageCircle, Package, Truck } from "lucide-react";

/**
 * CatalogSellerCard — barra compacta do vendedor/licenciado.
 * Estilo "loja oficial" do ML/Magalu: assinatura elegante, não outdoor.
 * Altura resultante ~80px desktop / ~72px mobile.
 *
 * Fallback: sem licenseeData, mostra "Loja Virtual Especial" na mesma barra.
 */
export default function CatalogSellerCard({ licenseeData, productCount = 0 }) {
  const hasLicensee = !!licenseeData;
  const name = hasLicensee ? licenseeData.name : "Loja Virtual Especial";
  const phone = hasLicensee ? licenseeData.phone : null;
  const photo = hasLicensee ? licenseeData.photo : null;

  const waHref = phone
    ? `https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá ${name}! Estou vendo sua loja virtual.`
      )}`
    : null;

  return (
    <section
      className="relative rounded-xl border border-gray-800 bg-gray-900/80 backdrop-blur-sm p-3 sm:p-4"
      aria-label="Informações do vendedor"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Avatar 48/56px — assinatura, não protagonista */}
        <div className="flex-shrink-0">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-emerald-500/30"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl sm:text-2xl font-black border border-emerald-500/30">
              {name?.charAt(0)?.toUpperCase() || "L"}
            </div>
          )}
        </div>

        {/* Nome + metadados numa linha só */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-white truncate leading-tight">
            {name}
          </h1>
          <div className="mt-0.5 flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] sm:text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold text-gray-200">{productCount}</span> produtos
            </span>
            <span className="text-gray-700 hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              Envio para todo Brasil
            </span>
          </div>
        </div>

        {/* CTA WhatsApp compacto */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors flex-shrink-0"
            aria-label="Falar com o vendedor no WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Falar Comigo</span>
          </a>
        )}
      </div>
    </section>
  );
}