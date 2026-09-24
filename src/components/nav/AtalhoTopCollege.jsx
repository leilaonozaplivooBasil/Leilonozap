import React from 'react';
import { Link } from 'react-router-dom';
import { lerAtalho, mostraAtalho, rotuloDoDestino, urlDoAtalho } from '@/lib/atalhoTopCollege';

// ⭐ O ícone da Top College no cabeçalho (ver src/lib/atalhoTopCollege.js).
// Só pra quem está logado; leva pra visão do Compromisso que a pessoa fixou.
//
// 🧊 24/09/2026 — pedido do dono: "tirar o quadrado em torno da logo e deixar
// ela chapada igual à logo do Leilão NoZap, mais próxima da logo, e mais em 3D".
// Sai a placa (fundo + borda); entra o símbolo sozinho, já extrudado em 3D
// (/marca/topcollege-3d.webp — só as colunas, sem o letreiro, que a 28px não
// se lia), do tamanho da logo, com a mesma sombra solta que a logo tem.
export const SOMBRA_3D = 'drop-shadow(0 2px 0 rgba(0,0,0,0.35)) drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 14px rgba(124,58,237,0.35))';
const SOMBRA_3D_CLARO = 'drop-shadow(0 2px 0 rgba(0,0,0,0.18)) drop-shadow(0 5px 9px rgba(0,0,0,0.22))';

export default function AtalhoTopCollege({ currentUser, temaClaro = false, className = '' }) {
  if (!mostraAtalho(currentUser)) return null;
  const destino = lerAtalho();
  const rotulo = `Top College — ${rotuloDoDestino(destino)}`;
  return (
    <Link
      to={urlDoAtalho(destino)}
      aria-label={rotulo}
      title={rotulo}
      data-teste="atalho-topcollege"
      // 🎯 24/09 (2º print do dono): "faceando com o martelo dá impressão de
      // descentralizado". A logo tem a ponta do balão embaixo, então o centro
      // VISUAL dela fica abaixo do centro da caixa — o símbolo desce 3px pra
      // ficar entre o martelo e a ponta do balão.
      // ✋ 24/09 (3º pedido): "quando passo o mouse na logo ela vem pra frente;
      // na Top College está parada". O deslocamento era um `transform` em linha,
      // que engolia o `hover:scale`. Agora os dois são classes e se somam:
      // desce 3px E cresce no hover, igual à logo (hover:scale-105).
      className={`grid shrink-0 place-items-center translate-y-[3px] transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
    >
      <img
        src="/marca/topcollege-3d.webp"
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        className="h-10 w-10 sm:h-11 sm:w-11 object-contain"
        style={{ filter: temaClaro ? SOMBRA_3D_CLARO : SOMBRA_3D }}
        draggable="false"
      />
    </Link>
  );
}
