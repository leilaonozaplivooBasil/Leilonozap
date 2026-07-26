import React, { useEffect, useMemo, useState } from "react";
import { fmtBR } from '@/lib/money';
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Plus, X } from "lucide-react";

export default function AmbienteDeTeste() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user || user.role !== 'admin' && user.role !== 'super_admin') {
      navigate('/');
    } else {
      setAuthorized(true);
    }
  }, []);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [anchorId, setAnchorId] = useState("");
  const [saleValue, setSaleValue] = useState(1000);
  const [preview, setPreview] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [showWalletTest, setShowWalletTest] = useState(false);
  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState(100);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");

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
    return preview.records
      .filter(r => r.role !== 'site_official_rollup')
      .reduce((s, r) => s + Number(r.percent || 0), 0);
  }, [preview]);

  const groupedRoles = useMemo(() => {
    if (!preview?.records) return [];
    const ORDER = ['fundador','conselheiro','ceo','diretoria','diretor','distribuidor','plano_lojista','plano_lider','kit_start','executivo','trainee','licenciado_catalogo','usuario'];
    const map = new Map();
    
    // Inicializa todos os cargos com valores zerados
    ORDER.forEach(role => {
      map.set(role, { role, percent: 0, amount: 0, members: [] });
    });
    
    // Preenche com dados reais
    for (const r of preview.records) {
      if (r.role === 'site_official_rollup') continue;
      const key = r.role;
      if (!map.has(key)) {
        map.set(key, { role: key, percent: 0, amount: 0, members: [] });
      }
      const entry = map.get(key);
      entry.percent += Number(r.percent || 0);
      entry.amount += Number(r.amount || 0);
      entry.members.push({ name: r.user_full_name, percent: Number(r.percent || 0), amount: Number(r.amount || 0) });
    }
    
    return ORDER.map(role => map.get(role)).filter(Boolean);
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

  const syncToProduction = async () => {
    setIsSyncing(true);
    setSyncMessage("");
    try {
      const { data } = await base44.functions.invoke("syncCommissionLogicProduction", {});
      setSyncMessage("✅ Lógica sincronizada com sucesso! O sistema de comissões agora está operacional.");
    } catch (e) {
      setSyncMessage("❌ Erro ao sincronizar: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const createWalletTest = async () => {
    if (!walletUserId || !walletAmount) {
      setWalletMessage("❌ Selecione usuário e insira o valor");
      return;
    }
    
    setIsCreatingWallet(true);
    setWalletMessage("");
    try {
      const selectedUser = users.find(u => u.id === walletUserId);
      if (!selectedUser) {
        setWalletMessage("❌ Usuário não encontrado");
        return;
      }

      const amount = Number(walletAmount);
      if (amount <= 0) {
        setWalletMessage("❌ Valor deve ser maior que 0");
        return;
      }

      // Atualiza ou cria carteira
      let wallet = await base44.entities.Wallet.filter({ user_id: walletUserId });
      if (wallet && wallet.length > 0) {
        await base44.entities.Wallet.update(wallet[0].id, {
          balance: (wallet[0].balance || 0) + amount
        });
      } else {
        await base44.entities.Wallet.create({
          user_id: walletUserId,
          balance: amount
        });
      }

      // Registra transação no histórico
      await base44.entities.WalletTransaction.create({
        user_id: walletUserId,
        type: "deposit",
        direction: "credit",
        amount: amount,
        status: "confirmed",
        description: `Teste de carteira - Saldo adicionado: R$ ${fmtBR(amount)}`
      });

      setWalletMessage(`✅ Saldo de R$ ${fmtBR(amount)} adicionado para ${selectedUser.full_name}`);
      setWalletUserId("");
      setWalletAmount(100);
      setTimeout(() => setShowWalletTest(false), 2000);
    } catch (e) {
      setWalletMessage("❌ Erro ao criar teste: " + e.message);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Auto-simulate on changes (debounced)
  useEffect(() => {
    if (!anchorUser || !saleValue) return;
    const t = setTimeout(() => simulate(), 450);
    return () => clearTimeout(t);
     
  }, [anchorUser?.id, saleValue]);

  const percentOk = totalPercent <= 30 + 0.0001;

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
    usuario: "Usuário",
    site_official_rollup: "Site Oficial (Sobra)"
  }[role] || role);

  if (!authorized) return null;

  return (
    <div className="ambiente-teste min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">🧪 Ambiente de Teste</h1>
          <div className="flex items-center gap-2">
            <Button className="bg-green-600 hover:bg-green-700 text-white border-none shadow-md shadow-green-600/20" onClick={simulate} disabled={isSimulating || !anchorUser}>
              {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Simular
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-md shadow-purple-600/20" onClick={() => setShowWalletTest(!showWalletTest)}>
              <Plus className="w-4 h-4" /> Teste Carteira
            </Button>
            {(me?.role === 'admin' || me?.email === 'jonhhenrique29@hotmail.com' || me?.email === 'erbrito.sistemas@gmail.com') && (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md shadow-blue-600/20" onClick={syncToProduction} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔄'} Sincronizar
              </Button>
            )}
          </div>
        </div>

        {syncMessage && (
          <Card className={syncMessage.includes("✅") ? "bg-green-900/20 border-green-700" : "bg-red-900/20 border-red-700"}>
            <CardContent className="p-4 text-sm">
              {syncMessage}
            </CardContent>
          </Card>
        )}

        {!me || (me.role !== "admin" && me.email !== "jonhhenrique29@hotmail.com" && me.email !== "erbrito.sistemas@gmail.com") ? (
          <Card className="bg-gray-800/90 border-gray-700 text-white">
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
            {showWalletTest && (
              <Card className="bg-purple-900/30 border-purple-700 text-white">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-lg text-white">💳 Teste de Carteira</CardTitle>
                  <button onClick={() => setShowWalletTest(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm text-white">Selecione o usuário</label>
                      {loadingUsers ? (
                        <div className="flex items-center gap-2 text-white"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                      ) : (
                        <Select value={walletUserId} onValueChange={setWalletUserId}>
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                            <SelectValue placeholder="Escolha um usuário" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/95 border-gray-700 text-white max-h-72">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="block mb-2 text-sm text-white">Valor a adicionar (R$)</label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  {walletMessage && (
                    <div className={`text-sm p-3 rounded ${walletMessage.includes("✅") ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"}`}>
                      {walletMessage}
                    </div>
                  )}
                  <Button 
                    onClick={createWalletTest} 
                    disabled={isCreatingWallet || !walletUserId}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isCreatingWallet ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Adicionar Saldo
                  </Button>
                  <p className="text-xs text-gray-400">Este teste criará um depósito confirmado no histórico da carteira.</p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gray-800/90 border-gray-700 text-white">
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
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white placeholder:text-white data-[placeholder]:text-white">
                          <SelectValue placeholder="Selecione o âncora" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900/95 border-gray-700 text-white max-h-72 overflow-auto">
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

            <Card className="bg-gray-800/90 border-gray-700 text-white">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  Resultado em tempo real
                  {percentOk ? (
                    <Badge className="bg-green-500/20 text-green-300 border border-green-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Dentro do limite (≤ 30%)
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-300 border border-red-500/40">Excede 30% • {totalPercent.toFixed(2)}%</Badge>
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
                      <div className="grid grid-cols-12 bg-gray-900 text-white px-3 py-2 text-sm font-semibold border-b border-gray-700">
                        <div className="col-span-9">Total (cargos)</div>
                        <div className="col-span-3 text-right">{totalPercent.toFixed(2)}% • {Number(groupedRoles.reduce((s, g) => s + Number(g.amount || 0), 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      </div>
                      <Accordion type="multiple" className="w-full">
                        {groupedRoles.map((g) => (
                          <AccordionItem key={g.role} value={g.role}>
                            <AccordionTrigger className="px-3 py-2 hover:no-underline">
                              <div className="flex justify-between items-center w-full gap-2">
                                <span className="font-medium">{roleLabel(g.role)}</span>
                                <div className="flex items-center gap-2">
                                  {g.percent === 0 && (
                                    <span className="text-xs text-gray-400">(subiu para a empresa)</span>
                                  )}
                                  <span className="text-right">{g.percent.toFixed(2)}%</span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-0 pb-3">
                              {g.members.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-12 bg-gray-900 text-white px-3 py-2 text-xs font-semibold uppercase tracking-wide border-b border-gray-700">
                                    <div className="col-span-6">Usuário</div>
                                    <div className="col-span-3 text-right">%</div>
                                    <div className="col-span-3 text-right">Valor (R$)</div>
                                  </div>
                                  <div className="divide-y divide-gray-700">
                                    {g.members.map((m, idx) => (
                                      <div key={idx} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                                        <div className="col-span-6 truncate">{m.name}</div>
                                        <div className="col-span-3 text-right">{m.percent.toFixed(2)}%</div>
                                        <div className="col-span-3 text-right">{Number(m.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                  Nenhum usuário neste cargo. Comissão subiu para a empresa.
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                          ))}
                          </Accordion>
                          </div>

                    {false && (
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