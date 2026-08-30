// dinheiroReal.js — critério ÚNICO de "isso é dinheiro real" pra qualquer tela
// que precise somar catalog_sales como receita/volume financeiro.
//
// Fonte oficial: docs/MARCO-OFICIAL-AGOSTO-2026.md, seção 1 — "Critério técnico
// de dinheiro real: venda em catalog_sales com status pago (paid/shipped/
// delivered) E com rastro de gateway (mp_payment_id/stripe_payment_intent/
// stripe_session_id). Antes de 01/08/2026 é TESTE, sem valor financeiro."
//
// Extraído em 30/08/2026 de src/pages/NetworkOverview.jsx (fetchFinanceStats,
// já em produção e com histórico real de bug corrigido — ver comentário da
// venda da Elenice/Lenice abaixo) pra ninguém mais reinventar esse filtro do
// zero numa tela nova e esquecer um dos três critérios (foi exatamente isso
// que aconteceu no CRM: "Venda bruta" saiu de R$ 0 pra R$ 228 mil pra R$ 154
// mil em três rodadas, cada uma com um filtro caseiro diferente — nenhum
// batendo com o Painel de Alavancagem, que sempre usou este critério).
export const MARCO_OFICIAL = new Date('2026-08-01T00:00:00Z');

// 🔧 vendas do PDV gravam status em português ("entregue") em vez de
// "delivered" — sem isso, pagamentos reais feitos no balcão (ex: a venda de
// R$250 da Lenice) ficavam fora da soma por não bater com o enum em inglês.
export const isPaga = (s) => ['paid', 'shipped', 'delivered', 'entregue'].includes(s.status);

// stripe_session_id vem redigido como "[REDACTED]" mesmo quando não é rastro
// real — só conta se for um valor de verdade.
export const temRastroGateway = (s) =>
  Boolean(s.mp_payment_id || s.stripe_payment_intent || (s.stripe_session_id && s.stripe_session_id !== '[REDACTED]'));

// 🩹 CAUSA-RAIZ da venda da Elenice (R$450) sumida do painel (19/08/2026): uma
// venda de PDV paga com "Saldo de Operação" ou "Saldo de Comissão" é dinheiro
// que JÁ entrou de verdade — só que numa etapa ANTERIOR (o depósito que
// abasteceu esse saldo). A venda em si é um débito interno, sem gateway
// próprio, então o filtro de rastro a jogava fora inteira. Confia no
// payment_method pra essas duas formas de pagamento internas, sem exigir
// rastro de gateway nesta linha.
export const PAGAMENTOS_SALDO_INTERNO = ['operacao', 'saldo'];
export const isDinheiroReal = (s) => temRastroGateway(s) || PAGAMENTOS_SALDO_INTERNO.includes(s.payment_method);

export const isPosMarco = (s) => new Date(s.created_date) >= MARCO_OFICIAL;

// Os 3 critérios juntos — sem isso é teste, não conta em relatório nenhum.
export const isVendaReal = (s) => isPaga(s) && isDinheiroReal(s) && isPosMarco(s);
