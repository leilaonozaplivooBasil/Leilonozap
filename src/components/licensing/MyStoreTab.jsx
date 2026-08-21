import React, { useState, useRef } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Store } from 'lucide-react';
import { toast } from "sonner";

// 🏪 "Minha Loja" — autoatendimento pra vendedor/licenciado editar SÓ o nome e a
// foto da própria loja virtual (nada de cargo/comissão). Chama updateSeller com
// seller_id = actor_id = o próprio usuário — o backend restringe os campos
// editáveis em auto-edição a store_name/avatar_url.
// 🎨 FASE 3 — tema claro FIXO (branco/verde/marrom): vive dentro do Painel de
// Alavancagem. Antes o tema vinha da flag isSaiDeBaixo, falsa na navegação
// normal, e o bloco aparecia preto dentro da página branca.
export default function MyStoreTab({ user }) {
  const [storeName, setStoreName] = useState(user.store_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await plataforma.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
    } catch (err) {
      toast.error("Erro ao enviar foto: " + (err.message || "desconhecido"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!storeName.trim()) {
      toast.error("Informe o nome da sua loja.");
      return;
    }
    setIsSaving(true);
    try {
      const data = await plataforma.functions.invoke("updateSeller", {
        seller_id: user.id,
        actor_id: user.id,
        store_name: storeName.trim(),
        avatar_url: avatarUrl || null,
      });
      if (data?.success) {
        toast.success("Loja atualizada!");
        try {
          const saved = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (saved) {
            localStorage.setItem('currentUser', JSON.stringify({ ...saved, store_name: storeName.trim(), avatar_url: avatarUrl || null }));
          }
        } catch { /* ignora */ }
      } else {
        toast.error(data?.error || "Erro ao atualizar loja");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-white border-nz-borda">
      <CardHeader>
        <CardTitle className="text-gray-900">Minha Loja</CardTitle>
        <CardDescription className="text-gray-500">
          Personalize o nome e a foto da sua loja virtual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-16 w-16 rounded-full overflow-hidden border border-nz-borda bg-nz-cinza-fundo grid place-items-center hover:ring-2 hover:ring-nz-verde/40 transition shrink-0"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto da loja" className="h-full w-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-gray-400" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-white/70 grid place-items-center text-[10px] text-gray-600">
                Enviando...
              </div>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div>
            <p className="font-semibold text-gray-900">Foto da loja</p>
            <p className="text-xs text-gray-500">Clique no círculo para trocar a foto.</p>
          </div>
        </div>

        <div>
          <Label className="text-gray-700">Nome da Loja Virtual</Label>
          <Input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Ex: Loja do João"
            className="bg-white border-gray-300 text-gray-900"
          />
          <p className="text-xs mt-1 text-gray-500">Esse é o nome que aparece na sua loja virtual pública.</p>
        </div>

        <Button onClick={handleSave} disabled={isSaving || isUploading} className="bg-nz-verde hover:bg-nz-verde-escuro text-white min-h-[44px]">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Store className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}