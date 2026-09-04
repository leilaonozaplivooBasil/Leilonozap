/**
 * rotulosFinanceiro — o vocabulário do Financeiro, num lugar só.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (03/09/2026)
 * O dono pediu para exportar o Financeiro em planilha. A tabela da tela já
 * traduz os códigos do banco para português (`pago_integral` → "Pago"), mas
 * esses mapas viviam presos dentro de `ExpenseTable.jsx`, misturados com cor e
 * ícone.
 *
 * Copiar os rótulos para a planilha criaria duas verdades: no dia em que alguém
 * renomeasse um status na tela, a planilha continuaria dizendo o nome velho — e
 * ninguém perceberia, porque planilha ninguém relê.
 *
 * Aqui fica só a PALAVRA. Cor e ícone continuam na tela, que é onde pintam.
 */

/** Status de pagamento, como a tabela mostra. */
export const STATUS_ROTULO = {
  pendente: 'Pendente',
  pago_integral: 'Pago',
  pago_parcial: 'Parcial',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

/** Tipo do gasto. */
export const TIPO_ROTULO = {
  fixo: 'Fixo',
  unico: 'Único',
  parcelado: 'Parcelado',
};

/** Forma de pagamento. */
export const PAGAMENTO_ROTULO = {
  pix: 'PIX',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
};

/**
 * Traduz um código para a palavra da tela.
 * Código desconhecido volta como veio — melhor mostrar `pago_atrasado` do que
 * uma célula vazia que esconde a linha de quem for conferir.
 */
export const rotuloDe = (mapa, codigo) => {
  const c = String(codigo ?? '').trim();
  if (!c) return '';
  return mapa[c] || c;
};
