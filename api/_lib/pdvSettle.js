// pdvSettle — helper (pasta _lib, não é rota): conclui uma venda do PDV (PIX ou cartão) quando o
// Mercado Pago confirma o pagamento. SÓ AGORA o estoque baixa e a comissão é paga —
// enquanto o pedido está 'pending_payment' ele não vale nada (sem faturamento, sem comissão).
// Chamado 1x pelo mpWebhook (o flip atômico lá garante execução única). O nome ficou
// 'settlePdvPixSale' de quando só existia PIX, mas hoje serve qualquer sale.source === 'pdv'.
import { fulfillStoreOrder } from './storeFulfill.js';
import { carregarTabelasBalcao, buscarUsuario, pagarComissaoBalcao } from './pdvBalcao.js';
// 📦 mesma regra de baixa da loja virtual: estoque próprio primeiro, central depois
import { baixarItensDaVenda } from './baixaEstoque.js';
import { liberarRepasseEstoqueProprio } from './repasseEstoqueProprio.js';
// 🤝 consignado: a dívida da peça morre nesta venda (aqui o cliente pagou PIX,
// então o custo fica retido na plataforma — nada é debitado do saldo dele)
import { liquidarConsignado } from './consignadoSettle.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export async function settlePdvPixSale(sale) {
  const now = new Date().toISOString();
  let raw = sale.raw_base44;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
  raw = raw || {};
  const items = Array.isArray(raw.items) ? raw.items : [];
  const isStoreOwner = raw.is_store_owner === true;
  const ownerId = raw.operator_id || sale.seller_id;

  // 📦 baixa pela REGRA ÚNICA (api/_lib/baixaEstoque.js): o estoque próprio do
  // balcão (comprado → consignado) sai primeiro; o que faltar sai do central.
  const { consumos } = await baixarItensDaVenda({ ownerId, items, saleId: sale.id });

  // 💰 comissão pela ÁRVORE OFICIAL (mesmo motor da loja) — estoque já baixado acima
  let commission = 0;
  try {
    if (raw.comprador_id) {
      // 🏪 balcão com licença identificada: mesma regra do dinheiro/cartão — o restante do
      // teto sobe pela linha do balcão, sobre o valor CHEIO (antes do desconto do comprador).
      const [tabelas, comprador, balcao] = await Promise.all([
        carregarTabelasBalcao(), buscarUsuario(raw.comprador_id), buscarUsuario(raw.balcao_id || sale.seller_id),
      ]);
      const rr = await pagarComissaoBalcao({
        saleId: sale.id, produtoTitulo: sale.product_title,
        base: Number(raw.total_bruto) || Number(sale.total_amount) || 0,
        comprador, balcao, levels: tabelas.levels,
      });
      commission = rr?.total ?? 0;
      if (commission > 0) {
        await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
      }
    } else {
      const rr = await fulfillStoreOrder({ ...sale, skipStock: true });
      commission = rr?.commission ?? 0;
    }
  } catch (e) {
    console.warn('PDV PIX: comissão falhou (venda segue paga):', e?.message);
  }

  // 🤝 peça consignada vendida: a dívida dela morre agora, retida no próprio PIX
  if (consumos.some((c) => c.origem === 'consignado')) {
    try {
      await liquidarConsignado({ sale, ownerId, consumos, paymentMethod: sale.payment_method || 'pix' });
    } catch (e) {
      console.error(`[PDV] Liquidação de consignado falhou na venda ${sale.id}:`, e?.message);
    }
  }

  // 💸 mercadoria que era do balcão: custo destravado + margem voltam pra conta dele
  if (consumos.length) {
    try {
      await liberarRepasseEstoqueProprio({ sale, ownerId, consumos, comissaoTotal: commission });
    } catch (e) {
      console.error(`[PDV] Repasse de estoque próprio falhou na venda ${sale.id}:`, e?.message);
    }
  }

  // retirada no balcão → entregue na hora (o flip do webhook já marcou 'paid')
  if (raw.delivered === true) {
    await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'entregue', delivered_at: now }) });
  }

  return { pdv: true, commission };
}