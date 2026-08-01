// 📣 PONTO 69 — MODO CHAMADA (PRÉ-LANÇAMENTO)
// Regra ÚNICA de "leilão visível mas ainda fechado para lances".
// Usada pelo card, pela sala, pelo painel admin e pelo servidor (submitAtomicBid).
// A liberação é por comparação de data em tempo real — não existe job que possa atrasar.

/** Instante (ms) da abertura dos lances, ou null se não houver data válida. */
export function instanteAbertura(auction) {
  const raw = auction?.data_abertura_lances;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

/** true = leilão em chamada (visível, lances BLOQUEADOS). */
export function emChamada(auction, agora = Date.now()) {
  if (!auction?.modo_chamada) return false;
  const abertura = instanteAbertura(auction);
  if (abertura === null) return false; // sem data válida nunca bloqueia
  return agora < abertura;
}

/** Milissegundos que faltam para abrir (0 quando já abriu). */
export function msAteAbertura(auction, agora = Date.now()) {
  const abertura = instanteAbertura(auction);
  if (abertura === null) return 0;
  return Math.max(0, abertura - agora);
}

/** Contagem legível: "3 dias", "12h 40min" ou "HH:MM:SS" na última hora. */
export function formatarContagem(ms) {
  const s = Math.floor(ms / 1000);
  if (s <= 0) return '';
  const dias = Math.floor(s / 86400);
  if (dias > 0) return `${dias} dia${dias > 1 ? 's' : ''}`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Estado do leilão para exibição no painel admin. */
export function estadoLeilao(auction, agora = Date.now()) {
  if (emChamada(auction, agora)) return 'chamada';
  if (auction?.status === 'active') return 'ao_vivo';
  return 'encerrado';
}