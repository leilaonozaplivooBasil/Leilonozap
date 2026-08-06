import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, Wallet as WalletIcon, Heart } from "lucide-react";

const LINHA = "flex min-h-[48px] items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 active:scale-[0.98]";

/**
 * Seção "Minha Conta" — os MESMOS itens para todos os perfis (padrão único).
 * Enxuta: Meus Arremates e Meu Perfil subiram para os atalhos (azulejos),
 * então aqui ficam só os itens que não têm azulejo próprio.
 */
export default function MobileAccountLinks({ onClose }) {
  return (
    <div className="pt-4 mt-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-bold text-[10px] uppercase tracking-wider px-4 mb-2 text-gray-500">Minha Conta</p>

      <Link to={createPageUrl("MyCatalogOrders")} onClick={onClose} className={`${LINHA} text-emerald-300`}>
        <Package className="w-5 h-5" />
        Meus Pedidos
      </Link>
      <button
        onClick={() => { window.dispatchEvent(new CustomEvent("openWallet")); onClose(); }}
        className={`w-full ${LINHA} text-emerald-300`}
      >
        <WalletIcon className="w-5 h-5" />
        Carteira
      </button>
      <Link to={createPageUrl("Home") + "?favorites=1"} onClick={onClose} className={`${LINHA} text-gray-400`}>
        <Heart className="w-5 h-5" />
        Favoritos
      </Link>
    </div>
  );
}