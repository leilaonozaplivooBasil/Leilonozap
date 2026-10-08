// 🖼️ O BANNER SAI SOZINHO QUANDO O LEILÃO ENCERRA — as regras, sem a tela (08/10/2026).
//
// Dono: "quando o leilão de um produto se encerrar, automaticamente já desativar o banner dele.
// A TV foi leiloada no sábado às 18h; às 18:01 o banner já tem que sair."
//
// Um banner pode estar LIGADO a um leilão (`auction_id`). A tela decide pelo horário do próprio
// leilão — no segundo em que ele acaba, sem esperar o robô que fecha leilões (roda de minuto em
// minuto) — e o banco desliga o banner de vez quando o status muda (migração 20261008160000).
//
// ⚠️ Lance de última hora PRORROGA o fim do leilão. Por isso o horário que vale é sempre o que
// veio do banco agora, e quem usa estas regras confere de novo no banco ANTES de tirar o banner
// no horário que a tela conhecia (ver o hook useBannersDoPainel).

/** Status em que o banner de um leilão pode aparecer: no ar, ou agendado (as artes "faltam 3, 2, 1 dia"). */
export const STATUS_QUE_APARECEM = ['active', 'scheduled'];

const ms = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * O leilão ainda justifica o banner?
 *  • agendado → sim (o `end_time` de um agendado guarda o INÍCIO previsto, não o fim);
 *  • no ar → sim enquanto o fim não chegou;
 *  • qualquer outro status (vendido, encerrado, cancelado, em liquidação) → não;
 *  • leilão que não existe mais → não.
 */
export function leilaoDoBannerAberto(leilao, agoraMs = Date.now()) {
  if (!leilao || typeof leilao !== 'object') return false;
  const status = String(leilao.status || '').toLowerCase();
  if (!STATUS_QUE_APARECEM.includes(status)) return false;
  if (status === 'scheduled') return true;
  const fim = ms(leilao.end_time);
  return fim === null ? true : agoraMs < fim;
}

/**
 * Tira da lista os banners cujo leilão acabou. `mapa` = { [auction_id]: { status, end_time } }.
 * Banner sem `auction_id` passa sempre. Banner cujo leilão AINDA NÃO foi consultado (primeira
 * pintura, antes da consulta chegar) passa também: o que está guardado vale até a consulta
 * responder, e quando responde esta regra decide.
 */
export function filtrarPorLeilao(banners, mapa = {}, agoraMs = Date.now()) {
  return (Array.isArray(banners) ? banners : []).filter((b) => {
    if (!b) return false;
    const id = String(b.auction_id || '').trim();
    if (!id) return true;
    if (!(id in (mapa || {}))) return true;
    return leilaoDoBannerAberto(mapa[id], agoraMs);
  });
}

/** Os ids de leilão de que a lista depende (sem repetir). */
export function idsDeLeilaoDosBanners(banners) {
  const ids = new Set();
  for (const b of Array.isArray(banners) ? banners : []) {
    const id = String(b?.auction_id || '').trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Próximo instante (ms) em que um leilão ligado a algum banner da lista acaba, ou null. */
export function proximoFimDeLeilao(banners, mapa = {}, agoraMs = Date.now()) {
  let menor = null;
  for (const id of idsDeLeilaoDosBanners(banners)) {
    const l = mapa?.[id];
    if (!l || String(l.status || '').toLowerCase() !== 'active') continue;
    const fim = ms(l.end_time);
    if (fim !== null && fim > agoraMs && (menor === null || fim < menor)) menor = fim;
  }
  return menor;
}

/**
 * Como o painel descreve o vínculo de UM banner. `null` quando não há leilão ligado.
 *   estado: 'leilao_no_ar' | 'leilao_agendado' | 'leilao_encerrou' | 'leilao_sumiu' | 'leilao_desconhecido'
 */
export function situacaoDoLeilaoDoBanner(banner, leilao, agoraMs = Date.now()) {
  const id = String(banner?.auction_id || '').trim();
  if (!id) return null;
  if (leilao === undefined) return { estado: 'leilao_desconhecido', texto: 'Ligado a um leilão' };
  if (!leilao) return { estado: 'leilao_sumiu', texto: 'O leilão ligado não existe mais' };
  if (!leilaoDoBannerAberto(leilao, agoraMs)) return { estado: 'leilao_encerrou', texto: 'O leilão encerrou · banner fora do ar' };
  if (String(leilao.status).toLowerCase() === 'scheduled') return { estado: 'leilao_agendado', texto: 'Leilão agendado · o banner sai quando ele encerrar' };
  return { estado: 'leilao_no_ar', texto: 'Sai sozinho quando o leilão encerrar' };
}
