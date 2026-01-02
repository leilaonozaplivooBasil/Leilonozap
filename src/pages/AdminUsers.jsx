import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const SendEmail = (params) => base44.integrations.Core.SendEmail(params);
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, EyeOff, Mail, Key, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({});
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

  const handleResetPassword = async (user) => {
    if (!confirm(`Resetar senha de ${user.full_name}?`)) return;

    try {
      const newPassword = Math.random().toString(36).slice(-8);
      
      await AppUser.update(user.id, { password: newPassword });
      
      await SendEmail({
        to: user.email,
        subject: "🔐 Senha Resetada - Leilão NoZap",
        body: `
Olá ${user.full_name},

Sua senha foi resetada pelo administrador.

📧 **Nova Senha:** ${newPassword}

⚠️ **Faça login e troque sua senha.**

---
Equipe Leilão NoZap 🎯
        `
      });
      
      alert(`✅ Senha resetada!\nNova senha: ${newPassword}\nE-mail enviado para ${user.email}`);
      
      await loadData();
      
    } catch (error) {
      console.error("Erro:", error);
      alert("❌ Erro ao resetar senha.");
    }
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
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
                      onClick={() => handleResetPassword(user)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-600"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Resetar Senha
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
    </div>
  );
}