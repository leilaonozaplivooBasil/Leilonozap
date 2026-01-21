import React, { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Camera, Search } from "lucide-react";

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LicenseeFormModal({ open, onClose, onCreated }) {
  const [cpf, setCpf] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
    const [slug, setSlug] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
const [avatarUrl, setAvatarUrl] = useState("");
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef(null);

  const suggestedCode = useMemo(() => {
    const base = slugify(fullName).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 6);
    return (base || "licenciado") + rand;
  }, [fullName]);

  const suggestedSlug = useMemo(() => slug || slugify(fullName), [slug, fullName]);

  const normalizeCpf = (v) => (v || "").replace(/\D/g, "");
  const handleCpfSearch = async () => {
    const doc = normalizeCpf(cpf);
    if (!doc) return;
    const rows = await base44.entities.AppUser.filter({ cpf: doc });
    if (rows && rows.length > 0) {
      const u = rows[0];
      setFoundUser(u);
      setFullName(u.full_name || "");
      setEmail(u.email || "");
      setPhone(u.phone || "");
      setAvatarUrl(u.avatar_url || "");
      if (u.nickname) setSlug(u.nickname);
    } else {
      setFoundUser(null);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setIsUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const common = {
      full_name: fullName.trim(),
      email: (email || "").trim().toLowerCase(),
      phone: (phone || "").trim(),
      role: "licensee",
      career_levels: ["licenciado_catalogo"],
      primary_career_level: "licenciado_catalogo",
      terms_accepted: true,
      referral_code: (foundUser && foundUser.referral_code) ? foundUser.referral_code : suggestedCode,
      nickname: suggestedSlug,
      avatar_url: avatarUrl,
    };

    let res;
    if (foundUser) {
      res = await base44.entities.AppUser.update(foundUser.id, common);
    } else {
      const genPass = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      res = await base44.entities.AppUser.create({ ...common, password: genPass });
    }

    setIsSubmitting(false);
    onCreated?.(res);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 text-slate-800">
        <DialogHeader>
          <DialogTitle>Catálogo do Vendedor</DialogTitle>
        </DialogHeader>

        {/* Busca por CPF */}
        <div className="mb-4 flex gap-2">
          <Input placeholder="CPF do vendedor" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          <Button type="button" variant="outline" onClick={handleCpfSearch} className="gap-2">
            <Search className="w-4 h-4" /> Buscar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avatar */}
              <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                <button type="button" onClick={handleAvatarClick} className="relative h-14 w-14 rounded-full overflow-hidden border border-slate-200 bg-white grid place-items-center hover:ring-2 hover:ring-slate-300 transition">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto do vendedor" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/60 grid place-items-center text-[10px] text-slate-600">Enviando...</div>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <div className="text-slate-700 font-medium">Catálogo do Vendedor</div>
              </div>

              {/* Nome */}
              <div>
                <Label className="text-slate-600">Nome do vendedor</Label>
                <Input
                  placeholder="Digite o nome dele aqui"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (!slug) setSlug(slugify(e.target.value));
                  }}
                  required
                />
              </div>

              {/* WhatsApp */}
              <div>
                <Label className="text-slate-600">WhatsApp do vendedor</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-200 bg-white text-slate-500">+55</span>
                  <Input
                    className="rounded-l-none"
                    placeholder="(21) 98407-2064"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    
                  />
                </div>
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <Label className="text-slate-600">E-mail para contato (opcional)</Label>
                <Input
                  type="email"
                  placeholder="vendedor@provedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Endereço do catálogo */}
              <div className="md:col-span-2">
                <Label className="text-slate-600">Endereço do catálogo do vendedor</Label>
                <div className="flex flex-nowrap items-stretch">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-200 bg-white text-slate-500 whitespace-nowrap shrink-0 text-sm">https://leilaonozap.app/catalog?ref=</span>
                  <Input
                    className="rounded-l-none flex-1 min-w-0"
                    placeholder="Ex: nome-do-vendedor"
                    value={suggestedSlug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}