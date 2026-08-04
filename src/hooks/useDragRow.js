import { useState, useRef, useCallback } from 'react';

/**
 * PONTO 91 — Fileira horizontal que rola sozinha, PAUSA no toque/hover e
 * pode ser ARRASTADA para os lados.
 *
 * A rolagem automática é uma animação CSS (transform) no elemento interno; então:
 * • paused → animationPlayState 'paused' no interno;
 * • o arraste vive num WRAPPER externo (translateX próprio), sem conflitar com a animação;
 * • limiar de 8px antes de considerar arraste, para nenhum botão perder o clique.
 */
export default function useDragRow({ limitePct = 0.4 } = {}) {
  const [paused, setPaused] = useState(false);
  const [offset, setOffset] = useState(0);
  const drag = useRef(null);
  const arrastou = useRef(false);
  const ref = useRef(null);

  const onPointerDown = useCallback((e) => {
    setPaused(true);
    arrastou.current = false;
    drag.current = { x: e.clientX, base: offset };
  }, [offset]);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!arrastou.current && Math.abs(dx) < 8) return;
    arrastou.current = true;
    const largura = ref.current?.offsetWidth || 320;
    const limite = largura * limitePct;
    setOffset(Math.max(-limite, Math.min(limite, d.base + dx)));
  }, [limitePct]);

  const soltar = useCallback(() => {
    drag.current = null;
    setPaused(false);
  }, []);

  const onClickCapture = useCallback((e) => {
    if (arrastou.current) {
      arrastou.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    paused,
    rowProps: {
      ref,
      onPointerDown,
      onPointerMove,
      onPointerUp: soltar,
      onPointerCancel: soltar,
      onPointerLeave: soltar,
      onClickCapture,
      style: { touchAction: 'pan-y' },
    },
    dragStyle: {
      transform: `translateX(${offset}px)`,
      transition: drag.current ? 'none' : 'transform 300ms ease-out',
    },
  };
}