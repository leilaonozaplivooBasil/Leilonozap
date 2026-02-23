import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Printer, Info, Search, Package, ChevronDown, ChevronUp, Truck, Clock, CheckCircle2, XCircle, CreditCard } from "lucide-react";

function StatusBadge({ status }) {
  const config = {
    active: { label: "Ativo", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    ended: { label: "Encerrado", cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    sold: { label: "Vendido", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    processing: { label: "Processando", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    awaiting_payment: { label: "Aguard. Pgto", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    paid: { label: "Pago", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    shipped: { label: "Enviado", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    delivered: { label: "Entregue", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
    canceled: { label: "Cancelado", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[status] || { label: status, cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
  return <Badge className={`${c.cls} border text-[10px] font-semibold px-2 py-0.5`}>{c.label}</Badge>;
}

function OrderStatusIcon({ status }) {
  if (status === 'shipped') return <Truck className="w-4 h-4 text-blue-400" />;
  if (status === 'delivered') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'paid') return <CreditCard className="w-4 h-4 text-yellow-400" />;
  if (status === 'canceled') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
}

function AuctionRow({ item, onView, onDetails, onUpdateStatus, onPrint, isSold }) {
  const imageUrl = item.image_urls?.[0] || item.product_image;
  const title = item.title || item.product_title;
  const price = item.current_price || item.total_amount || 0;
  const orderStatus = item.order_status || item.status;
  const clientName = item.winner_name || item.buyer_name;
  const date = item.created_date ? new Date(item.created_date).toLocaleDateString('pt-BR') : '';

  return (
    <div className="liquid-glass-card rounded-xl p-4 hover:scale-[1.005] transition-all duration-200 group">
      <div className="flex items-center gap-4">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-16 h-16 object-cover rounded-xl border border-white/10 flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-gray-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate mb-1">{title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            {isSold && orderStatus && <StatusBadge status={orderStatus} />}
            {clientName && (
              <span className="text-gray-500 text-[11px]">• {clientName}</span>
            )}
            {date && (
              <span className="text-gray-600 text-[11px]">• {date}</span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0 mr-3">
          <p className="text-green-400 font-bold text-lg">R$ {price.toFixed(2)}</p>
          {item.tracking_code && (
            <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{item.tracking_code}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          {!isSold && onView && (
            <Button size="sm" onClick={() => onView(item)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 h-8 px-2.5">
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
          {isSold && onDetails && (
            <Button size="sm" onClick={() => onDetails(item)} className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/20 h-8 px-2.5">
              <Info className="w-3.5 h-3.5" />
            </Button>
          )}
          {isSold && onUpdateStatus && (
            <Button size="sm" onClick={() => onUpdateStatus(item)} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 h-8 px-2.5">
              <Edit className="w-3.5 h-3.5" />
            </Button>
          )}
          {isSold && onPrint && (
            <Button size="sm" onClick={() => onPrint(item)} className="bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 h-8 px-2.5">
              <Printer className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LojistaDashboardTabs({
  auctions, catalogSales,
  onViewAuction, onViewDetails, onUpdateStatus, onPrintReceipt,
  onViewCatalogDetails, onUpdateCatalogStatus
}) {
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");

  const activeAuctions = auctions.filter(a => a.status === 'active');
  const soldAuctions = auctions.filter(a => a.status === 'sold' || (a.status === 'ended' && a.winner_id));
  const activeCatalogSales = catalogSales.filter(s => s.status !== 'pending_payment' && s.status !== 'canceled');

  const tabs = [
    { id: "active", label: "Leilões Ativos", count: activeAuctions.length, color: "text-blue-400 border-blue-400" },
    { id: "sold", label: "Vendas Realizadas", count: soldAuctions.length, color: "text-green-400 border-green-400" },
    { id: "catalog", label: "Catálogo", count: activeCatalogSales.length, color: "text-purple-400 border-purple-400" },
  ];

  const filterBySearch = (item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (item.title || item.product_title || '').toLowerCase().includes(s) ||
           (item.winner_name || item.buyer_name || '').toLowerCase().includes(s);
  };

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-4 liquid-glass-card rounded-xl p-1.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              activeTab === tab.id ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}

        {/* Search */}
        <div className="ml-auto flex-shrink-0 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-9 pl-8 w-48 text-sm focus:border-white/20"
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="space-y-2">
        {activeTab === "active" && (
          activeAuctions.filter(filterBySearch).length > 0 ? (
            activeAuctions.filter(filterBySearch).map(auction => (
              <AuctionRow key={auction.id} item={auction} onView={onViewAuction} isSold={false} />
            ))
          ) : (
            <EmptyState message="Nenhum leilão ativo no momento" />
          )
        )}

        {activeTab === "sold" && (
          soldAuctions.filter(filterBySearch).length > 0 ? (
            soldAuctions.filter(filterBySearch).map(auction => (
              <AuctionRow
                key={auction.id}
                item={auction}
                isSold={true}
                onDetails={onViewDetails}
                onUpdateStatus={onUpdateStatus}
                onPrint={onPrintReceipt}
              />
            ))
          ) : (
            <EmptyState message="Nenhuma venda realizada ainda" />
          )
        )}

        {activeTab === "catalog" && (
          activeCatalogSales.filter(filterBySearch).length > 0 ? (
            activeCatalogSales.filter(filterBySearch).map(sale => (
              <AuctionRow
                key={sale.id}
                item={{
                  ...sale,
                  title: sale.product_title,
                  image_urls: sale.product_image ? [sale.product_image] : [],
                  current_price: sale.total_amount,
                  winner_name: sale.buyer_name,
                  order_status: sale.status,
                }}
                isSold={true}
                onDetails={(item) => onViewCatalogDetails(sale)}
                onUpdateStatus={(item) => onUpdateCatalogStatus(sale)}
              />
            ))
          ) : (
            <EmptyState message="Nenhuma venda do catálogo encontrada" />
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="liquid-glass-card rounded-xl py-16 text-center">
      <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}