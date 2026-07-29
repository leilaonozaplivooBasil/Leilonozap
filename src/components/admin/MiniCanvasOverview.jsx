import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { buildAdminMenu } from "@/lib/adminMenu";
import { X, ZoomIn, ZoomOut, Maximize2, Maximize, Minimize2, Map, Sparkles } from "lucide-react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.2;

/**
 * MiniCanvasOverview — versão compacta da Visão Canvas.
 *
 * Renderizada como overlay modal (z-[200]) com backdrop semi-transparente:
 * a página atual (ex.: Loja Virtual) continua visível ao fundo, sem se perder.
 * Pan (arrastar), zoom (scroll/pinça), clique num cartão para navegar.
 * Fecha com Esc ou clicando no backdrop.
 */
const SECTION_LAYOUT = [
  { title: "Visão Geral", x: 0, y: -20, isHub: true },
  { title: "Operação — Leilões", x: -420, y: -220 },
  { title: "Operação — Loja Virtual", x: 420, y: -220 },
  { title: "Operação — Estoque", x: -510, y: 70 },
  { title: "Financeiro", x: 510, y: 70 },
  { title: "Rede & Pessoas", x: -345, y: 300 },
  { title: "Automação & IA", x: 345, y: 300 },
  { title: "Sistema", x: 0, y: 340 },
  { title: "Minha Conta", x: 680, y: -30 },
];

export default function MiniCanvasOverview({ onClose, currentPageName }) {
  const navigate = useNavigate();
  const [transform, setTransform] = useState({ x: 0, y: -40, scale: 1.17 });
  const [isDragging, setIsDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const dragRef = useRef({ startX: 0, startY: 0, startTX: 0, startTY: 0, moved: false });
  const pinchRef = useRef({ startDist: 0, startScale: 1 });
  const containerRef = useRef(null);

  const menu = useMemo(() => buildAdminMenu(true), []);
  const getSection = (title) => menu.find((s) => s.title === title);

  // --- Close com animação de saída ---
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 180);
  }, [onClose]);

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

  // --- Zoom (wheel) ---
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
    setTransform({ x: 0, y: -40, scale: 1.17 });
  }, []);

  // --- Esc to close ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const goTo = useCallback((pageName) => {
    navigate(createPageUrl(pageName));
    handleClose();
  }, [navigate, handleClose]);

  // --- Backdrop click to close ---
  const onBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 ${
        closing ? "animate-out fade-out duration-180" : "animate-in fade-in duration-200"
      }`}
      onClick={onBackdropClick}
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px) saturate(1.2)",
        WebkitBackdropFilter: "blur(6px) saturate(1.2)",
      }}
    >
      {/* Modal container */}
      <div
        className={`relative ${isFullscreen ? "w-screen h-screen max-w-none max-h-none rounded-none" : "w-[95vw] h-[95vh] max-w-none max-h-none rounded-2xl"} overflow-hidden flex flex-col ${
          closing ? "animate-out zoom-out-95 duration-180" : "animate-in zoom-in-95 duration-200"
        }`}
        style={{
          background: "rgba(11,14,20,0.97)",
          border: "1px solid rgba(16,185,129,0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* --- Top bar --- */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0 z-10"
          style={{
            background: "rgba(10,15,28,0.9)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.3))",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <Map className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-bold text-emerald-300 flex items-center gap-1.5">
                Visão Geral
                <Sparkles className="w-3 h-3 text-emerald-400/60" />
              </span>
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                arraste · scroll para zoom · clique para abrir
              </span>
            </div>
          </div>
          <div className="flex-1" />
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-300 hover:text-white transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>

        {/* --- Canvas area --- */}
        <div
          ref={containerRef}
          data-canvas-bg="true"
          className="flex-1 relative overflow-hidden select-none"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
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
            {/* SVG connection lines */}
            <svg
              className="absolute pointer-events-none"
              style={{ left: -1200, top: -600, width: 2400, height: 1200 }}
            >
              {SECTION_LAYOUT.filter((s) => !s.isHub).map((section) => {
                const hub = SECTION_LAYOUT[0];
                return (
                  <line
                    key={section.title}
                    x1={hub.x + 1200}
                    y1={hub.y + 600}
                    x2={section.x + 1200}
                    y2={section.y + 600}
                    stroke="rgba(16, 185, 129, 0.15)"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
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
                    className={`w-52 rounded-xl border p-3 transition-all duration-200 ${
                      section.isHub
                        ? "bg-emerald-500/10 border-emerald-500/40 shadow-xl shadow-emerald-500/10"
                        : isActive
                        ? "bg-white/[0.06] border-emerald-500/30 shadow-lg"
                        : "bg-[#151921] border-white/10 hover:border-white/25 hover:bg-[#1a1f2b]"
                    }`}
                  >
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-2">
                      {Icon && (
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            section.isHub
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/[0.05] text-gray-400"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span
                        className={`text-[12px] font-bold truncate ${
                          section.isHub ? "text-emerald-300" : "text-white"
                        }`}
                      >
                        {section.title}
                      </span>
                      <span className="text-[9px] text-gray-500 ml-auto flex-shrink-0">
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
                            className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all ${
                              isCurrent
                                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                                : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
                            }`}
                          >
                            {ItemIcon && <ItemIcon className="w-3 h-3 flex-shrink-0" />}
                            <span className="text-[11px] truncate">{item.title}</span>
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
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-white/10 bg-[#0a0f1c]/90 backdrop-blur p-1 z-10">
            <button
              onClick={zoomOut}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-gray-400 w-9 text-center tabular-nums">
              {Math.round(transform.scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            <button
              onClick={fitToScreen}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Ver tudo"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}