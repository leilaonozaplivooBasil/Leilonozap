import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

/**
 * 🛡️ ADMIN LAYOUT — Wrapper para painéis administrativos
 * - Renderiza AdminSidebar fixa à esquerda (desktop) ou drawer (mobile)
 * - Área de conteúdo com offset de 260px no desktop
 * - Botão hambúrguer fixo top-left no mobile (só quando sidebar fechada)
 */
export default function AdminLayout({ children, currentUser, currentPageName, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminSidebar
        currentUser={currentUser}
        currentPageName={currentPageName}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Botão hambúrguer mobile (fica oculto quando drawer está aberto) */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-3 left-3 z-30 w-11 h-11 rounded-xl bg-gray-800/90 backdrop-blur border border-white/10 text-white flex items-center justify-center shadow-lg hover:bg-gray-700/90 transition-colors"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Conteúdo: offset de 260px no desktop, full width no mobile */}
      <main className="md:ml-[260px] min-h-screen">
        {/* Top spacer no mobile pra não esconder conteúdo atrás do botão hambúrguer */}
        <div className="md:hidden h-16" aria-hidden="true" />
        {children}
      </main>
    </div>
  );
}