import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';

const AppUser = base44.entities.AppUser;

export default function CareerLevelsReport() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const directorPlusRoles = ['fundador', 'conselheiro', 'diretor', 'diretoria', 'ceo'];

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await AppUser.list('-created_date', 1000);
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  // Conta usuários por cargo
  const careerStats = {};
  users.forEach(user => {
    const levels = Array.isArray(user.career_levels) ? user.career_levels : [];
    levels.forEach(level => {
      if (!careerStats[level]) {
        careerStats[level] = [];
      }
      careerStats[level].push({
        id: user.id,
        name: user.full_name,
        email: user.email,
        referral_code: user.referral_code
      });
    });
  });

  const directorPlusUsers = {};
  directorPlusRoles.forEach(role => {
    if (careerStats[role]) {
      directorPlusUsers[role] = careerStats[role];
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* RESUMO CARGOS DIRECTOR+ */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-xl">👑 CARGOS DIRECTOR+ (Hierarquia Superior)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(directorPlusUsers).length === 0 ? (
              <p className="text-gray-400">Nenhum usuário com cargos director+</p>
            ) : (
              Object.entries(directorPlusUsers).map(([role, users]) => (
                <div key={role} className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-green-400 font-bold text-lg mb-3 uppercase">{role}</h3>
                  <div className="space-y-2">
                    {users.map(user => (
                      <div key={user.id} className="bg-gray-600 p-3 rounded flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{user.name}</p>
                          <p className="text-gray-300 text-sm">{user.email}</p>
                          <p className="text-gray-400 text-xs">Ref Code: {user.referral_code || 'N/A'}</p>
                        </div>
                        <Badge className="bg-green-600">{role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* LISTA COMPLETA DE USUÁRIOS */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-6 h-6 text-green-400" />
              Todos os Usuários e Seus Cargos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUsers.map(user => {
                const levels = Array.isArray(user.career_levels) ? user.career_levels : [];
                const isDirectorPlus = levels.some(l => directorPlusRoles.includes(l));

                return (
                  <div key={user.id} className={`p-4 rounded-lg ${isDirectorPlus ? 'bg-green-900/30 border border-green-700' : 'bg-gray-700'}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{user.full_name}</h3>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                        <p className="text-gray-500 text-xs mt-1">Ref: {user.referral_code || 'N/A'}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end max-w-md">
                        {levels.length > 0 ? (
                          levels.map(level => (
                            <Badge 
                              key={level}
                              className={directorPlusRoles.includes(level) ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}
                            >
                              {level}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary">Sem cargos</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-gray-400 text-sm mt-4">Total: {filteredUsers.length} usuários</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}