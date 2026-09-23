// 🤝 A ABA NEGOCIAÇÃO — a regra, testável sem navegador.
//
// 23/09/2026 — pedido: aba "Negociação". Decisão do dono: as etapas são as do
// FUNIL QUE JÁ EXISTE (customers.purchase_status, a mesma fonte do
// CrmFunilKanban) — nenhum campo novo, nenhuma régua paralela. O que esta aba
// acrescenta não é etapa: é ORDEM e URGÊNCIA. Dentro de cada etapa, quem tem
// follow-up vencido sobe pro topo; depois quem tem follow-up hoje; depois quem
// nunca foi contatado. É a lista de "com quem eu falo agora".
//
// A tabela `negotiations` do Base44 (0 linhas, casca vazia) NÃO é usada. O que
// existe de verdade mora no cliente: purchase_status, follow_up_date,
// next_steps, last_contact, qualificacao_network.

/** As etapas onde a negociação está viva. Pago/enviado/entregue/cancelado já saíram da negociação. */
export const ETAPAS_NEGOCIACAO = Object.freeze([
  { key: 'sem_compra', label: 'Sem compra' },
  { key: 'em_negociacao', label: 'Em negociação' },
  { key: 'aguardando_pagamento', label: 'Aguardando pagamento' },
]);
const CHAVES = new Set(ETAPAS_NEGOCIACAO.map((e) => e.key));

export const ESTADO_FOLLOWUP = Object.freeze({ VENCIDO: 'vencido', HOJE: 'hoje', FUTURO: 'futuro', SEM: 'sem' });

const dia = (v) => {
  const s = String(v || '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

/** Onde o follow-up está em relação a hoje. */
export function estadoDoFollowUp(cliente, hojeISO) {
  const f = dia(cliente?.follow_up_date); const h = dia(hojeISO);
  if (!f || !h) return ESTADO_FOLLOWUP.SEM;
  if (f < h) return ESTADO_FOLLOWUP.VENCIDO;
  if (f === h) return ESTADO_FOLLOWUP.HOJE;
  return ESTADO_FOLLOWUP.FUTURO;
}

/** A nota da qualificação completa (DIR-46: 3 notas 1–5 → até 15), ou null se nunca qualificou. */
export function notaDeQualificacao(cliente) {
  const q = cliente?.qualificacao_network;
  if (!q || typeof q !== 'object') return null;
  const notas = ['abertura', 'necessidade', 'poder'].map((k) => Number(q[k])).filter((n) => Number.isFinite(n) && n > 0);
  // aceita também qualquer chave numérica (o modal grava 3 notas com nomes que já mudaram uma vez)
  const soma = notas.length ? notas.reduce((s, n) => s + n, 0)
    : Object.values(q).filter((n) => Number.isFinite(Number(n)) && Number(n) > 0 && Number(n) <= 5).reduce((s, n) => s + Number(n), 0);
  return soma > 0 ? soma : null;
}

/**
 * Quem eu vejo aqui: a mesma régua do Método — cada um só a própria lista
 * (created_by_id), o super admin todas. Cadastro legado sem carimbo só na
 * visão total (melhor esconder do que vazar).
 */
export function clientesDoEscopo(clientes = [], { uid, superAdmin = false } = {}) {
  if (superAdmin) return clientes;
  return (clientes || []).filter((c) => c?.created_by_id && c.created_by_id === uid);
}

const PESO = { [ESTADO_FOLLOWUP.VENCIDO]: 0, [ESTADO_FOLLOWUP.HOJE]: 1, [ESTADO_FOLLOWUP.SEM]: 2, [ESTADO_FOLLOWUP.FUTURO]: 3 };

/**
 * Os clientes em negociação, por etapa, na ordem de "com quem falo agora":
 * vencido → hoje → nunca contatado → futuro; empate pelo follow-up mais
 * antigo, depois pelo nome.
 */
export function agruparNegociacao(clientes = [], { hojeISO } = {}) {
  const colunas = ETAPAS_NEGOCIACAO.map((e) => ({ ...e, clientes: [] }));
  const porChave = Object.fromEntries(colunas.map((c) => [c.key, c]));
  for (const c of clientes || []) {
    if (!c) continue;
    const etapa = c.purchase_status || 'sem_compra';
    if (!CHAVES.has(etapa)) continue; // já saiu da negociação
    const estado = estadoDoFollowUp(c, hojeISO);
    porChave[etapa].clientes.push({ ...c, _followUp: estado, _nota: notaDeQualificacao(c) });
  }
  for (const col of colunas) {
    col.clientes.sort((a, b) => (PESO[a._followUp] - PESO[b._followUp])
      || String(dia(a.follow_up_date) || '9999').localeCompare(String(dia(b.follow_up_date) || '9999'))
      || String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR'));
  }
  return colunas;
}

/** Os números do topo da aba. */
export function resumoDaNegociacao(colunas = []) {
  const todos = colunas.flatMap((c) => c.clientes || []);
  return {
    total: todos.length,
    vencidos: todos.filter((c) => c._followUp === ESTADO_FOLLOWUP.VENCIDO).length,
    hoje: todos.filter((c) => c._followUp === ESTADO_FOLLOWUP.HOJE).length,
    semQualificar: todos.filter((c) => c._nota === null).length,
  };
}
