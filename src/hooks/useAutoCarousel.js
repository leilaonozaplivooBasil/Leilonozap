import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * PONTO 91 — Carrossel de fotos VIVO, reutilizável.
 *
 * • Autoplay contínuo em QUALQUER dispositivo (não depende de hover).
 * • Só roda quando o card está visível (IntersectionObserver) E a aba está ativa
 *   (visibilitychange + focus) — economiza bateria/CPU no celular e retoma na hora
 *   que o usuário volta pro app.
 * • Pausa enquanto o dedo/mouse está em cima; retoma ao soltar/sair.
 * • Arraste lateral (>= 40px) avança/volta a foto, sem travar o scroll vertical
 *   (touch-action: pan-y) e sem disparar o clique que abre o produto/leilão.
 *
 * Uso:
 *   const { index, paused, carouselProps } = useAutoCarousel(images.length);
 *   <div {...carouselProps}> ... </div>
 */
export default function useAutoCarousel(count, { interval = 2500, threshold = 40 } = {}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState(() => typeof document === 'undefined' || !document.hidden);

  const ref = useRef(null);
  const drag = useRef(null);
  const arrastou = useRef(false);

  // Card visível na tela? (sem observer disponível → considera visível)
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Aba/app em primeiro plano? (mobile mata timers em background)
  useEffect(() => {
    const sync = () => setAbaAtiva(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // Autoplay — timer só existe quando realmente precisa
  useEffect(() => {
    if (count <= 1 || paused || !visivel || !abaAtiva) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, paused, visivel, abaAtiva, interval]);

  // Lista de fotos mudou (troca de produto) → volta pra primeira
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const avancar = useCallback((dir) => {
    if (count <= 1) return;
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  const onPointerDown = useCallback((e) => {
    setPaused(true);
    arrastou.current = false;
    drag.current = { x: e.clientX, y: e.clientY, usado: false };
  }, []);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    if (!d || d.usado) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Só considera arraste horizontal — vertical é scroll da página
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
    d.usado = true;
    arrastou.current = true;
    avancar(dx < 0 ? 1 : -1);
  }, [avancar, threshold]);

  const soltar = useCallback(() => {
    drag.current = null;
    setPaused(false);
  }, []);

  // Se arrastou, o clique não pode abrir o produto/leilão
  const onClickCapture = useCallback((e) => {
    if (arrastou.current) {
      arrastou.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    index,
    paused,
    carouselProps: {
      ref,
      onPointerDown,
      onPointerMove,
      onPointerUp: soltar,
      onPointerCancel: soltar,
      onPointerLeave: soltar,
      onClickCapture,
      style: { touchAction: 'pan-y' },
    },
  };
}