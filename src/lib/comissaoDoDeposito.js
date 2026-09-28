// 💸 A COMISSÃO DE CADA DEPÓSITO, EM PORTUGUÊS — 28/09/2026, pedido da Beatriz:
//   "eu só preciso ver essa questão de depósito geral dentro do site […]
//    esses relatórios aí me lascam demais […] já coloca esses valores lá
//    das comissões de depósito".
//
// A tela "Depósitos Confirmados" mostrava quem depositou e quanto — e mais
// nada. Para saber a comissão de um depósito era preciso cruzar com a tela de
// Pagamentos de Comissões (organizada por pessoa, não por depósito). Aqui cada
// depósito ganha a frase que responde "gerou comissão? para quem? e agora?".
//
// Nada é calculado aqui: o valor vem do commission_ledger, que o gatilho
// `deposito_paga_indicador` grava (supabase/migrations/20260923020215_…). Esta
// régua só TRADUZ o que está no banco — e explica quando não há comissão,
// com os mesmos motivos do gatilho.

/** Início da regra dos 10%: 23/09/2026 00:00 em Brasília (mesmo valor do banco). */
export const INICIO_COMISSAO_DEPOSITO = '2026-09-23T03:00:00.000Z';

export const SITUACOES = {
  ESPERA: 'espera',          // gerada, dentro dos 7 dias
  LIBERADA: 'liberada',      // já caiu no "A receber" — pode pagar
  PAGA: 'paga',
  EMPRESA: 'empresa',        // quem indicou foi a conta do site: fica com a empresa
  ESTORNADA: 'estornada',    // depósito cancelado depois de pago
  ANTES_DA_REGRA: 'antes_da_regra',
  SEM_INDICADOR: 'sem_indicador',
  AUTOINDICACAO: 'autoindicacao',
  INDICADOR_INATIVO: 'indicador_inativo',
  CONFERIR: 'conferir',      // devia ter e não tem — não deveria acontecer
  NAO_SE_APLICA: 'nao_se_aplica', // depósito não pago, ou passaporte
};

const dataCurta = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(d);
};

/**
 * @param {object} p
 * @param {object} p.deposito   {kind, status ('confirmed'|…), user_id, created_date}
 * @param {object} [p.indicador] {id, nome, ativo, empresa}
 * @param {object} [p.lancamento] linha do commission_ledger {amount, status, release_at, beneficiary_id}
 * @param {boolean} [p.pago]    a linha de comissão liberada já foi paga
 * @returns {{codigo: string, texto: string, valor: number}}
 */
export function situacaoDaComissao({ deposito, indicador = null, lancamento = null, pago = false } = {}) {
  const valor = Math.round((Number(lancamento?.amount) || 0) * 100) / 100;
  if (!deposito || deposito.kind !== 'wallet_deposit' || deposito.status !== 'confirmed') {
    return { codigo: SITUACOES.NAO_SE_APLICA, texto: '—', valor: 0 };
  }
  if (lancamento) {
    const st = String(lancamento.status || '');
    if (st === 'cancelado' || st === 'estornado') return { codigo: SITUACOES.ESTORNADA, texto: 'Estornada — depósito cancelado', valor };
    if (st === 'a_liberar') {
      const quando = dataCurta(lancamento.release_at);
      return { codigo: SITUACOES.ESPERA, texto: quando ? `Libera em ${quando}` : 'Em espera (7 dias)', valor };
    }
    if (indicador?.empresa) return { codigo: SITUACOES.EMPRESA, texto: 'Fica com a empresa', valor };
    if (pago) return { codigo: SITUACOES.PAGA, texto: 'Paga', valor };
    return { codigo: SITUACOES.LIBERADA, texto: 'Liberada — pode pagar', valor };
  }
  // Sem lançamento: os mesmos motivos do gatilho do banco, na mesma ordem.
  const quando = new Date(deposito.created_date).getTime();
  if (Number.isFinite(quando) && quando < new Date(INICIO_COMISSAO_DEPOSITO).getTime()) {
    return { codigo: SITUACOES.ANTES_DA_REGRA, texto: 'Sem comissão — antes de 23/09', valor: 0 };
  }
  if (!indicador?.id) return { codigo: SITUACOES.SEM_INDICADOR, texto: 'Sem comissão — ninguém indicou', valor: 0 };
  if (indicador.id === deposito.user_id) return { codigo: SITUACOES.AUTOINDICACAO, texto: 'Sem comissão — indicou a si mesmo', valor: 0 };
  if (indicador.ativo === false) return { codigo: SITUACOES.INDICADOR_INATIVO, texto: 'Sem comissão — indicador desativado', valor: 0 };
  return { codigo: SITUACOES.CONFERIR, texto: 'Sem comissão — conferir', valor: 0 };
}

/** Os três números do topo, só com depósitos confirmados. */
export function resumoDasComissoes(depositos) {
  const soma = (codigos) => Math.round((Array.isArray(depositos) ? depositos : [])
    .filter((d) => codigos.includes(d?.comissao?.codigo))
    .reduce((s, d) => s + (Number(d.comissao.valor) || 0), 0) * 100) / 100;
  return {
    emEspera: soma([SITUACOES.ESPERA]),
    liberada: soma([SITUACOES.LIBERADA]),
    paga: soma([SITUACOES.PAGA]),
  };
}
