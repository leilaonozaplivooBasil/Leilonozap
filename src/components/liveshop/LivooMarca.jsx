import React from "react";

// Selo da marca LIVOO LIVE — mesmo círculo rosa com play do botão flutuante.
export default function LivooMarca({ compact = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-full flex items-center justify-center bg-livoo-rosa shadow-lg shrink-0">
        <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
          <circle cx="24" cy="24" r="19" fill="#ffffff" />
          <path d="M19 15.5 L34 24 L19 32.5 Z" fill="var(--livoo-rosa)" stroke="var(--livoo-rosa)" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="19" cy="15.5" r="3.4" fill="var(--livoo-rosa)" />
        </svg>
      </span>
      {!compact && (
        <span className="text-white font-bold tracking-tight leading-none">
          LIVOO <span className="text-livoo-rosa-claro">LIVE</span>
        </span>
      )}
    </div>
  );
}