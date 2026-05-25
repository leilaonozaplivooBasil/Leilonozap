import React from "react";
import { LogIn } from "lucide-react";

export default function LandingCTA({
  title = "Pronto para começar?",
  description = "",
  primaryLabel = "Entrar",
  secondaryLabel = "Cadastrar",
  primaryIcon: PrimaryIcon = LogIn,
  secondaryIcon: SecondaryIcon = null,
  primaryColor = "bg-emerald-600 hover:bg-emerald-500",
  onPrimaryClick,
  onSecondaryClick,
}) {
  return (
    <section className="bg-gray-950 py-14 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3">
          {title}
        </h2>
        {description && (
          <p className="text-gray-400 text-base sm:text-lg mb-8 leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            type="button"
            onClick={onPrimaryClick}
            className={`min-h-[52px] inline-flex items-center justify-center gap-2 px-7 py-3.5 ${primaryColor} text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02]`}
          >
            <PrimaryIcon className="w-5 h-5" />
            {primaryLabel}
          </button>

          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="min-h-[52px] inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
            >
              {SecondaryIcon && <SecondaryIcon className="w-5 h-5" />}
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}