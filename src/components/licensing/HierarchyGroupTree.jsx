import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from 'lucide-react';

const CAREER_HIERARCHY = [
  'fundador',
  'conselheiro',
  'ceo',
  'diretoria',
  'diretor',
  'distribuidor',
  'plano_lojista',
  'plano_lider',
  'kit_start',
  'executivo',
  'trainee',
  'licenciado_catalogo',
  'influencer',
  'licenciado_aplicativo',
  'usuario'
];

export default function HierarchyGroupTree({ users = [] }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(CAREER_HIERARCHY));
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [draggedUser, setDraggedUser] = useState(null);
  const [userToCategory, setUserToCategory] = useState({}); // user_id -> category_id

  // Agrupar usuários por cargo
  const usersByCareer = useMemo(() => {
    const groups = {};
    CAREER_HIERARCHY.forEach(career => {
      groups[career] = users.filter(u => {
        const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
        return levels.includes(career);
      });
    });
    return groups;
  }, [users]);

  // Agrupar usuários por indicação (referred_by_id)
  const getIndicatedUsers = (userId) => {
    return users.filter(u => u.referred_by_id === userId);
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const addCustomCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: `custom_${Date.now()}`,
        name: newCategoryName,
        users: []
      };
      setCustomCategories([...customCategories, newCategory]);
      setNewCategoryName('');
    }
  };

  const removeCustomCategory = (categoryId) => {
    setCustomCategories(customCategories.filter(c => c.id !== categoryId));
    const newMapping = { ...userToCategory };
    Object.keys(newMapping).forEach(userId => {
      if (newMapping[userId] === categoryId) delete newMapping[userId];
    });
    setUserToCategory(newMapping);
  };

  const handleDragStart = (e, userId) => {
    setDraggedUser(userId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCategory = (e, categoryId) => {
    e.preventDefault();
    if (draggedUser) {
      const newMapping = { ...userToCategory };
      newMapping[draggedUser] = categoryId;
      setUserToCategory(newMapping);
      setDraggedUser(null);
    }
  };

  const getUserCategory = (userId) => {
    return userToCategory[userId] || null;
  };

  const UserItem = ({ user, isDraggable = true }) => (
    <div
      draggable={isDraggable}
      onDragStart={(e) => handleDragStart(e, user.id)}
      className={`flex items-center gap-2 p-3 rounded bg-gray-700 hover:bg-gray-600 transition-colors cursor-move ${
        draggedUser === user.id ? 'opacity-50' : ''
      }`}
    >
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
        <p className="text-gray-400 text-xs truncate">{user.email}</p>
      </div>
      {user.referral_code && (
        <Badge className="bg-blue-600 text-white text-xs flex-shrink-0">{user.referral_code}</Badge>
      )}
    </div>
  );

  const CareerGroupSection = ({ career, users: careerUsers }) => {
    const isExpanded = expandedGroups.has(career);
    const careerLabel = career.replace(/_/g, ' ').toUpperCase();

    return (
      <div key={career} className="border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleGroup(career)}
          className="w-full bg-gray-700 hover:bg-gray-600 p-4 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">{careerLabel}</span>
            <Badge className="bg-green-600 text-white">{careerUsers.length}</Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="bg-gray-800 p-4 space-y-3 border-t border-gray-700">
            {careerUsers.length > 0 ? (
              careerUsers.map(user => {
                const indicatedUsers = getIndicatedUsers(user.id);
                return (
                  <div key={user.id} className="space-y-2">
                    <UserItem user={user} />

                    {indicatedUsers.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-600 space-y-2">
                        <p className="text-gray-400 text-xs font-semibold">Indicados ({indicatedUsers.length}):</p>
                        {indicatedUsers.map(indicated => (
                          <UserItem key={indicated.id} user={indicated} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">Nenhum usuário com este cargo</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO: CARGOS (ÁRVORE AUTOMÁTICA) */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Visualização em Árvore - Cargos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-400 text-sm">
            Cargos com usuários agrupados automaticamente. Arraste usuários para adicionar a categorias customizadas.
          </p>
          {CAREER_HIERARCHY.map(career =>
            CareerGroupSection({ career, users: usersByCareer[career] || [] })
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO: CATEGORIAS CUSTOMIZADAS */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">🏷️ Categorias Customizadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-400 text-sm">
            Crie categorias e arraste usuários para organizá-los. Essas categorias servem como exemplos para o futuro.
          </p>

          {/* Criar nova categoria */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova categoria..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
            />
            <Button
              onClick={addCustomCategory}
              disabled={!newCategoryName.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Exibir categorias */}
          <div className="space-y-3">
            {customCategories.length > 0 ? (
              customCategories.map(category => {
                const usersInCategory = users.filter(
                  u => getUserCategory(u.id) === category.id
                );

                return (
                  <div
                    key={category.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnCategory(e, category.id)}
                    className="border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg p-4 min-h-[100px] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold">{category.name}</h4>
                        <Badge className="bg-blue-600 text-white">{usersInCategory.length}</Badge>
                      </div>
                      <Button
                        onClick={() => removeCustomCategory(category.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {usersInCategory.length > 0 ? (
                        usersInCategory.map(user => (
                          <UserItem key={user.id} user={user} isDraggable={true} />
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-8">
                          Arraste usuários aqui
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-center py-8">
                Nenhuma categoria customizada. Crie uma para começar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}