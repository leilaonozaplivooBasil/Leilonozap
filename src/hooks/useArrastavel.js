import React from 'react';

// 🤏 ARRASTAR QUE FUNCIONA NO DEDO TAMBÉM.
//
// POR QUE ESTE ARQUIVO EXISTE: o app usava a API de arrastar do HTML5
// (`draggable`, `onDragStart`, `dataTransfer`) em três telas. Ela é de mouse:
// navegador de CELULAR não dispara esses eventos — nem um. Por isso "mexer os
// ícones" funcionava no computador e não fazia absolutamente nada no telefone,
// sem nem uma mensagem de erro pra denunciar.
//
// Aqui a base é POINTER EVENTS, que é a API única: mouse, dedo e caneta caem
// todos em pointerdown/pointermove/pointerup. Um código só, dois mundos.
//
// DOIS DETALHES QUE FAZEM ELE PRESTAR:
//   • LIMIAR DE 6px — só vira arrasto depois que a pessoa REALMENTE andou.
//     Sem isso, todo toque no botão viraria um micro-arrasto e o clique
//     morreria: a pílula do X-Music não daria mais play.
//   • touch-action: none NO ALVO — sem isso o navegador entende o dedo como
//     rolagem da página e rouba o gesto no meio do caminho. É a causa nº 1 de
//     "arrastar não funciona no celular" mesmo com pointer events.

/**
 * @param {object} opts
 * @param {(p:{x:number,y:number}) => void} [opts.aoMover]  chamado durante o arrasto
 * @param {(p:{x:number,y:number}) => void} [opts.aoSoltar] chamado ao terminar
 * @param {number} [opts.limiar] pixels antes de virar arrasto (padrão 6)
 */
export default function useArrastavel({ aoMover, aoSoltar, limiar = 6 } = {}) {
  const [arrastando, setArrastando] = React.useState(false);
  const inicio = React.useRef(null);
  const passouLimiar = React.useRef(false);
  // fica true logo depois de um arrasto, pra engolir o clique que o navegador
  // dispara em seguida — senão soltar a pílula em cima do play acionaria o play
  const arrastouAgora = React.useRef(false);
  // as callbacks vivem em refs: os ouvintes da janela são registrados uma vez
  // por gesto e não podem ficar presos a uma versão velha delas
  const aoMoverRef = React.useRef(aoMover);
  const aoSoltarRef = React.useRef(aoSoltar);
  aoMoverRef.current = aoMover;
  aoSoltarRef.current = aoSoltar;
  const desligar = React.useRef(() => {});

  // ⚠️ SEM captura de ponteiro, e isso é decisão, não esquecimento. Duas
  // coisas aconteceram com ela:
  //   1. capturar no pointerdown MATOU O CLIQUE: com captura ativa o navegador
  //      entrega o `click` ao elemento que capturou (a pílula inteira), e não
  //      ao botão embaixo do dedo — o painel do X-Music parou de abrir;
  //   2. capturar só depois do limiar deixou o MOUSE frágil: se o primeiro
  //      movimento já sai da caixa do elemento (um puxão rápido), o pointermove
  //      nunca chega nele, ninguém captura, e o arrasto não começa. O dedo não
  //      sofria disso porque toque tem captura IMPLÍCITA no navegador — por
  //      isso a prova passava no dedo e reprovava no mouse.
  // A saída clássica: depois do pointerdown, os movimentos são ouvidos na
  // JANELA, que recebe o ponteiro onde ele estiver. O clique fica intacto e o
  // arrasto começa mesmo com o puxão mais brusco.
  const aoApontar = React.useCallback((e) => {
    if (e.button != null && e.button !== 0) return; // só botão esquerdo/toque
    inicio.current = { px: e.clientX, py: e.clientY };
    passouLimiar.current = false;

    const mover = (ev) => {
      const i = inicio.current;
      if (!i) return;
      const dx = ev.clientX - i.px;
      const dy = ev.clientY - i.py;
      if (!passouLimiar.current) {
        if (Math.hypot(dx, dy) < limiar) return;
        passouLimiar.current = true;
        setArrastando(true);
      }
      ev.preventDefault?.();
      aoMoverRef.current?.({ x: ev.clientX, y: ev.clientY, dx, dy });
    };
    const largar = (ev) => {
      desligar.current();
      const houve = passouLimiar.current;
      inicio.current = null;
      passouLimiar.current = false;
      setArrastando(false);
      if (houve) {
        arrastouAgora.current = true;
        setTimeout(() => { arrastouAgora.current = false; }, 60);
        aoSoltarRef.current?.({ x: ev.clientX, y: ev.clientY });
      }
    };
    window.addEventListener('pointermove', mover, { passive: false });
    window.addEventListener('pointerup', largar);
    window.addEventListener('pointercancel', largar);
    desligar.current = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', largar);
      window.removeEventListener('pointercancel', largar);
      desligar.current = () => {};
    };
  }, [limiar]);

  // desmontou no meio de um gesto: solta os ouvintes da janela
  React.useEffect(() => () => desligar.current(), []);

  // pendura no onClickCapture do container: mata o clique fantasma do arrasto
  const engolirCliqueDoArrasto = React.useCallback((e) => {
    if (!arrastouAgora.current) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    arrastando,
    /** espalhe no elemento que a pessoa segura */
    alcas: {
      onPointerDown: aoApontar,
      // touch-action: none é o que impede o navegador de ler o dedo como
      // rolagem da página e roubar o gesto no meio
      style: { touchAction: 'none' },
    },
    engolirCliqueDoArrasto,
  };
}

/** Mantém um ponto dentro da janela, com folga — usado ao soltar e ao girar a
 *  tela. Sem isto dá pra "perder" o que se arrastou fora da área visível. */
export const dentroDaTela = (x, y, larg = 220, alt = 56, folga = 8) => {
  const L = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const A = typeof window === 'undefined' ? 768 : window.innerHeight;
  return {
    x: Math.min(Math.max(x, folga), Math.max(folga, L - larg - folga)),
    y: Math.min(Math.max(y, folga), Math.max(folga, A - alt - folga)),
  };
};
