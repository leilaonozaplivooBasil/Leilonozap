import React from "react";
import BotaoVoltar from "@/components/common/BotaoVoltar";

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
  // 🎨 FASE 5 — PALETA INSTITUCIONAL ÚNICA (fim do azul, 08/08/2026)
  // Antes cada painel escolhia sua cor (azul, ciano, violeta, roxo) e o sistema
  // parecia oito produtos diferentes. Agora existem só DUAS famílias: verde da
  // marca e marrom da marca. As chaves antigas continuam aceitas — apenas
  // apontam para a família certa — então NENHUMA página precisa ser alterada.
  const VERDE = { ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" };
  const MARROM = { ring: "ring-amber-700/20", bg: "bg-amber-700/10", text: "text-amber-500", border: "border-amber-700/30" };
  const ALERTA = { ring: "ring-red-500/20", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };

  const colorMap = {
    emerald: VERDE,
    green: VERDE,
    blue: VERDE,   // era azul
    cyan: VERDE,   // era ciano
    amber: MARROM,
    violet: MARROM, // era violeta
    purple: MARROM, // era roxo
    red: ALERTA,    // alerta continua vermelho (é significado, não decoração)
  };

  const colors = colorMap[accentColor] || VERDE;

  // ↩️ 08/08/2026: era um botão próprio (link cinza) que checava a barra do painel
  // UMA vez, sem reagir — às vezes aparecia quando não devia. Agora usa o botão
  // voltar único do sistema, que observa a barra e se esconde sozinho: mesma
  // aparência e mesmo comportamento em todo o app.
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-4"><BotaoVoltar texto={backLabel} destino={backTo} /></div>

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