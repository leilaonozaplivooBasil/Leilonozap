import React from "react";
import NavDropdown from "./NavDropdown";

/**
 * 🔨 Dropdown "Leilões" — FASE 4A
 * Leilões ativos · Direto de Fábrica · Arremate & Devoluções · Collection
 */
export default function AuctionsDropdown() {
  const items = [
    {
      title: "Leilões",
      subtitle: "Arremate por uma fração do preço",
      emoji: "🔨",
      isHeadline: true,
    },
    {
      title: "Leilões ativos",
      subtitle: "Entre na sala e dê seu lance",
      path: "/leiloes",
    },
    {
      title: "Direto de Fábrica",
      subtitle: "Produtos novos, direto do fabricante",
      emoji: "✨",
      path: "/leiloes?source=factory_new",
    },
    {
      title: "Arremate & Devoluções",
      subtitle: "Lotes e devoluções de varejistas",
      emoji: "🔥",
      path: "/leiloes?source=return_resale",
    },
    {
      title: "Collection",
      subtitle: "Itens de luxo selecionados",
      emoji: "👑",
      path: "/LuxuryCollection",
    },
  ];

  return <NavDropdown label="Leilões" items={items} />;
}