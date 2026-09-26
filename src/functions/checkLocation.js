// 📍 checkLocation — NUNCA existiu na Vercel (26/09/2026).
//
// A Home chamava /api/functions/checkLocation 15 s depois de abrir, recebia
// 404 e gravava um erro "rota de servidor não existe" — 984 vezes em 24 h,
// sem nenhum efeito para o cliente (a região só filtra leilões com
// allowed_regions, e hoje nenhum leilão usa isso). Até existir um serviço de
// localização de verdade, a resposta é "sem região", sem bater no servidor.
export async function checkLocation() {
  return { location: null };
}
