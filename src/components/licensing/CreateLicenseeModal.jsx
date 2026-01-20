import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UserPlus, Upload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const AppUser = base44.entities.AppUser;
const UploadFile = (params) => base44.integrations.Core.UploadFile(params);

// Gera código de referência único
const generateReferralCode = (fullName) => {
  const namePart = fullName
    .split(' ')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 6);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${namePart}${randomPart}`;
};

export default function CreateLicenseeModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    password: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.phone || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      // Verifica se email já existe
      const existingUsers = await AppUser.filter({ email: formData.email.toLowerCase().trim() });
      if (existingUsers.length > 0) {
        toast.error("Este email já está cadastrado");
        setIsLoading(false);
        return;
      }

      // Upload do avatar se houver
      let avatarUrl = null;
      if (avatarFile) {
        try {
          const result = await UploadFile({ file: avatarFile });
          avatarUrl = result.file_url;
        } catch (err) {
          console.error("Erro no upload:", err);
        }
      }

      // Gera código de referência
      const referralCode = generateReferralCode(formData.full_name);

      // Cria o usuário como licenciado do catálogo
      const newUser = await AppUser.create({
        full_name: formData.full_name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.replace(/\D/g, ''),
        cpf: formData.cpf?.replace(/\D/g, '') || null,
        password: formData.password,
        avatar_url: avatarUrl,
        role: 'licensee',
        referral_code: referralCode,
        career_levels: ['licenciado_catalogo'],
        primary_career_level: 'licenciado_catalogo',
        valora_pay_balance: 0,
        commission_balance: 0,
        total_commissions_generated: 0,
        catalog_commission_balance: 0,
        catalog_total_commissions_generated: 0
      });

      setCreatedUser(newUser);
      setIsSuccess(true);

      // Log no sistema
      await base44.entities.SystemLog.create({
        step: 'Create_Catalog_Licensee',
        status: 'success',
        message: `Licenciado do catálogo criado: ${newUser.full_name}`,
        component_name: 'CreateLicenseeModal',
        payload: { user_id: newUser.id, email: newUser.email }
      }).catch(() => {});

    } catch (error) {
      console.error("Erro ao criar licenciado:", error);
      toast.error("Erro ao criar licenciado: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Tela de sucesso
  if (isSuccess && createdUser) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Licenciado Criado!</h2>
          <p className="text-gray-400 mb-6">{createdUser.full_name} agora é um licenciado do catálogo</p>

          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-1">Link do catálogo:</p>
            <p className="text-green-400 text-sm break-all">
              https://leilaonozap.app/Catalog?ref={createdUser.referral_code}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`https://leilaonozap.app/Catalog?ref=${createdUser.referral_code}`);
                toast.success("Link copiado!");
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Copiar Link
            </Button>
            <Button
              onClick={() => onSuccess()}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-400" />
            Cadastrar Licenciado
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-gray-700 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden hover:border-green-500 transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                    <span className="text-xs text-gray-500">Foto</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          {/* Nome */}
          <div>
            <Label className="text-gray-300">Nome completo *</Label>
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Nome do licenciado"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label className="text-gray-300">Email *</Label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          {/* Telefone */}
          <div>
            <Label className="text-gray-300">Telefone *</Label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
              placeholder="(00) 00000-0000"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          {/* CPF */}
          <div>
            <Label className="text-gray-300">CPF</Label>
            <Input
              name="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
              placeholder="000.000.000-00"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Senha */}
          <div>
            <Label className="text-gray-300">Senha de acesso *</Label>
            <Input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              className="bg-gray-700 border-gray-600 text-white"
              required
              minLength={6}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}