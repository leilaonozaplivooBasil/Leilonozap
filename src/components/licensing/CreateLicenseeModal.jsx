import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Loader2, CheckCircle, User, Mail } from 'lucide-react';
import { toast } from 'sonner';

const AppUser = base44.entities.AppUser;

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
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setSearchError('Digite um email para buscar');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setFoundUser(null);

    try {
      const users = await AppUser.filter({ email: searchEmail.toLowerCase().trim() });
      
      if (users.length === 0) {
        setSearchError('Nenhum usuário encontrado com este email');
      } else {
        const user = users[0];
        
        // Verifica se já é licenciado do catálogo
        if (user.career_levels?.includes('licenciado_catalogo') || user.primary_career_level === 'licenciado_catalogo') {
          setSearchError('Este usuário já é um licenciado do catálogo');
        } else {
          setFoundUser(user);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      setSearchError('Erro ao buscar usuário');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConvert = async () => {
    if (!foundUser) return;

    setIsLoading(true);

    try {
      // Gera código de referência se não tiver
      const referralCode = foundUser.referral_code || generateReferralCode(foundUser.full_name);

      // Atualiza o usuário para ser licenciado do catálogo
      const updatedUser = await AppUser.update(foundUser.id, {
        role: 'licensee',
        referral_code: referralCode,
        career_levels: [...(foundUser.career_levels || []), 'licenciado_catalogo'],
        primary_career_level: 'licenciado_catalogo',
        catalog_commission_balance: foundUser.catalog_commission_balance || 0,
        catalog_total_commissions_generated: foundUser.catalog_total_commissions_generated || 0
      });

      setCreatedUser({ ...foundUser, ...updatedUser, referral_code: referralCode });
      setIsSuccess(true);

    } catch (error) {
      console.error('Erro ao converter usuário:', error);
      toast.error('Erro ao converter usuário: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(p => p);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Tela de sucesso
  if (isSuccess && createdUser) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Licenciado Ativado!</h2>
          <p className="text-gray-400 mb-6">{createdUser.full_name} agora é um licenciado do catálogo</p>

          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-1">Link do catálogo:</p>
            <p className="text-green-400 text-sm break-all">
              https://leilaonozap.net/Catalog?ref={createdUser.referral_code}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(`https://leilaonozap.net/Catalog?ref=${createdUser.referral_code}`);
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Cadastrar Vendedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-gray-400 text-sm mb-4">
            Pesquise pelo email de um usuário já cadastrado para torná-lo um licenciado do catálogo.
          </p>

          {/* Campo de busca */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                value={searchEmail}
                onChange={(e) => {
                  setSearchEmail(e.target.value);
                  setSearchError('');
                  setFoundUser(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Digite o email do usuário"
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Erro de busca */}
          {searchError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{searchError}</p>
            </div>
          )}

          {/* Usuário encontrado */}
          {foundUser && (
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center overflow-hidden">
                  {foundUser.avatar_url ? (
                    <img src={foundUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold">{getInitials(foundUser.full_name)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{foundUser.full_name}</p>
                  <p className="text-sm text-gray-400">{foundUser.email}</p>
                  {foundUser.phone && (
                    <p className="text-xs text-gray-500">{foundUser.phone}</p>
                  )}
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
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
              onClick={handleConvert}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isLoading || !foundUser}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Tornar Licenciado'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}