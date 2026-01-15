import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Upload, Gem, ArrowLeft, Loader2, Trash2, Key, Users, ImagePlus } from "lucide-react";

export default function CreateLuxuryAuction() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef(null);
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipCode, setVipCode] = useState("");
  const [vipLabel, setVipLabel] = useState("");
  const [vipSingleUse, setVipSingleUse] = useState(true);
  const [savingVip, setSavingVip] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const p = parseFloat(price);
    if (!title.trim() || !Number.isFinite(p)) {
      alert("Preencha título e preço válidos");
      return;
    }
    setIsSaving(true);
    try {

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

  const generateVip = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setVipCode(out);
  };

  const saveVip = async () => {
    const code = vipCode.trim();
    if (!code) return;
    setSavingVip(true);
    try {
      const exists = await base44.entities.LuxuryAccessCode.filter({ code });
      if (!Array.isArray(exists) || exists.length === 0) {
        await base44.entities.LuxuryAccessCode.create({
          code,
          label: vipLabel || undefined,
          is_active: true,
          is_single_use: vipSingleUse,
          is_used: false
        });
      }
      setShowVipModal(false);
      setVipCode("");
      setVipLabel("");
      setVipSingleUse(true);
    } finally {
      setSavingVip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-200">
      <div className="max-w-3xl mx-auto">
        {/* Toolbar de gestão */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => setShowVipModal(true)} className="bg-amber-600 hover:bg-amber-700">
            <Key className="w-4 h-4 mr-2" /> Criar Acesso VIP
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('luxury-form')?.scrollIntoView({ behavior: 'smooth' })}>
            Cadastrar Leilão
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("LuxuryAccessManager"))}>
            🔑 Gerenciar Acessos VIP
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("BannerManagement"))}>
            <ImagePlus className="w-4 h-4 mr-2" /> Adicionar Banner
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("LuxuryAccessManager"))}>
            <Users className="w-4 h-4 mr-2" /> Gerenciar Usuários
          </Button>
        </div>
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
            <form id="luxury-form" ref={formRef} onSubmit={handleSubmit} className="space-y-5">
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