import React from "react";
import NavDropdown from "./NavDropdown";

/**
 * 🔴 Dropdown "Ao Vivo" — FASE 4A
 * Ao Vivo (LiveShopNoZap) · Livoo Live (placeholder oficial)
 */
export default function LiveDropdown() {
  const items = [
    {
      title: "Ao Vivo",
      subtitle: "Compre ao vivo, com o vendedor na tela",
      emoji: "🔴",
      isHeadline: true,
      path: "/LiveShopNoZap",
    },
    {
      title: "Livoo Live",
      subtitle: "As lives acontecem na Livoo — assista e compre",
      path: "/LivooLive",
    },
  ];

  return <NavDropdown label="Ao Vivo" emoji="🔴" items={items} />;
}