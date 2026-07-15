import React from "react";
import { MessageCircle, Package, Truck } from "lucide-react";

/**
 * CatalogSellerCard — card unificado do vendedor/licenciado.
 * Funde os dois cards antigos (banner licenciado + hero "Loja de X") em um só.
 *
 * Se NÃO houver licenseeData (visitante sem ?ref=), renderiza fallback
 * elegante "Loja Virtual Especial" com contagem de produtos.
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
      className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800/50 p-5 sm:p-8"
      aria-label="Informações do vendedor"
    >
      {/* Glow decorativo verde NoZap */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 bg-teal-500/5 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/10"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/10">
              {name?.charAt(0)?.toUpperCase() || "L"}
            </div>
          )}
        </div>

        {/* Nome + descrição + badges */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">
            {hasLicensee ? "Loja Virtual de" : "Bem-vindo à"}
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight truncate">
            {name}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-2">
            Produtos selecionados com preços imbatíveis
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">{productCount}</span> produtos disponíveis
            </span>
            <span className="hidden sm:inline text-gray-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-400" />
              Envio para todo Brasil
            </span>
          </div>
        </div>

        {/* CTA WhatsApp */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex-shrink-0"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Falar Comigo</span>
          </a>
        )}
      </div>
    </section>
  );
}