import React from 'react';

// 🎓 DIR-58 — onde cabe a MARCA, entra a marca; onde não cabe, o ícone.
// Ordem do dono: no menu, a Top College e a X-eos aparecem com o logo real, não
// com um desenho genérico do lucide.
//
// Duas decisões de acabamento que valem registro:
//  • entra só o SÍMBOLO (o pilar da Top College, o X da X-eos), nunca o logo
//    inteiro: num quadrado de 20px o nome escrito vira borrão ilegível.
//  • `object-contain` + o mesmo tamanho do ícone que ele substitui — assim a
//    marca não estica nem empurra o alinhamento da lista.
//
// A escolha vem do DADO (campo `marca` em @/lib/licensingTabs), então o menu do
// desktop, o do celular e o seletor interno mostram a mesma coisa sem cada um
// decidir por conta própria.
export default function MarcaOuIcone({ marca, icone: Icone, className = '', alt = '' }) {
  if (marca) {
    return (
      <img
        src={marca}
        alt={alt}
        aria-hidden={alt ? undefined : 'true'}
        className={`${className} object-contain`}
        draggable="false"
      />
    );
  }
  return Icone ? <Icone className={className} /> : null;
}
