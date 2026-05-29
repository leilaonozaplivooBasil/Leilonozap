import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, CheckCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ShippingSettings() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [settingsId, setSettingsId] = useState(null);

  const [formData, setFormData] = useState({
    client_id: "",
    client_secret: "",
    cep_origem: "",
    comprimento_padrao: 20,
    altura_padrao: 10,
    largura_padrao: 15,
    peso_padrao: 1,
    servico_pac: true,
    servico_sedex: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    // Verificar se é admin
    const savedUserJSON = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!savedUserJSON || !isLoggedIn) {
      toast.error("Faça login para acessar esta página");
      navigate(createPageUrl("Home"));
      return;
    }

    const user = JSON.parse(savedUserJSON);
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate(createPageUrl("Home"));
      return;
    }

    setCurrentUser(user);

    // Carregar configurações existentes
    try {
      const settings = await base44.entities.FreteSettings.list();
      if (settings.length > 0) {
        const config = settings[0];
        setSettingsId(config.id);
        setFormData({
          client_id: config.client_id || "",
          client_secret: config.client_secret || "",
          cep_origem: config.cep_origem || "",
          comprimento_padrao: config.comprimento_padrao || 20,
          altura_padrao: config.altura_padrao || 10,
          largura_padrao: config.largura_padrao || 15,
          peso_padrao: config.peso_padrao || 1,
          servico_pac: config.servico_pac !== false,
          servico_sedex: config.servico_sedex !== false
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.client_secret || !formData.cep_origem) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSaving(true);

    try {
      if (settingsId) {
        await base44.entities.FreteSettings.update(settingsId, formData);
        toast.success("✅ Configurações atualizadas com sucesso!");
      } else {
        const newConfig = await base44.entities.FreteSettings.create(formData);
        setSettingsId(newConfig.id);
        toast.success("✅ Configurações criadas com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.client_id || !formData.client_secret) {
      toast.error("Preencha Client ID e Client Secret primeiro");
      return;
    }

    setIsTesting(true);

    try {
      const response = await base44.functions.invoke('testCorreiosConnection', {
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        cep_origem: formData.cep_origem || '22790-703'
      });

      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Erro ao testar conexão: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCepChange = (value) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 8) cleanValue = cleanValue.slice(0, 8);
    if (cleanValue.length > 5) {
      cleanValue = `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`;
    }
    setFormData({ ...formData, cep_origem: cleanValue });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Truck className="w-8 h-8 text-green-500" />
            Configurações de Frete (Correios API Pública)
          </h1>
          <p className="text-gray-400">Configure a integração com a API dos Correios para cálculo automático de frete</p>
        </div>

        {/* Credenciais */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">📝 Credenciais Correios</CardTitle>
            <CardDescription className="text-gray-400">
              Obtenha suas credenciais no portal dos Correios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-400">Client ID *</Label>
              <Input
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                placeholder="Seu Client ID dos Correios"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-400">Client Secret *</Label>
              <Input
                type="password"
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                placeholder="Seu Client Secret dos Correios"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outline"
              className="w-full border-green-500 text-green-500 hover:bg-green-500/10"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Configurações Gerais */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">📦 Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-400">CEP de Origem *</Label>
              <Input
                value={formData.cep_origem}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div className="border-t border-gray-700 pt-4 mt-4">
              <h4 className="text-white font-semibold mb-3">Dimensões Padrão do Produto</h4>
              <p className="text-gray-400 text-sm mb-4">
                Usado quando o produto não tem dimensões específicas cadastradas
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Comprimento (cm)</Label>
                  <Input
                    type="number"
                    value={formData.comprimento_padrao}
                    onChange={(e) => setFormData({ ...formData, comprimento_padrao: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Altura (cm)</Label>
                  <Input
                    type="number"
                    value={formData.altura_padrao}
                    onChange={(e) => setFormData({ ...formData, altura_padrao: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Largura (cm)</Label>
                  <Input
                    type="number"
                    value={formData.largura_padrao}
                    onChange={(e) => setFormData({ ...formData, largura_padrao: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.peso_padrao}
                    onChange={(e) => setFormData({ ...formData, peso_padrao: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">⛽ Serviços a Disponibilizar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="pac"
                checked={formData.servico_pac}
                onCheckedChange={(checked) => setFormData({ ...formData, servico_pac: checked })}
              />
              <Label htmlFor="pac" className="text-white cursor-pointer">
                PAC (04510) - Econômico
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="sedex"
                checked={formData.servico_sedex}
                onCheckedChange={(checked) => setFormData({ ...formData, servico_sedex: checked })}
              />
              <Label htmlFor="sedex" className="text-white cursor-pointer">
                SEDEX (04014) - Rápido
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Package className="w-5 h-5 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}