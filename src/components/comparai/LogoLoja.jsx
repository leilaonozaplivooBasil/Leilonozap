import React, { useState } from 'react';

// 🖼️ PONTO 94 (20/08/2026) — pedido do dono: "ao invés de trazer o nome, trazer
// a logo redondinha da empresa que está trazendo — Mercado Livre, Magalu, Ponto
// Frio. A logo vende mais do que o nome."
//
// De onde vem a logo, em ordem de preferência:
//   1) storeIcon — o campo `source_icon` que a própria SerpAPI/SearchAPI já
//      devolve junto de cada anúncio. É a logo oficial que o Google usa; vinha
//      na resposta e era descartada.
//   2) favicon do domínio real do anúncio (extraído da URL). Cobre loja que a
//      API não mandou ícone.
//   3) círculo com a inicial, em cor derivada do nome — nunca fica um buraco
//      vazio no lugar da logo.
//
// Sempre redonda, sempre do mesmo tamanho: a lista fica alinhada mesmo com
// logos de proporções diferentes (object-contain + fundo branco, porque quase
// toda logo de varejo é desenhada pra fundo claro).

function dominioDe(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Cor estável por loja (mesma loja = sempre a mesma cor, sem sorteio).
const CORES = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
function corDaLoja(nome) {
  const s = String(nome || '?');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 997;
  return CORES[h % CORES.length];
}

export default function LogoLoja({ item, size = 20, className = '' }) {
  const [tentativa, setTentativa] = useState(0);
  const nome = String(item?.store || 'Loja');
  const dominio = dominioDe(item?.url);

  const fontes = [
    item?.storeIcon,
    dominio ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dominio)}&sz=64` : null,
  ].filter(Boolean);

  const src = fontes[tentativa];
  const estilo = { width: size, height: size };

  if (!src) {
    return (
      <span
        className={`shrink-0 rounded-full grid place-items-center font-bold text-white ${className}`}
        style={{ ...estilo, background: corDaLoja(nome), fontSize: Math.round(size * 0.5) }}
        title={nome}
        aria-hidden="true"
      >
        {nome.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      title={nome}
      style={estilo}
      className={`shrink-0 rounded-full object-contain bg-white border border-white/20 ${className}`}
      onError={() => setTentativa((t) => t + 1)}
    />
  );
}
