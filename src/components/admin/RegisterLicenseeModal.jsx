import React from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function slugify(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

export default function RegisterLicenseeModal({ isOpen, onClose, onSuccess }) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [referralCode, setReferralCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [touchedCode, setTouchedCode] = React.useState(false);

  React.useEffect(() => {
    if (!touchedCode) {
      const base = slugify(fullName) || "licenciado";
      setReferralCode(base + Math.floor(100 + Math.random() * 900));
    }
  }, [fullName, touchedCode]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      toast.error("Preencha nome, e-mail, telefone e senha.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim(),
        nickname: nickname.trim() || null,
        referral_code: (referralCode || slugify(fullName) || "licenciado") + "",
        role: "licensee",
        terms_accepted: true,
        career_levels: [
          "usuario",
          "licenciado_aplicativo",
          "licenciado_catalogo"
        ],
        primary_career_level: "licenciado_catalogo",
      };

      const created = await base44.entities.AppUser.create(payload);
      toast.success("Licenciado criado: " + created.full_name);
      onSuccess?.(created);
    } catch (e) {
      toast.error(e?.message || "Erro ao criar licenciado");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-green-400">Registrar licenciado</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2">
            <Label className="text-gray-300">Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="Ex: Cris Bastos" />
          </div>
          <div>
            <Label className="text-gray-300">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label className="text-gray-300">Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label className="text-gray-300">Senha inicial</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="Defina uma senha" />
          </div>
          <div>
            <Label className="text-gray-300">Apelido (opcional)</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="Como aparecerá no app" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-gray-300">Código do catálogo</Label>
            <Input
              value={referralCode}
              onChange={(e) => { setReferralCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "")); setTouchedCode(true); }}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="ex: crisbastos123"
            />
            <p className="text-xs text-gray-400 mt-1">Link do catálogo ficará: https://leilaonozap.app/c/{referralCode || "seu_codigo"}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-600">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-green-600 hover:bg-green-700">
            {busy ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}