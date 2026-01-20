import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { 
  X, 
  Search, 
  Camera, 
  Loader2, 
  CheckCircle, 
  User,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from "sonner";

const AppUser = base44.entities.AppUser;

export default function AddLicenseeModal({ onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Campos do formulário
  const [catalogSlug, setCatalogSlug] = useState('');


  // Busca usuários por nome ou CPF
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const users = await AppUser.list('-created_date', 500);
        const term = searchTerm.toLowerCase();
        
        // Filtra por nome, email ou CPF
        const filtered = users.filter(u => 
          (u.full_name?.toLowerCase().includes(term)) ||
          (u.email?.toLowerCase().includes(term)) ||
          (u.cpf?.replace(/\D/g, '').includes(term.replace(/\D/g, '')))
        );

        // Remove usuários que já são licenciados de catálogo
        const nonLicensees = filtered.filter(u => 
          !u.career_levels?.includes('licenciado_catalogo')
        );

        setSearchResults(nonLicensees.slice(0, 10));
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  // Quando seleciona um usuário, preenche o slug automaticamente
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchTerm(user.full_name);
    setCustomAvatarUrl(user.avatar_url || '');
    
    // Gera slug automático baseado no nickname ou primeiro nome
    const autoSlug = (user.nickname || user.full_name?.split(' ')[0] || 'vendedor')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    setCatalogSlug(autoSlug);
  };

  // Upload de foto
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCustomAvatarUrl(file_url);
      toast.success('Foto carregada!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao carregar foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Salva o licenciado
  const handleSave = async () => {
    if (!selectedUser) {
      toast.error('Selecione um usuário');
      return;
    }

    if (!catalogSlug.trim()) {
      toast.error('Digite o endereço do catálogo');
      return;
    }

    setIsSaving(true);
    try {
      // Atualiza os career_levels do usuário para incluir licenciado_catalogo
      const currentLevels = selectedUser.career_levels || ['usuario'];
      const newLevels = [...new Set([...currentLevels, 'licenciado_catalogo'])];

      const updateData = {
        career_levels: newLevels,
        nickname: selectedUser.nickname || catalogSlug
      };

      // Atualiza avatar se foi alterado
      if (customAvatarUrl && customAvatarUrl !== selectedUser.avatar_url) {
        updateData.avatar_url = customAvatarUrl;
      }

      await AppUser.update(selectedUser.id, updateData);

      setSuccess(true);
      toast.success('Licenciado cadastrado com sucesso!');
      
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao cadastrar licenciado');
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
            <CardTitle className="text-green-400">Sucesso!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              <span className="font-bold text-white">{selectedUser?.full_name}</span> agora é um Licenciado do Catálogo!
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
            Catálogo do Vendedor
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Área de busca e foto */}
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
                  ) : customAvatarUrl ? (
                    <>
                      <img 
                        src={customAvatarUrl} 
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
            </div>

            {/* Campos de busca */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome do vendedor (busca) */}
              <div className="relative">
                <Label className="text-gray-300 flex items-center gap-1 mb-2">
                  Nome do vendedor
                  <HelpCircle className="w-3 h-3 text-gray-500" />
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Digite o nome dele aqui"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedUser) setSelectedUser(null);
                    }}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>

                {/* Resultados da busca */}
                {searchResults.length > 0 && !selectedUser && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-600 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {user.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.full_name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Usuário selecionado */}
                {selectedUser && (
                  <div className="mt-2 bg-green-900/30 border border-green-500/50 rounded-lg p-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">Usuário encontrado!</span>
                  </div>
                )}
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
                    value={selectedUser?.phone || ''}
                    disabled
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* E-mail */}
          <div>
            <Label className="text-gray-300 flex items-center gap-1 mb-2">
              E-mail para contato (opcional)
              <HelpCircle className="w-3 h-3 text-gray-500" />
            </Label>
            <Input
              placeholder="vendedor@provedor.com"
              value={selectedUser?.email || ''}
              disabled
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Endereço do catálogo */}
          <div>
            <Label className="text-gray-300 flex items-center gap-1 mb-2">
              Endereço do catálogo do vendedor
              <HelpCircle className="w-3 h-3 text-gray-500" />
            </Label>
            <div className="flex">
              <div className="bg-gray-600 border border-gray-600 border-r-0 rounded-l-lg px-3 flex items-center text-gray-300 text-sm whitespace-nowrap">
                https://www.leilaonozap.com/s/
              </div>
              <Input
                placeholder="Ex.: Nome do vendedor"
                value={catalogSlug}
                onChange={(e) => setCatalogSlug(e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''))}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 rounded-l-none"
              />
            </div>
            {catalogSlug && (
              <p className="text-xs text-green-400 mt-1">
                Link do catálogo: leilaonozap.com/s/{catalogSlug}
              </p>
            )}
          </div>

          {/* Aviso */}
          {!selectedUser && searchTerm.length >= 3 && searchResults.length === 0 && !isSearching && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-medium">Nenhum usuário encontrado</p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  Verifique se o usuário já está cadastrado no sistema ou se já é um licenciado.
                </p>
              </div>
            </div>
          )}

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
              disabled={!selectedUser || !catalogSlug.trim() || isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Cadastrar Vendedor'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}