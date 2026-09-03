// gastosFixosRecorrentes — helper (pasta _lib, não é rota), usado só por
// api/functions/gerarGastosFixos.js.
//
// DIR-8 (27/08/2026) — "Fixo Mensal" nunca gerava o lançamento do mês seguinte:
// expense_type:'fixo' e recurring_day sempre foram só campos salvos, sem nenhum código
// lendo-os pra criar a próxima cobrança. Esta função decide, pra UM gasto fixo, quais
// meses ainda não têm lançamento — do mês seguinte ao último vencimento conhecido em
// diante. Cada mês em aberto vira uma data própria: um gasto "esquecido" há 3 meses gera
// 3 lançamentos, não um só com "vencido há 90 dias" — é isso que deixa claro pra Aline
// quantos meses estão realmente em atraso.
//
// 03/09/2026 — O HORIZONTE PRA FRENTE (pedido da Aline)
// "hj, tudo que cadastro como recorrente, não aparece para mim com referência as datas
// para frente. ex. 27/09 ainda não foi pago, se eu filtrar por empresa vou saber quanto
// tenho que pagar para ele mensalmente e o status estaria como pendente, pois ainda não
// venceu."
// Até aqui a função parava no mês corrente: enxergava no máximo um mês à frente, e isso
// só por acidente (o mês atual entra inteiro, mesmo com o dia ainda por vir). Dois meses
// adiante simplesmente não existiam no banco — medido em 03/09: dos 44 grupos de
// recorrência, NENHUM tinha 2+ meses à frente, e o vencimento mais distante de toda a
// base era 15/10. Agora o horizonte é explícito: MESES_A_FRENTE meses além do corrente.
//
// POR QUE 6 E NÃO 12 (decisão do dono, 03/09)
// A tela do Financeiro carrega com teto de 500 linhas (Financial.jsx: list("-due_date",
// 500)) e ordena por vencimento DECRESCENTE — então quanto mais futuro se gera, mais o
// futuro ocupa o topo e mais o passado cai fora da lista em silêncio. Com 6 meses a base
// projetada fica em ~396 linhas e cabe; com 12 iria a ~660 e a tela perderia ~160 linhas
// antigas — inclusive o "27/08 pago" que a própria Aline usou de exemplo. Subir para 12
// exige antes levantar esse teto; enquanto ele for 500, 6 é o horizonte que cabe.
function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Quantos meses ALÉM do mês corrente projetar. Ver o bloco acima antes de mexer. */
export const MESES_A_FRENTE = 6;

/**
 * @param {{ultimoVencimento: string|Date, recurringDay?: number|string}} gasto
 * @param {Date} [hoje] - injetável nos testes; padrão: agora
 * @param {number} [limiteMeses] - trava de segurança contra due_date/recurring_day mal configurado
 * @param {number} [mesesAFrente] - horizonte além do mês corrente; 0 = comportamento antigo
 * @returns {Date[]} um Date por mês faltando, já com o dia certo (clampado ao tamanho do mês)
 */
export function mesesFaltandoParaGastoFixo(gasto, hoje = new Date(), limiteMeses = 24, mesesAFrente = MESES_A_FRENTE) {
  const ultimo = new Date(gasto.ultimoVencimento);
  const dia = Number(gasto.recurringDay) || ultimo.getDate();

  let ano = ultimo.getFullYear();
  let mes = ultimo.getMonth() + 1; // já começa no mês SEGUINTE ao último vencimento
  if (mes > 11) { mes = 0; ano += 1; }

  // Índice absoluto de mês (ano*12 + mês): compara "quão longe" sem precisar tratar a
  // virada de ano em dois testes separados, que era de onde vinha a condição antiga.
  const frente = Math.max(0, Number(mesesAFrente) || 0);
  const limite = hoje.getFullYear() * 12 + hoje.getMonth() + frente;

  const faltando = [];
  // O teto de segurança conta o passado primeiro (a lista é cronológica): num grupo
  // esquecido há muitos meses, o atraso real é gerado antes da projeção — que é a ordem
  // certa, porque dívida vencida vale mais que previsão.
  while (ano * 12 + mes <= limite && faltando.length < limiteMeses) {
    faltando.push(new Date(ano, mes, Math.min(dia, diasNoMes(ano, mes))));
    mes += 1;
    if (mes > 11) { mes = 0; ano += 1; }
  }
  return faltando;
}
