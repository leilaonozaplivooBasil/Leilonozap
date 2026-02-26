import React from "react";

const DESIGNS = [
  { key: "classic", name: "Clássico", desc: "Padrão premium", preview: "linear-gradient(135deg, #111, #222)" },
  { key: "neon", name: "Neon Glow", desc: "Brilho intenso", preview: "linear-gradient(135deg, #000, #0a0a2e)" },
  { key: "diagonal", name: "Diagonal Bold", desc: "Faixas em ângulo", preview: "linear-gradient(135deg, #1a1a1a, #333)" },
  { key: "spotlight", name: "Spotlight", desc: "Foco no produto", preview: "radial-gradient(circle, #1a1a1a, #000)" },
  { key: "magazine", name: "Magazine", desc: "Estilo editorial", preview: "linear-gradient(180deg, #f5f5f5, #e0e0e0)" },
  { key: "brutalist", name: "Brutalist", desc: "Impacto máximo", preview: "linear-gradient(135deg, #000, #111)" },
  { key: "flash", name: "Flash Sale", desc: "Laranja + roxo diagonal", preview: "linear-gradient(135deg, #f97316, #7c3aed)" },
  { key: "relampago", name: "Relâmpago", desc: "Preço digital escuro", preview: "linear-gradient(180deg, #1a1a1a, #000)" },
  { key: "wave", name: "Wave Color", desc: "Ondas curvas coloridas", preview: "linear-gradient(160deg, #3b82f6, #ec4899)" },
  { key: "grid", name: "Grid Block", desc: "Blocos geométricos", preview: "linear-gradient(135deg, #84cc16, #333)" },
  { key: "tag", name: "Tag Sale", desc: "Etiqueta de preço", preview: "linear-gradient(135deg, #f59e0b, #ef4444)" },
];

export default function PromoDesignSelector({ selectedDesign, onSelect }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Modelo / Design
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
        {DESIGNS.map((d) => {
          const isActive = selectedDesign === d.key;
          return (
            <button
              key={d.key}
              onClick={() => onSelect(d.key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div
                className="h-6 w-full rounded-lg mb-2"
                style={{ background: d.preview, border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <span className={`text-sm font-semibold block ${isActive ? "text-emerald-300" : "text-gray-400"}`}>
                {d.name}
              </span>
              <span className="text-[10px] text-gray-500">{d.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { DESIGNS };