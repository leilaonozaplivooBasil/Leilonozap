// 🎯 getRecommendations — NUNCA existiu na Vercel (26/09/2026).
//
// A seção "Recomendados" chamava /api/functions/getRecommendations, recebia
// 404 e gravava um erro "rota de servidor não existe" — 367 vezes em 24 h.
// A seção já lida com resposta vazia (não renderiza). Até existir um motor
// de recomendação de verdade, devolve vazio sem bater no servidor.
export async function getRecommendations() {
  return { recommendations: [], stats: null };
}
