import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Package, LogOut, Bell, RefreshCw } from "lucide-react";

export default function LojistaDashboardHeader({ currentStore, auctions, catalogSales, onLogout, onNewAuction, onNewAuctionSDB, onRefresh }) {
  const pendingCount = [
    ...auctions.filter(a => (a.status === 'sold' || (a.status === 'ended' && a.winner_id)) && (!a.order_status || a.order_status === 'paid')),
    ...catalogSales.filter(s => s.status === 'paid')
  ].length;

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-medium tracking-wide uppercase">Online</span>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-yellow-400" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </span>
            </div>
          )}
          <Button
            onClick={onRefresh}
            size="sm"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 h-8 px-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main header */}
      <div className="liquid-glass-card rounded-2xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            {currentStore.logo_url ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-emerald-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <img
                  src={currentStore.logo_url}
                  alt="Logo"
                  className="relative w-16 h-16 object-cover rounded-2xl border border-white/20 shadow-xl"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-emerald-500/10 rounded-2xl blur-xl" />
                <div className="relative p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-400/30">
                  <Store className="w-7 h-7 text-green-400" />
                </div>
              </div>
            )}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-0.5">{currentStore.store_name}</h1>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2">
                  Loja Ativa
                </Badge>
                {currentStore.cnpj && (
                  <span className="text-gray-500 text-xs">CNPJ: {currentStore.cnpj}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentStore.can_create_sai_de_baixo && onNewAuctionSDB && (
              <Button
                onClick={onNewAuctionSDB}
                size="sm"
                className="bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-600 hover:to-red-700 text-white backdrop-blur-sm border border-red-400/30 shadow-lg shadow-red-500/20 h-9"
              >
                <Package className="w-3.5 h-3.5 mr-1.5" />
                Novo Leilão SDB
              </Button>
            )}

            {(currentStore.can_create_direto_fabrica || currentStore.can_create_arremate_devolucoes) && onNewAuction && (
              <Button
                onClick={onNewAuction}
                size="sm"
                className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 hover:from-green-600 hover:to-emerald-700 text-white backdrop-blur-sm border border-green-400/30 shadow-lg shadow-green-500/20 h-9"
              >
                <Package className="w-3.5 h-3.5 mr-1.5" />
                Novo Leilão
              </Button>
            )}

            <Button
              onClick={onLogout}
              size="sm"
              className="bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 backdrop-blur-sm h-9"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}