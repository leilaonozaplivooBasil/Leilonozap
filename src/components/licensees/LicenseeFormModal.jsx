import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LicenseeFormModal({ open, onClose, onCreated }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedCode = useMemo(() => {
    const base = slugify(fullName).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 6);
    return (base || "licenciado") + rand;
  }, [fullName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: password,
      role: "licensee",
      career_levels: ["licenciado_catalogo"],
      primary_career_level: "licenciado_catalogo",
      terms_accepted: true,
      referral_code: suggestedCode,
    };

    const user = await base44.entities.AppUser.create(payload);
    setIsSubmitting(false);
    onCreated?.(user);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200 text-slate-800">
        <DialogHeader>
          <DialogTitle>Cadastrar Licenciado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white"/>
          </div>
          <div>
            <Label className="text-gray-300">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-gray-800 border-gray-700 text-white"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-gray-800 border-gray-700 text-white"/>
            </div>
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-gray-800 border-gray-700 text-white"/>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Código de indicação (auto)</Label>
            <Input value={suggestedCode} readOnly className="bg-gray-800 border-gray-700 text-gray-400"/>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600 text-gray-200">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}