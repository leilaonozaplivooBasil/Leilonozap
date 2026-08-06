// 🏷️ FONTE ÚNICA do selo de cargo (desktop + mobile).
// Antes cada menu montava o selo por conta própria e divergia: a Sophia (Loja
// Física) aparecia como "LICENCIADO" no dropdown e sem selo nenhum no mobile.
// Regra de prioridade: Admin/Super Admin > cargo de rede real > role genérica.
import {
  Crown,
  Briefcase,
  TrendingUp,
  Hammer,
  User as UserIcon,
  Truck,
  Building2,
  MapPin,
  Store,
} from "lucide-react";

// Cargos de rede que têm painel próprio em /painel (ordem = prioridade)
export const REDE_CARGOS = ["distribuidor", "loja_fisica", "ponto_retirada", "parceiro", "licenciado"];

export const REDE_META = {
  distribuidor: { label: "DISTRIBUIDOR", title: "Painel do Distribuidor", icon: Truck },
  loja_fisica: { label: "LOJA FÍSICA", title: "Painel da Loja Física", icon: Building2 },
  ponto_retirada: { label: "PONTO DE RETIRADA", title: "Painel do Ponto de Retirada", icon: MapPin },
  parceiro: { label: "PARCEIRO", title: "Painel do Parceiro", icon: Store },
  licenciado: { label: "LICENCIADO", title: "Painel do Licenciado", icon: Briefcase },
};

const OURO = { grad: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500", text: "text-black", glow: "shadow-[0_2px_10px_rgba(245,158,11,0.55)]" };
const VERDE = { grad: "bg-gradient-to-r from-emerald-400 to-green-600", text: "text-white", glow: "shadow-[0_2px_10px_rgba(16,185,129,0.45)]" };

const ROLE_BADGE = {
  super_admin: { label: "SUPER ADMIN", ...OURO, icon: Crown },
  admin: { label: "ADMIN", ...OURO, icon: Crown },
  licensee: { label: "LICENCIADO", grad: "bg-gradient-to-r from-blue-400 to-indigo-500", text: "text-white", glow: "shadow-[0_2px_10px_rgba(59,130,246,0.45)]", icon: Briefcase },
  investidor: { label: "INVESTIDOR", grad: "bg-gradient-to-r from-amber-300 to-orange-500", text: "text-black", glow: "shadow-[0_2px_10px_rgba(245,158,11,0.45)]", icon: TrendingUp },
  leiloeiro: { label: "LEILOEIRO", grad: "bg-gradient-to-r from-red-400 to-rose-600", text: "text-white", glow: "shadow-[0_2px_10px_rgba(239,68,68,0.45)]", icon: Hammer },
  user: { label: "CLIENTE", ...VERDE, icon: UserIcon },
};

/** Cargo de rede do usuário (ou null) */
export function getRedeCargo(user) {
  const levels = Array.isArray(user?.career_levels) ? user.career_levels : [];
  return REDE_CARGOS.find((c) => levels.includes(c)) || null;
}

/** Selo a exibir para o usuário: { label, grad, text, glow, icon } */
export function getRoleBadge(user) {
  const roleKey = user?.role || "user";
  if (roleKey === "admin" || roleKey === "super_admin") return ROLE_BADGE[roleKey];
  const rede = getRedeCargo(user);
  if (rede) return { label: REDE_META[rede].label, ...VERDE, icon: REDE_META[rede].icon };
  // 🛡️ BLINDAGEM (05/08/2026): o campo antigo `role='licensee'` sobrou em contas que
  // NÃO têm cargo de licenciado na árvore (vendedor, influenciador, usuário) e fazia
  // o selo "LICENCIADO" aparecer indevidamente (caso TTT). O selo agora só sai do
  // cargo real; sem cargo de rede, o `licensee` legado não vale como cargo.
  if (roleKey === "licensee") return ROLE_BADGE.user;
  return ROLE_BADGE[roleKey] || ROLE_BADGE.user;
}