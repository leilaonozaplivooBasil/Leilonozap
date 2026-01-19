import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, EyeOff, Mail, Key, Loader2, Pencil, Save, X, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        
        if (user.role !== 'admin') {
          alert("❌ Acesso negado! Apenas administradores.");
          navigate(createPageUrl('Home'));
          return;
        }
      }

      const allUsers = await AppUser.list('-created_date', 1000);
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      nickname: user.nickname || '',
      password: user.password || '',
      role: user.role || 'user'
    });
    setShowEditPassword(false);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditFormData({});
    setShowEditPassword(false);
  };

  const handleSaveUser = async () => {
    if (!editFormData.full_name?.trim()) {
      alert("❌ Nome é obrigatório");
      return;
    }
    if (!editFormData.email?.trim() || !editFormData.email.includes('@')) {
      alert("❌ Email inválido");
      return;
    }
    if (editFormData.password && editFormData.password.length < 6) {
      alert("❌ Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSaving(true);
    try {
      // Atualiza senha se foi alterada
      if (editFormData.password && editFormData.password !== editingUser.password) {
        await base44.functions.invoke('updateUserPassword', {
          user_id: editingUser.id,
          new_password: editFormData.password
        });
      }

      // Atualiza outros dados
      await base44.functions.invoke('updateUserData', {
        user_id: editingUser.id,
        data: {
          full_name: editFormData.full_name.trim(),
          email: editFormData.email.toLowerCase().trim(),
          nickname: editFormData.nickname?.trim() || null,
          role: editFormData.role
        }
      });

      alert("✅ Usuário atualizado com sucesso!");
      closeEditModal();
      await loadData();

    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("❌ Erro ao atualizar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-green-400" />
              Gerenciar Usuários e Senhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou apelido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div key={user.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{user.full_name}</h3>
                      <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'licensee' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                    <p className="text-gray-500 text-sm">Apelido: {user.nickname || 'N/A'}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-400 text-sm">Senha:</span>
                      <code className="bg-gray-800 px-2 py-1 rounded text-green-400 text-sm">
                        {showPasswords[user.id] ? user.password : '••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="h-6 w-6 p-0"
                      >
                        {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(user)}
                      className="border-green-600 text-green-400 hover:bg-green-600/20"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                Nenhum usuário encontrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
        <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <User className="w-5 h-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Editando: <span className="font-semibold text-white">{editingUser?.full_name}</span>
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
                value={editFormData.full_name || ''} 
                onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))} 
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Nome do usuário"
              />
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
                value={editFormData.email || ''} 
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))} 
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Apelido */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-gray-300">
                Apelido (Nickname)
              </Label>
              <Input 
                id="nickname" 
                value={editFormData.nickname || ''} 
                onChange={(e) => setEditFormData(prev => ({ ...prev, nickname: e.target.value }))} 
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
                  type={showEditPassword ? "text" : "password"}
                  value={editFormData.password || ''} 
                  onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))} 
                  className="bg-gray-700 border-gray-600 text-white pr-10"
                  placeholder="Nova senha (mínimo 6 caracteres)"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-white"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  type="button"
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-gray-300 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Função
              </Label>
              <Select value={editFormData.role || 'user'} onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value }))}>
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
              onClick={closeEditModal}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUser} 
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
    </div>
  );
}