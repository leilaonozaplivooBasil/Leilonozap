import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Copy, Edit, Link2, ExternalLink } from "lucide-react";
import LicenseeFormModal from "../components/licensees/LicenseeFormModal";
import LicenseeListItem from "../components/licensees/LicenseeListItem";

function copyToClipboard(text){
  navigator.clipboard.writeText(text);
}

export default function RegisterLicensee() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: licensees = [], isLoading } = useQuery({
    queryKey: ["licensees"],
    queryFn: async () => {
      const res = await base44.entities.AppUser.filter({ role: "licensee" }, "-updated_date", 1000);
      return res || [];
    },
  });

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return licensees;
    return licensees.filter((l) =>
      (l.full_name || "").toLowerCase().includes(t) ||
      (l.email || "").toLowerCase().includes(t) ||
      (l.referral_code || "").toLowerCase().includes(t)
    );
  }, [licensees, searchTerm]);

  React.useEffect(() => {
    if (!selected && filtered.length) setSelected(filtered[0]);
  }, [filtered, selected]);

  const referral = selected?.referral_code || "";
  const catalogLink = referral ? `https://leilaonozap.app/catalog?ref=${referral}` : "";
  const isActive = (selected?.career_levels || []).includes("licenciado_catalogo");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gradient-to-r from-green-700/20 via-green-600/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Pesquise por licenciados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-green-600 hover:bg-green-700 gap-2">
            <Plus className="w-4 h-4" /> Cadastrar licenciado
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-400">Nenhum licenciado encontrado.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((l) => (
                <LicenseeListItem key={l.id} licensee={l} selected={selected?.id === l.id} onSelect={setSelected} />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:col-span-1">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-green-600/20 text-green-400 font-semibold flex items-center justify-center">
                  {(selected?.full_name || "?").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="text-white">{selected?.full_name || "Selecione um licenciado"}</div>
                  {selected && (
                    <Badge className={isActive ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"}>
                      {isActive ? "Catálogo ativo" : "Configurar catálogo"}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected ? (
                <>
                  <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Link do catálogo</div>
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-gray-400" />
                      <a href={catalogLink} target="_blank" rel="noreferrer" className="text-sm text-green-400 hover:underline truncate">
                        {catalogLink}
                      </a>
                      <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => copyToClipboard(catalogLink)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a href={catalogLink} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                      <div className="text-xs text-gray-400">Visitas (30d)</div>
                      <div className="text-lg">—</div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                      <div className="text-xs text-gray-400">Última venda</div>
                      <div className="text-lg">—</div>
                    </div>
                  </div>

                  <Separator className="bg-gray-800" />

                  <div className="flex justify-end">
                    <Button variant="outline" className="border-gray-600 text-gray-200 gap-2">
                      <Edit className="w-4 h-4" /> Editar cadastro
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-gray-400">Selecione um licenciado à esquerda para ver detalhes.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LicenseeFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["licensees"] });
          setShowModal(false);
        }}
      />
    </div>
  );
}