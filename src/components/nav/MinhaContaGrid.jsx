import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, Wallet } from "lucide-react";
import { TILE, Rotulo } from "@/components/nav/AtalhosGrid";

/**
 * 👤 MinhaContaGrid — "Minha Conta" no MESMO azulejo 3D dos Atalhos.
 *
 * Antes era uma lista de texto solta (e destoava da grade bonita logo acima).
 * Usada nos DOIS menus (mobile e dropdown do avatar) — uma implementação só.
 *
 * Favoritos não entra aqui: virou azulejo na grade de Atalhos.
 * "Sair da Conta" também não: continua item de texto separado, para ninguém
 * sair da conta por engano ao tocar num azulejo bonito.
 */
export default function MinhaContaGrid({ onNavigate, colunas = 3 }) {
  const navigate = useNavigate();

  const itens = [
    { key: "pedidos", rotulo: "Meus Pedidos", icon: Package, acao: () => navigate(createPageUrl("MyCatalogOrders")) },
    { key: "carteira", rotulo: "Carteira", icon: Wallet, acao: () => window.dispatchEvent(new CustomEvent("openWallet")) },
  ];

  return (
    <div className={`grid gap-2 ${colunas === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
      {itens.map((i) => (
        <button
          key={i.key}
          type="button"
          onClick={() => { if (onNavigate) onNavigate(); i.acao(); }}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl py-2 transition-transform active:scale-95"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl" style={TILE}>
            <i.icon className="h-[19px] w-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
          </span>
          <Rotulo>{i.rotulo}</Rotulo>
        </button>
      ))}
    </div>
  );
}