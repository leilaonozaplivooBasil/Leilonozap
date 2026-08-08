import React from 'react';
import { Link } from 'react-router-dom';

// 🧭 Item da lateral do Painel de Alavancagem (fundo preto da barra do topo).
// 08/08/2026: sem moldura por item (12 quadradinhos empilhados faziam ruído).
// O ativo é marcado por faixa verde à esquerda + fundo levemente claro; o
// hover também é VERDE — laranja é reservado só para CTA (fogo da marca).
export default function LicensingNavItem({ item, active, onSelect }) {
  const Icon = item.icon;
  const classe = `relative flex flex-col items-center gap-1 py-2.5 min-h-[44px] rounded-xl transition-colors w-full ${
    active
      ? 'bg-white/10 text-nz-verde-claro'
      : 'text-white/70 hover:bg-white/10 hover:text-nz-verde-claro'
  }`;

  const conteudo = (
    <>
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-nz-verde-claro" />
      )}
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