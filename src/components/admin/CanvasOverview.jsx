import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { buildAdminMenu } from "@/lib/adminMenu";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Maximize2, Map } from "lucide-react";

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

/**
 * CanvasOverview — Visão Canvas estilo mapa mental (Miro-style)
 *
 * Canvas infinito com todas as seções do Painel de Controle como cartões
 * conectados por linhas. Pan (arrastar), zoom (scroll/pinça), clique para navegar.
 *
 * Renderizado como overlay fullscreen (fixed inset-0 z-[200]) pelo AdminTopNav.
 */
const SECTION_LAYOUT = [
  { title: "Visão Geral", x: 0, y: -30, isHub: true },
  { title: "Operação — Leilões", x: -560, y: -300 },
  { title: "Operação — Loja Virtual", x: 560, y: -300 },
  { title: "Operação — Estoque", x: -680, y: 90 },
  { title: "Financeiro", x: 680, y: 90 },
  { title: "Rede & Pessoas", x: -460, y: 390 },
  { title: "Automação & IA", x: 460, y: 390 },
  { title: "Sistema", x: 0, y: 440 },
  { title: "Minha Conta", x: 900, y: -40 },
];

export default function CanvasOverview({ onClose, currentPageName }) {
  const navigate = useNavigate();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.65 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startTX: 0, startTY: 0, moved: false });
  const pinchRef = useRef({ startDist: 0, startScale: 1 });
  const containerRef = useRef(null);

  const menu = useMemo(() => buildAdminMenu(true), []);
  const getSection = (title) => menu.find((s) => s.title === title);

  // --- Pan (mouse) ---
  const onMouseDown = useCallback((e) => {
    if (e.target !== e.currentTarget && !e.target.dataset?.canvasBg) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTX: transform.x,
      startTY: transform.y,
      moved: false,
    };
  }, [transform.x, transform.y]);

  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    setTransform((prev) => ({
      ...prev,
      x: dragRef.current.startTX + dx,
      y: dragRef.current.startTY + dy,
    }));
  }, [isDragging]);

  const stopDrag = useCallback(() => setIsDragging(false), []);

  // --- Zoom (wheel) — listener manual com passive:false ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setTransform((prev) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta * prev.scale));
        return { ...prev, scale: newScale };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // --- Pan + Pinch (touch) ---
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = { startDist: dist, startScale: transform.scale };
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      if (e.target !== e.currentTarget && !e.target.dataset?.canvasBg) return;
      setIsDragging(true);
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTX: transform.x,
        startTY: transform.y,
        moved: false,
      };
    }
  }, [transform.x, transform.y, transform.scale]);

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchRef.current.startDist;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.startScale * ratio));
      setTransform((prev) => ({ ...prev, scale: newScale }));
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      setTransform((prev) => ({
        ...prev,
        x: dragRef.current.startTX + dx,
        y: dragRef.current.startTY + dy,
      }));
    }
  }, [isDragging]);

  // --- Zoom buttons ---
  const zoomIn = useCallback(() => {
    setTransform((prev) => ({ ...prev, scale: Math.min(MAX_SCALE, prev.scale * 1.25) }));
  }, []);
  const zoomOut = useCallback(() => {
    setTransform((prev) => ({ ...prev, scale: Math.max(MIN_SCALE, prev.scale / 1.25) }));
  }, []);
  const fitToScreen = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 0.65 });
  }, []);

  // --- Esc to close ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goTo = useCallback((pageName) => {
    navigate(createPageUrl(pageName));
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0b0e14] flex flex-col animate-in fade-in duration-200">
      {/* --- Top bar --- */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-[#0a0f1c] z-10 flex-shrink-0">
        <Map className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-emerald-400">Visão Canvas</span>
        <span className="text-[11px] text-gray-500 hidden sm:inline">
          arraste o fundo para mover · scroll ou pinça para zoom · clique num cartão para abrir
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          className="h-8 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white"
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Sair da visão canvas
        </Button>
      </div>

      {/* --- Canvas area --- */}
      <div
        ref={containerRef}
        data-canvas-bg="true"
        className="flex-1 relative overflow-hidden select-none"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={stopDrag}
      >
        {/* Transformable canvas */}
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          {/* SVG connection lines (hub → each section) */}
          <svg
            className="absolute pointer-events-none"
            style={{ left: -1500, top: -750, width: 3000, height: 1500 }}
          >
            {SECTION_LAYOUT.filter((s) => !s.isHub).map((section) => {
              const hub = SECTION_LAYOUT[0];
              return (
                <line
                  key={section.title}
                  x1={hub.x + 1500}
                  y1={hub.y + 750}
                  x2={section.x + 1500}
                  y2={section.y + 750}
                  stroke="rgba(16, 185, 129, 0.18)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
              );
            })}
          </svg>

          {/* Section cards */}
          {SECTION_LAYOUT.map((section) => {
            const data = getSection(section.title);
            if (!data) return null;
            const Icon = data.icon;
            const isActive = (data.items || []).some((i) => i.pageName === currentPageName);
            return (
              <div
                key={section.title}
                className="absolute"
                style={{
                  left: `${section.x}px`,
                  top: `${section.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`w-60 rounded-2xl border-2 p-4 transition-all duration-200 ${
                    section.isHub
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-2xl shadow-emerald-500/10"
                      : isActive
                      ? "bg-white/[0.06] border-emerald-500/30 shadow-xl"
                      : "bg-[#151921] border-white/10 hover:border-white/25 hover:bg-[#1a1f2b]"
                  }`}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    {Icon && (
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          section.isHub
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/[0.05] text-gray-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <span
                      className={`text-[13px] font-bold truncate ${
                        section.isHub ? "text-emerald-300" : "text-white"
                      }`}
                    >
                      {section.title}
                    </span>
                    <span className="text-[10px] text-gray-500 ml-auto flex-shrink-0">
                      {(data.items || []).length}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-0.5">
                    {(data.items || []).map((item) => {
                      const ItemIcon = item.icon;
                      const isCurrent = item.pageName === currentPageName;
                      return (
                        <button
                          key={item.pageName}
                          onClick={() => goTo(item.pageName)}
                          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all ${
                            isCurrent
                              ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                              : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {ItemIcon && <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="text-[12px] truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zoom controls (bottom-right) */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-white/10 bg-[#0a0f1c]/90 backdrop-blur p-1.5 z-10">
          <button
            onClick={zoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-gray-400 w-10 text-center tabular-nums">
            {Math.round(transform.scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-0.5" />
          <button
            onClick={fitToScreen}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Ver tudo"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}