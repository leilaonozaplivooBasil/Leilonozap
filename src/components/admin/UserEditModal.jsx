import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

const AppUser = base44.entities.AppUser;

const CAREER_LEVELS = [
  { id: 'usuario', name: 'Usuário', color: 'bg-gray-500' },
  { id: 'licenciado_aplicativo', name: 'Influencer', color: 'bg-green-500' },
  { id: 'licenciado_catalogo', name: 'Licenciado Catálogo', color: 'bg-yellow-500' },
  { id: 'executivo', name: 'Executivo', color: 'bg-purple-500' },
  { id: 'diretor', name: 'Diretor', color: 'bg-orange-500' },
  { id: 'diretoria', name: 'Diretoria', color: 'bg-fuchsia-500' },
  { id: 'ceo', name: 'CEO', color: 'bg-red-500' },
  { id: 'conselheiro', name: 'Conselheiro', color: 'bg-cyan-500' },
  { id: 'fundador', name: 'Fundador', color: 'bg-amber-500' }
];

export default function UserEditModal({ user, isOpen, onClose, onSuccess, allUsers = [] }) {
    const [userData, setUserData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    
    // Estados para níveis de carreira
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [primaryLevel, setPrimaryLevel] = useState('');
    const [displayFirstName, setDisplayFirstName] = useState('');
    const [displayLastName, setDisplayLastName] = useState('');
    const [referrerId, setReferrerId] = useState('');

    useEffect(() => {
        if (user) {
            setUserData({ ...user });
            
            // Carregar níveis de carreira
            const userLevels = Array.isArray(user.career_levels) 
                ? user.career_levels 
                : (user.career_levels ? [user.career_levels] : ['usuario']);
            setSelectedLevels(userLevels);
            
            // Carregar nível principal
            setPrimaryLevel(user.primary_career_level || userLevels[0] || 'usuario');
            
            // Carregar nomes para exibição
            const nameParts = user.full_name.split(' ').filter(part => part.trim() !== '');
            setDisplayFirstName(
                user.display_first_name && user.display_first_name.trim() !== '' 
                    ? user.display_first_name 
                    : (nameParts[0] || '')
            );
            setDisplayLastName(
                user.display_last_name && user.display_last_name.trim() !== '' 
                    ? user.display_last_name 
                    : (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '')
            );
            setReferrerId(user.referred_by_id || '');
        }
    }, [user]);

    if (!userData) return null;

    const handleInputChange = (field, value) => {
        setUserData(prev => ({ ...prev, [field]: value }));
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setUserData(prev => ({ ...prev, avatar_url: file_url }));
            toast.success('Foto de perfil atualizada!');
        } catch (error) {
            console.error("Erro ao fazer upload:", error);
            toast.error('Erro ao fazer upload da foto.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const toggleLevel = (levelId) => {
        setSelectedLevels(prev => {
            const newLevels = prev.includes(levelId) 
                ? prev.filter(l => l !== levelId) 
                : [...prev, levelId];
            
            // Ajustar nível principal se necessário
            if (levelId === primaryLevel && !newLevels.includes(levelId)) {
                setPrimaryLevel(newLevels[0] || 'usuario');
            } else if (newLevels.length === 0) {
                setPrimaryLevel('usuario');
            } else if (!newLevels.includes(primaryLevel)) {
                setPrimaryLevel(newLevels[0]);
            }
            
            return newLevels;
        });
    };

    const handleSave = async () => {
        if (!userData.full_name || !userData.email) {
            toast.error("Nome e email são obrigatórios!");
            return;
        }

        if (selectedLevels.length === 0) {
            toast.error("Selecione pelo menos um nível de carreira!");
            return;
        }

        if (!selectedLevels.includes(primaryLevel)) {
            toast.error("O nível principal deve estar entre os selecionados!");
            return;
        }

        setIsSaving(true);
        try {
            const newReferrerId = referrerId && String(referrerId).trim() !== '' ? referrerId : null;
            if (newReferrerId && newReferrerId === user.id) {
                toast.error("Um usuário não pode indicar a si mesmo.");
                setIsSaving(false);
                return;
            }
            if (newReferrerId) {
                const refUser = (Array.isArray(allUsers) ? allUsers : []).find(u => u.id === newReferrerId);
                if (refUser && refUser.referred_by_id === user.id) {
                    await AppUser.update(refUser.id, { referred_by_id: null });
                }
            }
            const updatePayload = {
                full_name: userData.full_name,
                nickname: userData.nickname || null,
                email: userData.email,
                phone: userData.phone || null,
                role: userData.role,
                referred_by_id: newReferrerId,
                career_levels: selectedLevels,
                primary_career_level: primaryLevel,
                display_first_name: displayFirstName.trim() || null,
                display_last_name: displayLastName.trim() || null,
                avatar_url: userData.avatar_url || null
            };
            
            await AppUser.update(user.id, updatePayload);
            
            const levelNames = selectedLevels.map(id => CAREER_LEVELS.find(l => l.id === id)?.name).join(', ');
            const primaryName = CAREER_LEVELS.find(l => l.id === primaryLevel)?.name;
            
            toast.success(`✅ Usuário atualizado!\nCargos: ${levelNames}\n⭐ Principal: ${primaryName}`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update user:", error);
            toast.error("Erro ao atualizar o usuário.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-400" />
                        Editar Usuário Completo: {user.full_name}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    {/* DADOS BÁSICOS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-green-400">📋 Dados Básicos</h3>
                        
                        {/* AVATAR UPLOAD */}
                        <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                            <div className="w-16 h-16 rounded-full border-2 border-gray-600 overflow-hidden flex-shrink-0 bg-gray-700 flex items-center justify-center">
                                {userData.avatar_url ? (
                                    <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 text-xs text-center px-1">Sem foto</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="avatar-upload" className="text-xs text-gray-400 mb-2 block">
                                    Foto de Perfil
                                </Label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={isUploadingAvatar}
                                    className="hidden"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                    disabled={isUploadingAvatar}
                                >
                                    <Upload className="w-3 h-3 mr-2" />
                                    {isUploadingAvatar ? 'Enviando...' : 'Escolher Foto'}
                                </Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-gray-300">Nome</Label>
                            <Input 
                                id="name" 
                                value={userData.full_name} 
                                onChange={(e) => handleInputChange('full_name', e.target.value)} 
                                className="col-span-3 bg-gray-700 border-gray-600 text-white" 
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nickname" className="text-right text-gray-300">Apelido</Label>
                            <Input 
                                id="nickname" 
                                value={userData.nickname || ''} 
                                onChange={(e) => handleInputChange('nickname', e.target.value)} 
                                className="col-span-3 bg-gray-700 border-gray-600 text-white" 
                                placeholder="Nome usado nos lances"
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right text-gray-300">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                value={userData.email} 
                                onChange={(e) => handleInputChange('email', e.target.value)} 
                                className="col-span-3 bg-gray-700 border-gray-600 text-white" 
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right text-gray-300">Telefone</Label>
                            <Input 
                                id="phone" 
                                value={userData.phone || ''} 
                                onChange={(e) => handleInputChange('phone', e.target.value)} 
                                className="col-span-3 bg-gray-700 border-gray-600 text-white" 
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right text-gray-300">Permissão</Label>
                            <Select value={userData.role} onValueChange={(value) => handleInputChange('role', value)}>
                                <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600 text-white">
                                    <SelectValue placeholder="Selecione a permissão" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="user">Usuário Comum</SelectItem>
                                    <SelectItem value="licensee">Licenciado</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* NOMES PARA PAINEL */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-blue-400">👤 Nomes para Exibição no Painel</h3>
                        
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                            <div>
                                <Label htmlFor="firstName" className="text-xs text-gray-400 mb-1 block">
                                    Nome para Painel
                                </Label>
                                <Input
                                    id="firstName"
                                    value={displayFirstName}
                                    onChange={(e) => setDisplayFirstName(e.target.value)}
                                    placeholder="Ex: Geovani"
                                    className="bg-gray-700 border-gray-600 text-white text-sm"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName" className="text-xs text-gray-400 mb-1 block">
                                    Sobrenome para Painel
                                </Label>
                                <Input
                                    id="lastName"
                                    value={displayLastName}
                                    onChange={(e) => setDisplayLastName(e.target.value)}
                                    placeholder="Ex: Silva"
                                    className="bg-gray-700 border-gray-600 text-white text-sm"
                                />
                            </div>
                            <p className="col-span-2 text-xs text-gray-400 italic">
                                Como aparecerá: "<strong className="text-white">{displayFirstName} {displayLastName}</strong>"
                            </p>
                        </div>
                    </div>

                    {/* HIERARQUIA / INDICADOR */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-emerald-400">📈 Hierarquia (Sistema de Alavancagem)</h3>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-gray-300">Indicador</Label>
                            <div className="col-span-3">
                                <Select value={referrerId} onValueChange={setReferrerId}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                        <SelectValue placeholder="Selecione o indicador (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-72">
                                        <SelectItem value={null}>Sem indicação</SelectItem>
                                        {(Array.isArray(allUsers) ? allUsers.filter(u => u.id !== user.id) : []).map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.full_name} — {u.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* HIERARQUIA / INDICADOR */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-emerald-400">📈 Hierarquia (Sistema de Alavancagem)</h3>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-gray-300">Indicador</Label>
                            <div className="col-span-3">
                                <Select value={referrerId} onValueChange={setReferrerId}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                        <SelectValue placeholder="Selecione o indicador (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-72">
                                        <SelectItem value={null}>Sem indicação</SelectItem>
                                        {(Array.isArray(allUsers) ? allUsers.filter(u => u.id !== user.id) : []).map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.full_name} — {u.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* NÍVEIS DE CARREIRA */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-purple-400">🏆 Níveis de Carreira</h3>
                        
                        <p className="text-xs text-gray-400">Selecione um ou mais cargos:</p>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {CAREER_LEVELS.slice().reverse().map(level => {
                                const isSelected = selectedLevels.includes(level.id);
                                const isPrimary = primaryLevel === level.id;
                                
                                return (
                                    <div key={level.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700">
                                        <div className="flex items-center space-x-3">
                                            <Checkbox
                                                id={`level-${level.id}`}
                                                checked={isSelected}
                                                onCheckedChange={() => toggleLevel(level.id)}
                                                className="border-gray-600"
                                            />
                                            <label htmlFor={`level-${level.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                                                <Badge className={`${level.color} text-white text-xs`}>
                                                    {level.name}
                                                </Badge>
                                            </label>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-400">Principal</label>
                                                <input
                                                    type="radio"
                                                    name="primary"
                                                    checked={isPrimary}
                                                    onChange={() => setPrimaryLevel(level.id)}
                                                    className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 focus:ring-green-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        {selectedLevels.length > 0 && (
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                <p className="text-sm text-green-400">
                                    ⭐ Função Principal: <strong>{CAREER_LEVELS.find(l => l.id === primaryLevel)?.name}</strong>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Esta será a função exibida no Plano de Carreira
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="bg-gray-700 text-white">
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar Todas Alterações ({selectedLevels.length} cargos)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}