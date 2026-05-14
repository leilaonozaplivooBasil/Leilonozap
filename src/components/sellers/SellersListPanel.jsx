import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy,
  ExternalLink,
  Loader2,
  Store,
  Phone,
  Users,
  Pencil,
  Trash2,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import SellerFormModal from "./SellerFormModal";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildStoreLink(referralCode) {
  return `leilaonozap.net/Loja-Virtual?ref=${referralCode || ""}`;
}

export default function SellersListPanel({ licenseeId, refreshKey }) {
  const [sellers, setSellers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSeller, setEditingSeller] = useState(null);
  const [deletingSeller, setDeletingSeller] = useState(null);
  const [deleteSalesCount, setDeleteSalesCount] = useState(0);
  const [isCheckingSales, setIsCheckingSales] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [sendingAccessId, setSendingAccessId] = useState(null);

  const fetchSellers = useCallback(async () => {
    if (!licenseeId) {
      setSellers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const rows = await base44.entities.AppUser.filter(
        { recruited_by_id: licenseeId, is_seller: true },
        "-created_date"
      );
      setSellers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error("Erro ao carregar vendedores: " + (err.message || "desconhecido"));
      setSellers([]);
    } finally {
      setIsLoading(false);
    }
  }, [licenseeId]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers, refreshKey, internalRefresh]);

  const handleCopyLink = async (referralCode) => {
    const link = `https://${buildStoreLink(referralCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        toast.success("Link copiado!");
      } catch {
        toast.error("Não foi possível copiar. Copie manualmente.");
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleOpenStore = (referralCode) => {
    const link = `https://${buildStoreLink(referralCode)}`;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleSendAccess = async (seller) => {
    if (sendingAccessId) return;
    setSendingAccessId(seller.id);
    try {
      const response = await base44.functions.invoke("generateSellerAccessToken", {
        seller_id: seller.id,
      });
      const data = response?.data;
      if (data?.success && data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp aberto! Link válido por 7 dias.");
      } else if (data?.success && data.magic_link) {
        // Fallback: sem WhatsApp (sem telefone) — copia o link
        try {
          await navigator.clipboard.writeText(data.magic_link);
          toast.success("Link de acesso copiado! Envie ao vendedor.");
        } catch {
          toast.info(`Link de acesso: ${data.magic_link}`, { duration: 10000 });
        }
      } else {
        toast.error(data?.error || "Não foi possível gerar o link de acesso.");
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.error;
      toast.error(apiMsg || err.message || "Erro ao gerar link de acesso.");
    } finally {
      setSendingAccessId(null);
    }
  };

  const handleOpenDelete = async (seller) => {
    setDeletingSeller(seller);
    setConfirmText("");
    setDeleteSalesCount(0);
    setIsCheckingSales(true);
    try {
      const sales = await base44.entities.CatalogSale.filter({ licensee_id: seller.id });
      setDeleteSalesCount(Array.isArray(sales) ? sales.length : 0);
    } catch (err) {
      // Em caso de falha, assume 0 (a função backend revalida)
      setDeleteSalesCount(0);
    } finally {
      setIsCheckingSales(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSeller) return;
    setIsDeleting(true);
    try {
      const response = await base44.functions.invoke("deleteSeller", {
        seller_id: deletingSeller.id,
      });
      const data = response?.data;
      if (data?.success) {
        if (data.action === "deleted") {
          toast.success("Vendedor excluído permanentemente.");
        } else {
          toast.success(`Vendedor desvinculado (${data.sales_count} venda(s) preservada(s)).`);
        }
        setDeletingSeller(null);
        setConfirmText("");
        setInternalRefresh((v) => v + 1);
      } else {
        toast.error(data?.error || "Erro ao excluir vendedor");
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.error;
      toast.error(apiMsg || err.message || "Erro ao excluir vendedor");
    } finally {
      setIsDeleting(false);
    }
  };

  const canConfirmHardDelete = deleteSalesCount === 0 && confirmText.trim().toUpperCase() === "EXCLUIR";
  const canConfirmUnlink = deleteSalesCount > 0;
  const canConfirm = canConfirmHardDelete || canConfirmUnlink;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-bold text-gray-100">Meus Vendedores</h2>
        </div>
        <span className="text-sm text-gray-400">
          {sellers.length} vendedor(es) cadastrado(s)
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando vendedores...
        </div>
      )}

      {!isLoading && sellers.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-8 text-center">
          <Store className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum vendedor cadastrado ainda.</p>
        </div>
      )}

      {!isLoading && sellers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => {
            const storeLink = buildStoreLink(seller.referral_code);
            const initials = getInitials(seller.full_name);
            return (
              <div
                key={seller.id}
                className="rounded-xl border border-gray-700 bg-gray-800 p-4 flex flex-col gap-3 relative"
              >
                {/* Botões de ação no canto superior direito */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingSeller(seller)}
                    title="Editar vendedor"
                    aria-label="Editar vendedor"
                    className="min-h-[36px] min-w-[36px] h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(seller)}
                    title="Excluir vendedor"
                    aria-label="Excluir vendedor"
                    className="min-h-[36px] min-w-[36px] h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 pr-20">
                  {seller.avatar_url ? (
                    <img
                      src={seller.avatar_url}
                      alt={seller.full_name}
                      className="h-12 w-12 rounded-full object-cover border border-gray-700"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-green-600/20 border border-green-600/30 grid place-items-center text-green-300 font-bold">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-100 font-semibold truncate">
                      {seller.full_name || "Sem nome"}
                    </div>
                    {seller.store_name && (
                      <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {seller.store_name}
                      </div>
                    )}
                  </div>
                </div>

                {seller.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{seller.phone}</span>
                  </div>
                )}

                <div className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-xs text-gray-400 truncate">
                  {storeLink}
                </div>

                <div className="flex gap-2 mt-auto flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyLink(seller.referral_code)}
                    className="flex-1 min-w-[120px] min-h-[44px] gap-2 bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleOpenStore(seller.referral_code)}
                    className="flex-1 min-w-[120px] min-h-[44px] gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Loja
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSendAccess(seller)}
                    disabled={sendingAccessId === seller.id}
                    className="w-full min-h-[44px] gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                    title="Enviar link de acesso ao painel do vendedor via WhatsApp"
                  >
                    {sendingAccessId === seller.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando link...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        📲 Enviar acesso
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      {editingSeller && (
        <SellerFormModal
          open={!!editingSeller}
          onClose={() => setEditingSeller(null)}
          editingSeller={editingSeller}
          onUpdated={() => {
            setEditingSeller(null);
            setInternalRefresh((v) => v + 1);
          }}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      <Dialog open={!!deletingSeller} onOpenChange={(v) => !v && !isDeleting && setDeletingSeller(null)}>
        <DialogContent className="sm:max-w-md bg-gray-900 border border-gray-700 text-gray-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Excluir vendedor {deletingSeller?.full_name || ""}?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isCheckingSales
                ? "Verificando histórico de vendas..."
                : deleteSalesCount > 0
                ? `Este vendedor já fez ${deleteSalesCount} venda(s). Ele será DESVINCULADO da sua rede, mas o histórico de comissões será preservado.`
                : "Este vendedor ainda não vendeu nada e será excluído PERMANENTEMENTE. Esta ação é irreversível."}
            </DialogDescription>
          </DialogHeader>

          {!isCheckingSales && deleteSalesCount === 0 && (
            <div className="space-y-2">
              <label className="text-sm text-gray-300">
                Digite <span className="font-bold text-red-400">EXCLUIR</span> para confirmar:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="bg-gray-800 border-gray-700 text-gray-100"
                disabled={isDeleting}
              />
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingSeller(null)}
              disabled={isDeleting}
              className="flex-1 bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isCheckingSales || isDeleting || !canConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : deleteSalesCount > 0 ? (
                "Sim, desvincular"
              ) : (
                "Excluir permanentemente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}