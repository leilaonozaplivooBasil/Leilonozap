import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * 🎨 PortalPageHeader — Cabeçalho padrão para os 9 painéis do Portal.
 *
 * Uso opcional: cada painel decide se adota. Não quebra nada que já existe.
 *
 * Props:
 * @param {React.ComponentType} icon - Ícone Lucide (ex: Crown, Trophy)
 * @param {string} title - Título principal
 * @param {string} subtitle - Subtítulo / descrição curta
 * @param {string} accentColor - Tailwind color base (ex: "emerald", "violet", "amber")
 * @param {string} backTo - Rota de "voltar" (default: "/" = Portal)
 * @param {string} backLabel - Texto do botão voltar (default: "Voltar ao Portal")
 * @param {React.ReactNode} actions - Ações extras (botões) à direita
 * @param {React.ReactNode} badge - Badge opcional (ex: "ADMIN", "VIP")
 */
export default function PortalPageHeader({
  icon: Icon,
  title,
  subtitle,
  accentColor = "emerald",
  backTo = "/",
  backLabel = "Voltar ao Portal",
  actions = null,
  badge = null,
}) {
  const navigate = useNavigate();

  // Mapa de cores (literal — Tailwind precisa encontrar as classes no source)
  const colorMap = {
    emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    violet:  { ring: "ring-violet-500/20",  bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/30" },
    amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30" },
    blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30" },
    green:   { ring: "ring-green-500/20",   bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/30" },
    purple:  { ring: "ring-purple-500/20",  bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/30" },
    red:     { ring: "ring-red-500/20",     bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30" },
    cyan:    { ring: "ring-cyan-500/20",    bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/30" },
  };

  const colors = colorMap[accentColor] || colorMap.emerald;

  return (
    <div className="mb-6 sm:mb-8">
      {/* Botão Voltar — sempre primeiro no fluxo de leitura */}
      <button
        onClick={() => navigate(backTo)}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4 min-h-[44px] -ml-1 px-2 rounded-md hover:bg-white/5"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backLabel}</span>
      </button>

      {/* Header principal */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={`shrink-0 p-3 rounded-2xl ${colors.bg} ${colors.border} border ring-4 ${colors.ring}`}>
              <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${colors.text}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Ações à direita (opcional) */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}