import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Copy, Edit, Link2, ExternalLink } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { LineChart, Line, ResponsiveContainer } from "recharts";
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
  const visitsData = useMemo(() => [12,14,13,15,18,22,20,24,23,26].map((v,i)=>({ i, v })), []);
  const visitsData = useMemo(() => [12,14,13,15,18,22,20,24,23,26].map((v,i)=>({ i, v })), []);
  const visitsData = useMemo(() => (
    [12,14,13,15,18,22,20,24,23,26].map((v,i)=>({ i, v }))
  ), []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Pesquise por licenciados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#f2f5fb] border-slate-200 text-slate-700 placeholder:text-slate-400 rounded-full"
            />
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-rose-500 hover:bg-rose-600 gap-2 rounded-full">
            <Plus className="w-4 h-4" /> Cadastrar vendedor
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-3 text-sm text-slate-500 flex items-center justify-between">
        <p>Gerencie os seus catálogos de vendedores</p>
        <span>{licensees.length} vendedores</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-2 sm:p-3">
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
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center">
                  {(selected?.full_name || "?").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">{selected?.full_name || "Selecione um licenciado"}</div>
                  {selected && (
                    <Badge className={isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                      {isActive ? "Catálogo ativo" : "Configurar catálogo"}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected ? (
                <>
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Link do catálogo</div>
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-gray-400" />
                      <a href={catalogLink} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline truncate">
                        {catalogLink}
                      </a>
                      <Button size="icon" variant="ghost" className="text-slate-500 hover:text-slate-700" onClick={() => copyToClipboard(catalogLink)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a href={catalogLink} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="text-slate-500 hover:text-slate-700">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">Visitas no catálogo</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-800">182 visitas</span>
                        <div className="w-28 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={visitsData}>
                              <Line type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <div className="text-xs text-slate-500">Última venda</div>
                      <div className="text-lg">—</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">Produtos mais visitados</div>
                      <button className="text-xs text-rose-500 hover:underline">Ver tudo</button>
                    </div>
                    <div className="flex items-center justify-center text-slate-400 text-sm h-24">—</div>
                  </div>
                  <Separator className="bg-slate-200" />

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">{selected?.full_name} não teve visitas em seu catálogo nos últimos 30 dias. Assim que houver visitas, este gráfico será exibido aqui.</div>

                  <div className="flex justify-between gap-3">
                    <Button variant="outline" className="border-slate-300 text-slate-700">
                      Ver pedidos
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