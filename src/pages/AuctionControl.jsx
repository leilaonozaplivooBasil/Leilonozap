import React, { useState, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import { base44 } from "@/api/base44Client";
import { adminDataProxy } from "@/functions/adminDataProxy";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, RotateCcw, Eye, Filter, Trash2, ShoppingCart, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import AddToCatalogModal from "@/components/admin/AddToCatalogModal";
import LiveMetrics from "@/components/admin/LiveMetrics";
import PageFullscreen from "@/components/admin/PageFullscreen";

const Auction = base44.entities.Auction;
const Payment = base44.entities.Payment;
const Bid = base44.entities.Bid;
const AuctionMessage = base44.entities.AuctionMessage;

// Verifica se um leilão está expirado (ativo no banco mas com end_time no passado)
const isExpiredActive = (auction) =>
  auction.status === 'active' &&
  auction.end_time &&
  new Date(auction.end_time) < new Date();

export default function AuctionControl() {
  const [auctions, setAuctions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showBulkResumeModal, setShowBulkResumeModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [resumeDuration, setResumeDuration] = useState("24");
  const [bulkResumeDuration, setBulkResumeDuration] = useState("24");
  const [customHours, setCustomHours] = useState("");
  const [bulkCustomHours, setBulkCustomHours] = useState("");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkResuming, setIsBulkResuming] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const getCallerEmail = () => {
    try { const s = localStorage.getItem('currentUser'); return s ? JSON.parse(s).email : null; } catch { return null; }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [auctionsData, paymentsResponse] = await Promise.all([
        Auction.list("-created_date", 200),
        adminDataProxy({ entity_name: 'Payment', method: 'list', params: { sort_by: '-created_date', limit: 500 }, caller_email: getCallerEmail() })
      ]);
      const paymentsData = paymentsResponse?.data?.data || paymentsResponse?.data || [];
      setAuctions(auctionsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar leilões");
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatus = (auctionId) => {
    const payment = payments.find(p => p.auction_id === auctionId && p.status === 'paid');
    return payment ? 'paid' : 'unpaid';
  };

  const handleResumeAuction = async () => {
    if (!selectedAuction) return;

    const hours = resumeDuration === "custom" ? parseInt(customHours) : parseInt(resumeDuration);
    if (!hours || hours <= 0) {
      toast.error("Duração inválida");
      return;
    }

    try {
      toast.info("Reiniciando leilão completamente...");
      
      const allBids = await Bid.filter({ auction_id: selectedAuction.id });
      for (const bid of allBids) await Bid.delete(bid.id);
      
      const allMessages = await AuctionMessage.filter({ auction_id: selectedAuction.id });
      for (const msg of allMessages) await AuctionMessage.delete(msg.id);
      
      const newEndTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await Auction.update(selectedAuction.id, {
        status: "active",
        end_time: newEndTime,
        current_price: selectedAuction.starting_price,
        winner_id: null,
        winner_name: null,
        order_status: null,
        tracking_code: null
      });

      toast.success(`Leilão reiniciado! Duração: ${hours}h`);
      setShowResumeModal(false);
      setSelectedAuction(null);
      loadData();
    } catch (error) {
      console.error("Erro ao retomar leilão:", error);
      toast.error("Erro ao retomar leilão: " + error.message);
    }
  };

  const handleDeleteAuction = async (auction) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR o leilão "${auction.title}"?\n\nEsta ação é irreversível e removerá:\n• O leilão\n• Todos os lances\n• Todas as mensagens\n• Histórico de pagamentos`)) {
      return;
    }

    try {
      toast.info("Excluindo leilão...");
      
      try {
        const allBids = await Bid.filter({ auction_id: auction.id });
        for (const bid of allBids) {
          try { await Bid.delete(bid.id); } catch (e) { console.warn("Lance já excluído:", bid.id); }
        }
      } catch (e) { console.warn("Erro ao buscar lances:", e); }
      
      try {
        const allMessages = await AuctionMessage.filter({ auction_id: auction.id });
        for (const msg of allMessages) {
          try { await AuctionMessage.delete(msg.id); } catch (e) { console.warn("Mensagem já excluída:", msg.id); }
        }
      } catch (e) { console.warn("Erro ao buscar mensagens:", e); }
      
      const auctionPayments = payments.filter(p => p.auction_id === auction.id);
      for (const payment of auctionPayments) {
        try { await Payment.delete(payment.id); } catch (e) { console.warn("Pagamento já excluído:", payment.id); }
      }
      
      try {
        await Auction.delete(auction.id);
        toast.success(`Leilão "${auction.title}"excluído com sucesso!`);
      } catch (error) {
        if (error.message?.includes('not found')) {
          toast.success(`Leilão já foi excluído anteriormente`);
        } else {
          throw error;
        }
      }

      loadData();
    } catch (error) {
      console.error("Erro ao excluir leilão:", error);
      toast.error("Erro ao excluir leilão: " + error.message);
      loadData();
    }
  };

  // ─── AÇÕES EM LOTE ──────────────────────────────────────────────────────────

  const expiredActiveAuctions = auctions.filter(a => !a.is_investment_plan && isExpiredActive(a));

  const handleBulkDeleteExpired = async () => {
    if (expiredActiveAuctions.length === 0) {
      toast.info("Nenhum leilão expirado para excluir.");
      return;
    }
    if (!confirm(`Excluir ${expiredActiveAuctions.length} leilão(ões) com data expirada?\n\nEsta ação é irreversível.`)) return;

    setIsBulkDeleting(true);
    let deleted = 0;
    for (const auction of expiredActiveAuctions) {
      try {
        const allBids = await Bid.filter({ auction_id: auction.id });
        for (const bid of allBids) { try { await Bid.delete(bid.id); } catch (_) {} }
        const allMessages = await AuctionMessage.filter({ auction_id: auction.id });
        for (const msg of allMessages) { try { await AuctionMessage.delete(msg.id); } catch (_) {} }
        await Auction.delete(auction.id);
        deleted++;
      } catch (e) {
        console.error("Erro ao excluir em lote:", auction.id, e);
      }
    }
    setIsBulkDeleting(false);
    toast.success(`${deleted} leilão(ões) expirado(s) excluído(s)!`);
    loadData();
  };

  const handleBulkResumeExpired = async () => {
    const hours = bulkResumeDuration === "custom" ? parseInt(bulkCustomHours) : parseInt(bulkResumeDuration);
    if (!hours || hours <= 0) { toast.error("Duração inválida"); return; }
    if (expiredActiveAuctions.length === 0) { toast.info("Nenhum leilão expirado para reativar."); return; }

    setIsBulkResuming(true);
    let reactivated = 0;
    const newEndTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    for (const auction of expiredActiveAuctions) {
      try {
        const allBids = await Bid.filter({ auction_id: auction.id });
        for (const bid of allBids) { try { await Bid.delete(bid.id); } catch (_) {} }
        const allMessages = await AuctionMessage.filter({ auction_id: auction.id });
        for (const msg of allMessages) { try { await AuctionMessage.delete(msg.id); } catch (_) {} }
        await Auction.update(auction.id, {
          status: "active",
          end_time: newEndTime,
          current_price: auction.starting_price,
          winner_id: null,
          winner_name: null,
          order_status: null,
          tracking_code: null
        });
        reactivated++;
      } catch (e) {
        console.error("Erro ao reativar em lote:", auction.id, e);
      }
    }
    setIsBulkResuming(false);
    setShowBulkResumeModal(false);
    toast.success(`${reactivated} leilão(ões) reativado(s) por ${hours}h!`);
    loadData();
  };

  // ─── FILTROS ─────────────────────────────────────────────────────────────────

  const filteredAuctions = auctions.filter(auction => {
    if (auction.is_investment_plan) return false;
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return auction.status === "active" && !isExpiredActive(auction);
    if (filterStatus === "expired") return isExpiredActive(auction);
    if (filterStatus === "ended") return auction.status !== "active";
    if (filterStatus === "paid") return auction.status !== "active" && getPaymentStatus(auction.id) === "paid";
    if (filterStatus === "unpaid") return auction.status !== "active" && getPaymentStatus(auction.id) === "unpaid";
    return true;
  });

  const visibleAuctions = React.useMemo(() => auctions.filter(a => !a.is_investment_plan), [auctions]);

  const getStatusBadge = (auction) => {
    if (isExpiredActive(auction)) {
      return <Badge className="bg-orange-600">⏰ Expirado</Badge>;
    }
    if (auction.status === "active") {
      return <Badge className="bg-green-600">Ativo</Badge>;
    }
    const paymentStatus = getPaymentStatus(auction.id);
    if (paymentStatus === "paid") return <Badge className="bg-blue-600">Finalizado - Pago</Badge>;
    return <Badge className="bg-red-600">Finalizado - Não Pago</Badge>;
  };

  return (
    <PageFullscreen>
    <div className="min-h-screen bg-gray-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Controle de Leilões</h1>
            <p className="text-sm sm:text-base text-gray-400">Gerencie todos os leilões</p>
          </div>
          <Button onClick={loadData} variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
            Atualizar
          </Button>
        </div>

        {/* Métricas ao Vivo */}
        <LiveMetrics />

        {/* Banner de Leilões Expirados */}
        {expiredActiveAuctions.length > 0 && (
          <div className="mb-6 bg-orange-900/40 border border-orange-500/50 rounded-xl px-5 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold text-orange-300">
                    {expiredActiveAuctions.length} leilão(ões) com data expirada ainda marcado(s) como ativo(s)
                  </p>
                  <p className="text-orange-400/70 text-xs mt-0.5">
                    Eles já foram removidos da listagem pública. Aqui você pode excluí-los ou reativá-los.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleBulkDeleteExpired}
                  disabled={isBulkDeleting || isBulkResuming}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  {isBulkDeleting
                    ? <><RefreshCw size={13} className="animate-spin" /> Excluindo...</>
                    : <><Trash2 size={13} /> Excluir todos</>
                  }
                </button>
                <button
                  onClick={() => setShowBulkResumeModal(true)}
                  disabled={isBulkDeleting || isBulkResuming}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw size={13} /> Reativar todos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h3 className="text-white font-semibold">Filtros</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setFilterStatus("all")} variant={filterStatus === "all" ? "default" : "outline"}
              className={filterStatus === "all" ? "bg-green-600" : "border-gray-600 text-gray-300"}>
              Todos ({visibleAuctions.length})
            </Button>
            <Button onClick={() => setFilterStatus("active")} variant={filterStatus === "active" ? "default" : "outline"}
              className={filterStatus === "active" ? "bg-green-600" : "border-gray-600 text-gray-300"}>
              Ativos ({visibleAuctions.filter(a => a.status === "active" && !isExpiredActive(a)).length})
            </Button>
            <Button onClick={() => setFilterStatus("expired")} variant={filterStatus === "expired" ? "default" : "outline"}
              className={filterStatus === "expired" ? "bg-orange-600" : "border-orange-700/50 text-orange-400"}>
              ⏰ Expirados ({expiredActiveAuctions.length})
            </Button>
            <Button onClick={() => setFilterStatus("ended")} variant={filterStatus === "ended" ? "default" : "outline"}
              className={filterStatus === "ended" ? "bg-green-600" : "border-gray-600 text-gray-300"}>
              Finalizados ({visibleAuctions.filter(a => a.status !== "active").length})
            </Button>
            <Button onClick={() => setFilterStatus("paid")} variant={filterStatus === "paid" ? "default" : "outline"}
              className={filterStatus === "paid" ? "bg-green-600" : "border-gray-600 text-gray-300"}>
              Pagos ({visibleAuctions.filter(a => a.status !== "active" && getPaymentStatus(a.id) === "paid").length})
            </Button>
            <Button onClick={() => setFilterStatus("unpaid")} variant={filterStatus === "unpaid" ? "default" : "outline"}
              className={filterStatus === "unpaid" ? "bg-green-600" : "border-gray-600 text-gray-300"}>
              Não Pagos ({visibleAuctions.filter(a => a.status !== "active" && getPaymentStatus(a.id) === "unpaid").length})
            </Button>
          </div>
        </div>

        {/* Lista de Leilões */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando leilões...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAuctions.map((auction) => {
              const paymentStatus = getPaymentStatus(auction.id);
              const isEnded = auction.status !== "active";
              const isPaid = paymentStatus === "paid";
              const expired = isExpiredActive(auction);

              return (
                <Card key={auction.id} className={`border-gray-700 ${expired ? 'bg-orange-950/30 border-orange-700/40' : 'bg-gray-800'}`}>
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{auction.title}</h3>
                          {getStatusBadge(auction)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                          <div>
                            <p className="text-gray-400 text-sm">Preço Atual</p>
                            <p className="text-green-400 font-bold text-lg">
                              R$ {fmtBR(auction.current_price || auction.starting_price)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-400 text-sm">Vencedor</p>
                            <p className="text-white font-semibold">{auction.winner_name || "-"}</p>
                          </div>

                          <div>
                            <p className="text-gray-400 text-sm">Término</p>
                            <p className={`font-semibold ${expired ? 'text-orange-400' : 'text-white'}`}>
                              {expired && <Clock className="inline w-3.5 h-3.5 mr-1" />}
                              {new Date(auction.end_time).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          {isEnded && (
                            <div>
                              <p className="text-gray-400 text-sm">Pagamento</p>
                              <div className="flex items-center gap-2">
                                {isPaid ? (
                                  <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-400 font-semibold">Pago</span></>
                                ) : (
                                  <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-400 font-semibold">Não Pago</span></>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto">
                        <Button onClick={() => navigate(createPageUrl("AuctionRoom") + `?id=${auction.id}`)}
                          variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10" size="sm">
                          <Eye className="w-4 h-4 mr-2" /> Ver Leilão
                        </Button>

                        <Button onClick={() => { setSelectedAuction(auction); setShowCatalogModal(true); }}
                          variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10" size="sm">
                          <ShoppingCart className="w-4 h-4 mr-2" /> Catálogo
                        </Button>

                        {/* Botão Retomar: aparece para ended sem pagamento OU para expirados */}
                        {(isEnded && !isPaid || expired) && (
                          <Button onClick={() => { setSelectedAuction(auction); setShowResumeModal(true); }}
                            className="bg-orange-600 hover:bg-orange-700" size="sm">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {expired ? "Reativar" : "Retomar"}
                          </Button>
                        )}

                        <Button onClick={() => handleDeleteAuction(auction)}
                          variant="outline" className="border-red-500 text-red-400 hover:bg-red-500/10" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredAuctions.length === 0 && (
              <div className="text-center py-12 bg-gray-800 rounded-xl">
                <p className="text-gray-400 text-lg">Nenhum leilão encontrado com este filtro</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Adicionar ao Catálogo */}
      <AddToCatalogModal 
        isOpen={showCatalogModal} 
        onClose={() => { setShowCatalogModal(false); setSelectedAuction(null); }}
        auction={selectedAuction}
      />

      {/* Modal Retomar / Reativar Leilão Individual */}
      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedAuction && isExpiredActive(selectedAuction) ? "Reativar Leilão Expirado" : "Retomar Leilão"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAuction && (
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Leilão</p>
                <p className="text-white font-semibold">{selectedAuction.title}</p>
                {isExpiredActive(selectedAuction) && (
                  <p className="text-orange-400 text-xs mt-1">
                    ⏰ Expirou em {new Date(selectedAuction.end_time).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Nova Duração do Leilão</label>
                <Select value={resumeDuration} onValueChange={setResumeDuration}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="3">3 horas</SelectItem>
                    <SelectItem value="6">6 horas</SelectItem>
                    <SelectItem value="12">12 horas</SelectItem>
                    <SelectItem value="24">24 horas (1 dia)</SelectItem>
                    <SelectItem value="48">48 horas (2 dias)</SelectItem>
                    <SelectItem value="72">72 horas (3 dias)</SelectItem>
                    <SelectItem value="168">168 horas (7 dias)</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resumeDuration === "custom" && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Horas Personalizadas</label>
                  <Input type="number" min="1" value={customHours} onChange={(e) => setCustomHours(e.target.value)}
                    placeholder="Digite o número de horas" className="bg-gray-900 border-gray-700 text-white" />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResumeModal(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={handleResumeAuction} className="bg-green-600 hover:bg-green-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              {selectedAuction && isExpiredActive(selectedAuction) ? "Reativar" : "Retomar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reativar Todos os Expirados */}
      <Dialog open={showBulkResumeModal} onOpenChange={setShowBulkResumeModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Reativar Todos os Leilões Expirados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-900/30 border border-orange-500/40 p-4 rounded-lg">
              <p className="text-orange-300 font-semibold">{expiredActiveAuctions.length} leilão(ões) serão reativados</p>
              <p className="text-orange-400/70 text-xs mt-1">Todos os lances e mensagens existentes serão removidos e o preço voltará ao inicial.</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Nova Duração para Todos</label>
              <Select value={bulkResumeDuration} onValueChange={setBulkResumeDuration}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="3">3 horas</SelectItem>
                  <SelectItem value="6">6 horas</SelectItem>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">24 horas (1 dia)</SelectItem>
                  <SelectItem value="48">48 horas (2 dias)</SelectItem>
                  <SelectItem value="72">72 horas (3 dias)</SelectItem>
                  <SelectItem value="168">168 horas (7 dias)</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkResumeDuration === "custom" && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Horas Personalizadas</label>
                <Input type="number" min="1" value={bulkCustomHours} onChange={(e) => setBulkCustomHours(e.target.value)}
                  placeholder="Digite o número de horas" className="bg-gray-900 border-gray-700 text-white" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkResumeModal(false)} className="border-gray-600 text-gray-300">Cancelar</Button>
            <Button onClick={handleBulkResumeExpired} disabled={isBulkResuming} className="bg-green-600 hover:bg-green-700">
              {isBulkResuming
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Reativando...</>
                : <><RotateCcw className="w-4 h-4 mr-2" /> Reativar Todos</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageFullscreen>
  );
}