import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Loader2, CheckCircle, User } from 'lucide-react';
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
  const [searchName, setSearchName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [foundUser, setFoundUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);

  // Carrega todos os usuários ao abrir o modal
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await AppUser.list('-created_date', 500);
        // Filtra apenas usuários que NÃO são licenciados do catálogo
        const nonLicensees = users.filter(u => 
          !u.career_levels?.includes('licenciado_catalogo') && 
          u.primary_career_level !== 'licenciado_catalogo'
        );
        setAllUsers(nonLicensees);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Filtra usuários conforme digita (por nome ou CPF)
  useEffect(() => {
    if (searchName.trim().length >= 2) {
      const search = searchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\-]/g, '');
      const filtered = allUsers.filter(u => {
        const nameMatch = u.full_name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(search);
        const cpfMatch = u.cpf?.replace(/[.\-]/g, '').includes(search);
        return nameMatch || cpfMatch;
      }).slice(0, 8);
      setFilteredUsers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowDropdown(false);
    }
  }, [searchName, allUsers]);

  const handleSelectUser = async (user) => {
    setFoundUser(user);
    setSearchName(user.full_name);
    setShowDropdown(false);
    
    // Ativa automaticamente como licenciado ao selecionar
    setIsLoading(true);
    try {
      const referralCode = user.referral_code || generateReferralCode(user.full_name);
      
      const updatedUser = await AppUser.update(user.id, {
        role: 'licensee',
        referral_code: referralCode,
        career_levels: [...(user.career_levels || []), 'licenciado_catalogo'],
        primary_career_level: 'licenciado_catalogo',
        catalog_commission_balance: user.catalog_commission_balance || 0,
        catalog_total_commissions_generated: user.catalog_total_commissions_generated || 0
      });

      setCreatedUser({ ...user, ...updatedUser, referral_code: referralCode });
      setIsSuccess(true);
      toast.success(`${user.full_name} agora é licenciado!`);
    } catch (error) {
      console.error('Erro ao ativar licenciado:', error);
      toast.error('Erro ao ativar licenciado: ' + error.message);
      setFoundUser(null);
    } finally {
      setIsLoading(false);
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
            Pesquise pelo nome de um usuário já cadastrado para torná-lo um licenciado do catálogo.
          </p>

          {/* Campo de busca com autocomplete */}
          <div className="relative mb-4">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              ref={inputRef}
              type="text"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setFoundUser(null);
              }}
              onFocus={() => searchName.length >= 2 && setShowDropdown(true)}
              placeholder={isLoadingUsers ? "Carregando usuários..." : "Digite o nome ou CPF do usuário"}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
              disabled={isLoadingUsers}
            />
            
            {/* Dropdown de resultados */}
            {showDropdown && filteredUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-600 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">{getInitials(user.full_name)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {showDropdown && searchName.length >= 2 && filteredUsers.length === 0 && !isLoadingUsers && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg p-3 z-50">
                <p className="text-gray-400 text-sm text-center">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>

          {/* Loading ao selecionar */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-green-500" />
              <span className="text-gray-400">Ativando licenciado...</span>
            </div>
          )}

          {/* Botão cancelar */}
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
          </div>
        </div>
      </div>
    </div>
  );
}