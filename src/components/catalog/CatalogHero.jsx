import React from "react";
import RotatingBanner from "@/components/banner/RotatingBanner";

/**
 * CatalogHero — wrapper panorâmico do banner rotativo.
 * Não modifica o RotatingBanner internamente — apenas passa altura
 * grande (220/320/420px) via prop heightClass, que já existe no componente.
 *
 * Se não houver banners, o componente inteiro não renderiza.
 */
export default function CatalogHero({ banners }) {
  if (!Array.isArray(banners) || banners.length === 0) return null;

  return (
    <section aria-label="Destaques da Loja" className="w-full">
      <RotatingBanner
        banners={banners}
        heightClass="h-[220px] md:h-[320px] lg:h-[420px]"
        fit="cover"
        rounded
      />
    </section>
  );
}