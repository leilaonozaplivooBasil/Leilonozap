import React from "react";

const DESIGNS = [
  { key: "classic", name: "Clássico", desc: "Escuro com gradiente premium e glow", preview: "linear-gradient(145deg, #1a0000, #0f0f0f, #0a0a0a)" },
  { key: "neon", name: "Neon Cyberpunk", desc: "Bordas brilhantes, moldura futurista", preview: "linear-gradient(160deg, #030014, #0a0025, #10002b)" },
  { key: "diagonal", name: "Diagonal Bold", desc: "Faixa colorida gigante, produto em destaque", preview: "linear-gradient(135deg, #ef4444, #0a0a0a 60%)" },
  { key: "spotlight", name: "Vitrine Premium", desc: "Holofote no produto, estilo loja", preview: "radial-gradient(circle at 50% 35%, #1a1a1a, #000)" },
  { key: "magazine", name: "Editorial", desc: "Fundo branco, tipografia de revista", preview: "linear-gradient(180deg, #fafafa, #e8e8e8)" },
  { key: "brutalist", name: "Brutalist", desc: "Preto total, bordas grossas, impacto", preview: "#000" },
  { key: "relampago", name: "Relâmpago", desc: "Preço estilo LED neon ciano, raio ⚡", preview: "linear-gradient(180deg, #0f0f0f, #000)" },
  { key: "wave", name: "Wave Color", desc: "Ondas SVG suaves, círculos flutuantes", preview: "linear-gradient(160deg, #0f172a, #1e293b)" },
  { key: "grid", name: "Grid Block", desc: "Blocos geométricos verde-limão assimétricos", preview: "linear-gradient(135deg, #84cc16 35%, #111 35%)" },
  { key: "tag", name: "Tag Sale", desc: "Fundo amarelo, etiqueta pendurada de desconto", preview: "linear-gradient(160deg, #fefce8, #fde047)" },
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