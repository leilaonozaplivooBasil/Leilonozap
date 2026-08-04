import React from "react";
import CompareAquiIcon from "@/assets/compareaqui-icon.webp";

// 📱 PONTO 80 — CompareAQUI e Livoo saem do rodapé flutuante e sobem para o
// cabeçalho, ao lado da logo (só mobile). Motivo: são ferramentas de INFORMAÇÃO
// (consulta antes de decidir). A Leila continua flutuando no rodapé, porque é
// SUPORTE. Desktop não muda em nada — este bloco é md:hidden.
const LIVOO_SITE = "https://livoolive.com.br";

export default function HeaderMobileActions() {
  return (
    <div className="flex md:hidden items-center gap-1.5">
      {/* CompareAQUI — abre o mesmo modal do antigo botão flutuante */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("openComparai"))}
        title="CompareAQUI — compare o preço antes de comprar"
        aria-label="CompareAQUI"
        className="grid h-11 w-11 place-items-center rounded-full active:scale-95 transition-transform"
      >
        <span className="relative block h-8 w-8">
          <img src={CompareAquiIcon} alt="" className="h-full w-full rounded-full object-cover" aria-hidden="true" />
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping" aria-hidden="true" />
        </span>
      </button>

      {/* Livoo Live — mesma logo redonda (círculo branco + play rosa) do flutuante */}
      <a
        href={LIVOO_SITE}
        target="_blank"
        rel="noopener noreferrer"
        title="Livoo Live — Compre ao Vivo"
        aria-label="Livoo Live — Compre ao Vivo"
        className="grid h-11 w-11 place-items-center rounded-full active:scale-95 transition-transform"
      >
        <span
          className="grid h-8 w-8 place-items-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #D91674, #E3559C)",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "0 4px 14px rgba(217, 22, 116, 0.45)",
          }}
        >
          <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
            <circle cx="24" cy="24" r="19" fill="#ffffff" />
            <path d="M19 15.5 L34 24 L19 32.5 Z" fill="#D91674" stroke="#D91674" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="19" cy="15.5" r="3.4" fill="#D91674" />
          </svg>
        </span>
      </a>
    </div>
  );
}