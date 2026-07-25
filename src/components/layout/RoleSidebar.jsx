import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X } from "lucide-react";

/**
 * 🛡️ RoleSidebar — Sidebar lateral contextual por role
 *
 * MODES:
 *   - Desktop: fixed à esquerda (240px), abaixo do header de 64px
 *   - Mobile: drawer que abre da esquerda quando isOpen=true
 *
 * Suporta 2 formatos de itens:
 *   1. categorized=true: items é array de categorias [{title, items:[...]}]
 *   2. categorized=false: items é array plano [{title, pageName}]
 */
export default function RoleSidebar({
  config,
  currentPageName,
  isMobileOpen,
  onCloseMobile,
}) {
  if (!config || !config.showSidebar) return null;

  const { title, items, categorized } = config;

  const isActive = (pageName) => currentPageName === pageName;

  const renderItem = (item) => (
    <li key={item.pageName}>
      <Link
        to={createPageUrl(item.pageName)}
        onClick={() => {
          if (onCloseMobile) onCloseMobile();
        }}
        className={`block px-3 py-2 rounded-lg text-[13px] transition-all duration-200 truncate ${
          isActive(item.pageName)
            ? "text-emerald-300 font-semibold"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
        style={
          isActive(item.pageName)
            ? {
                background: "rgba(16,185,129,0.12)",
                borderLeft: "3px solid rgba(16,185,129,0.6)",
                paddingLeft: "9px",
              }
            : {}
        }
      >
        {item.title}
      </Link>
    </li>
  );

  const content = (
    <div className="flex flex-col h-full">
      {/* Header da sidebar */}
      <div
        className="px-4 py-3 flex items-start justify-between flex-shrink-0 gap-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-bold text-emerald-300 truncate" title={title}>
            {title}
          </span>
        </div>
        {/* Botão fechar — só mobile */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white flex-shrink-0"
          aria-label="Fechar painel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {categorized ? (
          <div className="space-y-4">
            {items.map((category) => (
              <div key={category.title}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 px-3 mb-1.5 truncate">
                  {category.title}
                </p>
                <ul className="space-y-0.5">
                  {(category.items || []).map(renderItem)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">{items.map(renderItem)}</ul>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ==================== DESKTOP (fixed à esquerda) ==================== */}
      <aside
        className="hidden md:flex flex-col fixed left-0 w-60 z-40"
        style={{
          top: "64px",
          bottom: 0,
          background: "rgba(10, 15, 28, 0.55)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          borderRight: "1px solid rgba(16, 185, 129, 0.08)",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.02)",
        }}
      >
        {content}
      </aside>

      {/* ==================== MOBILE (drawer esquerda) ==================== */}
      {isMobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />

          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 w-[80%] max-w-xs z-[101] md:hidden animate-in slide-in-from-left duration-300"
            style={{
              background: "rgba(10, 15, 28, 0.92)",
              backdropFilter: "blur(32px) saturate(1.6)",
              WebkitBackdropFilter: "blur(32px) saturate(1.6)",
              boxShadow: "8px 0 48px rgba(0,0,0,0.4)",
              borderRight: "1px solid rgba(16,185,129,0.08)",
            }}
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}