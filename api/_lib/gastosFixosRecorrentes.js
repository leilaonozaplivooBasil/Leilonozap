// gastosFixosRecorrentes — helper (pasta _lib, não é rota), usado só por
// api/functions/gerarGastosFixos.js.
//
// DIR-8 (27/08/2026) — "Fixo Mensal" nunca gerava o lançamento do mês seguinte:
// expense_type:'fixo' e recurring_day sempre foram só campos salvos, sem nenhum código
// lendo-os pra criar a próxima cobrança. Esta função decide, pra UM gasto fixo, quais
// meses ainda não têm lançamento — do mês seguinte ao último vencimento conhecido até o
// mês de hoje (inclusive, mesmo que o dia da cobrança deste mês ainda não tenha chegado —
// é melhor o lançamento já existir como "pendente" do que aparecer de surpresa no dia).
// Cada mês em aberto vira uma data própria: um gasto "esquecido" há 3 meses gera 3
// lançamentos, não um só com "vencido há 90 dias" — é isso que deixa claro pra Aline
// quantos meses estão realmente em atraso.
function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

/**
 * @param {{ultimoVencimento: string|Date, recurringDay?: number|string}} gasto
 * @param {Date} [hoje] - injetável nos testes; padrão: agora
 * @param {number} [limiteMeses] - trava de segurança contra due_date/recurring_day mal configurado
 * @returns {Date[]} um Date por mês faltando, já com o dia certo (clampado ao tamanho do mês)
 */
export function mesesFaltandoParaGastoFixo(gasto, hoje = new Date(), limiteMeses = 24) {
  const ultimo = new Date(gasto.ultimoVencimento);
  const dia = Number(gasto.recurringDay) || ultimo.getDate();

  let ano = ultimo.getFullYear();
  let mes = ultimo.getMonth() + 1; // já começa no mês SEGUINTE ao último vencimento
  if (mes > 11) { mes = 0; ano += 1; }

  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const faltando = [];
  while ((ano < anoAtual || (ano === anoAtual && mes <= mesAtual)) && faltando.length < limiteMeses) {
    faltando.push(new Date(ano, mes, Math.min(dia, diasNoMes(ano, mes))));
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  return faltando;
}
