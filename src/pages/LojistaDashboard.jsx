import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

import LojistaDashboardHeader from "@/components/lojista/LojistaDashboardHeader";
import LojistaDashboardStats from "@/components/lojista/LojistaDashboardStats";
import LojistaDashboardTabs from "@/components/lojista/LojistaDashboardTabs";

const StoreEntity = base44.entities.Store;
const AuctionEntity = base44.entities.Auction;
const CatalogSaleEntity = base44.entities.CatalogSale;
const AppUserEntity = base44.entities.AppUser;

export default function LojistaDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [currentStore, setCurrentStore] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [catalogSales, setCatalogSales] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, activeAuctions: 0, soldProducts: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsAuction, setDetailsAuction] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedLogin = sessionStorage.getItem("lojista_login");
    if (storedLogin) {
      const store = JSON.parse(storedLogin);
      setCurrentStore(store);
      setIsLoggedIn(true);
      loadDashboardData(store.id);
    }
  }, []);

  useEffect(() => {
    if (!currentStore?.id) return;
    const unsubscribeCatalog = CatalogSaleEntity.subscribe((event) => {
      if (event.data?.seller_id === currentStore.id) {
        loadDashboardData(currentStore.id);
        if (event.type === 'create') toast.success(`🎉 Nova venda: ${event.data.product_title}`);
        else if (event.type === 'update' && event.data.status === 'paid') toast.success(`💰 Pagamento confirmado: ${event.data.product_title}`);
      }
    });
    return () => unsubscribeCatalog();
  }, [currentStore]);

  useEffect(() => {
    if (!currentStore?.id) return;
    const unsubscribeAuction = AuctionEntity.subscribe((event) => {
      if (event.data?.seller_id === currentStore.id) {
        loadDashboardData(currentStore.id);
        if (event.type === 'update' && event.data.status === 'sold') toast.success(`🎊 Leilão vendido: ${event.data.title}`);
        else if (event.type === 'update' && event.data.status === 'ended' && event.data.winner_id) toast.success(`🏆 Leilão arrematado: ${event.data.title}`);
      }
    });
    return () => unsubscribeAuction();
  }, [currentStore]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 🔒 Auth segura: valida credenciais no backend, sem trafegar senhas
      const response = await base44.functions.invoke('lojistaAuth', {
        login: loginForm.login,
        password: loginForm.password
      });

      const result = response?.data || response;

      if (!result?.success) {
        toast.error(result?.error || "Login ou senha incorretos");
        setIsLoading(false);
        return;
      }

      const store = result.store;
      sessionStorage.setItem("lojista_login", JSON.stringify(store));
      setCurrentStore(store);
      setIsLoggedIn(true);
      toast.success(`Bem-vindo, ${store.store_name}!`);
      loadDashboardData(store.id);
    } catch (error) {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async (storeId) => {
    try {
      const allAuctions = await AuctionEntity.list("-created_date", 500);
      const storeAuctions = allAuctions.filter(a => a.seller_id === storeId);
      setAuctions(storeAuctions);

      const allCatalogSales = await CatalogSaleEntity.list("-created_date", 500);
      const storeCatalogSales = allCatalogSales.filter(s => s.seller_id === storeId);
      setCatalogSales(storeCatalogSales);

      const activeCount = storeAuctions.filter(a => a.status === 'active').length;
      const soldCount = storeAuctions.filter(a => a.status === 'sold' || (a.status === 'ended' && a.winner_id)).length;
      const totalSalesAuctions = storeAuctions
        .filter(a => a.status === 'sold' || (a.status === 'ended' && a.winner_id))
        .reduce((sum, a) => sum + (a.current_price || 0), 0);
      const totalSalesCatalog = storeCatalogSales
        .filter(s => s.status === 'paid' || s.status === 'shipped' || s.status === 'delivered')
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const totalCatalogProducts = storeCatalogSales.filter(s => s.status === 'paid' || s.status === 'shipped' || s.status === 'delivered').length;

      setStats({
        totalSales: totalSalesAuctions + totalSalesCatalog,
        activeAuctions: activeCount,
        soldProducts: soldCount + totalCatalogProducts
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("lojista_login");
    setIsLoggedIn(false);
    setCurrentStore(null);
    setAuctions([]);
    toast.success("Logout realizado com sucesso");
  };

  const handleUpdateStatus = (auction) => {
    setSelectedAuction(auction);
    setNewStatus(auction.order_status || 'paid');
    setTrackingCode(auction.tracking_code || '');
    setShowStatusModal(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedAuction) return;
    setIsUpdating(true);
    try {
      const isCatalogSale = catalogSales.some(s => s.id === selectedAuction.id);
      if (isCatalogSale) {
        await CatalogSaleEntity.update(selectedAuction.id, { status: newStatus, tracking_code: trackingCode });
        setCatalogSales(prev => prev.map(s => s.id === selectedAuction.id ? { ...s, status: newStatus, tracking_code: trackingCode } : s));
      } else {
        await AuctionEntity.update(selectedAuction.id, { order_status: newStatus, tracking_code: trackingCode });
        setAuctions(prev => prev.map(a => a.id === selectedAuction.id ? { ...a, order_status: newStatus, tracking_code: trackingCode } : a));
      }
      toast.success('✅ Status atualizado com sucesso!');
      setShowStatusModal(false);
      setSelectedAuction(null);
      setTrackingCode('');
    } catch (error) {
      toast.error('❌ Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewDetails = async (auction) => {
    setDetailsAuction(auction);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setClientDetails(null);
    try {
      if (auction.winner_id) {
        const users = await AppUserEntity.filter({ id: auction.winner_id });
        if (users && users.length > 0) setClientDetails(users[0]);
      }
    } catch (err) {
      console.error("Erro ao buscar dados do cliente:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrintReceipt = async (auction) => {
    try {
      toast.info("Gerando comprovante...");
      let clientData = null;
      if (auction.winner_id) {
        try {
          const users = await AppUserEntity.filter({ id: auction.winner_id });
          if (users && users.length > 0) clientData = users[0];
        } catch (err) { /* ignore */ }
      }
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error("Bloqueio de pop-up detectado."); return; }
      const htmlContent = `<html><head><title>Comprovante</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px}.section{margin:20px 0}.section-title{font-weight:bold;font-size:14px;margin-bottom:10px;border-bottom:1px solid #ccc;padding-bottom:5px}.info{margin:8px 0;font-size:13px}.footer{margin-top:30px;text-align:center;font-size:12px;border-top:1px solid #ccc;padding-top:10px}</style></head><body><div class="header"><h2>${currentStore.store_name}</h2><p>CNPJ: ${currentStore.cnpj || 'N/A'}</p></div><h3>Comprovante de Venda</h3><div class="section"><div class="section-title">Produto</div><div class="info"><strong>Descrição:</strong> ${auction.title || 'N/A'}</div><div class="info"><strong>Valor:</strong> R$ ${(auction.current_price || 0).toFixed(2)}</div><div class="info"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div></div><div class="section"><div class="section-title">Cliente</div><div class="info"><strong>Nome:</strong> ${clientData?.full_name || auction.winner_name || 'N/A'}</div><div class="info"><strong>Email:</strong> ${clientData?.email || 'N/A'}</div><div class="info"><strong>Telefone:</strong> ${clientData?.phone || 'N/A'}</div></div>${clientData?.address_street ? `<div class="section"><div class="section-title">Endereço</div><div class="info">${clientData.address_street}${clientData.address_number ? ', ' + clientData.address_number : ''}</div><div class="info">${clientData.address_neighborhood || ''} - ${clientData.address_city || ''} / ${clientData.address_state || ''}</div><div class="info">CEP: ${clientData.address_zip_code || 'N/A'}</div></div>` : ''}<div class="footer"><p>Obrigado pela preferência!</p><p style="font-size:10px;color:#666">Gerado em ${new Date().toLocaleString('pt-BR')}</p></div></body></html>`;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      toast.error("Erro ao gerar comprovante");
    }
  };

  // ========== LOGIN SCREEN ==========
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-green-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/6 rounded-full blur-[100px]" />

        <div className="relative z-10 w-full max-w-md">
          <div className="liquid-glass-card rounded-3xl overflow-hidden">
            <div className="p-8 text-center border-b border-white/5">
              <div className="inline-flex p-4 bg-gradient-to-br from-green-500/15 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-400/20 mb-6">
                <Store className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Portal do Lojista</h1>
              <p className="text-gray-500 text-sm">Acesse seu painel de vendas</p>
            </div>

            <div className="p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Usuário</Label>
                  <Input
                    placeholder="Digite seu login"
                    value={loginForm.login}
                    onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20"
                    required
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Senha</Label>
                  <Input
                    type="password"
                    placeholder="Digite sua senha"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/25"
                  disabled={isLoading}
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</> : "Entrar"}
                </Button>
              </form>
            </div>

            <div className="border-t border-white/5 bg-white/[0.02] px-8 py-4 text-center">
              <p className="text-gray-600 text-xs">© 2024 Leilão NoZap - Portal do Lojista</p>
            </div>
          </div>
        </div>

        <style>{`
          .liquid-glass-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            transition: all 0.4s cubic-bezier(0.23,1,0.320,1);
          }
          .liquid-glass-card:hover {
            border-color: rgba(255,255,255,0.12);
          }
        `}</style>
      </div>
    );
  }

  // ========== DASHBOARD ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-green-500/6 rounded-full blur-[150px] animate-liquid-drift" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] animate-liquid-drift-reverse" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-purple-500/4 rounded-full blur-[100px] animate-liquid-pulse" />

      <div className="relative z-10 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <LojistaDashboardHeader
            currentStore={currentStore}
            auctions={auctions}
            catalogSales={catalogSales}
            onLogout={handleLogout}
            onNewAuction={(currentStore.can_create_direto_fabrica || currentStore.can_create_arremate_devolucoes) ? () => navigate(createPageUrl("CreateAuction")) : null}
            onNewAuctionSDB={currentStore.can_create_sai_de_baixo ? () => navigate(createPageUrl("CreateAuctionSaiDeBaixo")) : null}
            onRefresh={() => loadDashboardData(currentStore.id)}
          />

          <LojistaDashboardStats
            stats={stats}
            auctions={auctions}
            catalogSales={catalogSales}
          />

          <LojistaDashboardTabs
            auctions={auctions}
            catalogSales={catalogSales}
            onViewAuction={(a) => navigate(createPageUrl("AuctionRoom") + `?id=${a.id}`)}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onPrintReceipt={handlePrintReceipt}
            onViewCatalogDetails={(sale) => {
              setDetailsAuction({
                ...sale,
                title: sale.product_title,
                image_urls: [sale.product_image],
                current_price: sale.total_amount,
                winner_id: sale.buyer_id,
                winner_name: sale.buyer_name,
                order_status: sale.status
              });
              setShowDetailsModal(true);
            }}
            onUpdateCatalogStatus={(sale) => {
              setSelectedAuction({
                ...sale,
                id: sale.id,
                title: sale.product_title,
                winner_name: sale.buyer_name,
                order_status: sale.status
              });
              setNewStatus(sale.status);
              setTrackingCode(sale.tracking_code || '');
              setShowStatusModal(true);
            }}
          />
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-gray-950 border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto liquid-glass-card-modal">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="space-y-4 animate-pulse">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                <div className="h-3 w-16 bg-white/10 rounded"></div>
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-white/10 rounded-xl"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-white/10 rounded"></div>
                    <div className="h-5 w-1/3 bg-green-500/20 rounded"></div>
                    <div className="h-3 w-1/4 bg-white/10 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                <div className="h-3 w-16 bg-white/10 rounded"></div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/10 rounded"></div>
                  <div className="h-3 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-3 w-2/3 bg-white/10 rounded"></div>
                </div>
              </div>
            </div>
          ) : detailsAuction && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Produto</p>
                <div className="flex gap-4">
                  {detailsAuction.image_urls?.[0] && (
                    <img src={detailsAuction.image_urls[0]} alt="" className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                  )}
                  <div className="space-y-1.5 text-sm">
                    <p className="text-white font-semibold">{detailsAuction.title}</p>
                    <p className="text-green-400 text-lg font-bold">R$ {detailsAuction.current_price?.toFixed(2)}</p>
                    <p className="text-gray-500 text-xs">{new Date(detailsAuction.created_date).toLocaleDateString('pt-BR')}</p>
                    {detailsAuction.tracking_code && (
                      <p className="text-gray-400 text-xs font-mono">Rastreio: {detailsAuction.tracking_code}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Cliente</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Nome:</span> <span className="text-white">{clientDetails?.full_name || detailsAuction.winner_name || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="text-white">{clientDetails?.email || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Telefone:</span> <span className="text-white">{clientDetails?.phone || 'N/A'}</span></p>
                  {clientDetails?.cpf && <p><span className="text-gray-500">CPF:</span> <span className="text-white">{clientDetails.cpf}</span></p>}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Endereço</p>
                {clientDetails?.address_street ? (
                  <div className="space-y-1.5 text-sm">
                    <p className="text-white">{clientDetails.address_street}{clientDetails.address_number ? ', ' + clientDetails.address_number : ''}</p>
                    {clientDetails.address_complement && <p className="text-gray-400">{clientDetails.address_complement}</p>}
                    <p className="text-white">{clientDetails.address_neighborhood} - {clientDetails.address_city} / {clientDetails.address_state}</p>
                    <p className="text-gray-400">CEP: {clientDetails.address_zip_code || 'N/A'}</p>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">Endereço não informado</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)} className="bg-white/10 hover:bg-white/15 border border-white/10">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-gray-950 border-white/10 text-white liquid-glass-card-modal">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Atualizar Status</DialogTitle>
          </DialogHeader>
          {selectedAuction && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-sm text-white font-medium">{selectedAuction.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedAuction.winner_name}</p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 text-white">
                    <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
                    <SelectItem value="paid">Pagamento Confirmado</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newStatus === 'shipped' || newStatus === 'delivered') && (
                <div>
                  <Label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Rastreio</Label>
                  <Input
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ex: AA123456789BR"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isUpdating} className="border-white/10 text-gray-400">Cancelar</Button>
            <Button onClick={handleConfirmStatusUpdate} disabled={isUpdating} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              {isUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando...</> : 'Atualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes liquidDrift {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-15px,25px) scale(1.08); }
        }
        @keyframes liquidDriftReverse {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(15px,-25px) scale(1.06); }
        }
        @keyframes liquidPulse {
          0%, 100% { transform: scale(1); opacity: 0.04; }
          50% { transform: scale(1.12); opacity: 0.08; }
        }
        .animate-liquid-drift { animation: liquidDrift 12s ease-in-out infinite; }
        .animate-liquid-drift-reverse { animation: liquidDriftReverse 14s ease-in-out infinite; }
        .animate-liquid-pulse { animation: liquidPulse 8s ease-in-out infinite; }
        .liquid-glass-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.4s cubic-bezier(0.23,1,0.320,1);
        }
        .liquid-glass-card:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .liquid-glass-card-modal {
          background: linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(5,5,10,0.98) 100%) !important;
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
      `}</style>
    </div>
  );
}