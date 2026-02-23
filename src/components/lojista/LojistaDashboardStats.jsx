import React from "react";
import { DollarSign, TrendingUp, Package, ShoppingCart, Clock, BarChart3 } from "lucide-react";

function StatCard({ label, value, prefix, suffix, icon: Icon, gradient, borderColor, delay }) {
  return (
    <div className="group relative" style={{ animationDelay: delay }}>
      <div className={`absolute inset-0 ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className={`relative liquid-glass-card rounded-2xl p-5 ${borderColor} hover:scale-[1.02] transition-all duration-300`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-widest">{label}</span>
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} border border-white/10`}>
            <Icon className="w-4.5 h-4.5 text-white/80" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white">
          {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: prefix === 'R$ ' ? 2 : 0, maximumFractionDigits: prefix === 'R$ ' ? 2 : 0 }) : value}{suffix}
        </p>
      </div>
    </div>
  );
}

export default function LojistaDashboardStats({ stats, auctions, catalogSales }) {
  const pendingShipment = [
    ...auctions.filter(a => (a.status === 'sold' || (a.status === 'ended' && a.winner_id)) && a.order_status === 'paid'),
    ...catalogSales.filter(s => s.status === 'paid')
  ].length;

  const shippedCount = [
    ...auctions.filter(a => a.order_status === 'shipped'),
    ...catalogSales.filter(s => s.status === 'shipped')
  ].length;

  const deliveredCount = [
    ...auctions.filter(a => a.order_status === 'delivered'),
    ...catalogSales.filter(s => s.status === 'delivered')
  ].length;

  // Ticket médio
  const totalTransactions = stats.soldProducts || 1;
  const avgTicket = stats.totalSales / totalTransactions;

  return (
    <div className="space-y-4 mb-8">
      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          label="Faturamento"
          value={stats.totalSales}
          prefix="R$ "
          icon={DollarSign}
          gradient="from-green-500/20 to-emerald-500/10"
          borderColor="border-green-500/20 hover:border-green-400/40"
        />
        <StatCard
          label="Leilões Ativos"
          value={stats.activeAuctions}
          prefix=""
          icon={TrendingUp}
          gradient="from-blue-500/20 to-cyan-500/10"
          borderColor="border-blue-500/20 hover:border-blue-400/40"
          delay="0.1s"
        />
        <StatCard
          label="Vendidos"
          value={stats.soldProducts}
          prefix=""
          icon={Package}
          gradient="from-purple-500/20 to-pink-500/10"
          borderColor="border-purple-500/20 hover:border-purple-400/40"
          delay="0.2s"
        />
        <StatCard
          label="Ticket Médio"
          value={avgTicket}
          prefix="R$ "
          icon={BarChart3}
          gradient="from-amber-500/20 to-orange-500/10"
          borderColor="border-amber-500/20 hover:border-amber-400/40"
          delay="0.3s"
        />
      </div>

      {/* Pipeline de pedidos */}
      <div className="liquid-glass-card rounded-2xl p-5">
        <p className="text-gray-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Pipeline de Pedidos</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{pendingShipment}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Aguardando Envio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <ShoppingCart className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{shippedCount}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Em Trânsito</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{deliveredCount}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Entregues</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}