import React, { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Camera, Search, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SellerFormModal({ open, onClose, onCreated, onUpdated, editingSeller }) {
  const isEditMode = !!editingSeller;

  const [cpf, setCpf] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const suggestedCode = useMemo(() => {
    if (isEditMode) return editingSeller?.referral_code || "";
    return slugify(storeName) || slugify(fullName) || "vendedor";
  }, [storeName, fullName, isEditMode, editingSeller]);

  // Pré-preenche em modo edição / reset ao fechar
  React.useEffect(() => {
    if (!open) {
      setCpf("");
      setFullName("");
      setStoreName("");
      setEmail("");
      setPhone("");
      setFoundUser(null);
      setAvatarUrl("");
      return;
    }
    if (isEditMode && editingSeller) {
      setCpf(editingSeller.cpf || "");
      setFullName(editingSeller.full_name || "");
      setStoreName(editingSeller.store_name || "");
      setEmail(editingSeller.email || "");
      setPhone(editingSeller.phone || "");
      setAvatarUrl(editingSeller.avatar_url || "");
    }
  }, [open, isEditMode, editingSeller]);

  const normalizeCpf = (v) => (v || "").replace(/\D/g, "");

  const handleCpfSearch = async () => {
    const doc = normalizeCpf(cpf);
    if (!doc) return;
    try {
      const rows = await base44.entities.AppUser.filter({ cpf: doc });
      if (rows && rows.length > 0) {
        const u = rows[0];
        setFoundUser(u);
        setFullName(u.full_name || "");
        setStoreName(u.store_name || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setAvatarUrl(u.avatar_url || "");
        toast.success("Cadastro encontrado — dados preenchidos.");
      } else {
        setFoundUser(null);
        toast.info("CPF não cadastrado — preencha os dados para criar.");
      }
    } catch (err) {
      toast.error("Erro ao buscar CPF: " + (err.message || "desconhecido"));
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
    } catch (err) {
      toast.error("Erro ao enviar foto: " + (err.message || "desconhecido"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Informe o nome do vendedor.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Informe o WhatsApp do vendedor.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        const response = await base44.functions.invoke("updateSeller", {
          seller_id: editingSeller.id,
          full_name: fullName.trim(),
          store_name: storeName.trim(),
          phone: phone.trim(),
          cpf: normalizeCpf(cpf),
          avatar_url: avatarUrl || null,
        });

        const data = response?.data;
        if (data?.success) {
          toast.success("Vendedor atualizado com sucesso!");
          onUpdated?.(data.seller);
          onClose?.();
        } else {
          toast.error(data?.error || "Erro ao atualizar vendedor");
        }
      } else {
        const response = await base44.functions.invoke("registerSeller", {
          cpf: normalizeCpf(cpf),
          full_name: fullName.trim(),
          store_name: storeName.trim(),
          email: (email || "").trim().toLowerCase(),
          phone: phone.trim(),
          avatar_url: avatarUrl || null,
        });

        const data = response?.data;
        if (data?.success) {
          toast.success(`Vendedor cadastrado! Loja: ${data.store_link}`, { duration: 6000 });
          onCreated?.(data.seller);
          onClose?.();
        } else {
          toast.error(data?.error || "Erro ao cadastrar vendedor");
        }
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.error;
      toast.error(apiMsg || err.message || "Erro ao salvar vendedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-2xl bg-gray-900 border border-gray-700 text-gray-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {isEditMode ? "Editar Vendedor" : "Cadastrar Vendedor"}
          </DialogTitle>
        </DialogHeader>

        {/* Busca por CPF — APENAS em modo cadastro */}
        {!isEditMode && (
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="CPF do vendedor (opcional)"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-400"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCpfSearch}
              className="gap-2 bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800"
            >
              <Search className="w-4 h-4" /> Buscar
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avatar */}
              <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative h-14 w-14 rounded-full overflow-hidden border border-gray-700 bg-gray-900 grid place-items-center hover:ring-2 hover:ring-gray-600 transition"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto do vendedor" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-gray-900/60 grid place-items-center text-[10px] text-gray-300">
                      Enviando...
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="text-gray-200 font-semibold">
                  {fullName ? `Loja Virtual de ${fullName}` : "Loja Virtual do Vendedor"}
                </div>
              </div>

              {/* Nome da Loja */}
              <div className="md:col-span-2">
                <Label className="text-gray-300">Nome da Loja Virtual</Label>
                <Input
                  className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                  placeholder="Ex: Loja do João, Loja da Maria..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isEditMode
                    ? "Você pode atualizar o nome de exibição da loja."
                    : "Nome que aparece na listagem e gera o endereço da loja."}
                </p>
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
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-700 bg-gray-800 text-gray-300">
                    +55
                  </span>
                  <Input
                    className="rounded-l-none bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400"
                    placeholder="(21) 98407-2064"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Email — bloqueado em edição */}
              <div className="md:col-span-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  E-mail para contato {isEditMode ? "" : "(opcional)"}
                  {isEditMode && <Lock className="w-3 h-3 text-gray-500" title="Não editável após criação" />}
                </Label>
                <Input
                  type="email"
                  placeholder="vendedor@provedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditMode}
                  className={`bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-400 ${
                    isEditMode ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">E-mail não pode ser alterado após criação.</p>
                )}
              </div>

              {/* Link da Loja Virtual — sempre readOnly */}
              <div className="md:col-span-2">
                <Label className="text-gray-300 flex items-center gap-1">
                  Link da Loja Virtual
                  {isEditMode && <Lock className="w-3 h-3 text-gray-500" title="Não editável após criação" />}
                </Label>
                <Input
                  className="bg-gray-900 border-gray-700 text-gray-400 cursor-default opacity-60"
                  value={`leilaonozap.net/Loja-Virtual?ref=${suggestedCode}`}
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isEditMode
                    ? "Link permanente — não pode ser alterado para preservar acessos já compartilhados."
                    : "Link gerado automaticamente. O código final é definido pelo sistema ao salvar (garantindo unicidade)."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-gray-900 border-gray-700 text-gray-100 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "Salvando..." : "Cadastrando..."}
                </>
              ) : (
                isEditMode ? "Salvar alterações" : "Cadastrar Vendedor"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}