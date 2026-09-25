// 🏆 PROVAS SOCIAIS DA VITRINE — as regras puras (24/09/2026).
//
// Dono: "carrossel de alerta com lances recentes acima da lista de leilões
// ativos" · "provas sociais de arrematados + ranking dos maiores arrematadores".
// Régua combinada: primeiro nome + inicial, equipe interna fora, ranking por
// QUANTIDADE (sem R$).
//
// Os dados vêm de três views (migração provas_sociais_da_vitrine) com o nome
// JÁ MASCARADO no banco — vw_lances_publicos, vw_arremates_publicos e
// vw_ranking_arrematadores. Aqui só o que a tela decide: o "há X", a ordem, o
// que entra no ticker e a medalha do ranking. Sem React, sem rede.

/** Mesma máscara da função SQL nome_publico — pra tela nunca depender de outra. */
const PARTICULAS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'di', 'del', 'della', 'van', 'von', 'la', 'le']);
export function nomePublico(nome) {
  const partes = String(nome ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!partes.length) return 'Participante';
  const primeiro = partes[0].toLowerCase().replace(/(^|[-\s])(\p{L})/gu, (m, sep, l) => sep + l.toUpperCase());
  // a inicial é do SOBRENOME: "Rosenberg de Oliveira" → "Rosenberg O.", não "D."
  const sobrenome = partes.slice(1).find((p) => !PARTICULAS.has(p.toLowerCase()));
  return sobrenome ? `${primeiro} ${sobrenome[0].toUpperCase()}.` : primeiro;
}

const MIN = 60e3; const HORA = 60 * MIN; const DIA = 24 * HORA;

/** "há 3 min" · "há 2 h" · "há 5 dias" — ou '' sem data confiável (nunca "há 57 anos"). */
export function haQuantoTempo(quando, agora = Date.now()) {
  const t = quando ? new Date(quando).getTime() : NaN;
  if (!Number.isFinite(t) || t < Date.UTC(2000, 0, 1)) return '';
  const d = Math.max(0, Number(agora) - t);
  if (d < MIN) return 'agora';
  if (d < HORA) return `há ${Math.floor(d / MIN)} min`;
  if (d < DIA) return `há ${Math.floor(d / HORA)} h`;
  const dias = Math.floor(d / DIA);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

const fmtBR = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** As linhas do ticker: mais recente primeiro, no máximo `limite`, sem lixo. */
export function linhasDoTicker(lances = [], { limite = 10, agora = Date.now() } = {}) {
  return (Array.isArray(lances) ? lances : [])
    .filter((l) => l && l.auction_id && Number(l.valor) > 0)
    .sort((a, b) => new Date(b.quando || 0) - new Date(a.quando || 0))
    .slice(0, limite)
    .map((l) => ({
      id: l.id, auctionId: l.auction_id,
      texto: `${l.participante || 'Participante'} deu R$ ${fmtBR(l.valor)} em ${l.titulo || 'um leilão'}`,
      quando: haQuantoTempo(l.quando, agora),
    }));
}

/** Os arremates recentes, prontos pra tela. */
export function linhasDeArremates(arremates = [], { limite = 8, agora = Date.now() } = {}) {
  return (Array.isArray(arremates) ? arremates : [])
    .filter((a) => a && a.id)
    .sort((a, b) => new Date(b.quando || 0) - new Date(a.quando || 0))
    .slice(0, limite)
    .map((a) => ({ id: a.id, quem: a.arrematante || 'Participante', titulo: a.titulo || 'um leilão', imagem: a.imagem || null, quando: haQuantoTempo(a.quando, agora) }));
}

export const MEDALHAS = Object.freeze(['🥇', '🥈', '🥉']);

/** O ranking: por quantidade, desempate por quem arrematou mais recentemente; sem R$. */
export function linhasDoRanking(ranking = [], { limite = 5 } = {}) {
  return (Array.isArray(ranking) ? ranking : [])
    .filter((r) => r && Number(r.arremates) > 0)
    .sort((a, b) => (Number(b.arremates) - Number(a.arremates)) || (new Date(b.ultimo || 0) - new Date(a.ultimo || 0)))
    .slice(0, limite)
    .map((r, i) => ({
      id: r.id, posicao: i + 1, medalha: MEDALHAS[i] || `${i + 1}º`,
      quem: r.arrematante || 'Participante', arremates: Number(r.arremates),
      rotulo: `${Number(r.arremates)} ${Number(r.arremates) === 1 ? 'arremate' : 'arremates'}`,
    }));
}

/** Quanto tempo cada linha do ticker fica no ar. */
export const INTERVALO_DO_TICKER_MS = 4500;
/** De quanto em quanto tempo a vitrine busca lances novos. */
export const RECARGA_DO_TICKER_MS = 45_000;

/** O próximo índice do ticker (circular). */
export function proximoDoTicker(atual, total) {
  if (!total) return 0;
  return (Number(atual) + 1) % total;
}
