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
  const [personName, setPersonName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
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
        await base44.entities.LuxuryAccessCode.create({
          code: newCode.trim(),
          label: label || undefined,
          person_name: personName || undefined,
          email: email || undefined,
          whatsapp: whatsapp || undefined,
          is_active: true,
          is_single_use: singleUse,
          is_used: false
        });
      }
      setNewCode(""); setLabel(""); setPersonName(""); setEmail(""); setWhatsapp(""); setSingleUse(true);
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Key className="w-5 h-5 text-amber-400"/> Acessos VIP</h1>
          <Link to={createPageUrl("CreateLuxuryAuction")}><Button variant="outline" className="border-gray-600 text-gray-200 bg-gray-900 hover:bg-gray-800">Voltar</Button></Link>
        </div>

        <Card className="bg-gray-800/70 border-gray-700 p-4 mb-6">
          <div className="grid md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs mb-1 text-gray-200">Código</label>
              <div className="flex gap-2">
                <Input value={newCode} onChange={(e)=>setNewCode(e.target.value)} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-300" placeholder="EX: VIP1AB23"/>
                <Button variant="outline" onClick={gen} className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">Gerar</Button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1 text-gray-200">Rótulo (opcional)</label>
              <Input value={label} onChange={(e)=>setLabel(e.target.value)} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-300" placeholder="Clube Black"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1 text-gray-200">Nome da pessoa</label>
              <Input value={personName} onChange={(e)=>setPersonName(e.target.value)} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-300" placeholder="Ex.: João Silva"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1 text-gray-200">E-mail</label>
              <Input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-300" placeholder="exemplo@email.com"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1 text-gray-200">WhatsApp</label>
              <Input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-300" placeholder="(11) 99999-9999"/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-200">Uso único</span>
              <Switch checked={singleUse} onCheckedChange={setSingleUse}/>
            </div>
            <div className="md:col-span-6">
              <Button onClick={create} disabled={saving} className="bg-amber-600 hover:bg-amber-700 w-full md:w-auto"><Plus className="w-4 h-4 mr-2"/>Criar código</Button>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-800/70 border-gray-700 p-4">
          {loading ? (
            <div className="text-gray-200">Carregando...</div>
          ) : codes.length === 0 ? (
            <div className="text-gray-200">Nenhum código criado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="text-gray-200 border-b border-gray-700/70">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-28 whitespace-nowrap">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-48 whitespace-nowrap">Pessoa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-36 whitespace-nowrap">WhatsApp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-64 whitespace-nowrap">E-mail</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-32 whitespace-nowrap">Rótulo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-28 whitespace-nowrap">Uso único</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-28 whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold tracking-wide uppercase text-gray-300 w-60 whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {codes.map((c) => (
                    <tr key={c.id} className="border-t border-gray-700/60 odd:bg-gray-800/30 hover:bg-gray-800/60 transition-colors">
                      <td className="py-3 px-4"><span className="inline-block px-2.5 py-1 rounded-md bg-gray-900 border border-gray-700 font-mono tracking-wider">{c.code}</span></td>
                      <td className="py-3 px-4 truncate max-w-[220px]">{c.person_name || '-'}</td>
                      <td className="py-3 px-4">{c.whatsapp || '-'}</td>
                      <td className="py-3 px-4 truncate max-w-[260px]">{c.email || '-'}</td>
                      <td className="py-3 px-4">{c.label ? <span className="px-2 py-1 rounded bg-gray-700/40 border border-gray-600/40">{c.label}</span> : '-'}</td>
                      <td className="py-3 px-4"><span className={c.is_single_use ? "px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30" : "px-2 py-1 rounded bg-gray-500/10 text-gray-300 border border-gray-500/30"}>{c.is_single_use ? 'Sim' : 'Não'}</span></td>
                      <td className="py-3 px-4">
                        {c.is_used ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/30"><Lock className="w-3.5 h-3.5"/> Usado</span>
                        ) : c.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-300 border border-green-500/30"><Unlock className="w-3.5 h-3.5"/> Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-500/10 text-gray-300 border border-gray-500/30">Inativo</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-2 flex-wrap justify-end bg-gray-700/30 border border-gray-600/40 rounded-lg p-1">
                          <Button size="sm" variant="outline" onClick={()=>toggleActive(c)} className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800">{c.is_active ? 'Desativar' : 'Ativar'}</Button>
                          {c.is_used && <Button size="sm" variant="outline" onClick={()=>resetUse(c)} className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"><RefreshCcw className="w-3.5 h-3.5 mr-1"/>Resetar</Button>}
                          <Button size="sm" variant="destructive" onClick={()=>remove(c)}><Trash2 className="w-3.5 h-3.5 mr-1"/>Excluir</Button>
                        </div>
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