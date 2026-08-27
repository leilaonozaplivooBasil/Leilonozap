// 🔴 PONTO 123 (21/08/2026) — extraído de src/pages/Financial.jsx pra dar
// pra testar sem precisar de infra de teste de componente React (que este
// repo não tem). Decide quais gastos "pendente" já passaram do vencimento e
// ainda não foram marcados nesta sessão — pra não reenviar o mesmo PATCH
// de "marcar como vencido" repetidas vezes a cada refetch da lista.
import { startOfDay, isBefore } from 'date-fns';
import { toDate } from './dateFmt.js';

/**
 * @param {Array<{id: string, payment_status: string, due_date: string}>} expenses
 * @param {Set<string>} jaMarcados - ids já marcados nesta sessão (não reenviar)
 * @param {Date} [hoje] - injetável nos testes; padrão: agora
 * @returns {Array} os gastos que precisam ser marcados como "vencido" agora
 */
export function encontrarVencidosNaoMarcados(expenses, jaMarcados, hoje = new Date()) {
  const inicioDeHoje = startOfDay(hoje);
  return (expenses || []).filter((exp) =>
    exp.payment_status === 'pendente' &&
    isBefore(startOfDay(toDate(exp.due_date)), inicioDeHoje) &&
    !jaMarcados.has(exp.id)
  );
}
