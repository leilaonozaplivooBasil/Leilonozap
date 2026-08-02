import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Handshake, ArrowRight, Award } from "lucide-react";

// 💰 Página "Lucre" — identidade visual clara/executiva da Recepção (fundo
// branco, título preto + palavra verde, selo pill), com cards ilustrados
// para cada forma de ganhar. Bloco "Seja um Parceiro" separado (participação
// na operação, não investimento financeiro).
const EARN_CARDS = [
  {
    title: "Seja um Influenciador",
    desc: "Grátis: indique e ganhe 5% em cada venda e arremate.",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/075bc2b25_generated_image.png",
    page: "Licensing",
  },
  {
    title: "Seja um Vendedor",
    desc: "Ganhe 10% na venda direta (cadastro pelo licenciado).",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/b66e03ab8_generated_image.png",
    page: "SejaVendedor",
  },
  {
    title: "Seja um Licenciado",
    desc: "Tenha sua loja virtual e ganhe 13% na venda.",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/bfb11dea6_generated_image.png",
    page: "Licensing",
  },
];

export default function Lucre() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-nz-borda text-nz-tinta-fraca text-xs font-semibold tracking-wide mb-5">
          <Award className="w-3.5 h-3.5 text-nz-verde" />
          SELO
        </div>
        <h1 className="font-slab text-3xl sm:text-4xl font-bold text-nz-tinta mb-3">
          Lucre com a <span className="text-nz-verde">Leilão NoZap</span>
        </h1>
        <p className="text-nz-tinta-fraca max-w-lg mx-auto">
          Escolha como você quer trabalhar com a gente e comece a ganhar hoje mesmo.
        </p>
      </div>

      {/* Bloco 1 — Ganhe Dinheiro */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-14">
        <h2 className="text-lg font-bold text-nz-tinta mb-5 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-nz-verde rounded-full" />
          Ganhe Dinheiro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {EARN_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-nz-borda overflow-hidden flex flex-col"
            >
              <img
                src={card.image}
                alt={card.title}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-nz-tinta text-lg mb-1.5">{card.title}</h3>
                <p className="text-sm text-nz-tinta-fraca leading-snug mb-4 flex-1">{card.desc}</p>
                <Link
                  to={createPageUrl(card.page)}
                  className="inline-flex items-center justify-center gap-1.5 bg-nz-verde hover:bg-nz-verde-escuro text-white font-semibold text-sm rounded-lg py-2.5 transition-colors"
                >
                  Quero começar
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloco 2 — Seja um Parceiro */}
      <div className="bg-nz-cinza-fundo py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-nz-tinta mb-5 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full" />
            Seja um Parceiro
          </h2>
          <div className="rounded-2xl border border-nz-borda bg-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Handshake className="w-6 h-6 text-nz-tinta-fraca" />
              </div>
              <div>
                <h3 className="font-bold text-nz-tinta mb-1">Seja um Parceiro</h3>
                <p className="text-sm text-nz-tinta-fraca leading-snug">
                  Participe da nossa operação e acompanhe seu lucro.
                </p>
              </div>
            </div>
            <Link
              to={createPageUrl("Partners")}
              className="inline-flex items-center justify-center gap-1.5 bg-nz-verde hover:bg-nz-verde-escuro text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors whitespace-nowrap shrink-0"
            >
              Conhecer o plano
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}