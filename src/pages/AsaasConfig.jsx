import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, AlertCircle, LinkIcon, ShieldCheck, Globe, PlugZap } from 'lucide-react';

import { asaasValidateCredentials } from '@/functions/asaasValidateCredentials';
import { asaasRegisterWebhook } from '@/functions/asaasRegisterWebhook';

export default function AsaasConfig() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [validRes, setValidRes] = useState(null);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.AsaasAppSettings.list('-updated_date', 1);
      setSettings(list?.[0] || { asaasEnvironment: 'SANDBOX', defaultDueDays: 1, enableCardTokenization: false });
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.AsaasAppSettings.update(settings.id, { ...settings, updatedAt: new Date().toISOString() });
      } else {
        const created = await base44.entities.AsaasAppSettings.create({ ...settings, updatedAt: new Date().toISOString() });
        setSettings(created);
      }
    } finally { setSaving(false); }
  };

  const validate = async () => {
    const { data } = await asaasValidateCredentials({});
    setValidRes(data);
  };

  const registerWebhook = async () => {
    const { data } = await asaasRegisterWebhook({});
    setValidRes(data);
  };

  if (!settings) return <div className="min-h-screen bg-gray-900 text-white p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400"/> Configuração Asaas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Ambiente</label>
              <Select value={settings.asaasEnvironment} onValueChange={(v)=>setSettings(s=>({...s, asaasEnvironment: v}))}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SANDBOX">SANDBOX</SelectItem>
                  <SelectItem value="PRODUCTION">PRODUCTION</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm mb-1">User-Agent</label>
              <Input value={settings.asaasUserAgent || ''} onChange={(e)=>setSettings(s=>({...s, asaasUserAgent: e.target.value}))} className="bg-gray-900 border-gray-700" placeholder="MeuApp/1.0" />
            </div>

            <div>
              <label className="block text-sm mb-1">Webhook URL</label>
              <Input value={settings.webhookUrl || ''} onChange={(e)=>setSettings(s=>({...s, webhookUrl: e.target.value}))} className="bg-gray-900 border-gray-700" placeholder="https://seuapp.com/functions/asaasHandleWebhook" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Dias de vencimento padrão</label>
                <Input type="number" value={settings.defaultDueDays ?? 1} onChange={(e)=>setSettings(s=>({...s, defaultDueDays: Number(e.target.value || 1)}))} className="bg-gray-900 border-gray-700" />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <Switch checked={!!settings.enableCardTokenization} onCheckedChange={(v)=>setSettings(s=>({...s, enableCardTokenization: v}))} />
                <span>Habilitar tokenização</span>
              </div>
            </div>

            <div className="rounded-lg bg-gray-900 border border-gray-700 p-3 text-sm text-gray-300">
              As chaves da API devem ser setadas como segredos: ASAAS_API_KEY_SANDBOX e ASAAS_API_KEY_PRODUCTION. Nunca ficam visíveis aqui.
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button>
            <Button variant="outline" onClick={validate} className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"><PlugZap className="w-4 h-4 mr-2"/>Validar credenciais</Button>
            <Button variant="outline" onClick={registerWebhook} className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"><LinkIcon className="w-4 h-4 mr-2"/>Registrar Webhook</Button>
          </CardFooter>
        </Card>

        {validRes && (
          <div className="mt-4 p-3 rounded border bg-gray-800 border-gray-700 text-sm">
            {validRes.ok ? (
              <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4"/> Ok</div>
            ) : (
              <div className="flex items-center gap-2 text-red-400"><AlertCircle className="w-4 h-4"/> {validRes.error || 'Erro'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}