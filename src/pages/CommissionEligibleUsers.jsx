import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const DIRECTOR_PLUS = ['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'];
const COMMISSION_ROLES = [
  'licenciado_catalogo', 'trainee', 'executivo', 'kit_start', 'plano_lider',
  'plano_lojista', 'distribuidor', 'diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador'
];

export default function CommissionEligibleUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await base44.asServiceRole.entities.AppUser.list();
        const filtered = (Array.isArray(allUsers) ? allUsers : [])
          .filter(u => {
            const levels = Array.isArray(u.career_levels) ? u.career_levels : (u.career_levels ? [u.career_levels] : []);
            return levels.some(l => COMMISSION_ROLES.includes(l));
          })
          .map(u => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            roles: Array.isArray(u.career_levels) ? u.career_levels : (u.career_levels ? [u.career_levels] : []),
            isDirectorPlus: (Array.isArray(u.career_levels) ? u.career_levels : []).some(r => DIRECTOR_PLUS.includes(r))
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setUsers(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const directorPlusUsers = filtered.filter(u => u.isDirectorPlus);
  const regularUsers = filtered.filter(u => !u.isDirectorPlus);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">👥 Usuários Habilitados para Receber Comissão</h1>
        <p className="text-gray-400 mb-8">Total: <span className="font-bold text-green-400">{filtered.length}</span> usuários</p>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="pt-6">
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="space-y-8">
            {/* DIRETOR+ */}
            {directorPlusUsers.length > 0 && (
              <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-600">
                <CardHeader>
                  <CardTitle className="text-purple-300">👑 DIRETOR+ (Dividem igualmente as comissões)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {directorPlusUsers.map((user, idx) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-purple-700/50">
                        <div>
                          <p className="font-semibold text-white">{idx + 1}. {user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.roles.filter(r => DIRECTOR_PLUS.includes(r)).map(role => (
                              <span key={role} className="text-xs bg-purple-700 text-purple-100 px-2 py-1 rounded">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* USUÁRIOS REGULARES */}
            {regularUsers.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-green-400">✅ Usuários Regulares (Recebem conforme cadeia)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-4 text-gray-300 font-semibold">#</th>
                          <th className="text-left py-2 px-4 text-gray-300 font-semibold">NOME</th>
                          <th className="text-left py-2 px-4 text-gray-300 font-semibold">EMAIL</th>
                          <th className="text-left py-2 px-4 text-gray-300 font-semibold">CARGOS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regularUsers.map((user, idx) => (
                          <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                            <td className="py-3 px-4 text-white font-semibold">{user.name}</td>
                            <td className="py-3 px-4 text-gray-400">{user.email}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {user.roles.filter(r => COMMISSION_ROLES.includes(r)).map(role => (
                                  <span key={role} className="text-xs bg-green-700/30 text-green-300 px-2 py-1 rounded border border-green-600/30">
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {filtered.length === 0 && (
              <div className="text-center text-gray-400">Nenhum usuário encontrado</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}