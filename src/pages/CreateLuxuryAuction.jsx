import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Gem, ArrowLeft, Loader2, Trash2, Key, CheckCircle2 } from "lucide-react";

export default function CreateLuxuryAuction() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeLabel, setCodeLabel] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");

  const handleUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      if (res?.file_url) setImages((prev) => [...prev, res.file_url]);
    } finally {
      setIsUploading(false);
    }
  };

  const ensureAccessCodeExists = async (code, label) => {
    const rows = await base44.entities.LuxuryAccessCode.filter({ code, is_active: true });
    if (!Array.isArray(rows) || rows.length === 0) {
      await base44.entities.LuxuryAccessCode.create({ code, label: label || undefined, is_active: true });
    }
  };

  const handleGenerateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setAccessCode(out);
  };

  const handleCreateCode = async () => {
    const code = accessCode.trim();
    if (!code) { setCodeMessage("Informe um código."); return; }
    setCreatingCode(true);
    setCodeMessage("");
    try {
      const rows = await base44.entities.LuxuryAccessCode.filter({ code });
      if (Array.isArray(rows) && rows.length > 0) {
        setCodeMessage("Código já existe e está disponível.");
      } else {
        await base44.entities.LuxuryAccessCode.create({ code, label: codeLabel || undefined, is_active: true });
        setCodeMessage("Código criado com sucesso.");
      }
    } catch (err) {
      setCodeMessage("Erro: " + err.message);
    } finally {
      setCreatingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const p = parseFloat(price);
    if (!title.trim() || !Number.isFinite(p)) {
      alert("Preencha título e preço válidos");
      return;
    }
    setIsSaving(true);
    try {
      if (accessCode.trim()) {
        await ensureAccessCodeExists(accessCode.trim(), codeLabel.trim());
      }
      await base44.entities.LuxuryAuction.create({
        title: title.trim(),
        description: description.trim(),
        image_urls: images,
        price: p,
        status: "active"
      });
      alert("Leilão de luxo criado!");
      navigate(createPageUrl("LuxuryCollection"));
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-200">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-gray-800/60 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white font-bold flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-400" /> Criar Leilão de Luxo
              </CardTitle>
              <Button variant="outline" onClick={() => navigate(createPageUrl("LuxuryCollection"))} className="border-gray-600 text-gray-300">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm mb-1">Título *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-gray-900 border-gray-700" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Descrição</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-gray-900 border-gray-700 min-h-[120px]" />
              </div>
              <div>
                <label className="block text-sm mb-1">Preço (R$) *</label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-gray-900 border-gray-700" required />
              </div>

              <div className="pt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-amber-300 mb-2">
                  <Key className="w-4 h-4" />
                  <span className="text-sm font-semibold">Acesso VIP (opcional)</span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs mb-1">Código</label>
                    <Input value={accessCode} onChange={(e)=>setAccessCode(e.target.value)} placeholder="EX: VIP8X29" className="bg-gray-900 border-amber-700/60" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="button" variant="outline" onClick={handleGenerateCode} className="border-amber-700/60 text-amber-300">Gerar</Button>
                    <Button type="button" onClick={handleCreateCode} disabled={creatingCode} className="bg-amber-600 hover:bg-amber-700">
                      {creatingCode ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Criando...</>) : "Criar código"}
                    </Button>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs mb-1">Rótulo (opcional)</label>
                    <Input value={codeLabel} onChange={(e)=>setCodeLabel(e.target.value)} placeholder="Ex.: Clube Black, VIP Rolex..." className="bg-gray-900 border-amber-700/60" />
                  </div>
                </div>
                {codeMessage && <div className="mt-2 text-xs text-amber-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {codeMessage}</div>}
              </div>

              <div>
                <label className="block text-sm mb-2">Imagens</label>
                <div className="flex gap-3 flex-wrap">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative w-32 h-24 border border-gray-700 rounded overflow-hidden">
                      <img src={url} alt="img" className="w-full h-full object-cover" />
                      <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <label className="w-32 h-24 flex items-center justify-center border-2 border-dashed border-gray-600 rounded cursor-pointer hover:bg-gray-800">
                    <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                      onChange={(e) => e.target.files && e.target.files[0] && handleUpload(e.target.files[0])} />
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="text-xs text-gray-400">Enviar</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Home"))} className="flex-1 border-gray-600 text-gray-300">Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-amber-600 hover:bg-amber-700">
                  {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Salvando...</>) : "Criar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}