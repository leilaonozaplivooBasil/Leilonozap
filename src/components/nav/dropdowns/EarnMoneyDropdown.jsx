import React from "react";
import NavDropdown from "./NavDropdown";

/**
 * 💰 Dropdown "Ganhe Dinheiro" — FASE 4A
 * Influenciador · Vendedor · Licenciado · Parceiro
 */
export default function EarnMoneyDropdown() {
  const items = [
    {
      title: "Ganhe Dinheiro",
      subtitle: "Trabalhe com a gente e lucre junto",
      emoji: "💰",
      isHeadline: true,
    },
    {
      title: "Seja um Influenciador",
      subtitle: "Grátis: indique e ganhe 5% em cada venda e arremate",
      path: "/Licensing",
    },
    {
      title: "Seja um Vendedor",
      subtitle: "Ganhe 10% na venda direta (cadastro pelo licenciado)",
      path: "/SejaVendedor",
    },
    {
      title: "Seja um Licenciado",
      subtitle: "Tenha sua loja virtual e ganhe 13% na venda",
      path: "/SejaLicenciado",
    },
    {
      title: "Seja um Parceiro",
      subtitle: "Invista conosco e acompanhe seu rendimento",
      path: "/Partners",
    },
  ];

  return <NavDropdown label="Ganhe Dinheiro" items={items} />;
}