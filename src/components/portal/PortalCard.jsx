import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const BADGE_STYLES = {
  imediato: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  analise: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  convite: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

export default function PortalCard({
  title,
  description,
  icon: Icon,
  gradient,
  iconColor,
  badge,
  badgeType = "imediato",
  route,
}) {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      onClick={() => navigate(route)}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative w-full text-left bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-6 sm:p-7 overflow-hidden hover:border-gray-600 transition-colors min-h-[280px] flex flex-col"
    >
      {/* Glow no hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />

      <div className="relative flex-1 flex flex-col">
        {/* Header: ícone + badge */}
        <div className="flex items-start justify-between mb-5">
          <div className={`w-14 h-14 rounded-xl ${iconColor} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${BADGE_STYLES[badgeType]}`}>
            {badge}
          </span>
        </div>

        {/* Conteúdo */}
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed flex-1">
          {description}
        </p>

        {/* CTA */}
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
          <span>Acessar</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.button>
  );
}