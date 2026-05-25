import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function LandingBenefits({ title = "Benefícios", items = [], accentColor = "text-emerald-400" }) {
  return (
    <section className="bg-gray-950 py-14 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-4xl font-bold text-white text-center mb-10">
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 sm:p-5"
            >
              <CheckCircle2 className={`w-6 h-6 ${accentColor} flex-shrink-0 mt-0.5`} />
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base mb-1">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}