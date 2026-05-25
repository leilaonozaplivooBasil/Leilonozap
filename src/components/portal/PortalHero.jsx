import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function PortalHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Glow de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Bem-vindo ao Ecossistema Leilão NoZap</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
            Escolha o seu{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              caminho
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Um ecossistema completo de oportunidades — compre, venda, invista e
            cresça com a gente. Selecione abaixo a porta de entrada ideal para você.
          </p>
        </motion.div>
      </div>
    </section>
  );
}