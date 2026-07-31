/**
 * Cores das seções da Visão Geral no modo mobile.
 * Cada seção ganha uma cor própria, pra o mapa em blocos ser lido pela cor
 * antes mesmo da leitura do texto.
 */
const PALETA = [
  { ring: "rgba(16,185,129,0.45)", glow: "rgba(16,185,129,0.16)", texto: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300" },
  { ring: "rgba(96,165,250,0.45)", glow: "rgba(96,165,250,0.16)", texto: "text-blue-300", chip: "bg-blue-500/15 text-blue-300" },
  { ring: "rgba(251,146,60,0.45)", glow: "rgba(251,146,60,0.16)", texto: "text-orange-300", chip: "bg-orange-500/15 text-orange-300" },
  { ring: "rgba(192,132,252,0.45)", glow: "rgba(192,132,252,0.16)", texto: "text-purple-300", chip: "bg-purple-500/15 text-purple-300" },
  { ring: "rgba(250,204,21,0.45)", glow: "rgba(250,204,21,0.16)", texto: "text-yellow-300", chip: "bg-yellow-500/15 text-yellow-300" },
  { ring: "rgba(244,114,182,0.45)", glow: "rgba(244,114,182,0.16)", texto: "text-pink-300", chip: "bg-pink-500/15 text-pink-300" },
  { ring: "rgba(45,212,191,0.45)", glow: "rgba(45,212,191,0.16)", texto: "text-teal-300", chip: "bg-teal-500/15 text-teal-300" },
  { ring: "rgba(148,163,184,0.45)", glow: "rgba(148,163,184,0.16)", texto: "text-slate-300", chip: "bg-slate-500/15 text-slate-300" },
  { ring: "rgba(248,113,113,0.45)", glow: "rgba(248,113,113,0.16)", texto: "text-red-300", chip: "bg-red-500/15 text-red-300" },
];

export const corDaSecao = (indice) => PALETA[indice % PALETA.length];

// Sem acento, e com radical de 4 letras: "cupom" acha "Cupons",
// "comissao" acha "Auditoria de Comissões".
export const normaliza = (t) =>
  (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");