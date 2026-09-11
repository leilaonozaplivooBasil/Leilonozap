// 💰 A conta que o aviso de "Saldo Insuficiente" mostra.
//
// ══════════════════════════════════════════════════════════════════════════════
// O PROBLEMA QUE ISTO RESOLVE
// ══════════════════════════════════════════════════════════════════════════════
// 11/09/2026, Bike Harley M4. Cliente depositou R$ 1.000,00, tentou dar o lance
// mínimo de R$ 997,00 e levou "Saldo Insuficiente" com esta linha na tela:
//
//     Faltam:  R$ -3,00
//
// Faltar menos três reais não existe. O número negativo é a prova de que a tela
// estava mostrando uma conta e o sistema estava cobrando outra:
//
//   • a TRAVA (useBidSubmission.js) exige   lance + frete
//   • o AVISO (LowBalanceModal) mostrava    lance
//
// O frete é cotado pelo CEP de quem dá o lance, então some da tela e reaparece na
// hora de travar o saldo. Para o cliente, a plataforma simplesmente recusou um
// lance que a própria plataforma dizia caber no saldo dele.
//
// A regra daqui em diante: o aviso mostra EXATAMENTE o que a trava exige.

// Import relativo, não o atalho "@/": este arquivo também roda no `npm test`,
// fora do Vite, onde o atalho não existe.
import { money, addMoney, gteMoney } from './money.js';

/**
 * Monta a conta do lance, item a item.
 *
 * @param {{saldo?:number, lanceMinimo?:number, frete?:number}} entrada
 * @returns {{
 *   saldo:number, lanceMinimo:number, frete:number, total:number,
 *   faltam:number, temSaldo:boolean
 * }}
 *   `total` é o que precisa estar disponível na carteira (lance + frete).
 *   `faltam` NUNCA é negativo: quando o saldo cobre, vale 0.
 */
export function contaDoLance({ saldo, lanceMinimo, frete } = {}) {
  const saldoOk = money(Number(saldo) || 0);
  const lance = money(Number(lanceMinimo) || 0);
  const freteOk = money(Number(frete) || 0);
  const total = addMoney(lance, freteOk);
  const temSaldo = gteMoney(saldoOk, total);

  return {
    saldo: saldoOk,
    lanceMinimo: lance,
    frete: freteOk,
    total,
    // 🔴 O clamp em zero é a linha que mata o "Faltam: R$ -3,00".
    faltam: temSaldo ? 0 : money(total - saldoOk),
    temSaldo,
  };
}

/**
 * O aviso abriu, mas pela conta da tela o saldo dá.
 *
 * Acontece quando quem recusou foi o servidor — ele recota o frete na hora de
 * reservar, e a cotação pode ter mudado desde que a tela carregou. Neste caso
 * dizer "faltam R$ X" seria mentira; o certo é admitir que a tela não sabe.
 *
 * @param {ReturnType<typeof contaDoLance>} conta
 */
export function contaNaoExplicaRecusa(conta) {
  return Boolean(conta?.temSaldo);
}
