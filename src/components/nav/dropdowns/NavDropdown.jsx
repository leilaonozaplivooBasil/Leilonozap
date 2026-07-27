import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

/**
 * 🛡️ NavDropdown — Dropdown genérico do cabeçalho público (FASE 4A)
 *
 * Props:
 *   label       — texto do botão trigger (ex: "Comprar")
 *   emoji       — emoji renderizado antes do label (opcional)
 *   items[]     — { title, subtitle?, path?, emoji?, onClick?, isHeadline? }
 *
 * Comportamento:
 *   - Abre em hover E em click (touch-friendly)
 *   - Fecha ao clicar item, clicar fora, ou apertar ESC
 *   - Fecha ao trocar de página (unmount)
 */
export default function NavDropdown({ label, emoji, items = [] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleItemClick = (item) => {
    setOpen(false);
    if (item.onClick) item.onClick();
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 px-3 py-1.5 rounded-lg ${
          open ? "text-emerald-300 bg-emerald-500/10" : "text-gray-300 hover:text-white"
        }`}
      >
        {emoji && <span className="text-base leading-none">{emoji}</span>}
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150"
          style={{
            background: "rgba(10, 15, 28, 0.92)",
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            border: "1px solid rgba(16, 185, 129, 0.12)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="py-2">
            {items.map((item, idx) => {
              const isFirst = idx === 0 && item.isHeadline;
              const inner = (
                <div className={`px-5 py-3 min-h-[44px] ${isFirst ? "border-b border-white/10" : ""} hover:bg-emerald-500/8 transition-colors`}>
                  <div className="flex items-center gap-2">
                    {item.emoji && <span className="text-base leading-none">{item.emoji}</span>}
                    <span className={`font-semibold ${isFirst ? "text-emerald-300" : "text-white"}`}>
                      {item.title}
                    </span>
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.subtitle}</p>
                  )}
                </div>
              );

              if (item.isHeadline && !item.path && !item.onClick) {
                return <div key={idx}>{inner}</div>;
              }

              if (item.path) {
                return (
                  <Link key={idx} to={item.path} onClick={() => handleItemClick(item)} className="block">
                    {inner}
                  </Link>
                );
              }

              return (
                <button key={idx} type="button" onClick={() => handleItemClick(item)} className="w-full text-left">
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}