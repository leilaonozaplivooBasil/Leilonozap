import React from "react";
import { getRoleBadge } from "@/lib/roleBadge";
import { getSeloUsuario } from "@/lib/selosCargo";

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
}

/** Cabeçalho de perfil do menu mobile — avatar, nome, e-mail e selo de cargo. */
export default function MobileUserHeader({ user }) {
  const fullName = user?.full_name || "Usuário";
  const photoUrl = user?.profile_photo_url || user?.avatar_url;
  const avatarColor = user?.avatar_color || "linear-gradient(135deg, #10b981, #f59e0b)";
  const badge = getRoleBadge(user);
  const BadgeIcon = badge.icon;
  const seloUrl = getSeloUsuario(user);

  return (
    <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-lg overflow-hidden flex-shrink-0"
        style={{ background: photoUrl ? "transparent" : avatarColor }}
      >
        {photoUrl ? <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" /> : getInitials(fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{fullName}</p>
        {/* cargo/role em texto discreto sob o nome (mesmo padrão do menu desktop) */}
        <p className="flex items-center gap-1 truncate font-slab text-[11px] font-bold uppercase tracking-wide text-amber-300/90">
          <BadgeIcon className="h-3 w-3" />
          {badge.label}
        </p>
        <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
      </div>
      {/* 🏅 SELO OFICIAL do cargo (ex: CEO) */}
      {seloUrl && <img src={seloUrl} alt="" title={badge.label} className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />}
    </div>
  );
}