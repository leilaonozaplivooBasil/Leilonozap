import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";

import LicenseeFormModal from "../components/licensees/LicenseeFormModal";
import LicenseeListItem from "../components/licensees/LicenseeListItem";
import LicenseeDetailsPanel from "../components/licensees/LicenseeDetailsPanel";




export default function RegisterLicensee() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editingLicensee, setEditingLicensee] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"

  const { data: licensees = [], isLoading } = useQuery({
    queryKey: ["licensees"],
    queryFn: async () => {
      // Busca todos os AppUsers que são ou já foram licenciados
      const res = await base44.entities.AppUser.list("-updated_date", 1000);
      return (res || []).filter(u =>
        (u.career_levels || []).includes("licenciado_catalogo") ||
        u.role === "licensee" ||
        (u.referral_code && u.referral_code.trim() !== "") ||
        (u.store_name && u.store_name.trim() !== "")
      );
    },
  });

  const activeCount = useMemo(() => (licensees || []).filter(l => (l.career_levels || []).includes("licenciado_catalogo")).length, [licensees]);
  const inactiveCount = useMemo(() => (licensees || []).filter(l => !(l.career_levels || []).includes("licenciado_catalogo")).length, [licensees]);

  const filtered = useMemo(() => {
    let list = licensees || [];

    // Filtro por status
    if (statusFilter === "active") {
      list = list.filter(l => (l.career_levels || []).includes("licenciado_catalogo"));
    } else if (statusFilter === "inactive") {
      list = list.filter(l => !(l.career_levels || []).includes("licenciado_catalogo"));
    }

    // Filtro por busca
    const t = searchTerm.trim().toLowerCase();
    if (!t) return list;
    return list.filter((l) =>
      (l.full_name || "").toLowerCase().includes(t) ||
      (l.email || "").toLowerCase().includes(t) ||
      (l.referral_code || "").toLowerCase().includes(t) ||
      (l.store_name || "").toLowerCase().includes(t)
    );
  }, [licensees, searchTerm, statusFilter]);

  // Sincroniza selected com dados frescos da query
  React.useEffect(() => {
    if (selected) {
      const fresh = (licensees || []).find(l => l.id === selected.id);
      if (fresh) {
        // Atualiza com dados frescos
        if (JSON.stringify(fresh) !== JSON.stringify(selected)) {
          setSelected(fresh);
        }
      } else {
        // Usuário foi removido da lista (ex: remoção de licenciado) — limpa selected
        setSelected(null);
      }
    } else if (filtered.length) {
      setSelected(filtered[0]);
    }
  }, [licensees, filtered]);




  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top bar */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Pesquise por licenciados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-900/60 border-gray-700 text-gray-100 placeholder:text-gray-400 rounded-full"
            />
          </div>
          <Button onClick={() => { setEditingLicensee(null); setShowModal(true); }} className="bg-green-600 hover:bg-green-700 gap-2 rounded-full">
            <Plus className="w-4 h-4" /> Cadastrar vendedor
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-3 text-sm text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Todas ({licensees.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "active" ? "bg-green-600/30 text-green-400" : "text-gray-400 hover:text-green-400"}`}
          >
            Ativas ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "inactive" ? "bg-red-600/30 text-red-400" : "text-gray-400 hover:text-red-400"}`}
          >
            Inativas ({inactiveCount})
          </button>
        </div>
        <span>{filtered.length} vendedores</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-800 border-gray-700 shadow-sm">
            <CardContent className="p-2 sm:p-3">
          {isLoading ? (
            <div className="text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-400">Nenhum licenciado encontrado.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((l) => (
                <LicenseeListItem key={l.id} licensee={l} selected={selected?.id === l.id} onSelect={setSelected} onEdit={(u) => { setSelected(u); setEditingLicensee(u); setShowModal(true); }} />
              ))}
            </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-1">
          <LicenseeDetailsPanel
            selected={selected}
            onEdit={() => { setEditingLicensee(selected); setShowModal(true); }}
            onRefresh={(action) => {
              qc.invalidateQueries({ queryKey: ["licensees"] });
              if (action === "removed") {
                setSelected(null);
              }
            }}
          />
        </div>
      </div>

      <LicenseeFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingLicensee(null); }}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["licensees"] });
          setShowModal(false);
          setEditingLicensee(null);
        }}
        initialUser={editingLicensee}
      />
    </div>
  );
}