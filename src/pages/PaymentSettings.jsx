import React, { useState, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import { base44 } from "@/api/base44Client";
import { adminDataProxy } from "@/functions/adminDataProxy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  DollarSign, 
  Save, 
  Edit, 
  Trash2, 
  Plus,
  Copy,
  Check,
  Wallet,
  Package,
  Settings as SettingsIcon,
  TrendingUp,
  ArrowUpCircle,
  ShoppingBag
} from "lucide-react";
import { toast } from "sonner";

export default function PaymentSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("gateway");
  
  // Gateway settings
  const [gatewaySettings, setGatewaySettings] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({
    gateway_name: "generic_http",
    gateway_type: "generic_http",
    base_url: "",
    payment_endpoint: "/payments",
    http_method: "POST",
    headers_json: '{"Authorization": "Bearer {{API_KEY}}", "Content-Type": "application/json"}',
    api_key: "",
    webhook_secret: "",
    reference_field: "reference_id",
    status_field_path: "status",
    approved_status_value: "paid",
    is_active: true,
    pix_key: "",
    pix_key_type: "cpf",
    wallet_enabled: true,
    wallet_deposit_message: "Escolha o valor que deseja adicionar à sua conta",
    wallet_insufficient_message: "Saldo insuficiente. Por favor, adicione saldo para continuar."
  });
  
  // Deposit packages
  const [depositPackages, setDepositPackages] = useState([]);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [packageForm, setPackageForm] = useState({
    label: "",
    amount: "",
    is_active: true,
    sort_order: 0
  });
  
  // Wallet stats
  const [walletStats, setWalletStats] = useState({
    totalDeposits: 0,
    totalBalance: 0,
    totalPurchases: 0
  });
  
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      
      if (savedUserJSON && isLoggedIn) {
        const user = JSON.parse(savedUserJSON);
        
        if (user.role === 'admin') {
          setCurrentUser(user);
          await loadAllData();
        } else {
          toast.error("Acesso negado. Apenas administradores.");
        }
      } else {
        toast.error("Faça login para continuar");
      }
      setIsLoading(false);
    };
    checkAdminStatus();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadGatewaySettings(),
      loadDepositPackages(),
      loadWalletStats()
    ]);
  };

  const getCallerEmail = () => {
    try { const s = localStorage.getItem('currentUser'); return s ? JSON.parse(s).email : null; } catch { return null; }
  };

  const loadGatewaySettings = async () => {
    try {
      const response = await adminDataProxy({ entity_name: 'PaymentSettings', method: 'list', params: { sort_by: '-created_date', limit: 1 }, caller_email: getCallerEmail() });
      const settings = response?.data?.data || response?.data || [];
      if (settings.length > 0) {
        const setting = settings[0];
        setGatewaySettings(setting);
        setGatewayForm({
          gateway_name: setting.gateway_name || "generic_http",
          gateway_type: setting.gateway_type || "generic_http",
          base_url: setting.base_url || "",
          payment_endpoint: setting.payment_endpoint || "/payments",
          http_method: setting.http_method || "POST",
          headers_json: setting.headers_json || '{"Authorization": "Bearer {{API_KEY}}", "Content-Type": "application/json"}',
          api_key: setting.api_key || "",
          webhook_secret: setting.webhook_secret || "",
          reference_field: setting.reference_field || "reference_id",
          status_field_path: setting.status_field_path || "status",
          approved_status_value: setting.approved_status_value || "paid",
          is_active: setting.is_active !== false,
          pix_key: setting.pix_key || "",
          pix_key_type: setting.pix_key_type || "cpf",
          wallet_enabled: setting.wallet_enabled !== false,
          wallet_deposit_message: setting.wallet_deposit_message || "Escolha o valor que deseja adicionar à sua conta",
          wallet_insufficient_message: setting.wallet_insufficient_message || "Saldo insuficiente. Por favor, adicione saldo para continuar."
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadDepositPackages = async () => {
    try {
      const packages = await base44.entities.DepositPackage.list("sort_order", 50);
      setDepositPackages(packages);
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
    }
  };

  const loadWalletStats = async () => {
    try {
      const [txResponse, walletResponse] = await Promise.all([
        adminDataProxy({ entity_name: 'WalletTransaction', method: 'list', params: { sort_by: '-created_date', limit: 1000 }, caller_email: getCallerEmail() }),
        adminDataProxy({ entity_name: 'Wallet', method: 'list', params: { sort_by: '-created_date', limit: 1000 }, caller_email: getCallerEmail() })
      ]);
      const transactions = txResponse?.data?.data || txResponse?.data || [];
      const wallets = walletResponse?.data?.data || walletResponse?.data || [];
      
      const confirmedDeposits = transactions.filter(t => 
        t.type === 'deposit' && t.status === 'confirmed'
      );
      const totalDeposits = confirmedDeposits.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
      
      const confirmedPurchases = transactions.filter(t => 
        t.type === 'purchase' && t.status === 'confirmed'
      );
      const totalPurchases = confirmedPurchases.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      setWalletStats({
        totalDeposits,
        totalBalance,
        totalPurchases
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const handleSaveGateway = async () => {
    try {
      if (gatewaySettings) {
        await base44.entities.PaymentSettings.update(gatewaySettings.id, gatewayForm);
        toast.success("✅ Configurações atualizadas!");
      } else {
        await base44.entities.PaymentSettings.create(gatewayForm);
        toast.success("✅ Configurações salvas!");
      }
      await loadGatewaySettings();
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleSavePackage = async () => {
    try {
      if (!packageForm.label || !packageForm.amount) {
        toast.error("Preencha todos os campos");
        return;
      }
      
      const data = {
        label: packageForm.label,
        amount: parseFloat(packageForm.amount),
        is_active: packageForm.is_active,
        sort_order: parseInt(packageForm.sort_order || 0)
      };
      
      if (editingPackageId) {
        await base44.entities.DepositPackage.update(editingPackageId, data);
        toast.success("✅ Pacote atualizado!");
        setEditingPackageId(null);
      } else {
        await base44.entities.DepositPackage.create(data);
        toast.success("✅ Pacote criado!");
      }
      
      setPackageForm({
        label: "",
        amount: "",
        is_active: true,
        sort_order: 0
      });
      
      await loadDepositPackages();
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleEditPackage = (pkg) => {
    setEditingPackageId(pkg.id);
    setPackageForm({
      label: pkg.label,
      amount: pkg.amount.toString(),
      is_active: pkg.is_active,
      sort_order: pkg.sort_order || 0
    });
  };

  const handleDeletePackage = async (pkgId) => {
    if (!confirm("Tem certeza que deseja excluir este pacote?")) return;
    
    try {
      await base44.entities.DepositPackage.delete(pkgId);
      toast.success("🗑️ Pacote excluído!");
      await loadDepositPackages();
      
      if (editingPackageId === pkgId) {
        setEditingPackageId(null);
        setPackageForm({
          label: "",
          amount: "",
          is_active: true,
          sort_order: 0
        });
      }
    } catch (error) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const togglePackageActive = async (pkgId, currentStatus) => {
    try {
      await base44.entities.DepositPackage.update(pkgId, { is_active: !currentStatus });
      toast.success(currentStatus ? "Pacote desativado" : "Pacote ativado!");
      await loadDepositPackages();
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/functions/walletWebhookHandler`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success("✅ URL copiada!");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (!currentUser || currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Acesso negado. Apenas administradores.</p>
      </div>
    );
  }

  const webhookUrl = `${window.location.origin}/api/functions/walletWebhookHandler`;
  
  const examplePayload = {
    amount: 100.00,
    description: "Depósito R$ 100",
    [gatewayForm.reference_field]: "DEP_user123_1234567890",
    customer: {
      name: "Nome do Cliente",
      email: "cliente@email.com",
      phone: "(11) 99999-9999"
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <DollarSign className="w-8 h-8 text-green-500" />
          <h1 className="text-3xl font-bold text-white">Configurar Pagamentos</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 mb-6">
            <TabsTrigger value="gateway" className="data-[state=active]:bg-green-600">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Gateway & Credenciais
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-green-600">
              <Package className="w-4 h-4 mr-2" />
              Pacotes de Depósito
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-green-600">
              <Wallet className="w-4 h-4 mr-2" />
              Carteira & Regras
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: GATEWAY & CREDENCIAIS */}
          <TabsContent value="gateway" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Configuração do Gateway</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Tipo de Gateway</Label>
                    <Select 
                      value={gatewayForm.gateway_type} 
                      onValueChange={(value) => setGatewayForm({...gatewayForm, gateway_type: value})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="generic_http">Gateway Genérico via HTTP</SelectItem>
                        <SelectItem value="specific">Gateway Específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-400">Nome do Gateway</Label>
                    <Select 
                      value={gatewayForm.gateway_name} 
                      onValueChange={(value) => setGatewayForm({...gatewayForm, gateway_name: value})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="generic_http">Gateway Genérico</SelectItem>
                        <SelectItem value="manual">Manual (PIX)</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                        <SelectItem value="pagarme">Pagar.me</SelectItem>
                        <SelectItem value="asaas">Asaas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Base URL da API</Label>
                  <Input
                    value={gatewayForm.base_url}
                    onChange={(e) => setGatewayForm({...gatewayForm, base_url: e.target.value})}
                    placeholder="https://api.gateway.com"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Endpoint de Pagamento</Label>
                    <Input
                      value={gatewayForm.payment_endpoint}
                      onChange={(e) => setGatewayForm({...gatewayForm, payment_endpoint: e.target.value})}
                      placeholder="/payments ou /charges"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Método HTTP</Label>
                    <Select 
                      value={gatewayForm.http_method} 
                      onValueChange={(value) => setGatewayForm({...gatewayForm, http_method: value})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Headers (JSON)</Label>
                  <Textarea
                    value={gatewayForm.headers_json}
                    onChange={(e) => setGatewayForm({...gatewayForm, headers_json: e.target.value})}
                    placeholder='{"Authorization": "Bearer {{API_KEY}}"}'
                    className="bg-gray-900 border-gray-600 text-white font-mono text-sm"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {'{{API_KEY}}'} como placeholder</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">API Key / Token</Label>
                    <Input
                      type="password"
                      value={gatewayForm.api_key}
                      onChange={(e) => setGatewayForm({...gatewayForm, api_key: e.target.value})}
                      placeholder="Sua chave de API"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Webhook Secret</Label>
                    <Input
                      type="password"
                      value={gatewayForm.webhook_secret}
                      onChange={(e) => setGatewayForm({...gatewayForm, webhook_secret: e.target.value})}
                      placeholder="Chave de assinatura do webhook"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-400">Campo de Referência</Label>
                    <Input
                      value={gatewayForm.reference_field}
                      onChange={(e) => setGatewayForm({...gatewayForm, reference_field: e.target.value})}
                      placeholder="reference_id"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Campo de Status (path)</Label>
                    <Input
                      value={gatewayForm.status_field_path}
                      onChange={(e) => setGatewayForm({...gatewayForm, status_field_path: e.target.value})}
                      placeholder="status ou data.status"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Valor de Status Aprovado</Label>
                    <Input
                      value={gatewayForm.approved_status_value}
                      onChange={(e) => setGatewayForm({...gatewayForm, approved_status_value: e.target.value})}
                      placeholder="paid, approved, succeeded"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <p className="text-blue-300 font-semibold mb-2">📡 URL do Webhook (Configure no Gateway)</p>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="bg-gray-900 border-gray-600 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={copyWebhookUrl}
                      variant="outline"
                      size="icon"
                      className="border-blue-600 text-blue-400"
                    >
                      {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 font-semibold mb-2">📄 Exemplo de Payload Enviado ao Gateway</p>
                  <pre className="text-xs text-green-400 bg-black/50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(examplePayload, null, 2)}
                  </pre>
                </div>

                <Button onClick={handleSaveGateway} className="w-full bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações do Gateway
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: PACOTES DE DEPÓSITO */}
          <TabsContent value="packages" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingPackageId ? "Editar Pacote" : "Novo Pacote de Depósito"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-400">Nome do Pacote</Label>
                    <Input
                      value={packageForm.label}
                      onChange={(e) => setPackageForm({...packageForm, label: e.target.value})}
                      placeholder="Ex: Depósito R$ 100"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={packageForm.amount}
                      onChange={(e) => setPackageForm({...packageForm, amount: e.target.value})}
                      placeholder="100.00"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Ordem de Exibição</Label>
                    <Input
                      type="number"
                      value={packageForm.sort_order}
                      onChange={(e) => setPackageForm({...packageForm, sort_order: e.target.value})}
                      placeholder="0"
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={packageForm.is_active}
                    onCheckedChange={(checked) => setPackageForm({...packageForm, is_active: checked})}
                  />
                  <Label className="text-gray-400">Pacote ativo</Label>
                </div>

                <Button onClick={handleSavePackage} className="w-full bg-green-600 hover:bg-green-700">
                  {editingPackageId ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Atualizar Pacote
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Pacote
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">Pacotes Configurados</h2>
              {depositPackages.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Nenhum pacote configurado ainda.</p>
                  </CardContent>
                </Card>
              ) : (
                depositPackages.map((pkg) => (
                  <Card key={pkg.id} className={`bg-gray-800 border-gray-700 ${
                    editingPackageId === pkg.id ? 'ring-2 ring-green-500' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            pkg.is_active ? 'bg-green-600/20' : 'bg-gray-700'
                          }`}>
                            <Package className={`w-5 h-5 ${
                              pkg.is_active ? 'text-green-400' : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <p className="text-white font-semibold flex items-center gap-2">
                              {pkg.label}
                              <Badge className={pkg.is_active ? "bg-green-600" : "bg-gray-600"}>
                                {pkg.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </p>
                            <p className="text-gray-400 text-sm">
                              R$ {fmtBR(pkg.amount)} • Ordem: {pkg.sort_order}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPackage(pkg)}
                            className="border-gray-600 text-gray-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePackageActive(pkg.id, pkg.is_active)}
                            className={pkg.is_active ? 'text-yellow-400' : 'text-green-400'}
                          >
                            {pkg.is_active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="border-red-600 text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ABA 3: CARTEIRA & REGRAS */}
          <TabsContent value="wallet" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Configurações da Carteira</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <div>
                    <p className="text-white font-semibold">Carteira Interna Habilitada</p>
                    <p className="text-gray-400 text-sm">Permite depósitos e pagamentos com saldo</p>
                  </div>
                  <Switch
                    checked={gatewayForm.wallet_enabled}
                    onCheckedChange={(checked) => setGatewayForm({...gatewayForm, wallet_enabled: checked})}
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Mensagem na Tela de Depósito</Label>
                  <Textarea
                    value={gatewayForm.wallet_deposit_message}
                    onChange={(e) => setGatewayForm({...gatewayForm, wallet_deposit_message: e.target.value})}
                    className="bg-gray-900 border-gray-600 text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Mensagem de Saldo Insuficiente</Label>
                  <Textarea
                    value={gatewayForm.wallet_insufficient_message}
                    onChange={(e) => setGatewayForm({...gatewayForm, wallet_insufficient_message: e.target.value})}
                    className="bg-gray-900 border-gray-600 text-white"
                    rows={2}
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    ℹ️ <strong>Saldo só é liberado após confirmação do webhook</strong> do gateway de pagamento.
                  </p>
                </div>

                <Button onClick={handleSaveGateway} className="w-full bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações da Carteira
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Estatísticas da Carteira</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <p className="text-gray-400 text-sm">Total Depositado</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {fmtBR(walletStats.totalDeposits)}
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ArrowUpCircle className="w-5 h-5 text-blue-400" />
                    <p className="text-gray-400 text-sm">Saldo em Circulação</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    R$ {fmtBR(walletStats.totalBalance)}
                  </p>
                </div>

                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingBag className="w-5 h-5 text-purple-400" />
                    <p className="text-gray-400 text-sm">Total de Compras</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    R$ {fmtBR(walletStats.totalPurchases)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}