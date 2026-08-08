import React from 'react';
import { Link } from 'react-router-dom';

// 🧭 Item da lateral do Painel de Alavancagem (identidade branco/verde/marrom).
// Serve para os dois tipos: aba interna (botão) e rota existente (link).
export default function LicensingNavItem({ item, active, onSelect }) {
  const Icon = item.icon;
  const classe = `flex flex-col items-center gap-1 py-2.5 min-h-[44px] rounded-xl border transition-colors w-full ${
    active
      ? 'bg-white/10 text-nz-fogo-claro border-nz-fogo/40'
      : 'text-white/70 border-white/10 hover:bg-white/10 hover:text-nz-fogo-claro'
  }`;

  const conteudo = (
    <>
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-medium leading-tight text-center px-1">{item.label}</span>
    </>
  );

  if (item.type === 'link') {
    return (
      <Link to={item.to} title={item.label} className={classe}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" title={item.label} onClick={() => onSelect(item.value)} className={classe}>
      {conteudo}
    </button>
  );
}