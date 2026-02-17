import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Package, DollarSign, TrendingUp, LogOut, Printer, Eye, Edit, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

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

  // 🔔 Atualização em tempo real - Vendas do Catálogo
  useEffect(() => {
    if (!currentStore?.id) return;

    const unsubscribeCatalog = CatalogSaleEntity.subscribe((event) => {
      // Verifica se a venda é desta loja
      if (event.data?.seller_id === currentStore.id) {
        console.log('🔔 Nova venda do catálogo detectada:', event.data);
        loadDashboardData(currentStore.id);
        
        if (event.type === 'create') {
          toast.success(`🎉 Nova venda: ${event.data.product_title}`);
        } else if (event.type === 'update' && event.data.status === 'paid') {
          toast.success(`💰 Pagamento confirmado: ${event.data.product_title}`);
        }
      }
    });

    return () => {
      unsubscribeCatalog();
    };
  }, [currentStore]);

  // 🔔 Atualização em tempo real - Leilões
  useEffect(() => {
    if (!currentStore?.id) return;

    const unsubscribeAuction = AuctionEntity.subscribe((event) => {
      // Verifica se o leilão é desta loja
      if (event.data?.seller_id === currentStore.id) {
        console.log('🔔 Atualização de leilão detectada:', event.data);
        loadDashboardData(currentStore.id);
        
        if (event.type === 'update' && event.data.status === 'sold') {
          toast.success(`🎊 Leilão vendido: ${event.data.title}`);
        } else if (event.type === 'update' && event.data.status === 'ended' && event.data.winner_id) {
          toast.success(`🏆 Leilão arrematado: ${event.data.title}`);
        }
      }
    });

    return () => {
      unsubscribeAuction();
    };
  }, [currentStore]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const stores = await StoreEntity.list();
      const store = stores.find(
        s => s.store_login === loginForm.login && s.store_password === loginForm.password
      );

      if (!store) {
        toast.error("Login ou senha incorretos");
        setIsLoading(false);
        return;
      }

      if (store.status !== "active") {
        toast.error("Sua loja ainda não foi aprovada pelo administrador");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("lojista_login", JSON.stringify(store));
      setCurrentStore(store);
      setIsLoggedIn(true);
      toast.success(`Bem-vindo, ${store.store_name}!`);
      loadDashboardData(store.id);
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async (storeId) => {
    try {
      // Carrega leilões
      const allAuctions = await AuctionEntity.list("-created_date", 500);
      const storeAuctions = allAuctions.filter(a => a.seller_id === storeId);
      setAuctions(storeAuctions);

      // Carrega vendas do catálogo
      const allCatalogSales = await CatalogSaleEntity.list("-created_date", 500);
      const storeCatalogSales = allCatalogSales.filter(s => s.seller_id === storeId);
      setCatalogSales(storeCatalogSales);

      const activeCount = storeAuctions.filter(a => a.status === 'active').length;
      const soldCount = storeAuctions.filter(a => a.status === 'sold' || (a.status === 'ended' && a.winner_id)).length;
      const totalSalesAuctions = storeAuctions
        .filter(a => a.status === 'sold' || (a.status === 'ended' && a.winner_id))
        .reduce((sum, a) => sum + (a.current_price || 0), 0);
      
      // Soma vendas do catálogo pagas
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
      // Verifica se é venda do catálogo ou leilão
      const isCatalogSale = catalogSales.some(s => s.id === selectedAuction.id);
      
      if (isCatalogSale) {
        await CatalogSaleEntity.update(selectedAuction.id, {
          status: newStatus,
          tracking_code: trackingCode
        });

        setCatalogSales(prev => prev.map(s => 
          s.id === selectedAuction.id 
            ? { ...s, status: newStatus, tracking_code: trackingCode }
            : s
        ));
      } else {
        await AuctionEntity.update(selectedAuction.id, {
          order_status: newStatus,
          tracking_code: trackingCode
        });

        setAuctions(prev => prev.map(a => 
          a.id === selectedAuction.id 
            ? { ...a, order_status: newStatus, tracking_code: trackingCode }
            : a
        ));
      }

      toast.success('✅ Status atualizado com sucesso!');
      setShowStatusModal(false);
      setSelectedAuction(null);
      setTrackingCode('');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('❌ Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewDetails = async (auction) => {
    setDetailsAuction(auction);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    
    try {
      if (auction.winner_id) {
        const users = await AppUserEntity.filter({ id: auction.winner_id });
        if (users && users.length > 0) {
          setClientDetails(users[0]);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados do cliente:", err);
      toast.error("Erro ao carregar dados do cliente");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrintReceipt = async (auction) => {
    try {
      toast.info("Gerando comprovante...");
      
      // Busca dados completos do cliente
      let clientData = null;
      
      if (auction.winner_id) {
        try {
          const users = await AppUserEntity.filter({ id: auction.winner_id });
          if (users && users.length > 0) {
            clientData = users[0];
          }
        } catch (err) {
          console.warn("Não foi possível buscar dados do cliente:", err);
        }
      }

      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast.error("Bloqueio de pop-up detectado. Permita pop-ups para este site.");
        return;
      }

      const htmlContent = `
        <html>
          <head>
            <title>Comprovante de Venda</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .section { margin: 20px 0; }
              .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
              .info { margin: 8px 0; font-size: 13px; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${currentStore.store_name || 'Loja'}</h2>
              <p>CNPJ: ${currentStore.cnpj || 'N/A'}</p>
              ${currentStore.address ? `<p>${currentStore.address}</p>` : ''}
            </div>
            
            <h3>Comprovante de Venda</h3>
            
            <div class="section">
              <div class="section-title">Produto</div>
              <div class="info"><strong>Descrição:</strong> ${auction.title || 'N/A'}</div>
              <div class="info"><strong>Valor:</strong> R$ ${(auction.current_price || 0).toFixed(2)}</div>
              <div class="info"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Dados do Cliente</div>
              <div class="info"><strong>Nome:</strong> ${clientData?.full_name || auction.winner_name || 'N/A'}</div>
              <div class="info"><strong>Email:</strong> ${clientData?.email || 'N/A'}</div>
              <div class="info"><strong>Telefone:</strong> ${clientData?.phone || 'N/A'}</div>
            </div>
            
            ${clientData?.address_street ? `
              <div class="section">
                <div class="section-title">Endereço de Entrega</div>
                <div class="info">${clientData.address_street}${clientData.address_number ? ', ' + clientData.address_number : ''}</div>
                ${clientData.address_complement ? `<div class="info">${clientData.address_complement}</div>` : ''}
                <div class="info">${clientData.address_neighborhood || ''} - ${clientData.address_city || ''} / ${clientData.address_state || ''}</div>
                <div class="info"><strong>CEP:</strong> ${clientData.address_zip_code || 'N/A'}</div>
              </div>
            ` : '<div class="section"><div class="section-title">Endereço de Entrega</div><div class="info">Não informado</div></div>'}
            
            <div class="footer">
              <p>Obrigado pela preferência!</p>
              <p style="font-size: 10px; color: #666;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      toast.error("Erro ao gerar comprovante: " + error.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
        
        {/* Gradients */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
            
            <CardHeader className="relative text-center pt-8 pb-6 border-b border-white/10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-2xl blur-lg"></div>
                  <div className="relative p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30">
                    <Store className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">Portal do Lojista</CardTitle>
              <p className="text-gray-300 text-sm">Acesse seu painel de vendas</p>
            </CardHeader>

            <CardContent className="relative pt-8 space-y-5">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label className="text-gray-200 text-sm font-semibold mb-2 block">Usuário</Label>
                  <Input
                    placeholder="Digite seu login"
                    value={loginForm.login}
                    onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                    className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-12 focus:border-green-400/50 focus:ring-2 focus:ring-green-400/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-200 text-sm font-semibold mb-2 block">Senha</Label>
                  <Input
                    type="password"
                    placeholder="Digite sua senha"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="backdrop-blur-sm bg-white/5 border-white/20 text-white placeholder:text-gray-400 h-12 focus:border-green-400/50 focus:ring-2 focus:ring-green-400/20 transition-all"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/30 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>

            <div className="relative border-t border-white/10 bg-white/5 px-6 py-4 text-center">
              <p className="text-gray-400 text-xs">
                © 2024 Leilão NoZap - Portal do Lojista
              </p>
            </div>
          </Card>

          <p className="text-center text-gray-400 text-xs mt-6">
            Dúvidas? Entre em contato com o suporte
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      
      <div className="absolute top-20 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-liquid-drift"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-liquid-drift-reverse"></div>
      <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-liquid-pulse"></div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
            <div className="flex items-center gap-6">
              {currentStore.logo_url && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                  <img 
                    src={currentStore.logo_url} 
                    alt="Logo" 
                    className="relative w-20 h-20 object-cover rounded-2xl border border-green-400/30 shadow-lg shadow-green-500/20" 
                  />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">{currentStore.store_name}</h1>
                <p className="text-gray-400 text-sm">Painel de Controle Premium</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {currentStore.can_create_sai_de_baixo && (
                <Button
                  onClick={() => navigate(createPageUrl("CreateAuctionSaiDeBaixo"))}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Novo Leilão
                </Button>
              )}
              
              {(currentStore.can_create_direto_fabrica || currentStore.can_create_arremate_devolucoes) && (
                <Button
                  onClick={() => navigate(createPageUrl("CreateAuction"))}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Novo Leilão NoZap
                </Button>
              )}
              
              <Button 
                onClick={handleLogout} 
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white backdrop-blur-sm transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Total Vendido */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all animate-liquid-glow"></div>
              <Card className="relative backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-green-400/30 hover:border-green-400/50 transition-all shadow-2xl overflow-hidden liquid-glass-card">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                <CardContent className="relative pt-8 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Vendido</p>
                      <p className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                        R$ {stats.totalSales.toFixed(2)}
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                      <div className="relative p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30">
                        <DollarSign className="w-8 h-8 text-green-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leilões Ativos */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all animate-liquid-glow" style={{ animationDelay: '0.5s' }}></div>
              <Card className="relative backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-blue-400/30 hover:border-blue-400/50 transition-all shadow-2xl overflow-hidden liquid-glass-card" style={{ animationDelay: '0.3s' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                <CardContent className="relative pt-8 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Leilões Ativos</p>
                      <p className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
                        {stats.activeAuctions}
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                      <div className="relative p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30">
                        <TrendingUp className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Produtos Vendidos */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all animate-liquid-glow" style={{ animationDelay: '1s' }}></div>
              <Card className="relative backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-purple-400/30 hover:border-purple-400/50 transition-all shadow-2xl overflow-hidden liquid-glass-card" style={{ animationDelay: '0.6s' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                <CardContent className="relative pt-8 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Produtos Vendidos</p>
                      <p className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                        {stats.soldProducts}
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"></div>
                      <div className="relative p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl border border-purple-400/30">
                        <Package className="w-8 h-8 text-purple-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        {/* Tabs */}
         <Tabs defaultValue="auctions" className="w-full">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="auctions">Meus Leilões</TabsTrigger>
            <TabsTrigger value="sold">Vendas Realizadas</TabsTrigger>
            <TabsTrigger value="catalog">Vendas do Catálogo</TabsTrigger>
          </TabsList>

          <TabsContent value="auctions" className="space-y-4 mt-6">
            {auctions.filter(a => a.status === 'active').map(auction => (
              <Card key={auction.id} className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {auction.image_urls?.[0] && (
                      <img src={auction.image_urls[0]} alt={auction.title} className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">{auction.title}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge className="bg-blue-600">Ativo</Badge>
                        <span className="text-gray-400">Lance Atual: R$ {auction.current_price?.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(createPageUrl("AuctionRoom") + `?id=${auction.id}`)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Leilão
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sold" className="space-y-4 mt-6">
            {auctions.filter(a => a.status === 'sold' || (a.status === 'ended' && a.winner_id)).map(auction => (
              <Card key={auction.id} className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {auction.image_urls?.[0] && (
                      <img src={auction.image_urls[0]} alt={auction.title} className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">{auction.title}</h3>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p><strong>Cliente:</strong> {auction.winner_name || 'N/A'}</p>
                        <p><strong>Valor:</strong> R$ {auction.current_price?.toFixed(2)}</p>
                        <Badge className="bg-green-600">Vendido</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleViewDetails(auction)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Info className="w-4 h-4 mr-2" />
                        Detalhes
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(auction)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Atualizar Status
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePrintReceipt(auction)}
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="catalog" className="space-y-4 mt-6">
            {catalogSales.filter(s => s.status !== 'pending_payment' && s.status !== 'canceled').map(sale => (
              <Card key={sale.id} className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {sale.product_image && (
                      <img src={sale.product_image} alt={sale.product_title} className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">{sale.product_title}</h3>
                      <div className="space-y-1 text-sm text-gray-300">
                        <p><strong>Cliente:</strong> {sale.buyer_name || 'N/A'}</p>
                        <p><strong>Valor:</strong> R$ {sale.total_amount?.toFixed(2)}</p>
                        <Badge className={`${
                          sale.status === 'delivered' ? 'bg-green-600' :
                          sale.status === 'shipped' ? 'bg-blue-600' :
                          sale.status === 'paid' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`}>
                          {sale.status === 'paid' ? 'Pago' :
                           sale.status === 'shipped' ? 'Enviado' :
                           sale.status === 'delivered' ? 'Entregue' : sale.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
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
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Info className="w-4 h-4 mr-2" />
                        Detalhes
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
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
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Atualizar Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {catalogSales.filter(s => s.status !== 'pending_payment' && s.status !== 'canceled').length === 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">Nenhuma venda do catálogo encontrada</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          </Tabs>

          {/* Modal de Detalhes da Venda */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Venda</DialogTitle>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : detailsAuction && (
              <div className="space-y-6">
                {/* Informações do Produto */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">Informações do Produto</h3>
                  <div className="flex gap-4">
                    {detailsAuction.image_urls?.[0] && (
                      <img 
                        src={detailsAuction.image_urls[0]} 
                        alt={detailsAuction.title} 
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 space-y-2 text-sm">
                      <p><strong className="text-gray-400">Produto:</strong> {detailsAuction.title}</p>
                      <p><strong className="text-gray-400">Valor:</strong> <span className="text-green-400 text-lg font-bold">R$ {detailsAuction.current_price?.toFixed(2)}</span></p>
                      <p><strong className="text-gray-400">Data da Venda:</strong> {new Date(detailsAuction.created_date).toLocaleDateString('pt-BR')}</p>
                      {detailsAuction.order_status && (
                        <p><strong className="text-gray-400">Status:</strong> 
                          <Badge className={`ml-2 ${
                            detailsAuction.order_status === 'delivered' ? 'bg-green-600' :
                            detailsAuction.order_status === 'shipped' ? 'bg-blue-600' :
                            detailsAuction.order_status === 'paid' ? 'bg-yellow-600' :
                            'bg-gray-600'
                          }`}>
                            {detailsAuction.order_status === 'awaiting_payment' ? 'Aguardando Pagamento' :
                             detailsAuction.order_status === 'paid' ? 'Pago' :
                             detailsAuction.order_status === 'shipped' ? 'Enviado' :
                             detailsAuction.order_status === 'delivered' ? 'Entregue' :
                             detailsAuction.order_status === 'canceled' ? 'Cancelado' : detailsAuction.order_status}
                          </Badge>
                        </p>
                      )}
                      {detailsAuction.tracking_code && (
                        <p><strong className="text-gray-400">Rastreio:</strong> {detailsAuction.tracking_code}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">Dados do Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong className="text-gray-400">Nome:</strong> {clientDetails?.full_name || detailsAuction.winner_name || 'N/A'}</p>
                    <p><strong className="text-gray-400">Email:</strong> {clientDetails?.email || 'Não informado'}</p>
                    <p><strong className="text-gray-400">Telefone:</strong> {clientDetails?.phone || 'Não informado'}</p>
                    {clientDetails?.cpf && (
                      <p><strong className="text-gray-400">CPF:</strong> {clientDetails.cpf}</p>
                    )}
                  </div>
                </div>

                {/* Endereço de Entrega */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Endereço de Entrega</h3>
                  {clientDetails?.address_street ? (
                    <div className="space-y-2 text-sm">
                      <p><strong className="text-gray-400">Logradouro:</strong> {clientDetails.address_street}{clientDetails.address_number ? ', ' + clientDetails.address_number : ''}</p>
                      {clientDetails.address_complement && (
                        <p><strong className="text-gray-400">Complemento:</strong> {clientDetails.address_complement}</p>
                      )}
                      <p><strong className="text-gray-400">Bairro:</strong> {clientDetails.address_neighborhood || 'N/A'}</p>
                      <p><strong className="text-gray-400">Cidade/UF:</strong> {clientDetails.address_city || 'N/A'} / {clientDetails.address_state || 'N/A'}</p>
                      <p><strong className="text-gray-400">CEP:</strong> {clientDetails.address_zip_code || 'N/A'}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Endereço não informado</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-700 hover:bg-gray-600"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          {/* Modal de Atualização de Status */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Atualizar Status do Pedido</DialogTitle>
            </DialogHeader>
            
            {selectedAuction && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Produto: {selectedAuction.title}</p>
                  <p className="text-sm text-gray-400">Cliente: {selectedAuction.winner_name}</p>
                </div>

                <div>
                  <Label htmlFor="status" className="text-gray-300">Status do Pedido</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
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
                    <Label htmlFor="trackingCode" className="text-gray-300">Código de Rastreio</Label>
                    <Input
                      id="trackingCode"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Ex: AA123456789BR"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Este código será exibido para o cliente acompanhar a entrega
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
                disabled={isUpdating}
                className="border-gray-600 text-gray-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmStatusUpdate}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <style>{`
        @keyframes liquidDrift {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
            opacity: 0.1;
          }
          25% {
            transform: translate(20px, -20px) scale(1.05);
            opacity: 0.15;
          }
          50% {
            transform: translate(-10px, 30px) scale(1.1);
            opacity: 0.12;
          }
          75% {
            transform: translate(30px, 10px) scale(1.02);
            opacity: 0.14;
          }
        }

        @keyframes liquidDriftReverse {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
            opacity: 0.1;
          }
          25% {
            transform: translate(-30px, 20px) scale(1.05);
            opacity: 0.15;
          }
          50% {
            transform: translate(10px, -30px) scale(1.1);
            opacity: 0.12;
          }
          75% {
            transform: translate(-20px, -10px) scale(1.02);
            opacity: 0.14;
          }
        }

        @keyframes liquidPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.05;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.1;
          }
        }

        @keyframes liquidGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.02);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 255, 255, 0.1), inset 0 0 40px rgba(255, 255, 255, 0.05);
          }
        }

        .animate-liquid-drift {
          animation: liquidDrift 8s ease-in-out infinite;
        }

        .animate-liquid-drift-reverse {
          animation: liquidDriftReverse 10s ease-in-out infinite;
        }

        .animate-liquid-pulse {
          animation: liquidPulse 6s ease-in-out infinite;
        }

        .animate-liquid-glow {
          animation: liquidGlow 4s ease-in-out infinite;
        }

        .liquid-glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.5s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .liquid-glass-card:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
      `}</style>
    </div>
  );
}