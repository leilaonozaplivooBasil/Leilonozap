import React from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Gavel,
  Store,
  Building2,
  Briefcase,
  TrendingUp,
  Hammer,
  Shield,
  Crown,
  ArrowRight,
} from "lucide-react";

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

export default function PainelSelectorCard({ panel, onClick, index = 0 }) {
  const Icon = ICON_MAP[panel.iconName] || ShoppingBag;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(panel)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex items-center gap-3 sm:gap-4 w-full text-left p-3 sm:p-4 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-emerald-500/40 transition-all min-h-[64px]"
    >
      {/* Ícone */}
      <div
        className={`${panel.iconColor} flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shadow-lg`}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="text-sm sm:text-base font-bold text-white truncate">
          {panel.title}
        </div>
        <div className="text-xs sm:text-sm text-gray-400 truncate">
          {panel.description}
        </div>
      </div>

      {/* Seta */}
      <ArrowRight className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
}