import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy, Edit, ExternalLink, Share2, Calendar, Clock, User, ShoppingBag, Trash2, Power } from "lucide-react";
import LicenseeShareModal from "./LicenseeShareModal";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

function storeName(u) {
  return u?.store_name || ("L. Virtual " + (u?.full_name || "Sem nome"));
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  toast.success("Link copiado!");
}

function shareLink(url, name) {
  if (navigator.share) {
    navigator.share({ title: name ? `Loja Virtual de ${name}` : "Loja Virtual", url });
  } else {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }
}

export default function LicenseeDetailsPanel({ selected, onEdit, onRefresh }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const referral = selected?.referral_code || "";
  const catalogLink = referral ? `https://leilaonozap.net/Loja-Virtual?ref=${referral}` : "";
  const displayLink = referral ? `leilaonozap.net/Loja-Virtual?ref=${referral}` : "";
  const isActive = (selected?.career_levels || []).includes("licenciado_catalogo");

  // === VENDAS REAIS ===
  const { data: sales = [] } = useQuery({
    queryKey: ["licensee-sales", selected?.id],
    enabled: !!selected?.id,
    queryFn: () => base44.entities.CatalogSale.filter({ licensee_id: selected.id }, "-created_date", 500),
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const salesThisMonth = sales.filter(s => s.status === "paid" && new Date(s.created_date) >= startOfMonth);
  const lastSale = sales.find(s => s.status === "paid");
  const lastSaleDate = lastSale ? new Date(lastSale.created_date).toLocaleDateString("pt-BR") : null;

  // === VISITAS REAIS ===
  const { data: visits = [] } = useQuery({
    queryKey: ["catalogVisits", selected?.id],
    enabled: !!selected?.id,
    queryFn: () => base44.entities.CatalogVisit.filter({ licensee_id: selected.id }, "-visited_at", 10000),
  });

  const totalVisits = visits.length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentVisits = visits.filter(v => new Date(v.visited_at || v.created_date) >= thirtyDaysAgo);
  const hasRecentVisits = recentVisits.length > 0;

  // Gráfico de visitas (últimos 30 dias)
  const visitsData = React.useMemo(() => {
    const days = Array.from({ length: 30 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - idx));
      return { key: d.toISOString().slice(0, 10), i: idx, v: 0 };
    });
    const counts = recentVisits.reduce((acc, v) => {
      const key = (v.visited_at || v.created_date || "").slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    days.forEach(d => { d.v = counts[d.key] || 0; });
    return days.map(d => ({ i: d.i, v: d.v }));
  }, [recentVisits]);

  // === TOGGLE ATIVAR/DESATIVAR ===
  const handleToggle = async () => {
    if (!selected) return;
    setIsToggling(true);
    const currentLevels = selected.career_levels || [];
    let newLevels;
    if (isActive) {
      newLevels = currentLevels.filter(l => l !== "licenciado_catalogo");
    } else {
      newLevels = [...currentLevels, "licenciado_catalogo"];
    }
    await base44.entities.AppUser.update(selected.id, { career_levels: newLevels });
    toast.success(isActive ? "Loja desativada" : "Loja ativada");
    onRefresh?.("toggled");
    setIsToggling(false);
  };

  // === EXCLUIR LICENCIADO ===
  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    const currentLevels = (selected.career_levels || []).filter(l => l !== "licenciado_catalogo");
    await base44.entities.AppUser.update(selected.id, {
      career_levels: currentLevels.length > 0 ? currentLevels : ["usuario"],
      primary_career_level: "usuario",
      referral_code: null,
      nickname: null,
      store_name: null,
    });
    toast.success("Licenciado removido com sucesso");
    onRefresh?.("removed");
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  if (!selected) {
    return (
      <Card className="bg-gray-800 border-gray-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-gray-400">Selecione um licenciado à esquerda para ver detalhes.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex flex-col items-center text-center gap-3">
          {selected.avatar_url ? (
            <img src={selected.avatar_url} alt={selected.full_name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-green-500/20 text-green-400 font-semibold grid place-items-center">
              {(selected.full_name || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-xl font-semibold text-white">{storeName(selected)}</div>
          <div className="text-sm text-gray-400">{selected.full_name}</div>

          {/* Badge Ativa/Inativa — clicável */}
          <button onClick={handleToggle} disabled={isToggling} title={isActive ? "Clique para desativar" : "Clique para ativar"}>
            <Badge className={`cursor-pointer flex items-center gap-1 transition-colors ${isActive ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-gray-600/40 text-gray-400 hover:bg-gray-600/60"}`}>
              <Power className="w-3.5 h-3.5" />
              {isToggling ? "Salvando..." : isActive ? "Loja ativa" : "Loja inativa"}
            </Badge>
          </button>

          {catalogLink && (
            <a href={catalogLink} target="_blank" rel="noreferrer" className="text-gray-300 hover:underline break-all text-sm">
              {displayLink}
            </a>
          )}

          <div className="flex items-center gap-3 mt-1">
            <Button size="icon" variant="ghost" className="rounded-full text-white hover:text-green-400" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full text-white hover:text-green-400" onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full text-white hover:text-green-400" onClick={() => copyToClipboard(catalogLink)}>
              <Copy className="w-4 h-4" />
            </Button>
            <a href={catalogLink} target="_blank" rel="noreferrer">
              <Button size="icon" variant="ghost" className="rounded-full text-white hover:text-green-400">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        <Separator className="bg-gray-700" />

        {/* VENDAS REAIS */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-sm font-medium text-white">{salesThisMonth.length} {salesThisMonth.length === 1 ? "venda" : "vendas"}</div>
              <div className="text-xs text-gray-400">Este mês</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-sm font-medium text-white">Última venda</div>
              <div className="text-xs text-gray-400">{lastSaleDate || "Nenhuma"}</div>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* VISITAS REAIS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-300 font-medium">Visitas na loja</div>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-white font-semibold">{totalVisits} visitas</span>
              </div>
              <div className="text-xs text-gray-400">
                {recentVisits.length} nos últimos 30 dias
              </div>
            </div>
            <div className="w-full">
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitsData}>
                    <Line type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-gray-400 text-right mt-1">Últimos 30 dias</div>
            </div>
          </div>
        </div>

        {/* MENSAGEM CONDICIONAL */}
        {!hasRecentVisits && (
          <>
            <Separator className="bg-gray-700" />
            <div className="text-center">
              <div className="font-semibold text-gray-100">{storeName(selected)} não teve visitas nos últimos 30 dias</div>
              <p className="text-gray-400 text-sm mt-1">As visitas são registradas quando um cliente acessa a loja do vendedor.</p>
            </div>
          </>
        )}

        <Separator className="bg-gray-700" />

        {/* AÇÕES */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="ghost"
            className="text-green-400 hover:text-green-500"
            onClick={() => {
              const url = createPageUrl("LicenseeOrders") + `?licenseeId=${selected.id}&ref=${encodeURIComponent(selected.referral_code || "")}&name=${encodeURIComponent(selected.full_name || "")}`;
              navigate(url);
            }}
          >
            Ver pedidos
          </Button>
          <Button variant="ghost" className="text-green-400 hover:text-green-500" onClick={onEdit}>
            Editar cadastro
          </Button>
        </div>

        {/* EXCLUIR */}
        <Separator className="bg-gray-700" />
        {showDeleteConfirm ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 space-y-3">
            <p className="text-sm text-red-300 font-medium">Tem certeza que deseja remover este licenciado?</p>
            <p className="text-xs text-gray-400">O usuário NÃO será excluído, apenas perderá o status de licenciado (referral code, nickname e store_name serão limpos).</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Removendo..." : "Confirmar remoção"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-gray-400">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="text-red-400 hover:text-red-300 w-full gap-2" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" />
            Remover licenciado
          </Button>
        )}
      </CardContent>

      <LicenseeShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        licensee={selected}
      />
    </Card>
  );
}