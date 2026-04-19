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

export default function LicenseeFormModal({ open, onClose, onCreated, initialUser }) {
  const [cpf, setCpf] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
    const [slug, setSlug] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
const [avatarUrl, setAvatarUrl] = useState("");
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef(null);

  const suggestedCode = useMemo(() => {
    return slugify(storeName) || slugify(fullName) || "licenciado";
  }, [storeName, fullName]);

  const suggestedSlug = useMemo(() => slug || slugify(storeName) || slugify(fullName), [slug, storeName, fullName]);

  React.useEffect(() => {
    if (open && initialUser) {
      setFoundUser(initialUser);
      setFullName(initialUser.full_name || "");
      setStoreName(initialUser.store_name || "");
      setEmail(initialUser.email || "");
      setPhone(initialUser.phone || "");
      setAvatarUrl(initialUser.avatar_url || "");
      if (initialUser.nickname) setSlug(initialUser.nickname);
    }
  }, [open, initialUser]);

  const normalizeCpf = (v) => (v || "").replace(/\D/g, "");
  const handleCpfSearch = async () => {
    const doc = normalizeCpf(cpf);
    if (!doc) return;
    const rows = await base44.entities.AppUser.filter({ cpf: doc });
    if (rows && rows.length > 0) {
      const u = rows[0];
      setFoundUser(u);
      setFullName(u.full_name || "");
      setStoreName(u.store_name || "");
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
      store_name: storeName.trim() || null,
      email: (email || "").trim().toLowerCase(),
      phone: (phone || "").trim(),
      role: "licensee",
      career_levels: ["licenciado_catalogo"],
      primary_career_level: "licenciado_catalogo",
      terms_accepted: true,
      referral_code: suggestedCode,
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
      <DialogContent className="sm:max-w-2xl bg-gray-900 border border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Loja Virtual do Vendedor</DialogTitle>
        </DialogHeader>

        {/* Busca por CPF */}
        <div className="mb-4 flex gap-2">
                        <Input placeholder="CPF do vendedor" value={cpf} onChange={(e) => setCpf(e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-400" />
                        <Button type="button" variant="outline" onClick={handleCpfSearch} className="gap-2 bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800">
            <Search className="w-4 h-4" /> Buscar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avatar */}
              <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                <button type="button" onClick={handleAvatarClick} className="relative h-14 w-14 rounded-full overflow-hidden border border-gray-700 bg-gray-900 grid place-items-center hover:ring-2 hover:ring-gray-600 transition">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto do vendedor" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-gray-900/60 grid place-items-center text-[10px] text-gray-300">Enviando...</div>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <div className="text-gray-200 font-semibold">{fullName ? `Loja Virtual de ${fullName}` : "Loja Virtual do Vendedor"}</div>
              </div>

              {/* Nome da Loja */}
              <div className="md:col-span-2">
                <Label className="text-gray-300">Nome da Loja Virtual</Label>
                <Input
                  className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                  placeholder="Ex: Loja Vale do Recreio, Loja da Maria..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Nome que aparece na listagem e gera o endereço da loja.</p>
              </div>

              {/* Nome do vendedor */}
              <div>
                <Label className="text-gray-300">Nome do vendedor</Label>
                <Input
                  className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                  placeholder="Nome completo do vendedor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* WhatsApp */}
              <div>
                <Label className="text-gray-300">WhatsApp do vendedor</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-700 bg-gray-800 text-gray-300">+55</span>
                  <Input
                                            className="rounded-l-none bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                                            placeholder="(21) 98407-2064"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}

                                          />
                </div>
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <Label className="text-gray-300">E-mail para contato (opcional)</Label>
                <Input
                                        type="email"
                                        placeholder="vendedor@provedor.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                                      />
              </div>

              {/* Link da Loja Virtual */}
              <div className="md:col-span-2">
                <Label className="text-gray-300">Link da Loja Virtual</Label>
                <Input
                  className="bg-gray-900 border-gray-700 text-gray-400 cursor-default"
                  value={`leilaonozap.net/Loja-Virtual?ref=${suggestedCode}`}
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Link gerado automaticamente pelo código de indicação.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}