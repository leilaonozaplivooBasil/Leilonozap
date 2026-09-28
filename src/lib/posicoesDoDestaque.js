// 🌟 POSIÇÕES DO DESTAQUE — 28/09/2026, "não consigo botar +1 destaque" (dono).
//
// Destaque é marcação MANUAL e ninguém desmarca quando o leilão acaba. Em 28/09
// as posições 1 a 6 estavam todas "ocupadas" — e quatro delas por leilões já
// encerrados (PS5, secador, patinete, relógio). Resultado:
//   • em Editar Leilão, ligar a chave dava "Posição ocupada" em qualquer posição;
//   • na Home, os encerrados comiam vaga dos 6 e só 3 destaques apareciam.
//
// A régua de "ainda vale" é a mesma da vitrine (estaEmCartaz). Destaque de
// leilão que saiu do cartaz não segura posição: aparece como LIVRE, e quem liga
// a chave nela desliga o antigo antes de gravar o novo.
import { estaEmCartaz } from './leilaoEmCartaz.js';

export const POSICOES_DO_DESTAQUE = [1, 2, 3, 4, 5, 6];

const leilaoDa = (linha) => linha?.raw_base44?.auction_id || null;

/**
 * { ocupadas, vencidas } por posição, sem contar o próprio leilão.
 * `leiloes` = mapa id → linha de auctions. Se vier `null` (a consulta falhou),
 * ninguém é tratado como vencido — melhor dizer "ocupada" do que desligar o
 * destaque de alguém por falta de informação.
 */
export function mapaDePosicoes(linhas, leiloes, auctionIdAtual, agora = new Date()) {
  const ocupadas = {};
  const vencidas = {};
  for (const r of Array.isArray(linhas) ? linhas : []) {
    const aid = leilaoDa(r);
    const pos = Number(r?.sort_order);
    if (!aid || aid === auctionIdAtual || r.is_active === false || !pos) continue;
    const vivo = leiloes === null || estaEmCartaz(leiloes?.[aid], agora);
    const alvo = vivo ? ocupadas : vencidas;
    if (!alvo[pos]) alvo[pos] = { id: aid, title: r.name || '', featuredId: r.id };
  }
  for (const p of Object.keys(ocupadas)) delete vencidas[p];
  return { ocupadas, vencidas };
}

/** Os leilões que a Home mostra: marcados, ainda no cartaz, na ordem, até 6. */
export function destaquesEmCartaz(linhas, leiloes, limite = POSICOES_DO_DESTAQUE.length, agora = new Date()) {
  return (Array.isArray(linhas) ? linhas : [])
    .filter((r) => leilaoDa(r) && r.is_active !== false)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((r) => leiloes?.[leilaoDa(r)])
    .filter((a) => a && estaEmCartaz(a, agora))
    .slice(0, limite);
}
