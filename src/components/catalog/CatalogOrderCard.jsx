import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Package, Truck, Eye, Trash2, Star } from 'lucide-react';
import { Stars } from '@/components/loja/StarRating';

// 🧩 Card de pedido da Loja Virtual — COMPARTILHADO entre MyCatalogOrders e a aba
// "Meus Pedidos" do Profile (extraído em 25/07 pra acabar com a versão pobre do
// Profile). As ações só aparecem quando o handler correspondente é passado.

export const statusConfig = {
  pending_payment: { text: "Aguardando Pagamento", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { text: "Pago", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  processing: { text: "Processando", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { text: "Enviado", icon: Truck, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  delivered: { text: "Entregue", icon: Package, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  canceled: { text: "Cancelado", icon: Package, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  // status reais (em português) dos pedidos da loja
  preparando: { text: "Preparando", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  saiu_entrega: { text: "Saiu para entrega", icon: Truck, color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  entregue: { text: "Entregue", icon: CheckCircle, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  cancelado: { text: "Cancelado", icon: Package, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export const RATEABLE = ['paid', 'preparando', 'saiu_entrega', 'entregue'];
// estados em que o comprador já pode confirmar o recebimento (libera o saldo do vendedor)
export const CONFIRMABLE = ['paid', 'preparando', 'saiu_entrega', 'shipped', 'entregue', 'delivered'];

export default function CatalogOrderCard({ order, onTrackClick, onDeleteClick, onRateClick, onConfirmReceipt, confirmado, confirmando }) {
  const config = statusConfig[order.status] || statusConfig.pending_payment;
  const mainImage = order.product_image || "https://via.placeholder.com/150";
  const podeAvaliar = onRateClick && RATEABLE.includes(order.status) && order.seller_id;
  const jaAvaliou = order.minha_avaliacao;

  return (
    <div className="group cursor-pointer">
      <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30 text-white overflow-hidden flex flex-col h-full hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300">

        {/* IMAGEM - Destaque Principal */}
        <div className="relative w-full bg-gradient-to-b from-gray-600/30 to-gray-900/60 px-5 pt-6 pb-5 flex justify-center">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-white/10 to-gray-900/40 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg shadow-black/40">
            <img
              src={mainImage}
              alt={order.product_title}
              onError={(e) => {
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%239CA3AF' text-anchor='middle' dy='.3em'%3EImagem%3C/text%3E%3C/svg%3E"
              }}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* NOME DO PRODUTO */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-green-300 transition-colors">
            {order.product_title}
          </h3>
        </div>

        {/* DATA + HORA */}
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500">
            {new Date(order.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(order.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* SEPARADOR */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

        {/* TOTAL */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total:</span>
            <span className="font-bold text-green-400 text-base">
              R$ {(order.total_amount || order.sale_price || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* STATUS */}
        <div className="px-4 pb-3">
          <Badge className={`flex items-center gap-1.5 text-xs font-semibold ${config.color} border w-full justify-center py-1.5`}>
            <config.icon className="w-3 h-3" />
            <span>{config.text}</span>
          </Badge>
        </div>

        {/* BOTÃO CTA */}
        {onTrackClick && (
          <button
            onClick={() => onTrackClick(order)}
            className="mx-4 mb-4 py-2.5 px-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-green-500/40 flex items-center justify-center gap-2 group/btn"
          >
            <Eye className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            Acompanhar Pedido
          </button>
        )}

        {/* AVALIAR O VENDEDOR (estrelas) */}
        {podeAvaliar && (
          jaAvaliou ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRateClick(order); }}
              className="mx-4 mb-4 py-2 px-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Stars value={jaAvaliou.stars} size={15} />
              <span className="text-yellow-300 text-xs font-semibold">Você avaliou · editar</span>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onRateClick(order); }}
              className="mx-4 mb-4 py-2 px-3 rounded-lg border border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 to-amber-500/10 hover:from-yellow-500/25 text-yellow-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Star className="w-4 h-4" fill="#facc15" /> Avaliar vendedor
            </button>
          )
        )}

        {/* CONFIRMAR RECEBIMENTO — libera o saldo do vendedor na hora (antes do prazo) */}
        {onConfirmReceipt && CONFIRMABLE.includes(order.status) && (
          confirmado ? (
            <div className="mx-4 mb-4 py-2 px-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 font-semibold text-xs flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Recebimento confirmado
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirmReceipt(order); }}
              disabled={confirmando}
              className="mx-4 mb-4 py-2 px-3 rounded-lg border border-green-500/40 bg-gradient-to-r from-green-500/15 to-emerald-500/10 hover:from-green-500/25 text-green-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" /> {confirmando ? 'Confirmando…' : 'Confirmar recebimento'}
            </button>
          )
        )}

        {/* EXCLUIR — pendentes e cancelados */}
        {onDeleteClick && (order.status === 'pending_payment' || order.status === 'canceled') && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteClick(order); }}
            className="mx-4 mb-4 py-2 px-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs transition-all duration-300 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Pedido
          </button>
        )}

        {/* RASTREIO (se houver) */}
        {order.tracking_code && (
          <div className="px-4 pb-4 text-center">
            <p className="text-xs text-gray-500">
              Rastreio: <span className="text-green-400 font-mono font-semibold text-xs">{order.tracking_code}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
