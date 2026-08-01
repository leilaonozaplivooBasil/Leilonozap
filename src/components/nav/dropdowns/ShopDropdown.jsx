import React from "react";
import NavDropdown from "./NavDropdown";

/**
 * 🛒 Dropdown "Comprar" — FASE 4A
 * Loja Virtual · Comparar preços · Meu carrinho
 */
export default function ShopDropdown() {
  const items = [
    {
      title: "Comprar",
      subtitle: "Produtos com entrega em todo o Brasil",
      emoji: "🛍️",
      isHeadline: true,
    },
    {
      title: "Loja Virtual",
      subtitle: "Todos os produtos, PIX ou cartão",
      path: "/Loja-Virtual",
    },
    {
      title: "Comparar preços",
      subtitle: "Veja se o preço é bom antes de comprar",
      onClick: () => {
        // Dispara o mesmo evento global consumido pelo ComparaiFloatingButton/ComparaiButton
        // (nome precisa ser exatamente "openComparai" — os listeners não escutam "openComparaiModal")
        window.dispatchEvent(new CustomEvent("openComparai"));
      },
    },
    {
      title: "Meu carrinho",
      subtitle: "Finalize sua compra",
      path: "/Cart",
    },
  ];

  return <NavDropdown label="Comprar" items={items} />;
}