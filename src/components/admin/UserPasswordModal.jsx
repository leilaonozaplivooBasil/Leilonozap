import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;

export default function UserPasswordModal({ user, isOpen, onClose, onSave }) {
    const [newPassword, setNewPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!user) return null;

    const handleSave = async () => {
        if (newPassword.length < 6) {
            alert("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }
        setIsSaving(true);
        try {
            // Usa função backend para bypass de RLS
            await base44.functions.invoke('updateUserPassword', {
                user_id: user.id,
                new_password: newPassword
            });
            onSave();
            onClose();
            setNewPassword(''); // Limpa o campo
            alert("Senha redefinida com sucesso!");
        } catch (error) {
            console.error("Failed to reset password:", error);
            alert("Erro ao redefinir a senha.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if(!open) { setNewPassword(''); onClose(); } }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Redefinir Senha</DialogTitle>
                    <DialogDescription>
                        Você está redefinindo a senha para <span className="font-bold">{user.full_name}</span>. Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-password" className="text-right col-span-1">Nova Senha</Label>
                        <div className="col-span-3 relative">
                            <Input 
                                id="new-password" 
                                type={showPassword ? "text" : "password"}
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                className="pr-10"
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isSaving || newPassword.length < 6}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Redefinir Senha
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}