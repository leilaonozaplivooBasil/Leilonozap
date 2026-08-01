import React from 'react';
import { X, Package } from 'lucide-react';
import { fmtBR } from '@/lib/money';
import { statusConfig } from '@/components/catalog/CatalogOrderCard';
import LinhaDetalhe from '@/components/catalog/LinhaDetalhe';

// 📄 Detalhamento completo do pedido da Loja Virtual (SOMENTE LEITURA).
// Mostra apenas o que está realmente gravado no pedido — campo ausente = linha oculta.
// ⚠️ O valor do frete NÃO é gravado no pedido hoje, por isso não aparece aqui.

const PAGAMENTO = {
  pix: 'PIX', pix_mp: 'PIX (Mercado Pago)', dinheiro: 'Dinheiro',
  cartao: 'Cartão', credit_card: 'Cartão de crédito', debito: 'Cartão de débito',
  saldo: 'Saldo da carteira', stripe: 'Cartão (Stripe)', boleto: 'Boleto',
};

const ENTREGA = {
  a_enviar: 'A enviar', preparando: 'Preparando', enviado: 'Enviado',
  saiu_entrega: 'Saiu para entrega', entregue: 'Entregue',
};

const dataHora = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

function parseItens(order) {
  let itens = order?.items_json;
  if (typeof itens === 'string') {
    try { itens = JSON.parse(itens); } catch { itens = null; }
  }
  if (Array.isArray(itens) && itens.length > 0) return itens;
  // Pedido antigo (1 produto, sem items_json): monta a partir dos campos do pedido
  if (order?.product_title) {
    return [{ title: order.product_title, qty: order.quantity || 1, unit: null }];
  }
  return [];
}

export default function DetalhesPedidoModal({ order, onClose }) {
  if (!order) return null;

  const cfg = statusConfig[order.status] || statusConfig.pending_payment;
  const itens = parseItens(order);
  const total = order.total_amount || order.sale_price || 0;
  const endereco = [order.buyer_address, order.buyer_cep].filter(Boolean).join(' · ');

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 flex items-center gap-3 border-b border-white/10 bg-gray-900/95 px-4 py-3 backdrop-blur">
          <Package className="h-5 w-5 shrink-0 text-green-400" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-white">Detalhes do pedido</h2>
            <p className="truncate font-mono text-[11px] text-gray-500">
              {order.tracking_code || order.id}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Situação */}
          <div className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold ${cfg.color}`}>
            <cfg.icon className="h-3.5 w-3.5" />
            {cfg.text}
          </div>

          {/* Itens */}
          <section>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Itens</p>
            <div className="divide-y divide-white/5 rounded-lg border border-white/10">
              {itens.map((it, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white break-words">{it.title || 'Item'}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">Quantidade: {it.qty || 1}</p>
                  </div>
                  {it.unit ? (
                    <span className="shrink-0 text-xs font-bold text-green-400">R$ {fmtBR(it.unit)}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* Valores */}
          <section>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Valores</p>
            <div className="divide-y divide-white/5 rounded-lg border border-white/10 px-3">
              <LinhaDetalhe label="Cupom" value={order.coupon_code} mono />
              <LinhaDetalhe label="Desconto" value={order.discount_amount ? `- R$ ${fmtBR(order.discount_amount)}` : null} />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs font-bold text-white">Total pago</span>
                <span className="text-base font-black text-green-400">R$ {fmtBR(total)}</span>
              </div>
            </div>
          </section>

          {/* Pagamento */}
          <section>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Pagamento</p>
            <div className="divide-y divide-white/5 rounded-lg border border-white/10 px-3">
              <LinhaDetalhe label="Forma" value={PAGAMENTO[order.payment_method] || order.payment_method} />
              <LinhaDetalhe label="Pedido feito em" value={dataHora(order.created_date)} />
            </div>
          </section>

          {/* Entrega */}
          {(endereco || order.carrier || order.tracking_code || order.fulfillment_status || order.shipped_at || order.delivered_at) && (
            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Entrega</p>
              <div className="divide-y divide-white/5 rounded-lg border border-white/10 px-3">
                <LinhaDetalhe label="Situação" value={ENTREGA[order.fulfillment_status] || order.fulfillment_status} />
                <LinhaDetalhe label="Endereço" value={endereco} />
                <LinhaDetalhe label="Transportadora" value={order.carrier} />
                <LinhaDetalhe label="Rastreio" value={order.tracking_code} mono />
                <LinhaDetalhe label="Enviado em" value={dataHora(order.shipped_at)} />
                <LinhaDetalhe label="Entregue em" value={dataHora(order.delivered_at)} />
              </div>
            </section>
          )}

          {/* Comprador */}
          <section>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Comprador</p>
            <div className="divide-y divide-white/5 rounded-lg border border-white/10 px-3">
              <LinhaDetalhe label="Nome" value={order.buyer_name} />
              <LinhaDetalhe label="E-mail" value={order.buyer_email} />
              <LinhaDetalhe label="Telefone" value={order.buyer_phone} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}