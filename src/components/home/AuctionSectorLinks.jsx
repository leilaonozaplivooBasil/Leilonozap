import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Flame, Crown } from "lucide-react";

// 🧭 Atalhos pros setores de leilão que saíram do dropdown "Leilões" da navbar
// (agora um link direto pros Leilões Ativos). Nada se perde: quem já está aqui
// dentro descobre esses setores como chips, sem decidir antes de clicar.
const LINKS = [
  { title: "Direto de Fábrica", icon: Sparkles, page: "DiretoDeFabrica" },
  { title: "Arremate & Devoluções", icon: Flame, page: "ArremateDevolucoes" },
  { title: "Collection", icon: Crown, page: "LuxuryCollection" },
];

export default function AuctionSectorLinks() {
  return (
    <div className="mb-6 flex flex-wrap gap-2.5">
      {LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className="glass-pill flex items-center gap-2 whitespace-nowrap text-sm font-medium py-2.5 px-5 rounded-full text-gray-300 hover:text-white transition-all duration-300"
          >
            <Icon className="w-4 h-4 text-emerald-400" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}