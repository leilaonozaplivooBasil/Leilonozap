import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const careerHierarchy = ['fundador', 'conselheiro', 'ceo', 'diretoria', 'diretor', 'executivo', 'licenciado_catalogo', 'influencer', 'usuario'];

const careerLevelsMap = {
  'usuario': 'Usuário',
  'licenciado_aplicativo': 'Influencer',
  'influencer': 'Influencer',
  'licenciado_catalogo': 'Licenciado Catálogo',
  'trainee': 'Trainee',
  'executivo': 'Executivo',
  'kit_start': 'Kit Start',
  'plano_lider': 'Plano Líder',
  'plano_lojista': 'Plano Lojista',
  'distribuidor': 'Distribuidor',
  'diretor': 'Diretor',
  'diretoria': 'Diretoria',
  'ceo': 'CEO',
  'conselheiro': 'Conselheiro',
  'fundador': 'Fundador'
};

const directorPlusRoles = ['fundador', 'conselheiro', 'ceo', 'diretoria', 'diretor'];

export default function HierarchyTreeView({ users, isLoading }) {
  const [expandedLevels, setExpandedLevels] = useState({});
  const [reordering, setReordering] = useState(false);
  const [usersByLevel, setUsersByLevel] = useState(groupUsersByLevel(users || []));

  function groupUsersByLevel(usersList) {
    const grouped = {};
    careerHierarchy.forEach(level => {
      grouped[level] = usersList.filter(u => {
        const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
        return levels.includes(level);
      });
    });
    return grouped;
  }

  React.useEffect(() => {
    setUsersByLevel(groupUsersByLevel(users || []));
  }, [users]);

  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({
      ...prev,
      [level]: !prev[level]
    }));
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Mesmo nível
    if (source.droppableId === destination.droppableId) {
      const level = source.droppableId;
      const newUsersAtLevel = [...usersByLevel[level]];
      const [movedUser] = newUsersAtLevel.splice(source.index, 1);
      newUsersAtLevel.splice(destination.index, 0, movedUser);

      setUsersByLevel(prev => ({
        ...prev,
        [level]: newUsersAtLevel
      }));

      toast.success(`${movedUser.full_name} realocado!`);
    }
  };

  const UserItem = ({ user, isDragging }) => {
    const isDirectorPlus = user.career_levels?.some(l => directorPlusRoles.includes(l));
    const primaryLevel = user.primary_career_level || user.career_levels?.[0] || 'usuario';

    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
          isDragging
            ? 'bg-blue-500/30 border-blue-500/60 shadow-lg opacity-70'
            : isDirectorPlus
            ? 'bg-red-900/20 border-red-500/40 hover:border-red-500/60'
            : 'bg-gray-700/50 border-gray-600/50 hover:border-gray-500/60'
        }`}
      >
        <GripVertical className={`w-4 h-4 flex-shrink-0 ${isDragging ? 'text-blue-400' : 'text-gray-400'} cursor-grab`} />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm truncate">{user.full_name}</h4>
          <p className="text-gray-400 text-xs truncate">{user.email}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user.valora_pay_balance > 0 && (
            <span className="text-green-400 text-xs font-semibold">
              R$ {user.valora_pay_balance.toFixed(0)}
            </span>
          )}
          {user.indicated_clients_count > 0 && (
            <span className="text-blue-400 text-xs">👥 {user.indicated_clients_count}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span>🌳 Visão em Árvore - Reorganizar Posições</span>
          {reordering && <Loader2 className="w-5 h-5 animate-spin text-green-400" />}
        </CardTitle>
        <p className="text-gray-400 text-sm mt-2">Arraste usuários para reordenar dentro do mesmo nível (sem alterar cargo)</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-2">
              {careerHierarchy.map(level => {
                const levelUsers = usersByLevel[level] || [];
                const isExpanded = expandedLevels[level] !== false; // Expandido por padrão
                const hasUsers = levelUsers.length > 0;

                return (
                  <div key={level}>
                    <button
                      onClick={() => toggleLevel(level)}
                      className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        hasUsers
                          ? 'bg-gray-700/50 border-gray-600/50 hover:border-gray-500'
                          : 'bg-gray-800 border-gray-700/30 cursor-default opacity-50'
                      }`}
                    >
                      {hasUsers && (
                        isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <Badge className={directorPlusRoles.includes(level) ? 'bg-red-600' : 'bg-blue-600'}>
                        {careerLevelsMap[level]}
                      </Badge>
                      <span className="text-gray-400 text-sm ml-auto">{levelUsers.length} usuários</span>
                    </button>

                    {isExpanded && hasUsers && (
                      <Droppable droppableId={level} type="USER">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`mt-2 ml-4 pl-3 border-l-2 space-y-2 transition-colors ${
                              snapshot.isDraggingOver ? 'border-blue-500/60' : 'border-gray-600/30'
                            }`}
                          >
                            {levelUsers.map((user, index) => (
                              <Draggable key={user.id} draggableId={user.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <UserItem user={user} isDragging={snapshot.isDragging} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </CardContent>
    </Card>
  );
}