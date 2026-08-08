import React from "react";
import { useNavigate } from "react-router-dom";
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
  Truck,
  Map as MapIcon,
} from "lucide-react";
import AtalhosGrid from "@/components/nav/AtalhosGrid";
import MinhaContaGrid from "@/components/nav/MinhaContaGrid";
// 🏷️ Selo e cargos de rede vêm da fonte ÚNICA compartilhada com o menu mobile —
// era a duplicação que fazia a Loja Física aparecer como "LICENCIADO" aqui.
import { getRedeCargo, REDE_META, getRoleBadge } from "@/lib/roleBadge";
// 🏅 Selo oficial de quem é o usuário (Super Admin, Distribuidor, CEO…)
import { getSeloUsuario } from "@/lib/selosCargo";

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

  // 🛒 Mesmo contador do menu mobile (lido do mesmo localStorage do Layout)
  const cartCount = React.useMemo(() => {
    if (!menuOpen) return 0;
    try {
      const c = JSON.parse(localStorage.getItem("catalogCart") || "[]");
      return c.reduce((s, i) => s + (i.quantity || 1), 0);
    } catch { return 0; }
  }, [menuOpen]);

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

  // Selo do cargo — prioridade Admin > cargo de rede real > role genérica
  const roleKey = effectiveUser.role || "user";
  const badge = getRoleBadge(effectiveUser);
  const BadgeIcon = badge.icon;
  const seloUrl = getSeloUsuario(effectiveUser);

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
            {/* cargo/role em texto discreto sob o nome (a plaquinha amarela saiu) */}
            <p className="flex items-center gap-1 text-[11px] font-slab font-bold uppercase tracking-wide text-amber-300/90 truncate">
              <BadgeIcon className="w-3 h-3" />
              {badge.label}
            </p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
          {/* 🏅 SELO OFICIAL do cargo (ex: CEO) — identidade visual no lugar do chip */}
          {seloUrl && (
            <img
              src={seloUrl}
              alt=""
              title={badge.label}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          )}
        </div>

        {/* ===== Visão Geral (admin) — mini visão canvas.
             Vem ANTES dos atalhos: é o acesso de comando de quem tem painel. ===== */}
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

        {/* ===== Painel da pessoa (destaque) — o nome vem do CARGO dela:
             "Painel do Distribuidor", "Painel do Influenciador", "Painel do
             Usuário"… Substitui o azulejo "Alavancagem", que saiu da grade. ===== */}
        <div className="p-3 pb-0">
          <button
            onClick={() => { setMenuOpen(false); navigate(redeMeta ? "/painel" : "/Licensing"); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-green-500/50 bg-green-500/10 hover:bg-green-500/15 transition-all duration-200 text-left"
          >
            <RedeIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-slab text-sm font-extrabold uppercase tracking-wide text-green-300 truncate">
                Painel do {badge.label}
              </p>
              <p className="text-[11px] text-gray-400 truncate">Financeiro, loja, rede, cadastros e links</p>
            </div>
          </button>
        </div>

        {/* ===== Atalhos — MESMA grade do menu mobile (fonte única: @/lib/menuAtalhos) ===== */}
        <div className="p-3 pb-0">
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Atalhos</p>
          <AtalhosGrid user={effectiveUser} cartCount={cartCount} onNavigate={() => setMenuOpen(false)} colunas={4} />
        </div>

        {/* ===== Minha Conta — mesmos azulejos dos Atalhos (Favoritos migrou pra grade) ===== */}
        <div className="p-3 pb-0">
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Minha Conta</p>
          <MinhaContaGrid onNavigate={() => setMenuOpen(false)} colunas={4} />
        </div>

        <DropdownMenuSeparator className="bg-white/5 mt-3 mb-0" />

        {/* ===== Sair — texto separado, nunca azulejo ===== */}
        <div className="p-2">
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