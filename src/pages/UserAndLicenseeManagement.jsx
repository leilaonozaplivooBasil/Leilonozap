import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CareerGroupBuilder from '@/components/admin/CareerGroupBuilder';

const AppUser = base44.entities.AppUser;

export default function UserAndLicenseeManagement() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCargo, setExpandedCargo] = useState(null);
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);
  const navigate = useNavigate();

  const allCareerLevels = [
    'usuario',
    'licenciado_aplicativo',
    'influencer',
    'licenciado_catalogo',
    'trainee',
    'executivo',
    'kit_start',
    'plano_lider',
    'plano_lojista',
    'distribuidor',
    'diretoria',
    'diretor',
    'ceo',
    'conselheiro',
    'fundador'
  ];

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          if (user.role !== 'admin') {
            alert("❌ Acesso negado! Apenas administradores.");
            navigate(createPageUrl('Home'));
            return;
          }
        }

        const allUsers = await AppUser.list('-created_date', 1000);
        setUsers(allUsers);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [navigate]);

  const licensees = users.filter(u => u.role === 'licensee');
  const generalUsers = users.filter(u => u.role === 'user' || !u.role);

  // Agrupar usuários por cargo
  const usersByCareer = {};
  allCareerLevels.forEach(level => {
    usersByCareer[level] = users.filter(u => {
      const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
      return levels.includes(level);
    });
  });

  const filteredLicensees = licensees.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGeneral = generalUsers.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const UserCard = ({ user }) => (
    <div className="bg-gray-700 p-3 rounded flex justify-between items-start gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{user.full_name}</p>
        <p className="text-gray-300 text-sm truncate">{user.email}</p>
        {user.referral_code && <p className="text-gray-400 text-xs mt-1">Ref: {user.referral_code}</p>}
      </div>
      <div className="flex flex-wrap gap-1 justify-end max-w-xs">
        {Array.isArray(user.career_levels) && user.career_levels.length > 0 ? (
          user.career_levels.map(level => (
            <Badge key={level} className="bg-blue-600 text-white text-xs">{level}</Badge>
          ))
        ) : (
          <Badge variant="secondary" className="text-xs">Sem cargo</Badge>
        )}
      </div>
    </div>
  );

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
        <h1 className="text-3xl font-bold text-white mb-6">Gerenciamento de Usuários e Sistema de Alavancagem</h1>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Gerenciamento de Usuários e Sistema de Alavancagem</h1>
          <Button onClick={() => setShowGroupBuilder(true)} className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Criar Grupos por Cargo
          </Button>
        </div>

        <Tabs defaultValue="licensees" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border border-gray-700">
            <TabsTrigger value="licensees" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              👑 Licenciados
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              👥 Usuários Gerais
            </TabsTrigger>
            <TabsTrigger value="careers" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              🎯 Cargos
            </TabsTrigger>
          </TabsList>

          {/* ABA: LICENCIADOS */}
          <TabsContent value="licensees" className="space-y-4 mt-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Licenciados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar licenciado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredLicensees.length > 0 ? (
                    filteredLicensees.map(user => <UserCard key={user.id} user={user} />)
                  ) : (
                    <p className="text-gray-400 text-center py-4">Nenhum licenciado encontrado</p>
                  )}
                </div>
                <p className="text-gray-400 text-sm">Total: {licensees.length} licenciados</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: USUÁRIOS GERAIS */}
          <TabsContent value="general" className="space-y-4 mt-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Usuários Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredGeneral.length > 0 ? (
                    filteredGeneral.map(user => <UserCard key={user.id} user={user} />)
                  ) : (
                    <p className="text-gray-400 text-center py-4">Nenhum usuário encontrado</p>
                  )}
                </div>
                <p className="text-gray-400 text-sm">Total: {generalUsers.length} usuários</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: CARGOS */}
          <TabsContent value="careers" className="space-y-4 mt-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Visualização por Cargos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allCareerLevels.map(cargo => {
                  const cargoUsers = usersByCareer[cargo];
                  const isExpanded = expandedCargo === cargo;

                  return (
                    <div key={cargo} className="border border-gray-700 rounded-lg overflow-hidden">
                      {/* HEADER DO CARGO */}
                      <button
                        onClick={() => setExpandedCargo(isExpanded ? null : cargo)}
                        className="w-full bg-gray-700 hover:bg-gray-600 p-4 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-semibold capitalize">{cargo}</span>
                          <Badge className="bg-green-600 text-white">{cargoUsers.length}</Badge>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {/* USUÁRIOS DO CARGO */}
                      {isExpanded && (
                        <div className="bg-gray-800 p-4 space-y-2 border-t border-gray-700">
                          {cargoUsers.length > 0 ? (
                            cargoUsers.map(user => (
                              <div key={user.id} className="bg-gray-700 p-3 rounded">
                                <p className="text-white font-semibold">{user.full_name}</p>
                                <p className="text-gray-300 text-sm">{user.email}</p>
                                {user.referral_code && (
                                  <p className="text-gray-400 text-xs mt-1">Ref: {user.referral_code}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400 text-sm">Nenhum usuário com este cargo</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}