import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Megaphone, Store, Building2, Handshake, ArrowRight } from "lucide-react";

// 💰 Página "Lucre" — substitui o dropdown da navbar. Separa em 2 blocos claros:
// 1) Ganhe Dinheiro (Influenciador/Vendedor/Licenciado) — mesma jornada comercial.
// 2) Seja um Parceiro — bloco isolado, sem falar em "investimento" (é participação
//    na operação, não produto financeiro).
const EARN_CARDS = [
  {
    title: "Seja um Influenciador",
    desc: "Grátis: indique e ganhe 5% em cada venda e arremate.",
    icon: Megaphone,
    page: "Licensing",
  },
  {
    title: "Seja um Vendedor",
    desc: "Ganhe 10% na venda direta (cadastro pelo licenciado).",
    icon: Store,
    page: "SejaVendedor",
  },
  {
    title: "Seja um Licenciado",
    desc: "Tenha sua loja virtual e ganhe 13% na venda.",
    icon: Building2,
    page: "Licensing",
  },
];

export default function Lucre() {
  return (
    <div className="min-h-screen bg-gray-900 text-white pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10">
        <div className="text-center mb-10">
          <h1 className="font-slab text-3xl sm:text-4xl font-bold mb-2">
            Lucre com a <span className="text-emerald-400">Leilão NoZap</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Escolha como você quer trabalhar com a gente e comece a ganhar hoje mesmo.
          </p>
        </div>

        {/* Bloco 1 — Ganhe Dinheiro */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
            Ganhe Dinheiro
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {EARN_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={createPageUrl(card.page)}
                  className="group flex flex-col justify-between rounded-2xl p-6 bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all duration-300"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-white mb-1.5">{card.title}</h3>
                    <p className="text-sm text-gray-400 leading-snug">{card.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold mt-4">
                    Quero começar
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bloco 2 — Seja um Parceiro (separado: participação na operação, não investimento financeiro) */}
        <div>
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full" />
            Seja um Parceiro
          </h2>
          <Link
            to={createPageUrl("Partners")}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl p-6 sm:p-8 border border-amber-500/20 hover:border-amber-500/50 transition-all duration-300"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))" }}
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Handshake className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Seja um Parceiro</h3>
                <p className="text-sm text-gray-400 leading-snug max-w-md">
                  Participe da nossa operação e acompanhe seu lucro.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 text-sm font-semibold shrink-0">
              Conhecer o plano
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}