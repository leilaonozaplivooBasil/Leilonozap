import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User as UserIcon,
  LogOut,
  ChevronDown,
  ShoppingBag,
  Gavel,
  Store,
  Building2,
  Briefcase,
  TrendingUp,
  Hammer,
  Shield,
  Crown,
  Truck,
  MapPin,
  Wallet as WalletIcon,
  Map as MapIcon,
} from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";

// Cargos de rede que têm Painel próprio e completo (/painel)
const REDE_CARGOS = ["distribuidor", "loja_fisica", "ponto_retirada", "parceiro", "licenciado"];
const REDE_META = {
  distribuidor: { label: "DISTRIBUIDOR", title: "Painel do Distribuidor", icon: Truck },
  loja_fisica: { label: "LOJA FÍSICA", title: "Painel da Loja Física", icon: Building2 },
  ponto_retirada: { label: "PONTO DE RETIRADA", title: "Painel do Ponto de Retirada", icon: MapPin },
  parceiro: { label: "PARCEIRO", title: "Painel do Parceiro", icon: Store },
  licenciado: { label: "LICENCIADO", title: "Painel do Licenciado", icon: Briefcase },
};
function getRedeCargo(user) {
  const levels = Array.isArray(user?.career_levels) ? user.career_levels : [];
  // respeita a ordem de prioridade (distribuidor primeiro)
  return REDE_CARGOS.find((c) => levels.includes(c)) || null;
}

// Mapa de ícones (string → componente) — evita import dinâmico
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

// Cor accent por painel (para borda/texto destacado dos cards)
const PANEL_ACCENT = {
  loja_virtual: { text: "text-orange-300", border: "border-orange-500/40", bg: "hover:bg-orange-500/5", icon: "text-orange-400" },
  arrematante: { text: "text-emerald-300", border: "border-emerald-500/40", bg: "hover:bg-emerald-500/5", icon: "text-emerald-400" },
  vendedor: { text: "text-purple-300", border: "border-purple-500/40", bg: "hover:bg-purple-500/5", icon: "text-purple-400" },
  lojista: { text: "text-fuchsia-300", border: "border-fuchsia-500/40", bg: "hover:bg-fuchsia-500/5", icon: "text-fuchsia-400" },
  licenciado: { text: "text-blue-300", border: "border-blue-500/40", bg: "hover:bg-blue-500/5", icon: "text-blue-400" },
  investidor: { text: "text-amber-300", border: "border-amber-500/40", bg: "hover:bg-amber-500/5", icon: "text-amber-400" },
  leiloeiro: { text: "text-red-300", border: "border-red-500/40", bg: "hover:bg-red-500/5", icon: "text-red-400" },
  admin: { text: "text-slate-200", border: "border-slate-500/40", bg: "hover:bg-slate-500/10", icon: "text-slate-300" },
  super_admin: { text: "text-yellow-300", border: "border-yellow-500/50", bg: "hover:bg-yellow-500/5", icon: "text-yellow-400" },
};

// Badge da role principal — pill com gradiente + brilho (acabamento premium)
const ROLE_BADGE = {
  super_admin: { label: "SUPER ADMIN", grad: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500", text: "text-black", glow: "shadow-[0_2px_10px_rgba(245,158,11,0.55)]", icon: Crown },
  admin: { label: "ADMIN", grad: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500", text: "text-black", glow: "shadow-[0_2px_10px_rgba(245,158,11,0.55)]", icon: Crown },
  licensee: { label: "LICENCIADO", grad: "bg-gradient-to-r from-blue-400 to-indigo-500", text: "text-white", glow: "shadow-[0_2px_10px_rgba(59,130,246,0.45)]", icon: Briefcase },
  investidor: { label: "INVESTIDOR", grad: "bg-gradient-to-r from-amber-300 to-orange-500", text: "text-black", glow: "shadow-[0_2px_10px_rgba(245,158,11,0.45)]", icon: TrendingUp },
  leiloeiro: { label: "LEILOEIRO", grad: "bg-gradient-to-r from-red-400 to-rose-600", text: "text-white", glow: "shadow-[0_2px_10px_rgba(239,68,68,0.45)]", icon: Hammer },
  user: { label: "CLIENTE", grad: "bg-gradient-to-r from-emerald-400 to-green-600", text: "text-white", glow: "shadow-[0_2px_10px_rgba(16,185,129,0.45)]", icon: UserIcon },
};

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";
}

// temaClaro: usado só na Recepção (navbar branca) — garante contraste do botão
// "Entrar" e do nome do usuário. Sem a prop, o comportamento é o de sempre.
export default function UserAvatarMenu({ currentUser, temaClaro = false, onLoginClick, onLogout }) {
  const navigate = useNavigate();

  // 🛡️ FASE 4.6 — Anti-flash do botão "Entrar":
  // Na primeira render o Layout ainda pode estar hidratando currentUser do
  // localStorage. Se o localStorage já tem um usuário válido, usamos ele
  // como fallback IMEDIATO — evita o pisca de "Entrar" antes do avatar aparecer.
  const effectiveUser = React.useMemo(() => {
    if (currentUser && currentUser.email) return currentUser;
    try {
      const cached = localStorage.getItem("currentUser");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.email) return parsed;
      }
    } catch { /* localStorage indisponível — segue como visitante */ }
    return null;
  }, [currentUser]);

  const [menuOpen, setMenuOpen] = React.useState(false);

  // ===== VISITANTE — não logado =====
  if (!effectiveUser || !effectiveUser.email) {
    return (
      <Button
        onClick={onLoginClick}
        className={`flex items-center gap-2 font-medium text-white border-0 transition-all duration-300 hover:scale-105 ${temaClaro ? 'rounded-full text-[13px]' : 'text-sm font-semibold rounded-xl'}`}
        style={temaClaro ? {
        background: "#1B7A48",
        border: "1px solid #1B7A48",
        boxShadow: "none",
        } : {
          background: "linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))",
          border: "1px solid rgba(16,185,129,0.3)",
          boxShadow: "0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <UserIcon className="h-4 w-4" />
        Entrar
      </Button>
    );
  }

  // ===== LOGADO =====
  // 🛡️ FASE 4.6 — Usa effectiveUser (currentUser OU fallback do localStorage)
  const panels = resolveUserPanels(effectiveUser);
  const fullName = effectiveUser.full_name || effectiveUser.display_first_name || "Usuário";
  const email = effectiveUser.email;
  const initials = getInitials(fullName);
  const avatarColor = effectiveUser.avatar_color || "linear-gradient(135deg, #10b981, #f59e0b)";
  const photoUrl = effectiveUser.profile_photo_url || effectiveUser.avatar_url;

  // Funcionário de PDV → atalho direto pro PDV
  const isPdvOperator = effectiveUser.is_pdv_operator === true;

  // Cargo de rede (tem painel próprio /painel)
  const redeCargo = getRedeCargo(effectiveUser);
  const redeMeta = redeCargo ? REDE_META[redeCargo] : null;
  const RedeIcon = redeMeta?.icon || Truck;

  // Badge da role principal — cargo de rede tem prioridade visual sobre "CLIENTE"
  const roleKey = effectiveUser.role || "user";
  const badge = (redeMeta && roleKey === "user")
    ? { label: redeMeta.label, grad: "bg-gradient-to-r from-emerald-400 to-green-600", text: "text-white", glow: "shadow-[0_2px_10px_rgba(16,185,129,0.45)]", icon: redeMeta.icon }
    : (ROLE_BADGE[roleKey] || ROLE_BADGE.user);
  const BadgeIcon = badge.icon;

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all duration-300 ${temaClaro ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
          style={{ border: temaClaro ? "none" : "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md overflow-hidden flex-shrink-0"
            style={{ background: photoUrl ? "transparent" : avatarColor }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {/* Nome (truncado, só desktop largo) */}
          <span className={`hidden lg:inline font-slab font-normal max-w-[120px] truncate ${temaClaro ? 'text-[13px] text-nz-tinta' : 'text-sm text-white'}`}>
            {fullName.split(" ")[0]} {fullName.split(" ")[1] || ""}
          </span>
          <ChevronDown className={`w-4 h-4 ${temaClaro ? 'text-nz-tinta-fraca' : 'text-gray-400'}`} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[320px] text-white border-0 p-0 overflow-hidden"
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(24px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* ===== Header — perfil ===== */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-slab font-bold uppercase tracking-wide ring-1 ring-white/25 ${badge.grad} ${badge.text} ${badge.glow} flex-shrink-0`}
          >
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </div>
        </div>

        {/* ===== Visão Geral (admin) — mini visão canvas ===== */}
        {["admin", "super_admin"].includes(roleKey) && (
          <div className="p-3 pb-0">
            <button
              onClick={() => { setMenuOpen(false); window.dispatchEvent(new CustomEvent("openMiniCanvas")); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/15 hover:to-teal-500/15 transition-all duration-200 text-left group"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-300 flex-shrink-0 group-hover:scale-110 transition-transform">
                <MapIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-slab text-sm font-extrabold uppercase tracking-wide text-emerald-300 truncate">Visão Geral</p>
                <p className="text-[11px] text-gray-400 truncate">Mapa de todo o painel — abra num clique</p>
              </div>
              <ChevronDown className="w-4 h-4 text-emerald-400/60 flex-shrink-0 rotate-[-90deg] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* ===== Funcionário de PDV (destaque) ===== */}
        {isPdvOperator && (
          <div className="p-3 pb-0">
            <button
              onClick={() => navigate("/painel/pdv")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-green-500/50 bg-green-500/10 hover:bg-green-500/15 transition-all duration-200 text-left"
            >
              <ShoppingBag className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-slab text-sm font-extrabold uppercase tracking-wide text-green-300 truncate">PDV — Tirar Pedido</p>
                <p className="text-[11px] text-gray-400 truncate">Abrir o caixa e registrar vendas</p>
              </div>
            </button>
          </div>
        )}

        {/* ===== Painel próprio do cargo de rede (destaque) ===== */}
        {redeMeta && (
          <div className="p-3 pb-0">
            <button
              onClick={() => navigate("/painel")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-green-500/50 bg-green-500/10 hover:bg-green-500/15 transition-all duration-200 text-left"
            >
              <RedeIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-slab text-sm font-extrabold uppercase tracking-wide text-green-300 truncate">{redeMeta.title}</p>
                <p className="text-[11px] text-gray-400 truncate">Financeiro, loja, rede, cadastros e links</p>
              </div>
            </button>
          </div>
        )}

        <DropdownMenuSeparator className="bg-white/5 my-0" />

        {/* ===== Ações pessoais ===== */}
        <div className="p-2">
          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent('openWallet'))}
            className="cursor-pointer font-slab text-xs font-bold uppercase tracking-wide text-emerald-300 hover:bg-emerald-500/10 focus:bg-emerald-500/10 hover:text-emerald-200 rounded-md gap-3 px-3 py-2"
          >
            <WalletIcon className="w-4 h-4" />
            Carteira
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(createPageUrl("Profile"))}
            className="cursor-pointer font-slab text-xs font-bold uppercase tracking-wide text-gray-300 hover:bg-white/5 focus:bg-white/5 hover:text-white rounded-md gap-3 px-3 py-2"
          >
            <UserIcon className="w-4 h-4" />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer font-slab text-xs font-bold uppercase tracking-wide text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 hover:text-red-300 rounded-md gap-3 px-3 py-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}