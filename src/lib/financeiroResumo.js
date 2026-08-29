// 💳 A conta dos quatro cartões do topo do Financeiro.
//
// Fica aqui, fora do componente, pelo mesmo motivo de financeiroVencidos.js: é
// regra de dinheiro, e regra de dinheiro precisa de teste. Os erros que este
// arquivo conserta (ver tests/financeiroResumo.test.mjs) passaram meses na tela
// justamente porque a conta morava dentro do JSX, onde ninguém a exercita.
//
// ⚠️ ESCRITO EM 29/08/2026 para consertar quatro defeitos que se somavam:
//
//   ① "Total Pago" só somava conta `pago_integral`. Baixa PARCIAL não entrava.
//      Pagar R$ 500 de uma conta de R$ 2.000 deixava os R$ 500 invisíveis: fora
//      do caixa de verdade, e fora da tela. Agora a soma é de `amount_paid`, o
//      campo que o PaymentModal grava em TODA baixa, integral ou parcial.
//
//   ② "Pendente" não contava status `vencido` — e a própria tela do Financeiro
//      marca conta vencida sozinha. No dia em que a conta vencia, o valor dela
//      sumia do "Pendente".
//
//   ③ "Total do Período" somava conta `cancelado`. Cancelada deixou de ser
//      compromisso; o filtro "A Pagar" já tratava assim.
//
//   ④ Pendente e Vencido se sobrepunham: conta `pendente` já vencida entrava nos
//      dois; conta `vencido` entrava só no segundo. Os cartões não fechavam.
//
// A régua agora, e ela FECHA:  totalPeriodo = pago + pendente + vencido
//   • pago     — tudo que já saiu do caixa (integral e parcial).
//   • pendente — o que falta pagar de conta que AINDA NÃO venceu.
//   • vencido  — o que falta pagar de conta que JÁ passou do vencimento.
//
// Pendente e Vencido separam por DATA, não por status: é a data que diz se está
// atrasado. O status `vencido` continua existindo e continua servindo ao filtro
// "A Pagar" — só não é mais ele quem decide de que lado do corte o valor cai.

// Valor de verdade da conta: o original mais o juro que ela acumulou.
export const valorTotalGasto = (e) => (e?.amount || 0) + (e?.interest_amount || 0);

// O que ainda falta pagar desta conta.
export const emAbertoGasto = (e) => valorTotalGasto(e) - (e?.amount_paid || 0);

const soData = (d) => {
  const dt = d instanceof Date ? new Date(d) : new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

/**
 * @param {Array} gastos  lista JÁ filtrada pela tela (período, categoria, busca…)
 * @param {Date}  hoje    injetável para o teste não depender do relógio
 */
export function resumirGastos(gastos = [], hoje = new Date()) {
  const dia = soData(hoje);
  const jaVenceu = (e) => soData(e?.due_date).getTime() < dia.getTime();

  // Cancelada não é compromisso: fora de TODOS os cartões, inclusive do total.
  const ativas = gastos.filter((e) => e?.payment_status !== 'cancelado');
  const naoQuitadas = ativas.filter((e) => e?.payment_status !== 'pago_integral');

  const somar = (lista, fn) => lista.reduce((s, e) => s + fn(e), 0);

  return {
    totalPeriodo: somar(ativas, valorTotalGasto),
    pago: somar(ativas, (e) => e?.amount_paid || 0),
    pendente: somar(naoQuitadas.filter((e) => !jaVenceu(e)), emAbertoGasto),
    vencido: somar(naoQuitadas.filter(jaVenceu), emAbertoGasto),
    // Contas que vencem de hoje até daqui a 3 dias — o aviso amarelo da tela.
    venceEmBreve: naoQuitadas.filter((e) => {
      const dias = Math.round((soData(e?.due_date) - dia) / 86400000);
      return dias >= 0 && dias <= 3;
    }).length,
  };
}
