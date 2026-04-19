import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Share2, LogOut, User as UserIcon, ShoppingCart as CartIcon } from "lucide-react";

export default function NavMobile({
  isOpen,
  onClose,
  finalMenuItems,
  currentPageName,
  isLoggedIn,
  isAdmin,
  isInvestidor,
  isLeiloeiro,
  isCatalogPage,
  adminMenuItems,
  onShareClick,
  onLoginClick,
  onLogout,
}) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Menu Lateral */}
      <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm z-[101] animate-in slide-in-from-right duration-300" style={{ background: 'rgba(10, 15, 28, 0.75)', backdropFilter: 'blur(32px) saturate(1.6)', WebkitBackdropFilter: 'blur(32px) saturate(1.6)', boxShadow: '-8px 0 48px rgba(0,0,0,0.4)', borderLeft: '1px solid rgba(16,185,129,0.06)' }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* ITENS DO MENU */}
            {finalMenuItems.filter(item => item.pageName).map((item) => (
              <Link
                key={item.title}
                to={createPageUrl(item.pageName) + (item.addFromCatalog ? "?from=catalog" : "")}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${currentPageName === item.pageName
                  ? "text-emerald-300"
                  : "text-gray-400 hover:text-white hover:translate-x-1"
                  }`}
                style={currentPageName === item.pageName ? {
                  background: 'rgba(16,185,129,0.1)',
                  borderLeft: '3px solid rgba(16,185,129,0.5)',
                } : {}}
              >
                {item.icon === 'cart' && <CartIcon className="w-5 h-5" />}
                {item.title}
              </Link>
            ))}

            {/* CARRINHO - APENAS EM PÁGINAS DO CATÁLOGO */}
            {isCatalogPage && (
              <Link
                to={createPageUrl("Cart")}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${currentPageName === "Cart"
                  ? "text-emerald-300"
                  : "text-gray-400 hover:text-white hover:translate-x-1"
                  }`}
                style={currentPageName === "Cart" ? {
                  background: 'rgba(16,185,129,0.1)',
                  borderLeft: '3px solid rgba(16,185,129,0.5)',
                } : {}}
              >
                <CartIcon className="w-5 h-5" />
                Carrinho
              </Link>
            )}

            {/* COMPARTILHAR */}
            <button
              onClick={() => { onClose(); onShareClick(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
            >
              <Share2 className="h-5 w-5" />
              Compartilhar
            </button>

            {/* PERFIL - APENAS EM PÁGINAS DO CATÁLOGO (com parâmetro from=catalog) */}
            {isCatalogPage && isLoggedIn && (
              <Link
                to={createPageUrl("Profile") + "?from=catalog"}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${currentPageName === "Profile"
                  ? "text-emerald-300"
                  : "text-gray-400 hover:text-white hover:translate-x-1"
                  }`}
                style={currentPageName === "Profile" ? {
                  background: 'rgba(16,185,129,0.1)',
                  borderLeft: '3px solid rgba(16,185,129,0.5)',
                } : {}}
              >
                <UserIcon className="w-5 h-5" />
                Perfil
              </Link>
            )}

            {/* PAINEL MOBILE - INVESTIDOR */}
            {isInvestidor && (
              <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 text-emerald-400/70">Minha Conta</p>
                {[
                  { title: "Marketplace de Lotes", pageName: "MarketplaceLotes" },
                  { title: "Carteira Investidor", pageName: "CarteiraInvestidor" },
                  { title: "💰 Carteira Leilões", pageName: "AddFunds" },
                  { title: "Perfil", pageName: "Profile" },
                ].map((item) => (
                  <Link
                    key={item.pageName}
                    to={createPageUrl(item.pageName)}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 ${currentPageName === item.pageName ? "text-emerald-300" : "text-gray-400 hover:text-white"}`}
                    style={currentPageName === item.pageName ? { background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid rgba(16,185,129,0.5)' } : {}}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}

            {/* PAINEL MOBILE - LEILOEIRO/ARREMATANTE */}
            {isLeiloeiro && (
              <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 text-emerald-400/70">Minha Conta</p>
                {[
                  { title: "CRM de Investidores", pageName: "CRMInvestidores" },
                  { title: "Controle de Leilões", pageName: "AuctionControl" },
                  { title: "💰 Minha Carteira", pageName: "AddFunds" },
                  { title: "Perfil", pageName: "Profile" },
                ].map((item) => (
                  <Link
                    key={item.pageName}
                    to={createPageUrl(item.pageName)}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 ${currentPageName === item.pageName ? "text-emerald-300" : "text-gray-400 hover:text-white"}`}
                    style={currentPageName === item.pageName ? { background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid rgba(16,185,129,0.5)' } : {}}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}

            {/* PAINEL MOBILE - SÓ ADMIN */}
            {isAdmin && (
              <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {expandedCategory ? (
                  <>
                    <button
                      onClick={() => setExpandedCategory(null)}
                      className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-purple-300 hover:text-purple-200 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Voltar
                    </button>
                    <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 mt-1 text-gray-500">{expandedCategory}</p>
                    {adminMenuItems.find(c => c.title === expandedCategory)?.items?.map((subItem) => (
                      <Link
                        key={subItem.pageName}
                        to={createPageUrl(subItem.pageName)}
                        onClick={onClose}
                        className="flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-xs uppercase tracking-wider px-4 mb-2 text-purple-400/70">Painel de Controle</p>
                    {adminMenuItems.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => setExpandedCategory(item.title)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                      >
                        <span>{item.title}</span>
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ENTRAR MOBILE */}
            {!isLoggedIn && (
              <button
                onClick={() => { onClose(); onLoginClick(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 mt-4 text-emerald-400 hover:text-emerald-300"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <UserIcon className="h-5 w-5" />
                Entrar na Conta
              </button>
            )}

            {/* SAIR MOBILE */}
            {isLoggedIn && (
              <button
                onClick={() => { onClose(); onLogout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 mt-4 text-red-400/70 hover:text-red-300"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <LogOut className="h-5 w-5" />
                Sair da Conta
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}