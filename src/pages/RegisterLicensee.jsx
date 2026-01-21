import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Copy, Edit, Link2, ExternalLink, Share2, Trash2, Calendar, Clock, User, ShoppingBag } from "lucide-react";
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
            <CardHeader className="pb-0">
              <div className="flex flex-col items-center text-center gap-3">
                {selected?.avatar_url ? (
                  <img src={selected.avatar_url} alt={selected.full_name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 font-semibold grid place-items-center">
                    {(selected?.full_name || "?").slice(0,2).toUpperCase()}
                  </div>
                )}
                <div className="text-xl font-semibold text-slate-900">{selected?.full_name || "Selecione um licenciado"}</div>
                {selected && (
                  <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">Catálogo ativo <ShoppingBag className="w-3.5 h-3.5" /></Badge>
                )}
                {selected && (
                  <a href={catalogLink} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline break-all">
                    {catalogLink}
                  </a>
                )}
                {selected && (
                  <div className="flex items-center gap-3 mt-1">
                    <Button size="icon" variant="ghost" className="rounded-full">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-full">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-full" onClick={() => copyToClipboard(catalogLink)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <a href={catalogLink} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" className="rounded-full">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button size="icon" variant="ghost" className="rounded-full">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {selected ? (
                <>
                  <Separator className="bg-slate-200" />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-800">0 vendas</div>
                        <div className="text-xs text-slate-500">Mês passado</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-800">Última venda</div>
                        <div className="text-xs text-slate-500">-</div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200" />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-600 font-medium">Visitas no catálogo</div>
                      <button className="text-xs text-rose-500 hover:underline">Ver tudo</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-800 font-semibold">132 visitas</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">4 contatos</span>
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
                        <div className="text-[10px] text-slate-400 text-right mt-1">Últimos 30 dias</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600 font-medium">Produtos mais visitados</div>
                      <button className="text-xs text-rose-500 hover:underline">Ver tudo</button>
                    </div>
                    <div className="flex flex-col items-center justify-center text-slate-400 text-sm h-28 gap-2">
                      <span className="text-2xl">📱</span>
                      <span className="text-center">—</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="font-semibold text-slate-700">{selected?.full_name} não teve visitas em seu catálogo nos últimos 30 dias</div>
                    <p className="text-slate-500 text-sm mt-1">As visitas aos produtos do vendedor são registradas quando um cliente acessa o catálogo do vendedor e visualiza os produtos. Assim que houver visitas, elas serão exibidas aqui.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="ghost" className="text-rose-500 hover:text-rose-600">Ver pedidos</Button>
                    <Button variant="ghost" className="text-rose-500 hover:text-rose-600">Editar cadastro</Button>
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