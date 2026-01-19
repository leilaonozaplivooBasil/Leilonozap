import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, User, Mail, Key, Shield, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UserFullEditModal({ user, isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        nickname: '',
        password: '',
        role: 'user'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                nickname: user.nickname || '',
                password: user.password || '',
                role: user.role || 'user'
            });
            setErrors({});
        }
    }, [user, isOpen]);

    if (!user) return null;

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.full_name.trim()) {
            newErrors.full_name = 'Nome é obrigatório';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!formData.email.includes('@')) {
            newErrors.email = 'Email inválido';
        }
        
        if (formData.password && formData.password.length < 6) {
            newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        
        setIsSaving(true);
        try {
            // Prepara dados para atualização
            const updateData = {
                full_name: formData.full_name.trim(),
                email: formData.email.toLowerCase().trim(),
                nickname: formData.nickname.trim() || null,
                role: formData.role
            };
            
            // Se a senha foi alterada, usa função backend
            if (formData.password && formData.password !== user.password) {
                await base44.functions.invoke('updateUserPassword', {
                    user_id: user.id,
                    new_password: formData.password
                });
            }
            
            // Atualiza outros dados via service role
            await base44.functions.invoke('updateUserData', {
                user_id: user.id,
                data: updateData
            });
            
            alert("✅ Usuário atualizado com sucesso!");
            onSave();
            onClose();
            
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error);
            alert("❌ Erro ao atualizar usuário: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-400">
                        <User className="w-5 h-5" />
                        Editar Usuário
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Editando: <span className="font-semibold text-white">{user.full_name}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label htmlFor="full_name" className="text-gray-300 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nome Completo
                        </Label>
                        <Input 
                            id="full_name" 
                            value={formData.full_name} 
                            onChange={(e) => handleChange('full_name', e.target.value)} 
                            className={`bg-gray-700 border-gray-600 text-white ${errors.full_name ? 'border-red-500' : ''}`}
                            placeholder="Nome do usuário"
                        />
                        {errors.full_name && <p className="text-red-400 text-sm">{errors.full_name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            E-mail
                        </Label>
                        <Input 
                            id="email" 
                            type="email"
                            value={formData.email} 
                            onChange={(e) => handleChange('email', e.target.value)} 
                            className={`bg-gray-700 border-gray-600 text-white ${errors.email ? 'border-red-500' : ''}`}
                            placeholder="email@exemplo.com"
                        />
                        {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
                    </div>

                    {/* Apelido */}
                    <div className="space-y-2">
                        <Label htmlFor="nickname" className="text-gray-300">
                            Apelido (Nickname)
                        </Label>
                        <Input 
                            id="nickname" 
                            value={formData.nickname} 
                            onChange={(e) => handleChange('nickname', e.target.value)} 
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Apelido público"
                        />
                    </div>

                    {/* Senha */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Senha
                        </Label>
                        <div className="relative">
                            <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"}
                                value={formData.password} 
                                onChange={(e) => handleChange('password', e.target.value)} 
                                className={`bg-gray-700 border-gray-600 text-white pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                placeholder="Nova senha (mínimo 6 caracteres)"
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-white"
                                onClick={() => setShowPassword(!showPassword)}
                                type="button"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
                        <p className="text-gray-500 text-xs">Deixe em branco para manter a senha atual</p>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-gray-300 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Função
                        </Label>
                        <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                                <SelectItem value="user" className="text-white">Usuário</SelectItem>
                                <SelectItem value="licensee" className="text-white">Licenciado</SelectItem>
                                <SelectItem value="admin" className="text-white">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <DialogFooter className="gap-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}