import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Truck, CreditCard, Filter, Search } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

function currency(v){
  if (v == null || isNaN(v)) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getDateKey(iso){
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0,10);
}

export default function LicenseeOrders(){
  const params = new URLSearchParams(window.location.search);
  const licenseeId = params.get("licenseeId") || "";
  const ref = params.get("ref") || "";
  const licenseeName = decodeURIComponent(params.get("name") || "");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const { data: licensee = null } = useQuery({
    queryKey: ["licensee", licenseeId],
    enabled: !!licenseeId,
    queryFn: async () => {
      const rows = await base44.entities.AppUser.filter({ id: licenseeId });
      return rows?.[0] || null;
    }
  });

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["catalogSales"],
    queryFn: async () => {
      // Carrega últimas 1000 vendas (ajuste conforme necessário)
      const rows = await base44.entities.CatalogSale.list("-created_date", 1000);
      return rows || [];
    },
    initialData: []
  });

  const sales = useMemo(() => {
    const email = licensee?.email || null;
    return (allSales || []).filter((s) => {
      const anchorMatch = [s.licensee_id, s.anchor_id, s.seller_id, s.owner_id].includes(licenseeId);
      const refMatch = [s.anchor_referral_code, s.referral_code, s.licensee_referral_code].includes(ref);
      const emailMatch = email && [s.anchor_email, s.licensee_email, s.seller_email].includes(email);
      return anchorMatch || refMatch || emailMatch;
    });
  }, [allSales, licenseeId, ref, licensee]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (sales || []).filter((s) => {
      // Status
      if (status !== "all" && (s.status || "").toLowerCase() !== status) return false;
      // Dates (inclusive)
      const dtStr = s.created_date || s.purchase_date || s.payment_date || s.updated_date;
      const dt = dtStr ? new Date(dtStr) : null;
      if (start) {
        const sd = new Date(start + "T00:00:00");
        if (!dt || dt < sd) return false;
      }
      if (end) {
        const ed = new Date(end + "T23:59:59");
        if (!dt || dt > ed) return false;
      }
      if (!term) return true;
      const hay = (
        (s.id || "") + " " +
        (s.order_code || "") + " " +
        (s.buyer_name || "") + " " +
        (s.buyer_email || "") + " " +
        (s.buyer_cpf || "") + " " +
        JSON.stringify(s.items || [])
      ).toLowerCase();
      return hay.includes(term);
    });
  }, [sales, search, status, start, end]);

  const awaitingShipment = useMemo(() => filtered.filter(s => (s.status || "") === "paid").length, [filtered]);
  const pendingSales = useMemo(() => filtered.filter(s => (s.status || "") === "pending"), [filtered]);
  const pendingAmount = useMemo(() => pendingSales.reduce((sum, s) => sum + (s.amount || s.total_amount || 0), 0), [pendingSales]);

  // Performance (últimos 6 períodos semanais)
  const perfData = useMemo(() => {
    const now = new Date();
    const weeks = Array.from({ length: 6 }).map((_,i) => {
      const startW = new Date(now);
      startW.setDate(now.getDate() - (5 - i) * 7);
      const key = `${startW.getDate().toString().padStart(2,'0')}/${(startW.getMonth()+1).toString().padStart(2,'0')}`;
      return { key, total: 0 };
    });
    filtered.forEach((s) => {
      const dtStr = s.created_date || s.purchase_date || s.payment_date;
      const d = dtStr ? new Date(dtStr) : null;
      if (!d) return;
      const idx = Math.min(5, Math.max(0, Math.floor((Date.now() - d.getTime()) / (7*24*60*60*1000))));
      const pos = 5 - idx; // 0..5 left->right
      if (weeks[pos]) weeks[pos].total += (s.amount || s.total_amount || 0);
    });
    return weeks;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pedidos {licenseeName ? `— ${licenseeName}` : "do licenciado"}</h1>
            <p className="text-sm text-gray-400">Resumo e gestão de pedidos originados pelo catálogo</p>
          </div>
          <Link to={createPageUrl("RegisterLicensee")}> 
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">Voltar</Button>
          </Link>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-gray-300">Aguardando envio</CardTitle>
              <Truck className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{awaitingShipment}</div>
              <div className="text-xs text-gray-400">Pedidos pagos</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-gray-300">Aguardando pagamento</CardTitle>
              <CreditCard className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currency(pendingAmount)}</div>
              <div className="text-xs text-gray-400">em relação a {pendingSales.length} pedidos</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-gray-300">Performance de vendas</CardTitle>
              <span className="text-xs text-gray-400">6 semanas</span>
            </CardHeader>
            <CardContent>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfData}>
                    <XAxis dataKey="key" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v)=>currency(v)} contentStyle={{ background: "#111827", border: "1px solid #374151", color: "#E5E7EB" }} />
                    <Bar dataKey="total" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="bg-gray-800 border-gray-700 mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="bg-gray-900 border-gray-700 text-gray-100" />
                <span className="text-gray-500">—</span>
                <Input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="bg-gray-900 border-gray-700 text-gray-100" />
              </div>

              <div className="relative w-full md:flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Código, cliente, CPF, produto..."
                  value={search}
                  onChange={(e)=>setSearch(e.target.value)}
                  className="pl-9 bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500"
                />
              </div>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[200px] bg-gray-900 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Status do pedido" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="pending">Aguardando pagamento</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white" onClick={()=>{ setSearch(""); setStatus("all"); setStart(""); setEnd(""); }}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <div className="overflow-hidden rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">Data e hora</th>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Produtos</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Itens</th>
                <th className="text-right px-4 py-3">Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-900">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Carregando pedidos...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    Nenhum item encontrado. Ajuste os filtros e tente novamente.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const when = s.created_date || s.purchase_date || s.payment_date || "";
                  const code = s.order_code || s.id;
                  const client = s.buyer_name || s.buyer_email || s.customer_name || "-";
                  const items = Array.isArray(s.items) ? s.items : (Array.isArray(s.products) ? s.products : []);
                  const itemsCount = items?.length || (s.items_count || 1);
                  const productsLabel = items?.slice(0,2).map(i => i.title || i.name).filter(Boolean).join(", ") || "-";
                  const value = s.amount || s.total_amount || 0;
                  const statusText = (s.status || "").toString();
                  return (
                    <tr key={s.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-300">{when ? new Date(when).toLocaleString("pt-BR") : "-"}</td>
                      <td className="px-4 py-3 text-gray-300">{code}</td>
                      <td className="px-4 py-3 text-gray-300">{client}</td>
                      <td className="px-4 py-3 text-gray-300">{productsLabel}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          statusText === "paid" ? "bg-green-500/20 text-green-400" :
                          statusText === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          statusText === "canceled" ? "bg-red-500/20 text-red-400" :
                          "bg-gray-600/20 text-gray-300"
                        }>{statusText || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{itemsCount}</td>
                      <td className="px-4 py-3 text-right text-gray-100">{currency(value)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}