// statusVenda — vocabulário de "a venda aconteceu e o dinheiro entrou".
//
// POR QUE ESTE ARQUIVO EXISTE (02/09/2026):
// `catalog_sales.status` carrega DUAS línguas desde a migração do Base44
// ('shipped'/'delivered' e 'entregue'/'saiu_entrega'), e o retrato de hoje é:
//     entregue 489 · canceled 57 · paid 47 · cancelado 12 · cancelled 9
//     delivered 4 · preparando 2 · shipped 1
// Repare que 'paid' NÃO é o estado de uma venda de produto: os 47 'paid' são
// depósito de carteira, passaporte e operação. Venda de verdade nasce e morre
// em 'entregue'. Quem filtrar por `status = 'paid'` acha ZERO venda real —
// foi exatamente isso que deixou o aviso "Venda realizada" mudo.
//
// ⚠️ ESTA LISTA JÁ EXISTE EM OUTROS TRÊS LUGARES:
//     api/functions/updateOrderStatus.js:51            (JA_PAGO)
//     api/functions/reprocessarEnvioMelhorEnvio.js:30  (STATUS_JA_PAGO)
//     src/lib/crmUnifiedCustomers.js:38                (STATUS_PAGO)
// Não foram unificadas aqui de propósito: as duas primeiras estão no caminho de
// pagamento, e mexer nelas não cabia na correção do aviso. Este arquivo é o
// lugar para onde elas devem convergir quando alguém puder tocar naquele caminho.
export const STATUS_VENDA_PAGA = [
  'paid',          // pago, ainda não começou a separação (hoje: só depósito)
  'pago',
  'confirmado',
  'concluido',
  'preparando',    // dono já está embalando
  'enviado',
  'saiu_entrega',
  'shipped',
  'delivered',
  'entregue',      // o estado real da esmagadora maioria das vendas
];

// Vendas que não são compra de ninguém — depósito de carteira, passaporte e
// crédito de comissão entram em catalog_sales só para ter registro financeiro.
export const KINDS_NAO_COMPRA = ['wallet_deposit', 'passaporte', 'commission_deposit'];

// ── commission_ledger ────────────────────────────────────────────────────────
// 'venda' NÃO é comissão: é a linha de ESCROW que a trigger trg_sale_to_ledger
// (20260716_saldo_a_liberar.sql) grava com 100% do valor da venda no nome do
// VENDEDOR, para segurar o dinheiro até a data de liberação. Em 02/09/2026 a
// tabela inteira — 480 linhas, R$ 68.929,74 — é só isso: nenhuma comissão real.
// Comissão de verdade vive em `commission_records` e nos papéis venda_direta,
// venda_pdv, override, pool_*, topo_*, estrutura_executivo, bonus_adesao.
export const PAPEL_ESCROW = 'venda';
export const ehEscrow = (papel) => String(papel || '').toLowerCase() === PAPEL_ESCROW;
