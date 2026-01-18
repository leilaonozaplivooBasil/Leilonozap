import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ROLE_COLORS = {
  'fundador': 'bg-amber-600',
  'conselheiro': 'bg-cyan-600',
  'ceo': 'bg-red-600',
  'diretoria': 'bg-fuchsia-600',
  'diretor': 'bg-orange-600',
  'distribuidor': 'bg-teal-600',
  'plano_lojista': 'bg-sky-600',
  'plano_lider': 'bg-indigo-600',
  'kit_start': 'bg-emerald-600',
  'executivo': 'bg-purple-600',
  'trainee': 'bg-blue-600',
  'licenciado_catalogo': 'bg-yellow-600',
  'influencer': 'bg-green-600',
  'licenciado_aplicativo': 'bg-green-500',
  'usuario': 'bg-gray-600'
};

export default function EditableOrganigramTree({ users = [] }) {
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const getIndicatedUsers = (userId) => {
    return users.filter(u => u.referred_by_id === userId);
  };

  const toggleExpand = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const getPrimaryRole = (user) => {
    const levels = Array.isArray(user.career_levels) ? user.career_levels : [];
    return levels[0] || 'usuario';
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
      toast.success('Atualizado!');
      setEditingUser(null);
      window.location.reload();
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderUserCascade = (user, level = 0) => {
    const children = getIndicatedUsers(user.id);
    const isExpanded = expandedUsers.has(user.id);
    const primaryRole = getPrimaryRole(user);

    return (
      <div key={user.id} className="relative">
        {/* Linha conectora */}
        {level > 0 && (
          <div className="absolute -left-4 top-0 w-4 h-9 border-l-2 border-b-2 border-gray-600"></div>
        )}

        {/* Usuário */}
        <div
          style={{ paddingLeft: `${level * 40}px` }}
          className="flex items-center gap-2 py-1 group"
        >
          {/* Botão expandir */}
          {children.length > 0 ? (
            <button
              onClick={() => toggleExpand(user.id)}
              className="text-gray-500 hover:text-white transition-colors p-0 w-5 h-5 flex items-center justify-center"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5"></div>
          )}

          {/* Badge nome */}
          <div className={`${ROLE_COLORS[primaryRole] || 'bg-gray-600'} text-white px-3 py-1.5 rounded font-semibold text-sm whitespace-nowrap`}>
            {user.full_name}
          </div>

          {/* Botões ação */}
          <div className="hidden group-hover:flex gap-1 ml-auto">
            <button
              onClick={() => handleEditUser(user)}
              className="p-1 rounded text-blue-400 hover:bg-blue-500/20"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm('Deletar?')) {
                  base44.entities.AppUser.delete(user.id).then(() => {
                    toast.success('Removido!');
                    window.location.reload();
                  }).catch(e => toast.error(e.message));
                }
              }}
              className="p-1 rounded text-red-400 hover:bg-red-500/20"
              title="Deletar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filhos */}
        {children.length > 0 && isExpanded && (
          <div>
            {children.map(child => renderUserCascade(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootUsers = users.filter(u => !u.referred_by_id);

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1">
        {rootUsers.length > 0 ? (
          rootUsers.map(user => renderUserCascade(user, 0))
        ) : (
          <p className="text-gray-400 text-center py-8">Nenhum usuário</p>
        )}
      </div>

      {/* MODAL EDIÇÃO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-xl p-6">
            <h3 className="text-white text-lg font-bold mb-4">Editar {editingUser.full_name}</h3>

            <div className="space-y-4">
              {/* Cargos */}
              <div>
                <label className="text-gray-300 text-sm font-semibold block mb-2">Cargos</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(ROLE_COLORS).map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        const current = selectedRoles.roles || [];
                        const updated = current.includes(role)
                          ? current.filter(r => r !== role)
                          : [...current, role];
                        setSelectedRoles({ ...selectedRoles, roles: updated });
                      }}
                      className={`p-2 rounded text-xs font-semibold transition-colors ${
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
                <label className="text-gray-300 text-sm font-semibold block mb-2">Indicado por</label>
                <Select
                  value={selectedRoles.referred_by_id || ''}
                  onValueChange={(value) =>
                    setSelectedRoles({ ...selectedRoles, referred_by_id: value || null })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Ninguém" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value={null}>Ninguém</SelectItem>
                    {users.filter(u => u.id !== editingUser.id).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveUser} disabled={isSaving} className="flex-1 bg-green-600">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}