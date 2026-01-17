import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function AmbienteDeTeste() {
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [anchorId, setAnchorId] = useState("");
  const [saleValue, setSaleValue] = useState(1000);
  const [preview, setPreview] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);

  // Load current user and all AppUsers (for anchor select)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await base44.auth.me().catch(() => null);
        if (mounted) setMe(u);
        const list = await base44.entities.AppUser.list();
        const sorted = (Array.isArray(list) ? list : []).sort((a, b) =>
          String(a.full_name || "").localeCompare(String(b.full_name || ""), "pt-BR", { sensitivity: "base" })
        );
        if (mounted) {
          setUsers(sorted);
          // Preselect anchor if found in local storage or first available
          const cached = sessionStorage.getItem("ambiente_teste_anchor_id");
          if (cached && sorted.find(u => u.id === cached)) {
            setAnchorId(cached);
          } else if (sorted.length > 0) {
            setAnchorId(sorted[0].id);
          }
        }
      } catch (e) {
        if (mounted) setError("Não foi possível carregar usuários.");
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist selected anchor
  useEffect(() => {
    if (anchorId) sessionStorage.setItem("ambiente_teste_anchor_id", anchorId);
  }, [anchorId]);

  const anchorUser = useMemo(() => users.find(u => u.id === anchorId) || null, [users, anchorId]);

  const totalPercent = useMemo(() => {
    if (!preview?.records) return 0;
    return preview.records.reduce((s, r) => s + Number(r.percent || 0), 0);
  }, [preview]);

  const simulate = async () => {
    if (!anchorUser) return;
    setIsSimulating(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("previewCatalogCommission", {
        sale_value: Number(saleValue),
        anchor_name: anchorUser.full_name,
      });
      setPreview(data);
    } catch (e) {
      setError("Falha ao simular comissões.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Auto-simulate on changes (debounced)
  useEffect(() => {
    if (!anchorUser || !saleValue) return;
    const t = setTimeout(() => simulate(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorUser?.id, saleValue]);

  const percentOk = Math.abs(totalPercent - 27) < 0.0001;

  const roleLabel = (role) => ({
    licenciado_catalogo: "Licenciado Catálogo",
    trainee: "Trainee",
    executivo: "Executivo",
    kit_start: "Kit Start",
    plano_lider: "Plano Líder",
    plano_lojista: "Plano Lojista",
    distribuidor: "Distribuidor",
    diretor: "Diretor",
    diretoria: "Diretoria",
    ceo: "CEO",
    conselheiro: "Conselheiro",
    fundador: "Fundador",
    site_official_rollup: "Site Oficial (Sobra)"
  }[role] || role);

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">🧪 Ambiente de Teste</h1>
          <div className="flex items-center gap-2">
            <Button className="bg-green-600 hover:bg-green-700 text-white border-none" onClick={simulate} disabled={isSimulating || !anchorUser}>
              {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Simular
            </Button>
          </div>
        </div>

        {!me || me.role !== "admin" ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 text-white">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Acesso restrito</p>
                  <p className="text-sm text-white">Somente administradores podem usar este ambiente.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Parâmetros da Simulação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block mb-2 text-sm text-white">Valor da venda (R$)</label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={saleValue}
                      onChange={(e) => setSaleValue(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block mb-2 text-sm text-white">Âncora (licenciado do link)</label>
                    {loadingUsers ? (
                      <div className="flex items-center gap-2 text-white"><Loader2 className="w-4 h-4 animate-spin" /> Carregando usuários...</div>
                    ) : (
                      <Select value={anchorId} onValueChange={setAnchorId}>
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue placeholder="Selecione o âncora" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-72 overflow-auto">
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <p className="text-xs text-white">Esta simulação usa apenas o preview — não altera saldos nem cria registros.</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  Resultado em tempo real
                  {percentOk ? (
                    <Badge className="bg-green-500/20 text-green-300 border border-green-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Soma 27%
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-300 border border-red-500/40">Soma {totalPercent.toFixed(2)}%</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="text-red-300 text-sm mb-3">{error}</div>
                )}
                {!preview && (
                  <div className="text-white text-sm">Preencha os campos e clique em Simular para visualizar a divisão.</div>
                )}
                {preview && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                      <span>Âncora:</span>
                      <Badge className="bg-gray-900 border-gray-700 text-white">{preview.anchor}</Badge>
                      <span>• Valor:</span>
                      <Badge className="bg-gray-900 border-gray-700 text-white">R$ {Number(preview.sale_value || saleValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Badge>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-700">
                      <div className="grid grid-cols-12 bg-gray-900 text-white px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                        <div className="col-span-5">Usuário</div>
                        <div className="col-span-3">Cargo</div>
                        <div className="col-span-2 text-right">%</div>
                        <div className="col-span-2 text-right">Valor (R$)</div>
                      </div>
                      <div className="divide-y divide-gray-800">
                        {preview.records?.map((r, idx) => (
                          <div key={idx} className="grid grid-cols-12 px-3 py-2 text-sm items-center bg-gray-800/50 text-white">
                            <div className="col-span-5 truncate">{r.user_full_name}</div>
                            <div className="col-span-3 text-white">{roleLabel(r.role)}</div>
                            <div className="col-span-2 text-right">{Number(r.percent).toFixed(2)}%</div>
                            <div className="col-span-2 text-right">{Number(r.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-12 bg-gray-900/70 text-white px-3 py-2 text-sm font-semibold">
                        <div className="col-span-8">Total</div>
                        <div className="col-span-2 text-right">{totalPercent.toFixed(2)}%</div>
                        <div className="col-span-2 text-right">
                          {Number(preview.records?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {preview.site_official_rollup && (
                      <div className="text-xs text-white">
                        Sobra encaminhada ao Site Oficial: {preview.site_official_rollup.percent}% (
                        R$ {Number(preview.site_official_rollup.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                      </div>
                    )}

                    <div className="pt-2 text-xs text-white">
                      Quando a divisão estiver correta, avise para aplicarmos no sistema de produção.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}