import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Settings, ChevronDown } from "lucide-react";

/**
 * 🛡️ AdminMegaMenu — Dropdown grande de atalhos administrativos
 *
 * Visível APENAS para admin/super_admin (controle de visibilidade no componente pai).
 * Reaproveita 100% o array `adminMenuItems` definido em Layout.jsx (8 categorias × ~39 itens).
 *
 * Estrutura do dropdown:
 *   - Header com título "Painel Admin"
 *   - Grid responsivo (1 col mobile, 2-3 cols desktop) com categorias
 *   - Cada categoria: título + lista de itens clicáveis (Link → createPageUrl)
 *   - Fecha ao clicar em qualquer item ou fora do dropdown
 */
export default function AdminMegaMenu({ adminMenuItems = [], onItemClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleClick = () => {
    setOpen(false);
    if (onItemClick) onItemClick();
  };

  if (!adminMenuItems || adminMenuItems.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 px-3 py-1.5 rounded-lg ${
          open ? "text-emerald-300" : "text-gray-300 hover:text-white"
        }`}
        style={
          open
            ? {
                background: "rgba(16, 185, 129, 0.1)",
                boxShadow: "0 0 12px rgba(16, 185, 129, 0.08)",
              }
            : {}
        }
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Settings className="w-4 h-4" />
        Admin
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[680px] max-w-[92vw] rounded-xl overflow-hidden z-50"
          style={{
            background: "rgba(10, 15, 28, 0.98)",
            backdropFilter: "blur(28px) saturate(1.6)",
            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.05)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Painel Admin</span>
            <span className="text-xs text-gray-500 ml-auto">Configurações e operações</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-4 max-h-[70vh] overflow-y-auto">
            {adminMenuItems.map((category) => (
              <div key={category.title} className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 mb-2 truncate">
                  {category.title}
                </p>
                <ul className="space-y-0.5">
                  {(category.items || []).map((item) => (
                    <li key={item.pageName}>
                      <Link
                        to={createPageUrl(item.pageName)}
                        onClick={handleClick}
                        className="block px-2 py-1.5 rounded-md text-[13px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors truncate"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}