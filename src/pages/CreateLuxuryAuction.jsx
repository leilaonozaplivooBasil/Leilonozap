import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Upload, Gem, ArrowLeft, Loader2, Trash2, Key, ImagePlus } from "lucide-react";

export default function CreateLuxuryAuction() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [increment, setIncrement] = useState("10");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [duration, setDuration] = useState("24");
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
    const p = parseFloat((startingPrice || "").toString().replace(",", "."));
    const inc = parseFloat((increment || "").toString().replace(",", "."));
    const buyNow = buyNowPrice ? parseFloat((buyNowPrice || "").toString().replace(",", ".")) : undefined;
    if (!title.trim() || !Number.isFinite(p) || !Number.isFinite(inc)) {
      alert("Preencha título, preço inicial e incremento válidos");
      return;
    }
    const hours = parseInt(duration || "24", 10);
    const endISO = new Date(Date.now() + (isNaN(hours) ? 24 : hours) * 3600000).toISOString();
    setIsSaving(true);
    try {

      await base44.entities.LuxuryAuction.create({
        title: title.trim(),
        description: description.trim(),
        image_urls: images,
        price: p,
        starting_price: p,
        increment: inc,
        buy_now_price: Number.isFinite(buyNow) ? buyNow : undefined,
        end_time: endISO,
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
          is_active: false,
          is_single_use: false,
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
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-white">
      <div className="max-w-3xl mx-auto">
        {/* Toolbar de gestão */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => setShowVipModal(true)} className="border-gray-700 bg-gray-900 text-white hover:bg-gray-800">
            <Key className="w-4 h-4 mr-2" /> Criar Acesso VIP
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('luxury-form')?.scrollIntoView({ behavior: 'smooth' })} className="border-gray-700 bg-gray-900 text-white hover:bg-gray-800">
            Cadastrar Leilão
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("LuxuryAccessManager"))} className="border-gray-700 bg-gray-900 text-white hover:bg-gray-800">
            🔑 Gerenciar Acessos VIP
          </Button>
          <Button variant="outline" onClick={() => navigate(createPageUrl("BannerManagement"))} className="border-gray-700 bg-gray-900 text-white hover:bg-gray-800">
            <ImagePlus className="w-4 h-4 mr-2" /> Adicionar Banner
          </Button>

        </div>
        <Card className="bg-gray-800/60 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white font-bold flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-400" /> Criar Leilão de Luxo
              </CardTitle>
              <Button variant="outline" onClick={() => navigate(createPageUrl("LuxuryCollection"))} className="border-gray-600 bg-gray-900 text-white hover:bg-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form id="luxury-form" ref={formRef} onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm mb-1 text-white">Título *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-gray-900 border-gray-700 text-white placeholder:text-white/60" required />
              </div>
              <div>
                <label className="block text-sm mb-1 text-white">Descrição</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-gray-900 border-gray-700 min-h-[120px] text-white placeholder:text-white/60" />
              </div>
              <div className="border border-emerald-800/40 bg-emerald-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                  <span>💲</span>
                  <span>Preços e Duração</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm mb-1 text-white">Preço Inicial (R$) *</label>
                    <Input value={startingPrice} onChange={(e)=>setStartingPrice(e.target.value)} placeholder="0,00" className="bg-gray-900 border-gray-700 text-white placeholder:text-white/60" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-white">Incremento (R$) *</label>
                    <Input value={increment} onChange={(e)=>setIncrement(e.target.value)} placeholder="10,00" className="bg-gray-900 border-gray-700 text-white placeholder:text-white/60" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-white">Preço de Compra Rápida (opcional)</label>
                    <Input value={buyNowPrice} onChange={(e)=>setBuyNowPrice(e.target.value)} placeholder="Ex.: 9.999,99" className="bg-gray-900 border-gray-700 text-white placeholder:text-white/60" />
                    <p className="text-xs text-white mt-1">Se preenchido, o leilão pode ser encerrado imediatamente por este valor.</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm mb-1 text-white">Duração do Leilão</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="6">6 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">1 dia (24h)</SelectItem>
                      <SelectItem value="72">3 dias (72h)</SelectItem>
                      <SelectItem value="168">7 dias (168h)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Imagens</label>
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
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1 text-white" />
                        <span className="text-xs text-white">Enviar</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Home"))} className="flex-1 border-gray-600 bg-gray-900 text-white hover:bg-gray-800">Cancelar</Button>
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