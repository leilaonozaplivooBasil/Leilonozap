import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, RefreshCcw, Lock, Unlock, Key, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function LuxuryAccessManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [label, setLabel] = useState("");
  const [singleUse, setSingleUse] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.LuxuryAccessCode.list("-created_date", 200);
      setCodes(Array.isArray(list) ? list : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const gen = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setNewCode(out);
  };

  const create = async () => {
    if (!newCode.trim()) return;
    setSaving(true);
    try {
      const exists = await base44.entities.LuxuryAccessCode.filter({ code: newCode.trim() });
      if (!Array.isArray(exists) || exists.length === 0) {
        await base44.entities.LuxuryAccessCode.create({ code: newCode.trim(), label: label || undefined, is_active: true, is_single_use: singleUse, is_used: false });
      }
      setNewCode(""); setLabel(""); setSingleUse(true);
      await load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (c) => {
    await base44.entities.LuxuryAccessCode.update(c.id, { is_active: !c.is_active });
    await load();
  };

  const resetUse = async (c) => {
    await base44.entities.LuxuryAccessCode.update(c.id, { is_used: false, is_active: true, used_by_user_id: null, used_at: null });
    await load();
  };

  const remove = async (c) => {
    await base44.entities.LuxuryAccessCode.delete(c.id);
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="w-5 h-5 text-amber-400"/> Acessos VIP</h1>
          <Link to={createPageUrl("CreateLuxuryAuction")}><Button variant="outline">Voltar</Button></Link>
        </div>

        <Card className="bg-gray-800/70 border-gray-700 p-4 mb-6">
          <div className="grid md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">Código</label>
              <div className="flex gap-2">
                <Input value={newCode} onChange={(e)=>setNewCode(e.target.value)} className="bg-gray-900 border-gray-700" placeholder="EX: VIP1AB23"/>
                <Button variant="outline" onClick={gen}>Gerar</Button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">Rótulo (opcional)</label>
              <Input value={label} onChange={(e)=>setLabel(e.target.value)} className="bg-gray-900 border-gray-700" placeholder="Clube Black"/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Uso único</span>
              <Switch checked={singleUse} onCheckedChange={setSingleUse}/>
            </div>
            <div className="md:col-span-5">
              <Button onClick={create} disabled={saving} className="bg-amber-600 hover:bg-amber-700 w-full md:w-auto"><Plus className="w-4 h-4 mr-2"/>Criar código</Button>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-800/70 border-gray-700 p-4">
          {loading ? (
            <div className="text-gray-400">Carregando...</div>
          ) : codes.length === 0 ? (
            <div className="text-gray-400">Nenhum código criado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-300">
                  <tr>
                    <th className="text-left py-2">Código</th>
                    <th className="text-left py-2">Rótulo</th>
                    <th className="text-left py-2">Uso único</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-t border-gray-700/60">
                      <td className="py-2 font-mono">{c.code}</td>
                      <td className="py-2">{c.label || '-'}</td>
                      <td className="py-2">{c.is_single_use ? 'Sim' : 'Não'}</td>
                      <td className="py-2">
                        {c.is_used ? (
                          <span className="text-red-400 flex items-center gap-1"><Lock className="w-3.5 h-3.5"/> Usado</span>
                        ) : c.is_active ? (
                          <span className="text-green-400 flex items-center gap-1"><Unlock className="w-3.5 h-3.5"/> Ativo</span>
                        ) : (
                          <span className="text-gray-400">Inativo</span>
                        )}
                      </td>
                      <td className="py-2 text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={()=>toggleActive(c)}>{c.is_active ? 'Desativar' : 'Ativar'}</Button>
                        {c.is_used && <Button size="sm" variant="outline" onClick={()=>resetUse(c)}><RefreshCcw className="w-3.5 h-3.5 mr-1"/>Resetar</Button>}
                        <Button size="sm" variant="destructive" onClick={()=>remove(c)}><Trash2 className="w-3.5 h-3.5 mr-1"/>Excluir</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}