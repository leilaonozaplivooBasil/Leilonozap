import React from "react";
import { Zap, BadgeCheck, Handshake } from "lucide-react";
import LivooMarca from "@/components/liveshop/LivooMarca";

const SELOS = [
  { icon: Zap, label: "Entrega Full", desc: "Comprou até meio-dia, recebe hoje" },
  { icon: BadgeCheck, label: "Produto Oficial", desc: "Marcas com loja oficial no CD" },
  { icon: Handshake, label: "Aceita Representantes", desc: "Venda o catálogo e ganhe comissão" },
];

// Faixa institucional curta da Livoo no fim da Live Shop (sem preços/cotas).
export default function SelosLivoo() {
  return (
    <footer className="relative border-t border-nz-borda bg-white">
      <div className="h-[3px] w-full livoo-faixa" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <LivooMarca halo />
          <p className="text-sm text-nz-tinta-fraca">
            Mercado Livoo · <span className="text-nz-tinta font-semibold">Viu. Comprou. Chegou.</span>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SELOS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="livoo-card flex items-start gap-3 rounded-2xl p-4">
              <Icon className="w-5 h-5 text-livoo-rosa shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-nz-tinta font-semibold text-sm">{label}</p>
                <p className="text-nz-tinta-fraca text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}