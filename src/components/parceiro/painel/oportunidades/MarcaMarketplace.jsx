import React, { useState } from 'react';

// 🏷️ SELO DA ORIGEM DO LOTE — chip com a marca do marketplace.
// Tenta a logo oficial pela CDN; se ela falhar (offline/bloqueio), cai no chip
// só com o nome, nas cores da marca — nunca fica um espaço vazio no cartão.
const MARCAS = {
  'mercado livre': {
    nome: 'Mercado Livre',
    logo: 'https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.90/mercadolibre/logo__large_plus.png',
    fundo: '#FFE600',
    tinta: '#2D3277',
  },
  shopee: { nome: 'Shopee', fundo: '#EE4D2D', tinta: '#FFFFFF' },
  'magazine luiza': { nome: 'Magazine Luiza', fundo: '#0086FF', tinta: '#FFFFFF' },
  'casas bahia': { nome: 'Casas Bahia', fundo: '#004997', tinta: '#FFFFFF' },
  amazon: { nome: 'Amazon', fundo: '#232F3E', tinta: '#FF9900' },
  americanas: { nome: 'Americanas', fundo: '#E60014', tinta: '#FFFFFF' },
};

export default function MarcaMarketplace({ origem }) {
  const [erro, setErro] = useState(false);
  if (!origem) return null;
  const m = MARCAS[String(origem).trim().toLowerCase()];

  if (!m) {
    return (
      <span className="inline-flex items-center border border-pc-borda px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-pc-tinta-fraca">
        {origem}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1"
      style={{ background: m.fundo, color: m.tinta }}
    >
      {m.logo && !erro ? (
        <img
          src={m.logo}
          alt={m.nome}
          onError={() => setErro(true)}
          className="h-3.5 w-auto"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span className="text-[10px] font-black uppercase tracking-[0.06em]">{m.nome}</span>
    </span>
  );
}