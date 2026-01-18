import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CAREER_LEVELS = [
  'usuario', 'licenciado_aplicativo', 'influencer', 'licenciado_catalogo', 
  'trainee', 'executivo', 'kit_start', 'plano_lider', 'plano_lojista', 
  'distribuidor', 'diretoria', 'diretor', 'ceo', 'conselheiro', 'fundador'
];

const ROLE_COLORS = {
  'fundador': 'bg-purple-600',
  'conselheiro': 'bg-purple-500',
  'ceo': 'bg-blue-600',
  'diretoria': 'bg-blue-500',
  'diretor': 'bg-indigo-600',
  'distribuidor': 'bg-green-600',
  'plano_lojista': 'bg-green-500',
  'plano_lider': 'bg-green-400',
  'kit_start': 'bg-emerald-500',
  'executivo': 'bg-teal-500',
  'trainee': 'bg-cyan-500',
  'licenciado_catalogo': 'bg-cyan-400',
  'influencer': 'bg-sky-400',
  'licenciado_aplicativo': 'bg-sky-300',
  'usuario': 'bg-gray-500'
};

export default function EditableOrganigramTree({ users = [] }) {
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [draggingUserId, setDraggingUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Agrupar por cargo
  const usersByRole = useMemo(() => {
    const groups = {};
    CAREER_LEVELS.forEach(role => {
      groups[role] = users.filter(u => {
        const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
        return levels.includes(role);
      });
    });
    return groups;
  }, [users]);

  // Indicados de um usuário
  const getIndicatedUsers = (userId) => {
    return users.filter(u => u.referred_by_id === userId);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setSelectedRoles({
      roles: Array.isArray(user.career_levels) ? user.career_levels : [],
      referred_by_id: user.referred_by_id || ''
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    try {
      await base44.entities.AppUser.update(editingUser.id, {
        career_levels: selectedRoles.roles || [],
        referred_by_id: selectedRoles.referred_by_id || null
      });

      toast.success('Usuário atualizado com sucesso!');
      setEditingUser(null);
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm('Tem certeza? Esta ação é irreversível.');
    if (!confirmDelete) return;

    try {
      await base44.entities.AppUser.delete(userId);
      toast.success('Usuário removido!');
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao deletar: ' + error.message);
    }
  };

  const toggleRoleSelection = (role) => {
    const current = selectedRoles.roles || [];
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    setSelectedRoles({ ...selectedRoles, roles: updated });
  };

  return (
    <div className="space-y-6">
      {/* ORGANOGRAMA PRINCIPAL */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Organograma Interativo</CardTitle>
          <p className="text-gray-400 text-sm mt-2">Clique em usuários para editar, arraste para reorganizar</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {CAREER_LEVELS.map(role => {
            const roleUsers = usersByRole[role] || [];
            if (roleUsers.length === 0) return null;

            return (
              <div key={role} className="space-y-3">
                {/* Header do cargo */}
                <div className={`${ROLE_COLORS[role]} text-white px-4 py-2 rounded-lg font-semibold text-center`}>
                  {role.replace(/_/g, ' ').toUpperCase()}
                  <Badge className="ml-2 bg-white text-gray-900">{roleUsers.length}</Badge>
                </div>

                {/* Usuários no cargo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4">
                  {roleUsers.map(user => {
                    const indicated = getIndicatedUsers(user.id);

                    return (
                      <div
                        key={user.id}
                        draggable
                        onDragStart={() => setDraggingUserId(user.id)}
                        className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-green-500/50 transition-colors cursor-move"
                      >
                        {/* Info do usuário */}
                        <div className="mb-3">
                          <h4 className="text-white font-semibold truncate">{user.full_name}</h4>
                          <p className="text-gray-400 text-xs truncate">{user.email}</p>
                          {user.referral_code && (
                            <p className="text-green-400 text-xs mt-1">Ref: {user.referral_code}</p>
                          )}
                        </div>

                        {/* Indicados */}
                        {indicated.length > 0 && (
                          <div className="bg-gray-600/50 rounded p-2 mb-3 border-l-2 border-green-400">
                            <p className="text-gray-300 text-xs font-semibold">Indicados: {indicated.length}</p>
                            {indicated.slice(0, 2).map(ind => (
                              <p key={ind.id} className="text-gray-400 text-xs truncate">
                                • {ind.full_name}
                              </p>
                            ))}
                            {indicated.length > 2 && (
                              <p className="text-gray-400 text-xs">+ {indicated.length - 2} mais</p>
                            )}
                          </div>
                        )}

                        {/* Botões de ação */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditUser(user)}
                            size="sm"
                            variant="outline"
                            className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500/20"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(user.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-white">Editar Usuário</CardTitle>
              <Button
                onClick={() => setEditingUser(null)}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-gray-300 text-sm font-semibold">Nome</label>
                <Input
                  value={editingUser.full_name}
                  disabled
                  className="bg-gray-700 border-gray-600 text-gray-400 mt-1"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-gray-300 text-sm font-semibold">Email</label>
                <Input
                  value={editingUser.email}
                  disabled
                  className="bg-gray-700 border-gray-600 text-gray-400 mt-1"
                />
              </div>

              {/* Selecionar Cargos */}
              <div>
                <label className="text-gray-300 text-sm font-semibold block mb-2">
                  Cargos do Usuário
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-700/30 p-3 rounded-lg">
                  {CAREER_LEVELS.map(role => (
                    <button
                      key={role}
                      onClick={() => toggleRoleSelection(role)}
                      className={`p-2 rounded text-sm font-semibold transition-colors ${
                        (selectedRoles.roles || []).includes(role)
                          ? `${ROLE_COLORS[role]} text-white`
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {role.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicado por */}
              <div>
                <label className="text-gray-300 text-sm font-semibold">Indicado por:</label>
                <Select
                  value={selectedRoles.referred_by_id || ''}
                  onValueChange={(value) =>
                    setSelectedRoles({
                      ...selectedRoles,
                      referred_by_id: value || null
                    })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue placeholder="Ninguém" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value={null}>Ninguém (Sem indicação)</SelectItem>
                    {users
                      .filter(u => u.id !== editingUser.id)
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <Button
                  onClick={() => setEditingUser(null)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveUser}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isSaving}
                >
                  {isSaving ? '💾 Salvando...' : '✅ Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}