import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { flattenAdminMenu } from "@/lib/adminMenu";
import {
  ShieldCheck,
  ChevronDown,
  Search,
  Command as CommandIcon,
  LayoutGrid,
  X,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/**
 * AdminTopNav — Barra de comando do Painel de Controle (Admin / Super Admin)
 *
 * Substitui a antiga sidebar lateral de 240px (pedido Gabriel 26/07/2026):
 * o menu passa para o TOPO e a tela inteira fica livre para o conteúdo
 * (árvore genealógica, tabelas, gestão de usuários).
 *
 * INTERAÇÕES
 *   • Clique numa seção  → mega-menu expandido abaixo da barra, com os itens da seção
 *   • Hover entre seções → troca de seção sem novo clique (padrão mega-menu)
 *   • "Todos os painéis" → grade completa com TODAS as seções de uma vez
 *   • Cmd/Ctrl + K       → paleta de busca por qualquer painel (setas + Enter)
 *   • Esc / clique fora  → fecha
 *
 * REGRA: zero emoji. Todo item é ícone lucide.
 */
export default function AdminTopNav({ config, currentPageName }) {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState(null); // título da categoria aberta
  const [showAll, setShowAll] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef(null);

  const { title, items, categorized } = config || {};

  // Normaliza: contexto plano vira uma única "seção" com os itens
  const sections = useMemo(() => {
    if (!items) return [];
    return categorized ? items : [{ title: title || "Painéis", items, isCategory: true }];
  }, [items, categorized, title]);

  const allItems = useMemo(() => flattenAdminMenu(sections), [sections]);

  // Seção que contém a página atual (para o breadcrumb e o destaque do chip)
  const activeSection = useMemo(
    () => sections.find((s) => (s.items || []).some((i) => i.pageName === currentPageName)) || null,
    [sections, currentPageName]
  );
  const activeItem = useMemo(
    () => allItems.find((i) => i.pageName === currentPageName) || null,
    [allItems, currentPageName]
  );

  const closeAll = useCallback(() => {
    setOpenSection(null);
    setShowAll(false);
  }, []);

  // Esc fecha tudo · Cmd/Ctrl+K abre a paleta
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeAll();
        setPaletteOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        closeAll();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAll]);

  // Clique fora fecha o mega-menu
  useEffect(() => {
    if (!openSection && !showAll) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeAll();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openSection, showAll, closeAll]);

  const go = useCallback(
    (pageName) => {
      closeAll();
      setPaletteOpen(false);
      navigate(createPageUrl(pageName));
    },
    [navigate, closeAll]
  );

  if (!config || !config.showSidebar) return null;

  const openedSection = sections.find((s) => s.title === openSection) || null;

  return (
    <>
      <div
        ref={rootRef}
        className="sticky top-14 sm:top-16 z-40"
        style={{
          background: "rgba(10, 15, 28, 0.88)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.14)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        }}
      >
        <div className="mx-auto max-w-[1800px] px-3 sm:px-5">
          {/* ---------- Linha 1: identificação + breadcrumb + busca ---------- */}
          <div className="flex items-center gap-3 h-11 sm:h-12">
            <button
              type="button"
              onClick={() => {
                setOpenSection(null);
                setShowAll((v) => !v);
              }}
              className="flex items-center gap-2 flex-shrink-0 rounded-lg px-2 py-1.5 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
              title="Ver todos os painéis"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[13px] font-bold hidden sm:inline truncate max-w-[240px]">
                {title}
              </span>
              <LayoutGrid className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Breadcrumb: Seção › Página atual */}
            {activeItem && (
              <div className="hidden lg:flex items-center gap-1.5 text-[12px] text-gray-500 min-w-0">
                <span className="text-gray-700">/</span>
                {activeSection && (
                  <>
                    <span className="truncate">{activeSection.title}</span>
                    <span className="text-gray-700">/</span>
                  </>
                )}
                <span className="text-gray-200 font-medium truncate">{activeItem.title}</span>
              </div>
            )}

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-gray-400 hover:text-white hover:border-emerald-500/30 hover:bg-white/[0.06] transition-colors"
              title="Buscar painel (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar painel</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-gray-500">
                <CommandIcon className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </div>

          {/* ---------- Linha 2: chips das seções ---------- */}
          <div className="flex items-stretch gap-1 overflow-x-auto no-scrollbar pb-1.5 -mx-1 px-1">
            {sections.map((section) => {
              const SectionIcon = section.icon;
              const isOpen = openSection === section.title && !showAll;
              const isCurrent = activeSection?.title === section.title;
              return (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => {
                    setShowAll(false);
                    setOpenSection(isOpen ? null : section.title);
                  }}
                  onMouseEnter={() => {
                    if (openSection && !showAll) setOpenSection(section.title);
                  }}
                  className={`group flex items-center gap-1.5 flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[12.5px] whitespace-nowrap transition-all duration-150 border ${
                    isOpen
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
                      : isCurrent
                      ? "bg-white/[0.06] text-white border-white/10"
                      : "text-gray-400 border-transparent hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {SectionIcon && <SectionIcon className="w-3.5 h-3.5" />}
                  <span>{section.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 opacity-60 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- Mega-menu (uma seção) ---------- */}
        {openedSection && !showAll && (
          <div
            className="absolute left-0 right-0 top-full border-t border-emerald-500/10 animate-in fade-in slide-in-from-top-1 duration-150"
            style={{
              background: "rgba(8, 12, 24, 0.97)",
              backdropFilter: "blur(28px) saturate(1.6)",
              WebkitBackdropFilter: "blur(28px) saturate(1.6)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div className="mx-auto max-w-[1800px] px-3 sm:px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                {openedSection.icon && <openedSection.icon className="w-4 h-4 text-emerald-400" />}
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90">
                  {openedSection.title}
                </span>
                <span className="text-[11px] text-gray-600">
                  {(openedSection.items || []).length} painéis
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={closeAll}
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                {(openedSection.items || []).map((item) => (
                  <MenuTile
                    key={item.pageName}
                    item={item}
                    active={item.pageName === currentPageName}
                    onClick={() => go(item.pageName)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------- Grade completa (todos os painéis) ---------- */}
        {showAll && (
          <div
            className="absolute left-0 right-0 top-full border-t border-emerald-500/10 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
            style={{
              background: "rgba(8, 12, 24, 0.97)",
              backdropFilter: "blur(28px) saturate(1.6)",
              WebkitBackdropFilter: "blur(28px) saturate(1.6)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div className="mx-auto max-w-[1800px] px-3 sm:px-5 py-5">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90">
                  Todos os painéis
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={closeAll}
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
                {sections.map((section) => (
                  <div key={section.title}>
                    <div className="flex items-center gap-1.5 px-1 mb-1.5">
                      {section.icon && <section.icon className="w-3.5 h-3.5 text-emerald-400/80" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                        {section.title}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {(section.items || []).map((item) => (
                        <MenuTile
                          key={item.pageName}
                          item={item}
                          compact
                          active={item.pageName === currentPageName}
                          onClick={() => go(item.pageName)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Paleta de busca (Cmd+K) ---------- */}
      {paletteOpen && (
        <CommandPalette items={allItems} onClose={() => setPaletteOpen(false)} onSelect={go} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tile de painel                                                      */
/* ------------------------------------------------------------------ */
function MenuTile({ item, active, onClick, compact = false }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-lg text-left transition-all duration-150 ${
        compact ? "px-2 py-1.5" : "px-3 py-2.5"
      } ${
        active
          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
          : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {Icon && (
        <span
          className={`flex items-center justify-center rounded-md flex-shrink-0 ${
            compact ? "w-6 h-6" : "w-8 h-8"
          } ${active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.05] text-gray-400"}`}
        >
          <Icon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </span>
      )}
      <span className={`truncate ${compact ? "text-[12.5px]" : "text-[13.5px] font-medium"}`}>
        {item.title}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Paleta de comando                                                   */
/* ------------------------------------------------------------------ */
function CommandPalette({ items, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const results = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return items;
    return items.filter(
      (i) => normalize(i.title).includes(q) || normalize(i.category).includes(q)
    );
  }, [items, query]);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mantém o item selecionado visível
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${index}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [index]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[index];
      if (item) onSelect(item.pageName);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-150"
        style={{
          background: "rgba(12, 17, 30, 0.98)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.07]">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar painel, seção ou ferramenta…"
            className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-gray-600"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5"
            aria-label="Fechar busca"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-gray-500">
              Nenhum painel encontrado.
            </p>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={`${item.category}-${item.pageName}`}
                  data-idx={i}
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => onSelect(item.pageName)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === index ? "bg-emerald-500/12" : ""
                  }`}
                >
                  {Icon && (
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                        i === index
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/[0.05] text-gray-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-[13.5px] truncate ${
                        i === index ? "text-white font-medium" : "text-gray-300"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="block text-[11px] text-gray-600 truncate">{item.category}</span>
                  </span>
                  {i === index && <CornerDownLeft className="w-3.5 h-3.5 text-gray-600" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.07] text-[10.5px] text-gray-600">
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            <ArrowDown className="w-3 h-3" /> navegar
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" /> abrir
          </span>
          <span className="flex items-center gap-1">esc fechar</span>
          <div className="flex-1" />
          <span>{results.length} painéis</span>
        </div>
      </div>
    </div>
  );
}
