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

  const { data: licensees = [], isLoading } = useQuery({
    queryKey: ["licensees"],
    queryFn: async () => {
      // Busca todos os AppUsers e filtra os que têm licenciado_catalogo nos career_levels
      // Não pode filtrar apenas por role=licensee pois admins também podem ser licenciados
      const res = await base44.entities.AppUser.list("-updated_date", 1000);
      return (res || []).filter(u => (u.career_levels || []).includes("licenciado_catalogo"));
    },
  });

  const filtered = useMemo(() => {
    const onlyCatalog = (licensees || []).filter(l => (l.career_levels || []).includes("licenciado_catalogo"));
    const t = searchTerm.trim().toLowerCase();
    if (!t) return onlyCatalog;
    return onlyCatalog.filter((l) =>
      (l.full_name || "").toLowerCase().includes(t) ||
      (l.email || "").toLowerCase().includes(t) ||
      (l.referral_code || "").toLowerCase().includes(t)
    );
  }, [licensees, searchTerm]);

  React.useEffect(() => {
    if (!selected && filtered.length) setSelected(filtered[0]);
  }, [filtered, selected]);




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
          <Button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700 gap-2 rounded-full">
            <Plus className="w-4 h-4" /> Cadastrar vendedor
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-3 text-sm text-gray-400 flex items-center justify-between">
        <p>Gerencie as lojas virtuais dos vendedores</p>
        <span>{(licensees || []).filter(l => (l.career_levels || []).includes("licenciado_catalogo")).length} vendedores</span>
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
                <LicenseeListItem key={l.id} licensee={l} selected={selected?.id === l.id} onSelect={setSelected} onEdit={(u) => { setSelected(u); setShowModal(true); }} />
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
            onEdit={() => setShowModal(true)}
            onRefresh={() => setSelected(null)}
          />
        </div>
      </div>

      <LicenseeFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["licensees"] });
          setShowModal(false);
        }}
        initialUser={selected}
      />
    </div>
  );
}