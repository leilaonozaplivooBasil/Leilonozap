import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Camera, Monitor, Key, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const AppUser = base44.entities.AppUser;
const UploadFile = (params) => base44.integrations.Core.UploadFile(params);

// Gera código de referência único baseado no nome
const generateReferralCode = (fullName) => {
  const namePart = fullName
    .split(' ')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  return namePart || 'vendedor';
};

export default function CreateLicenseeModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    password: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [enableAccess, setEnableAccess] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [slugAvailable, setSlugAvailable] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-gerar slug quando nome muda
    if (name === 'full_name' && value) {
      const slug = generateReferralCode(value);
      setFormData(prev => ({ ...prev, catalog_slug: slug }));
      checkSlugAvailability(slug);
    }
  };

  const handleSlugChange = (e) => {
    const slug = e.target.value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    setFormData(prev => ({ ...prev, catalog_slug: slug }));
    if (slug) {
      checkSlugAvailability(slug);
    } else {
      setSlugAvailable(null);
    }
  };

  const checkSlugAvailability = async (slug) => {
    try {
      const existing = await AppUser.filter({ referral_code: slug });
      setSlugAvailable(existing.length === 0);
    } catch {
      setSlugAvailable(null);
    }
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
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0,2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0,2)}) ${numbers.slice(2,7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0,2)}) ${numbers.slice(2,7)}-${numbers.slice(7,11)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.phone) {
      toast.error("Preencha o nome e WhatsApp do vendedor");
      return;
    }

    if (enableAccess && (!formData.email || !formData.password)) {
      toast.error("Preencha email e senha para acesso");
      return;
    }

    if (slugAvailable === false) {
      toast.error("Este endereço de catálogo já está em uso");
      return;
    }

    setIsLoading(true);

    try {
      // Verifica se email já existe
      if (formData.email) {
        const existingUsers = await AppUser.filter({ email: formData.email.toLowerCase().trim() });
        if (existingUsers.length > 0) {
          toast.error("Este email já está cadastrado");
          setIsLoading(false);
          return;
        }
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

      // Usa o slug como código de referência
      const referralCode = formData.catalog_slug || generateReferralCode(formData.full_name);

      // Cria o usuário como licenciado do catálogo
      const newUser = await AppUser.create({
        full_name: formData.full_name.trim(),
        email: formData.email?.toLowerCase().trim() || `${referralCode}@catalogo.leilaonozap.app`,
        phone: formData.phone.replace(/\D/g, ''),
        password: formData.password || Math.random().toString(36).substring(2, 10),
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
          
          <h2 className="text-xl font-bold text-white mb-2">Vendedor Cadastrado!</h2>
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
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Cadastrar Vendedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Seção: Catálogo do Vendedor */}
          <div className="bg-gray-750 rounded-xl border border-gray-600 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Catálogo do Vendedor</h3>
            </div>

            <div className="flex gap-4">
              {/* Avatar */}
              <label className="cursor-pointer flex-shrink-0">
                <div className="w-16 h-16 rounded-xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center overflow-hidden hover:border-green-500 transition-colors">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>

              {/* Nome e WhatsApp */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm flex items-center gap-1">
                    Nome do vendedor
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </Label>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Digite o nome dele aqui"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm flex items-center gap-1">
                    WhatsApp do vendedor
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md px-3">
                      <span className="text-gray-400 text-sm">+55</span>
                    </div>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                      placeholder="(21) 98407-2064"
                      className="bg-gray-700 border-gray-600 text-white flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Email de contato */}
            <div className="mt-4">
              <Label className="text-gray-300 text-sm flex items-center gap-1">
                E-mail para contato (opcional)
                <HelpCircle className="w-3 h-3 text-gray-500" />
              </Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="vendedor@provedor.com"
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>

            {/* Endereço do catálogo */}
            <div className="mt-4">
              <Label className="text-gray-300 text-sm flex items-center gap-1">
                Endereço do catálogo do vendedor
                <HelpCircle className="w-3 h-3 text-gray-500" />
              </Label>
              <div className="flex mt-1">
                <div className="flex items-center bg-gray-600 border border-gray-500 rounded-l-md px-3 border-r-0">
                  <span className="text-gray-300 text-sm whitespace-nowrap">leilaonozap.app/Catalog?ref=</span>
                </div>
                <div className="relative flex-1">
                  <Input
                    value={formData.catalog_slug}
                    onChange={handleSlugChange}
                    placeholder="nome_do_vendedor"
                    className={`bg-gray-700 border-gray-600 text-white rounded-l-none pr-8 ${
                      slugAvailable === false ? 'border-red-500' : slugAvailable === true ? 'border-green-500' : ''
                    }`}
                  />
                  {slugAvailable !== null && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {slugAvailable ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              {slugAvailable === false && (
                <p className="text-red-400 text-xs mt-1">Este endereço já está em uso</p>
              )}
            </div>
          </div>

          {/* Seção: Conceder acesso */}
          <div className="bg-gray-750 rounded-xl border border-gray-600 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Monitor className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Conceder acesso ao Sistema</h3>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Conceder acesso a este vendedor para que ele possa acessar o seu painel.
            </p>

            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
              <span className="text-white">Habilitar acesso ao Sistema para Vendedores</span>
              <Switch
                checked={enableAccess}
                onCheckedChange={setEnableAccess}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {enableAccess && (
              <div className="mt-4 bg-gray-700/50 rounded-lg p-4 border border-yellow-500/30">
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-yellow-500 font-medium">Importante:</span> Seu vendedor poderá acessar e gerenciar a versão do Sistema para vendedores. A página ou o app de acesso são os mesmos que você já utiliza.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Seção: Email e senha */}
          {enableAccess && (
            <div className="bg-gray-750 rounded-xl border border-gray-600 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                  <Key className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">E-mail e senha do vendedor para o acesso</h3>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                Seu vendedor utilizará o e-mail e a senha abaixo para acessar o Sistema.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">E-mail para acessar o Sistema</Label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e-mail@email.com"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Senha para acessar o Sistema</Label>
                  <div className="relative mt-1">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Escolha a senha do vendedor"
                      className="bg-gray-700 border-gray-600 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
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
              disabled={isLoading || slugAvailable === false}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar vendedor'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}