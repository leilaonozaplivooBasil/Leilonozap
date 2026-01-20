import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Camera, 
  Loader2, 
  CheckCircle, 
  User,
  HelpCircle,
  Save
} from 'lucide-react';
import { toast } from "sonner";

const AppUser = base44.entities.AppUser;

export default function EditLicenseeModal({ licensee, onClose, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);

  // Campos editáveis
  const [fullName, setFullName] = useState(licensee?.full_name || '');
  const [phone, setPhone] = useState(licensee?.phone || '');
  const [email, setEmail] = useState(licensee?.email || '');
  const [nickname, setNickname] = useState(licensee?.nickname || '');
  const [referralCode, setReferralCode] = useState(licensee?.referral_code || licensee?.id || '');
  const [avatarUrl, setAvatarUrl] = useState(licensee?.avatar_url || '');

  // Upload de foto
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
      toast.success('Foto carregada!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao carregar foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Salva as alterações
  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await AppUser.update(licensee.id, {
        full_name: fullName,
        phone: phone,
        email: email,
        nickname: nickname,
        referral_code: referralCode,
        avatar_url: avatarUrl
      });

      setSuccess(true);
      toast.success('Dados atualizados com sucesso!');
      
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsSaving(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2001] p-4">
        <Card className="w-full max-w-md bg-gray-800 border-green-500 text-white text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-green-400">Salvo!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              Os dados de <span className="font-bold text-white">{fullName}</span> foram atualizados!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2001] p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700 text-white relative my-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-400 hover:text-white z-10"
          disabled={isSaving}
        >
          <X className="w-5 h-5" />
        </Button>

        <CardHeader className="border-b border-gray-700">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            Editar Vendedor
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Área de foto e campos principais */}
          <div className="flex gap-6">
            {/* Foto/Avatar com Upload */}
            <div className="flex-shrink-0">
              <label className="cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center border-2 border-dashed border-gray-500 hover:border-green-500 transition-colors relative overflow-hidden">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : avatarUrl ? (
                    <>
                      <img 
                        src={avatarUrl} 
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-green-400 transition-colors" />
                  )}
                </div>
              </label>
              <p className="text-xs text-gray-500 text-center mt-1">Clique para alterar</p>
            </div>

            {/* Campos principais */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <Label className="text-gray-300 flex items-center gap-1 mb-2">
                  Nome do vendedor
                  <HelpCircle className="w-3 h-3 text-gray-500" />
                </Label>
                <Input
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <Label className="text-gray-300 flex items-center gap-1 mb-2">
                  WhatsApp do vendedor
                  <HelpCircle className="w-3 h-3 text-gray-500" />
                </Label>
                <div className="flex gap-2">
                  <div className="w-16 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center text-gray-300 text-sm">
                    +55
                  </div>
                  <Input
                    placeholder="(21) 98407-2064"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* E-mail */}
          <div>
            <Label className="text-gray-300 flex items-center gap-1 mb-2">
              E-mail para contato
              <HelpCircle className="w-3 h-3 text-gray-500" />
            </Label>
            <Input
              placeholder="vendedor@provedor.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Código de Referência (Link do Catálogo) */}
          <div>
            <Label className="text-gray-300 flex items-center gap-1 mb-2">
              Código do link do catálogo (?ref=)
              <HelpCircle className="w-3 h-3 text-gray-500" />
            </Label>
            <div className="flex">
              <div className="bg-gray-600 border border-gray-600 border-r-0 rounded-l-lg px-3 flex items-center text-gray-300 text-sm whitespace-nowrap">
                .../Catalog?ref=
              </div>
              <Input
                placeholder="Ex.: joaosilva"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.replace(/\s+/g, ''))}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 rounded-l-none"
              />
            </div>
            {referralCode && (
              <p className="text-xs text-green-400 mt-1">
                Link completo: leilaonozap.net/Catalog?ref={referralCode}
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!fullName.trim() || isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}