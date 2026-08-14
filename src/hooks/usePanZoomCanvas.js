import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * usePanZoomCanvas — navegação de canvas infinito (pan & zoom estilo Figma/Miro).
 *
 * Regras do gesto (comportamento nativo do navegador):
 *  - Trackpad com dois dedos deslizando (wheel sem ctrlKey) = ANDAR o mapa.
 *  - Pinça no trackpad ou Ctrl/⌘+roda (wheel com ctrlKey) = ZOOM focal no cursor
 *    (é assim que o navegador reporta pinça de trackpad — padrão, sem gesture API).
 *  - Mouse: arrastar com botão esquerdo (ou botão do meio) no fundo = pan.
 *  - Touch: 1 dedo = pan; 2 dedos = pinça de zoom focal + pan simultâneo.
 *  - Soltar o arraste com velocidade = inércia leve (respeita prefers-reduced-motion).
 *  - autoPanFromPointer(px, py): chamado durante o arraste de um nó — perto da
 *    borda do canvas, a tela anda sozinha na direção da borda.
 */
const EDGE = 48;       // px da borda que aciona o auto-pan
const EDGE_SPEED = 14; // px por frame quando o ponteiro está bem na borda

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export default function usePanZoomCanvas({
  viewportRef,
  panRef,
  zoomRef,
  setPan,
  setZoom,
  minZoom = 0.25,
  maxZoom = 3,
}) {
  const [isPanning, setIsPanning] = useState(false);
  const pointers = useRef(new Map()); // pointerId -> {x,y} (multi-touch)
  const modeRef = useRef(null);       // 'pan' | 'pinch' | null
  const startRef = useRef(null);
  const inertiaRef = useRef(null);
  const autoPanRef = useRef(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const stopInertia = useCallback(() => {
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  }, []);

  const panBy = useCallback(
    (dx, dy) => {
      const p = panRef.current;
      setPan({ x: p.x + dx, y: p.y + dy });
    },
    [panRef, setPan]
  );

  const zoomBy = useCallback(
    (factor, origin) => {
      const z = zoomRef.current;
      const next = Math.min(maxZoom, Math.max(minZoom, z * factor));
      if (next === z) return;
      const p = panRef.current;
      const vp = viewportRef.current;
      const o =
        origin || {
          x: (vp?.clientWidth || 0) / 2,
          y: (vp?.clientHeight || 0) / 2,
        };
      setPan({ x: o.x - ((o.x - p.x) * next) / z, y: o.y - ((o.y - p.y) * next) / z });
      setZoom(next);
    },
    [minZoom, maxZoom, panRef, zoomRef, setPan, setZoom, viewportRef]
  );

  /* ---------------- Roda / trackpad (wheel) ---------------- */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const handler = (e) => {
      e.preventDefault();
      stopInertia();
      const rect = vp.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        zoomBy(factor, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    };
    vp.addEventListener('wheel', handler, { passive: false });
    return () => vp.removeEventListener('wheel', handler);
  }, [viewportRef, zoomBy, panBy, stopInertia]);

  /* ---------------- Inércia ao soltar ---------------- */
  const runInertia = useCallback(
    (vx, vy) => {
      if (reducedMotion) return;
      let velX = vx * 16; // vx estava em px/ms → aproxima px/frame (60fps)
      let velY = vy * 16;
      if (Math.hypot(velX, velY) < 0.6) return;
      const step = () => {
        velX *= 0.92;
        velY *= 0.92;
        if (Math.hypot(velX, velY) < 0.3) {
          inertiaRef.current = null;
          return;
        }
        panBy(velX, velY);
        inertiaRef.current = requestAnimationFrame(step);
      };
      inertiaRef.current = requestAnimationFrame(step);
    },
    [panBy, reducedMotion]
  );

  /* ---------------- Pointer (mouse + touch) ---------------- */
  const beginPan = useCallback(
    (e) => {
      stopInertia();
      if (e.pointerType === 'touch') {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          modeRef.current = 'pinch';
          startRef.current = { dist: dist(a, b) || 1, mid: mid(a, b), zoom: zoomRef.current, pan: { ...panRef.current } };
        } else {
          modeRef.current = 'pan';
          startRef.current = { x: e.clientX, y: e.clientY, pan: { ...panRef.current }, vx: 0, vy: 0, t: Date.now() };
        }
        setIsPanning(true);
        return true;
      }
      // mouse: botão esquerdo ou do meio arrastam o fundo
      if (e.button !== 0 && e.button !== 1) return false;
      modeRef.current = 'pan';
      startRef.current = { x: e.clientX, y: e.clientY, pan: { ...panRef.current }, vx: 0, vy: 0, t: Date.now() };
      setIsPanning(true);
      return true;
    },
    [panRef, zoomRef, stopInertia]
  );

  const movePan = useCallback(
    (e) => {
      if (e.pointerType === 'touch' && pointers.current.has(e.pointerId)) {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (modeRef.current === 'pinch' && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const s = startRef.current;
          const newDist = dist(a, b) || 1;
          const newMid = mid(a, b);
          const factor = newDist / s.dist;
          const nextZoom = Math.min(maxZoom, Math.max(minZoom, s.zoom * factor));
          const vp = viewportRef.current;
          const rect = vp?.getBoundingClientRect();
          const ox = newMid.x - (rect?.left || 0);
          const oy = newMid.y - (rect?.top || 0);
          const dxMid = newMid.x - s.mid.x;
          const dyMid = newMid.y - s.mid.y;
          setPan({
            x: ox - ((ox - (s.pan.x + dxMid)) * nextZoom) / s.zoom,
            y: oy - ((oy - (s.pan.y + dyMid)) * nextZoom) / s.zoom,
          });
          setZoom(nextZoom);
          return true;
        }

        if (modeRef.current === 'pan') {
          const s = startRef.current;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          const now = Date.now();
          const dt = Math.max(1, now - s.t);
          s.vx = (e.clientX - (s.lastX ?? s.x)) / dt;
          s.vy = (e.clientY - (s.lastY ?? s.y)) / dt;
          s.lastX = e.clientX;
          s.lastY = e.clientY;
          s.t = now;
          setPan({ x: s.pan.x + dx, y: s.pan.y + dy });
          return true;
        }
      }

      if (modeRef.current === 'pan' && startRef.current && e.pointerType !== 'touch') {
        const s = startRef.current;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        const now = Date.now();
        const dt = Math.max(1, now - s.t);
        s.vx = (e.clientX - (s.lastX ?? s.x)) / dt;
        s.vy = (e.clientY - (s.lastY ?? s.y)) / dt;
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        s.t = now;
        setPan({ x: s.pan.x + dx, y: s.pan.y + dy });
        return true;
      }

      return false;
    },
    [minZoom, maxZoom, setPan, setZoom, viewportRef]
  );

  const endPan = useCallback(
    (e) => {
      if (e?.pointerType === 'touch' && e?.pointerId != null) {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size === 1) {
          // ainda tem 1 dedo na tela: continua andando a partir daqui
          const [only] = [...pointers.current.values()];
          modeRef.current = 'pan';
          startRef.current = { x: only.x, y: only.y, pan: { ...panRef.current }, vx: 0, vy: 0, t: Date.now() };
          return;
        }
        if (pointers.current.size > 0) return; // ainda tem dedo(s)
      } else {
        pointers.current.clear();
      }
      const s = startRef.current;
      modeRef.current = null;
      startRef.current = null;
      setIsPanning(false);
      if (s?.vx || s?.vy) runInertia(s.vx, s.vy);
    },
    [panRef, runInertia]
  );

  /* ---------------- Auto-pan de borda (arrastar um nó) ---------------- */
  const autoPanFromPointer = useCallback(
    (px, py) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const w = vp.clientWidth;
      const h = vp.clientHeight;
      let vx = 0;
      let vy = 0;
      if (px < EDGE) vx = EDGE_SPEED * (1 - px / EDGE);
      else if (px > w - EDGE) vx = -EDGE_SPEED * (1 - (w - px) / EDGE);
      if (py < EDGE) vy = EDGE_SPEED * (1 - py / EDGE);
      else if (py > h - EDGE) vy = -EDGE_SPEED * (1 - (h - py) / EDGE);

      if (vx === 0 && vy === 0) {
        if (autoPanRef.current) {
          cancelAnimationFrame(autoPanRef.current);
          autoPanRef.current = null;
        }
        return;
      }
      if (autoPanRef.current) cancelAnimationFrame(autoPanRef.current);
      const step = () => {
        panBy(vx, vy);
        autoPanRef.current = requestAnimationFrame(step);
      };
      autoPanRef.current = requestAnimationFrame(step);
    },
    [viewportRef, panBy]
  );

  const stopAutoPan = useCallback(() => {
    if (autoPanRef.current) {
      cancelAnimationFrame(autoPanRef.current);
      autoPanRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopInertia();
      stopAutoPan();
    },
    [stopInertia, stopAutoPan]
  );

  return { isPanning, beginPan, movePan, endPan, zoomBy, autoPanFromPointer, stopAutoPan };
}