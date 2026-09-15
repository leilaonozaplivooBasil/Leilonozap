// 🧯 storageSeguro — ler/gravar JSON no localStorage sem derrubar a tela (15/09/2026).
//
// Achado da auditoria: o Layout global fazia JSON.parse(localStorage.getItem('catalogCart'))
// sem proteção. Uma chave corrompida (ou storage bloqueado no modo privado do Safari)
// virava tela branca no site INTEIRO. O carrinho, os cards de produto e o modal de
// produto repetiam o mesmo padrão. Aqui tudo falha pra um valor padrão, nunca pra erro.
export function lerJSON(chave, padrao = null) {
  try {
    const bruto = localStorage.getItem(chave);
    if (bruto == null || bruto === '') return padrao;
    const v = JSON.parse(bruto);
    return v == null ? padrao : v;
  } catch {
    return padrao;
  }
}

export function gravarJSON(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch { return false; }
}

/** Carrinho da Loja Virtual: sempre um array. */
export function lerCarrinho() {
  const c = lerJSON('catalogCart', []);
  return Array.isArray(c) ? c : [];
}
