import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LogOut, X } from 'lucide-react';
import { getNavForUser, ROLE_ACCENT, ROLE_LABEL } from '@/lib/adminNavConfig';

/**
 * 🛡️ ADMIN SIDEBAR — Estilo "LIVOO"
 * - Desktop: fixa lateral 260px
 * - Mobile: drawer off-canvas com overlay
 * - Renderização condicional de itens por role
 */
export default function AdminSidebar({ currentUser, currentPageName, onLogout, mobileOpen, onMobileClose }) {
  const navigate = useNavigate();
  const role = currentUser?.role || 'user';
  const accent = ROLE_ACCENT[role] || 'emerald';
  const roleLabel = ROLE_LABEL[role] || 'USUÁRIO';
  const categories = getNavForUser(currentUser);

  // Fecha drawer ao navegar (mobile)
  const handleNavigate = (page) => {
    navigate(createPageUrl(page));
    if (onMobileClose) onMobileClose();
  };

  // ESC fecha drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape' && onMobileClose) onMobileClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  // Bloqueia scroll do body quando drawer aberto (mobile)
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  // 🎨 Helper: classes do badge da role
  const badgeColors = {
    fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    green: 'bg-green-500/15 text-green-300 border-green-500/30',
  };

  // 🎨 Helper: classes do item ATIVO
  const activeItemColors = {
    fuchsia: 'bg-gradient-to-r from-fuchsia-500/15 to-fuchsia-500/5 border border-fuchsia-500/30 text-fuchsia-300',
    violet: 'bg-gradient-to-r from-violet-500/15 to-violet-500/5 border border-violet-500/30 text-violet-300',
    amber: 'bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/30 text-amber-300',
    blue: 'bg-gradient-to-r from-blue-500/15 to-blue-500/5 border border-blue-500/30 text-blue-300',
    cyan: 'bg-gradient-to-r from-cyan-500/15 to-cyan-500/5 border border-cyan-500/30 text-cyan-300',
    emerald: 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 text-emerald-300',
    green: 'bg-gradient-to-r from-green-500/15 to-green-500/5 border border-green-500/30 text-green-300',
  };

  // 🎨 Helper: cor do ponto à direita do item ativo
  const dotColors = {
    fuchsia: 'bg-fuchsia-400',
    violet: 'bg-violet-400',
    amber: 'bg-amber-400',
    blue: 'bg-blue-400',
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    green: 'bg-green-400',
  };

  const displayName = currentUser?.full_name || currentUser?.email || 'Usuário';
  const displayEmail = currentUser?.email || '';
  const firstLetter = (displayName || '?').trim().charAt(0).toUpperCase();

  // Renderização do conteúdo da sidebar (compartilhado entre desktop e mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* TOPO — Logo + Badge Role */}
      <div className="px-4 py-4 border-b border-white/[0.04] flex-shrink-0">
        <button
          onClick={() => handleNavigate('Portal')}
          className="flex items-center gap-3 w-full group"
        >
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-10 w-auto group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-xs font-extrabold text-white tracking-tight leading-none">LEILÃO</span>
            <span className="text-xs font-extrabold text-white tracking-tight leading-none">NoZap</span>
            <span className={`mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border ${badgeColors[accent]}`}>
              {roleLabel}
            </span>
          </div>
          {/* Botão fechar (só mobile) */}
          {mobileOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); onMobileClose && onMobileClose(); }}
              className="md:hidden p-2 -mr-2 text-gray-400 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          )}
        </button>
      </div>

      {/* CORPO — Categorias e itens */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 sidebar-scroll">
        {categories.map((cat) => (
          <div key={cat.title}>
            <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">
              {cat.title}
            </p>
            <div className="space-y-0.5">
              {cat.items.map((item) => {
                const isActive = currentPageName === item.page;
                const Icon = item.icon;
                return (
                  <button
                    key={item.page + item.label}
                    onClick={() => handleNavigate(item.page)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                      isActive
                        ? activeItemColors[accent]
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {isActive && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[accent]} flex-shrink-0`} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="px-3 text-sm text-gray-500 italic">Nenhum painel disponível</p>
        )}
      </nav>

      {/* RODAPÉ — Perfil + Sair */}
      <div className="border-t border-white/[0.04] p-3 flex-shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
          {currentUser?.profile_photo_url || currentUser?.avatar_url ? (
            <img
              src={currentUser.profile_photo_url || currentUser.avatar_url}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/10"
            />
          ) : (
            <div className={`w-9 h-9 rounded-full ${dotColors[accent]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
              {firstLetter}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-500 truncate">{displayEmail}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP — Sidebar fixa lateral */}
      <aside
        className="hidden md:flex fixed top-0 left-0 h-screen w-[260px] z-40 flex-col"
        style={{
          background: 'linear-gradient(180deg, #0a0f1c 0%, #050810 100%)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* MOBILE — Drawer + Overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed top-0 left-0 h-screen w-[280px] max-w-[85vw] z-50 flex flex-col animate-slide-in"
            style={{
              background: 'linear-gradient(180deg, #0a0f1c 0%, #050810 100%)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-slide-in { animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }

        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </>
  );
}