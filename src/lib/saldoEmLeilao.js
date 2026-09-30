// 🔒 O DINHEIRO QUE ESTÁ EM LEILÃO, EXPLICADO NA TELA — 30/09/2026
//
// Caso Paulo Victor: a carteira mostrava R$ 220 e o checkout da loja só
// R$ 44,78. Não era erro — era a REGRA DOS TRÊS ESTADOS (dono, 08/08/2026):
// lance coberto volta na hora pra relançar, mas fica preso PRA LOJA até aquele
// leilão acabar (api/_lib/compromissoLeilao.js). O que faltava era a tela dizer
// isso. Aqui só se traduz o que o getMyWallet devolve; nada é calculado.

const brl = (n) => 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** "02/10, 18h" · "02/10, 18h30" (Brasília) */
export function quandoLibera(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}, ${Number(p.hour)}h${p.minute === '00' ? '' : p.minute}`;
}

// corta no espaço e sem deixar hífen pendurado: "Apple iPhone 17 512GB 48MP 5G…"
const curto = (t, max = 34) => {
  const s = String(t || '').trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const noEspaco = corte.lastIndexOf(' ') > max / 2 ? corte.slice(0, corte.lastIndexOf(' ')) : corte;
  return `${noEspaco.replace(/[\s\-–,.:;]+$/, '')}…`;
};

/**
 * O que a Carteira mostra. null quando não há nada preso (o quadro nem aparece).
 * @param {{saldo_comprometido_leilao?:number, leiloes_comprometidos?:Array}} w  resposta do getMyWallet
 */
export function resumoDoSaldoEmLeilao(w) {
  const valor = Math.round((Number(w?.saldo_comprometido_leilao) || 0) * 100) / 100;
  if (valor <= 0) return null;
  const itens = (Array.isArray(w?.leiloes_comprometidos) ? w.leiloes_comprometidos : []).map((i) => ({
    auctionId: i.auction_id, titulo: String(i.titulo || 'Leilão'), valor: brl(i.valor), libera: quandoLibera(i.termina),
  }));
  return {
    valor: brl(valor),
    nota: 'Livre para dar lance. Para a loja, libera quando o leilão terminar, se você não arrematar.',
    itens,
  };
}

/**
 * A linha do checkout, embaixo de "Saldo da carteira". '' quando não há nada preso.
 * @param {number} comprometido  saldo_comprometido_leilao
 * @param {Array} itens          leiloes_comprometidos
 */
export function avisoNoCheckout(comprometido, itens = []) {
  const v = Math.round((Number(comprometido) || 0) * 100) / 100;
  if (v <= 0) return '';
  const lista = Array.isArray(itens) ? itens : [];
  if (lista.length === 1) {
    const q = quandoLibera(lista[0].termina);
    return `${brl(v)} estão no leilão ${curto(lista[0].titulo)} e liberam para a loja quando ele terminar${q ? ` (${q})` : ''}.`;
  }
  const q = quandoLibera(lista[0]?.termina);
  return `${brl(v)} estão em ${lista.length || 'alguns'} leilões rolando e liberam para a loja quando eles terminarem${q ? ` (o próximo: ${q})` : ''}.`;
}
