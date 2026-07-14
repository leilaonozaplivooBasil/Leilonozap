import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LogOut,
  User as UserIcon,
  ShoppingCart as CartIcon,
  Heart,
  ShoppingBag,
  Gavel,
  Store,
  Building2,
  Briefcase,
  TrendingUp,
  Hammer,
  Shield,
  Crown,
  ChevronDown,
} from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";
import { SECTORS } from "@/lib/sectors";

const ICON_MAP = {
  ShoppingBag,
  Gavel,
  Store,
  Building2,
  Briefcase,
  TrendingUp,
  Hammer,
  Shield,
  Crown,
};

const PANEL_ACCENT = {
  loja_virtual: { text: "text-orange-300", icon: "text-orange-400", border: "border-orange-500/30" },
  arrematante: { text: "text-emerald-300", icon: "text-emerald-400", border: "border-emerald-500/30" },
  vendedor: { text: "text-purple-300", icon: "text-purple-400", border: "border-purple-500/30" },
  lojista: { text: "text-fuchsia-300", icon: "text-fuchsia-400", border: "border-fuchsia-500/30" },
  licenciado: { text: "text-blue-300", icon: "text-blue-400", border: "border-blue-500/30" },
  investidor: { text: "text-amber-300", icon: "text-amber-400", border: "border-amber-500/30" },
  leiloeiro: { text: "text-red-300", icon: "text-red-400", border: "border-red-500/30" },
  admin: { text: "text-slate-200", icon: "text-slate-300", border: "border-slate-500/30" },
  super_admin: { text: "text-yellow-300", icon: "text-yellow-400", border: "border-yellow-500/40" },
};

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * 🛡️ NavMobile — Drawer público padrão LEILÃO NOZAP
 *
 * Estrutura vertical:
 *   • Header do usuário (avatar + nome + role badge) [se logado]
 *   • Links públicos: Leilões / Loja / Seja Licenciado
 *   • Carrinho
 *   • Acessar como... (cards de painel — só logado)
 *   • Meu perfil / Favoritos / Sair  [se logado]
 *   • Entrar  [se visitante]
 */
export default function NavMobile({
  isOpen,
  onClose,
  currentPageName,
  currentUser,
  onLoginClick,
  onLogout,
  // props legadas — mantidas para compatibilidade
   
  finalMenuItems,
   
  isLoggedIn,
   
  isAdmin,
   
  isInvestidor,
   
  isLeiloeiro,
   
  isCatalogPage,
   
  adminMenuItems,
   
  onShareClick,
}) {
  const navigate = useNavigate();
  const [openSector, setOpenSector] = React.useState(null);

  if (!isOpen) return null;

  const userLogged = !!(currentUser && currentUser.email);
  const panels = userLogged ? resolveUserPanels(currentUser) : [];
  // Cargo de rede → painel próprio em /painel
  const REDE_CARGOS = ["distribuidor", "loja_fisica", "ponto_retirada", "parceiro", "licenciado"];
  const REDE_TITLE = { distribuidor: "Painel do Distribuidor", loja_fisica: "Painel da Loja Física", ponto_retirada: "Painel do Ponto de Retirada", parceiro: "Painel do Parceiro", licenciado: "Painel do Licenciado" };
  const redeCargo = userLogged && Array.isArray(currentUser.career_levels) ? REDE_CARGOS.find((c) => currentUser.career_levels.includes(c)) : null;
  const fullName = currentUser?.full_name || "Usuário";
  const email = currentUser?.email || "";
  const initials = getInitials(fullName);
  const avatarColor = currentUser?.avatar_color || "linear-gradient(135deg, #10b981, #f59e0b)";
  const photoUrl = currentUser?.profile_photo_url || currentUser?.avatar_url;

  const isActive = (pageName) => {
    if (pageName === "Home" && currentPageName === "Home") return true;
    if (pageName === "Catalog" && (currentPageName === "Catalog" || currentPageName === "CatalogProductDetails")) return true;
    if (pageName === "Licensing" && currentPageName === "Licensing") return true;
    return false;
  };

  const handlePanelClick = (route) => {
    onClose();
    navigate(route);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-[85%] max-w-sm z-[101] animate-in slide-in-from-right duration-300"
        style={{
          background: "rgba(10, 15, 28, 0.85)",
          backdropFilter: "blur(32px) saturate(1.6)",
          WebkitBackdropFilter: "blur(32px) saturate(1.6)",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.4)",
          borderLeft: "1px solid rgba(16,185,129,0.06)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* ===== Header ===== */}
          <div
            className="flex items-center justify-between p-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              aria-label="Fechar menu"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ===== Bloco do usuário (se logado) ===== */}
          {userLogged && (
            <div
              className="flex items-center gap-3 p-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-lg overflow-hidden flex-shrink-0"
                style={{ background: photoUrl ? "transparent" : avatarColor }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{fullName}</p>
                <p className="text-xs text-gray-400 truncate">{email}</p>
              </div>
            </div>
          )}

          {/* ===== Content ===== */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* === SETORES (acordeão — mesma fonte do desktop) === */}
            {SECTORS.map((s) => {
              const open = openSector === s.key;
              return (
                <div key={s.key}>
                  <button
                    onClick={() => setOpenSector(open ? null : s.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 ${
                      open ? "text-emerald-300" : "text-gray-300 hover:text-white"
                    }`}
                    style={open ? { background: "rgba(16,185,129,0.1)", borderLeft: "3px solid rgba(16,185,129,0.5)" } : {}}
                  >
                    <span>{s.emoji}</span>
                    <span className="flex-1 text-left">{s.title}</span>
                    {s.live && (
                      <span className="relative flex h-2 w-2" aria-hidden>
                        <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="pl-4 pb-1 space-y-0.5">
                      {s.items.map((it) => (
                        <Link
                          key={it.title}
                          to={createPageUrl(it.page) + (it.query || "")}
                          onClick={onClose}
                          className="block px-4 py-2.5 rounded-xl hover:bg-white/5"
                        >
                          <p className="text-sm font-semibold text-gray-200">{it.title}</p>
                          <p className="text-[11px] text-gray-500 leading-snug">{it.desc}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* === CARRINHO === */}
            <Link
              to={createPageUrl("Cart")}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${
                currentPageName === "Cart"
                  ? "text-emerald-300"
                  : "text-gray-400 hover:text-white hover:translate-x-1"
              }`}
              style={
                currentPageName === "Cart"
                  ? {
                      background: "rgba(16,185,129,0.1)",
                      borderLeft: "3px solid rgba(16,185,129,0.5)",
                    }
                  : {}
              }
            >
              <CartIcon className="w-5 h-5" />
              Carrinho
            </Link>

            {/* === PAINEL PRÓPRIO (cargo de rede) === */}
            {userLogged && redeCargo && (
              <div className="pt-4 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => handlePanelClick("/painel")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-500/50 text-left transition-all duration-200 hover:translate-x-1"
                  style={{ background: "rgba(16,185,129,0.10)" }}
                >
                  <Building2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-green-300 truncate">{REDE_TITLE[redeCargo]}</p>
                    <p className="text-[11px] text-gray-400 truncate">Financeiro, loja, rede, cadastros e links</p>
                  </div>
                </button>
              </div>
            )}

            {/* === ACESSAR COMO... === */}
            {userLogged && panels.length > 0 && (
              <div
                className="pt-4 mt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="font-bold text-[10px] uppercase tracking-wider px-4 mb-3 text-gray-500">
                  {redeCargo ? "Também acessar como..." : "Acessar como..."}
                </p>
                <div className="space-y-2">
                  {panels.map((panel) => {
                    const accent = PANEL_ACCENT[panel.key] || PANEL_ACCENT.arrematante;
                    const Icon = ICON_MAP[panel.iconName] || UserIcon;
                    let subtitle = panel.description;
                    if (panel.key === "lojista" && currentUser.store_name) {
                      subtitle = `Loja: ${currentUser.store_name}`;
                    }
                    return (
                      <button
                        key={panel.key}
                        onClick={() => handlePanelClick(panel.route)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border ${accent.border} text-left transition-all duration-200 hover:translate-x-1`}
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <Icon className={`w-5 h-5 ${accent.icon} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${accent.text} truncate`}>{panel.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === AÇÕES PESSOAIS === */}
            {userLogged && (
              <div
                className="pt-4 mt-3 space-y-1"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Link
                  to={createPageUrl("Profile")}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                >
                  <UserIcon className="w-5 h-5" />
                  Meu perfil
                </Link>
                <Link
                  to={createPageUrl("Home") + "?favorites=1"}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 text-gray-400 hover:text-white"
                >
                  <Heart className="w-5 h-5" />
                  Favoritos
                </Link>
              </div>
            )}

            {/* === ENTRAR === */}
            {!userLogged && (
              <button
                onClick={() => {
                  onClose();
                  onLoginClick();
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 mt-6 text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))",
                  border: "1px solid rgba(16,185,129,0.3)",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.15)",
                }}
              >
                <UserIcon className="h-5 w-5" />
                Entrar na Conta
              </button>
            )}

            {/* === SAIR === */}
            {userLogged && (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:translate-x-1 mt-4 text-red-400/80 hover:text-red-300"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
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