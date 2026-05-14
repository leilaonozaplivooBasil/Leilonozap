import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Loader2, Store, Phone, Users } from "lucide-react";
import { toast } from "sonner";

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
  }, [fetchSellers, refreshKey]);

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
                className="rounded-xl border border-gray-700 bg-gray-800 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
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

                <div className="flex gap-2 mt-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyLink(seller.referral_code)}
                    className="flex-1 min-h-[44px] gap-2 bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleOpenStore(seller.referral_code)}
                    className="flex-1 min-h-[44px] gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Loja
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}