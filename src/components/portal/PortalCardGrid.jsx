import React from "react";
import { Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp, Hammer } from "lucide-react";
import PortalCard from "./PortalCard";

const CARDS = [
  {
    title: "Arrematante",
    description: "Dê lances em leilões diários e arremate produtos com até 90% de desconto.",
    icon: Gavel,
    iconColor: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    gradient: "bg-gradient-to-br from-emerald-500/10 to-transparent",
    badge: "Acesso Imediato",
    badgeType: "imediato",
    route: "/portal/arrematante",
  },
  {
    title: "Loja Virtual",
    description: "Compre direto produtos selecionados com pagamento via PIX e entrega para todo o Brasil.",
    icon: ShoppingBag,
    iconColor: "bg-gradient-to-br from-orange-500 to-orange-700",
    gradient: "bg-gradient-to-br from-orange-500/10 to-transparent",
    badge: "Acesso Imediato",
    badgeType: "imediato",
    route: "/portal/loja-virtual",
  },
  {
    title: "Licenciado",
    description: "Construa renda recorrente indicando arrematantes e ganhe comissões em múltiplos níveis.",
    icon: Briefcase,
    iconColor: "bg-gradient-to-br from-blue-500 to-blue-700",
    gradient: "bg-gradient-to-br from-blue-500/10 to-transparent",
    badge: "Sob Análise",
    badgeType: "analise",
    route: "/portal/licenciado",
  },
  {
    title: "Lojista",
    description: "Tenha sua loja virtual própria com produtos prontos para revenda e suporte completo.",
    icon: Store,
    iconColor: "bg-gradient-to-br from-purple-500 to-purple-700",
    gradient: "bg-gradient-to-br from-purple-500/10 to-transparent",
    badge: "Sob Análise",
    badgeType: "analise",
    route: "/portal/lojista",
  },
  {
    title: "Vendedor Recrutado",
    description: "Painel exclusivo para vendedores convidados por um Licenciado parceiro.",
    icon: Users,
    iconColor: "bg-gradient-to-br from-gray-600 to-gray-800",
    gradient: "bg-gradient-to-br from-gray-500/10 to-transparent",
    badge: "Apenas por Convite",
    badgeType: "convite",
    route: "/portal/vendedor",
  },
  {
    title: "Investidor",
    description: "Aplique capital em lotes selecionados e participe da rentabilidade dos arremates.",
    icon: TrendingUp,
    iconColor: "bg-gradient-to-br from-amber-500 to-yellow-600",
    gradient: "bg-gradient-to-br from-amber-500/10 to-transparent",
    badge: "Sob Análise",
    badgeType: "analise",
    route: "/portal/investidor",
  },
  {
    title: "Leiloeiro",
    description: "Conduza leilões oficiais na plataforma com suporte total da nossa estrutura.",
    icon: Hammer,
    iconColor: "bg-gradient-to-br from-red-500 to-red-700",
    gradient: "bg-gradient-to-br from-red-500/10 to-transparent",
    badge: "Sob Análise",
    badgeType: "analise",
    route: "/portal/leiloeiro",
  },
];

export default function PortalCardGrid() {
  return (
    <section className="relative bg-gray-950 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {CARDS.map((card) => (
            <PortalCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}