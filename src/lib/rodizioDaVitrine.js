/**
 * rodizioDaVitrine — o RODÍZIO da Home de leilões e da Loja (10/10/2026).
 *
 * Dono: "a loja não pode ficar parada nos mesmos produtos; o cliente abre e vê sempre o
 * mesmo, e acha que ele não sai. Os destaques não mudam (vêm pela data). Depois dos
 * destaques, uma fileira dos leilões que faltam 2 dias; abaixo, o resto roda aleatório."
 *
 * 🎲 A REGRA: cada ACESSO tem uma semente. Quem abre o site (ou volta depois de
 * JANELA_DO_ACESSO_MS parado) ganha uma ordem nova; enquanto navega, a ordem NÃO muda —
 * senão o produto que o cliente estava olhando sumiria e a página 2 repetiria itens da 1.
 *
 * A ordem não é um "embaralhar a lista": cada item recebe uma chave a partir de
 * (semente + id) e a lista é ordenada por ela. Assim, leilão que entra ou sai no meio do
 * acesso não empurra os demais para outro lugar.
 *
 * Arquivo sem `@/` e sem React: roda no `node --test`.
 */

export const CHAVE_SEMENTE = 'rodizioDaVitrine';
export const JANELA_DO_ACESSO_MS = 30 * 60 * 1000;

const sorteio = () => Math.floor(Math.random() * 2147483647) + 1;

/** hash de 32 bits (FNV-1a) → número entre 0 e 1, estável para o mesmo texto. */
function chaveDe(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15; h = Math.imul(h, 2246822507);
  h ^= h >>> 13; h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * A semente do acesso atual. Guarda {semente, ts} no armazém (sessionStorage); ts é a
 * ÚLTIMA vez que a vitrine foi montada. Parado por mais de JANELA_DO_ACESSO_MS → acesso
 * novo → semente nova. Armazém indisponível → semente sorteada na hora (nunca quebra).
 */
export function sementeDoAcesso({ armazem, agora = Date.now() } = {}) {
  let guardado = null;
  try {
    const bruto = armazem?.getItem(CHAVE_SEMENTE);
    if (bruto) guardado = JSON.parse(bruto);
  } catch { /* sem registro */ }
  const valido = guardado
    && Number.isFinite(guardado.semente) && Number.isFinite(guardado.ts)
    && agora - guardado.ts >= 0 && agora - guardado.ts < JANELA_DO_ACESSO_MS;
  const semente = valido ? guardado.semente : sorteio();
  try { armazem?.setItem(CHAVE_SEMENTE, JSON.stringify({ semente, ts: agora })); } catch { /* sem armazém */ }
  return semente;
}

/** Ordena `lista` pela chave (semente + id). Devolve array NOVO; sem id, vai para o fim. */
export function rodar(lista, semente) {
  const itens = (Array.isArray(lista) ? lista : []).filter(Boolean);
  const comChave = itens.map((item, i) => ({
    item,
    i,
    k: item.id ? chaveDe(`${semente}:${item.id}`) : 2,
  }));
  comChave.sort((a, b) => (a.k - b.k) || (a.i - b.i));
  return comChave.map((c) => c.item);
}

const DIA_MS = 24 * 60 * 60 * 1000;
const BRASILIA_MS = 3 * 60 * 60 * 1000;

/** Dia de calendário de Brasília (UTC−3) como número de dias desde 1970. */
export function diaDeBrasilia(ms) {
  return Math.floor((ms - BRASILIA_MS) / DIA_MS);
}

/**
 * Os leilões que "faltam 2 dias": ATIVOS cujo encerramento cai no dia de calendário
 * (Brasília) de depois de amanhã. Ordem: quem encerra primeiro. `scheduled` não entra —
 * nele `end_time` é o INÍCIO. Vazio → a fileira não aparece.
 */
export function faltamDoisDias(leiloes, agoraMs = Date.now()) {
  const alvo = diaDeBrasilia(agoraMs) + 2;
  return (Array.isArray(leiloes) ? leiloes : [])
    .filter((a) => {
      if (a?.status !== 'active' || !a.end_time) return false;
      const fim = new Date(a.end_time).getTime();
      return Number.isFinite(fim) && fim > agoraMs && diaDeBrasilia(fim) === alvo;
    })
    .sort((a, b) => new Date(a.end_time) - new Date(b.end_time));
}

/**
 * Ordem da grade de leilões abaixo dos blocos fixos: ATIVOS em rodízio, depois o resto
 * (agendados etc.) na ordem em que vieram. `fora` = ids que já aparecem em cima
 * (destaques e fileira de 2 dias) e não se repetem aqui.
 */
export function ordemDaGrade(leiloes, { semente, fora = [] } = {}) {
  const f = new Set(fora);
  const base = (Array.isArray(leiloes) ? leiloes : []).filter((a) => a && !f.has(a.id));
  const ativos = base.filter((a) => a.status === 'active');
  const resto = base.filter((a) => a.status !== 'active');
  return [...rodar(ativos, semente), ...resto];
}

/** Loja: produtos COM estoque em rodízio; esgotados continuam no fim, na ordem original. */
export function rodarProdutos(produtos, semente) {
  const lista = (Array.isArray(produtos) ? produtos : []).filter(Boolean);
  const comEstoque = lista.filter((p) => p.quantity > 0);
  const esgotados = lista.filter((p) => !(p.quantity > 0));
  return [...rodar(comEstoque, semente), ...esgotados];
}
