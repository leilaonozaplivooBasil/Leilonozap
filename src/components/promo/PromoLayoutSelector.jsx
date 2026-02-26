import React from "react";
import { Square, RectangleVertical, RectangleHorizontal, Minimize2, LayoutGrid } from "lucide-react";

const LAYOUTS = [
  { key: "square", name: "Quadrado", icon: Square, ratio: "1/1.15", desc: "Feed / Catálogo" },
  { key: "story", name: "Story", icon: RectangleVertical, ratio: "9/16", desc: "Stories / Reels" },
  { key: "landscape", name: "Paisagem", icon: RectangleHorizontal, ratio: "16/9", desc: "WhatsApp / Banner" },
  { key: "minimal", name: "Minimalista", icon: Minimize2, ratio: "1/1", desc: "Limpo / Elegante" },
  { key: "split", name: "Dividido", icon: LayoutGrid, ratio: "1/1", desc: "Foto + Info" },
];

export default function PromoLayoutSelector({ selectedLayout, onSelect }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Formato do Banner
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
        {LAYOUTS.map((layout) => {
          const Icon = layout.icon;
          const isActive = selectedLayout === layout.key;
          return (
            <button
              key={layout.key}
              onClick={() => onSelect(layout.key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-gray-500"}`} />
                <span className={`text-sm font-semibold ${isActive ? "text-emerald-300" : "text-gray-400"}`}>
                  {layout.name}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">{layout.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { LAYOUTS };