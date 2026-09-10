import { isSalePago, isVendaMercadoria } from './crmUnifiedCustomers.js';
import { isVendaReal } from './dinheiroReal.js';
import { ehFechada, aporteExternoValido } from './esteiraCaptacao.js';
import { vendasEquivalentesAltoValor, TICKET_MEDIO_VENDA } from './xgame.js';

// 💰 AS VENDAS DO CICLO — a MESMA conta nos dois lugares (09/09/2026).
//
// Achado da auditoria noturna: "o ranking do time não vê as mesmas vendas que o
// painel pessoal". O painel de cada pessoa passava `vendasReais` pro
// `tokenDoCiclo`; a Visão Executiva do time, não — e sem esse dado o
// `tokenDoCiclo` cai numa fonte DIFERENTE (`soma('vendas_feitas')`, as tarefas
// [VENDA] anotadas no dia).
//
// 🔴 POR QUE ISSO IMPORTA MAIS DO QUE PARECE: quem vendeu de verdade mas não
// anotou a tarefa aparecia MENOR no ranking do que no próprio painel; quem
// anotou a tarefa sem a venda ter caído aparecia MAIOR. E o Human Token decide
// liga e status de Platina — então a divergência não era cosmética: a mesma
// pessoa tinha dois lugares diferentes no mesmo jogo, dependendo de quem olhava.
//
// A conta agora mora AQUI, pura e testada, e os dois lados chamam esta função.
// Duplicar a fórmula é exatamente como as duas telas se separaram na primeira vez.

/** O dono de uma venda pode estar em 4 colunas (legado). */
export const DONOS_DA_VENDA = ['seller_id', 'licensee_id', 'anchor_id', 'owner_id'];

/**
 * Os ids de pessoas a quem esta venda pertence.
 *
 * ⚠️ Pode ser MAIS DE UM, e isso é de propósito: a consulta do painel pessoal
 * usa `or(seller_id.eq.X, licensee_id.eq.X, ...)`, então a mesma venda aparece
 * pra todo mundo que estiver em qualquer uma das quatro colunas. Atribuir a um
 * dono só faria o ranking mostrar menos do que a própria pessoa vê — que é o
 * bug que estamos consertando, ao contrário.
 */
export function donosDaVenda(venda = {}) {
  const ids = DONOS_DA_VENDA.map((c) => venda[c]).filter(Boolean).map(String);
  return [...new Set(ids)];
}

/**
 * As vendas do ciclo de UMA pessoa, no mesmo formato que o `tokenDoCiclo` espera.
 *
 * É a fórmula que já rodava no painel pessoal, palavra por palavra:
 *   mercadoria paga (contagem) + equivalente de alto valor + aporte externo
 *   convertido pelo ticket médio.
 */
export function vendasDaPessoa({ sales = [], oportunidades = [] } = {}) {
  const lista = Array.isArray(sales) ? sales : [];
  const pagas = lista.filter(isSalePago);
  const reais = lista.filter(isVendaReal);
  const aporteExterno = (Array.isArray(oportunidades) ? oportunidades : [])
    .filter((o) => ehFechada(o) && aporteExternoValido(o))
    .reduce((soma, o) => soma + (Number(o?.aporte_externo?.valor) || 0), 0) / TICKET_MEDIO_VENDA;
  return pagas.filter(isVendaMercadoria).length + vendasEquivalentesAltoValor(reais) + aporteExterno;
}

/**
 * O mesmo, para o time inteiro, a partir de UMA consulta em lote.
 *
 * Devolve `{ [userId]: vendas }`. Quem não tem venda nenhuma não aparece — e
 * quem chama deve tratar ausência como 0, nunca como "sem dado": passar
 * `undefined` pro `tokenDoCiclo` reativa justamente o fallback das tarefas, que
 * é a divergência que esta peça existe pra acabar.
 */
export function vendasPorPessoa({ sales = [], oportunidades = [] } = {}) {
  const porPessoa = new Map();
  const guardar = (id, chave, item) => {
    if (!porPessoa.has(id)) porPessoa.set(id, { sales: [], oportunidades: [] });
    porPessoa.get(id)[chave].push(item);
  };
  for (const v of Array.isArray(sales) ? sales : []) {
    for (const id of donosDaVenda(v)) guardar(id, 'sales', v);
  }
  for (const o of Array.isArray(oportunidades) ? oportunidades : []) {
    const id = o?.responsavel_id;
    if (id) guardar(String(id), 'oportunidades', o);
  }
  const saida = {};
  for (const [id, dados] of porPessoa) saida[id] = vendasDaPessoa(dados);
  return saida;
}
