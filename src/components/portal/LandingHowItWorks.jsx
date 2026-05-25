import React from "react";

export default function LandingHowItWorks({ title = "Como funciona", steps = [], accentColor = "bg-emerald-600" }) {
  return (
    <section className="bg-gray-900 py-14 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-4xl font-bold text-white text-center mb-10">
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative bg-gray-800/60 border border-gray-700/60 rounded-2xl p-5 sm:p-6"
            >
              <div className={`absolute -top-4 -left-2 w-10 h-10 rounded-xl ${accentColor} text-white font-black flex items-center justify-center shadow-lg text-lg`}>
                {i + 1}
              </div>
              <div className="pt-4">
                <h3 className="font-bold text-white text-base sm:text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}