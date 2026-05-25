import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function LandingHero({
  icon: Icon,
  iconColor = "bg-emerald-600",
  badge,
  title,
  subtitle,
  description,
}) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 pt-10 pb-16 sm:pt-14 sm:pb-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Voltar */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Portal
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${iconColor} mb-6 shadow-2xl`}>
            <Icon className="w-10 h-10 text-white" />
          </div>

          {badge && (
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300 uppercase tracking-wider">
              {badge}
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-3 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg sm:text-2xl text-gray-300 font-medium mb-5">
              {subtitle}
            </p>
          )}
          <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
        </motion.div>
      </div>
    </section>
  );
}