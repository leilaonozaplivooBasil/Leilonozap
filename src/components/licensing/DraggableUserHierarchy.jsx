import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AppUser = base44.entities.AppUser;

export default function DraggableUserHierarchy({ users, onReorder, isLoading }) {
  const [reordering, setReordering] = useState(false);
  const [hierarchy, setHierarchy] = useState(users || []);

  // Atualizar hierarchy quando users mudar
  React.useEffect(() => {
    setHierarchy(users || []);
  }, [users]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Criar novo array com ordem alterada
    const newHierarchy = Array.from(hierarchy);
    const [movedUser] = newHierarchy.splice(source.index, 1);
    newHierarchy.splice(destination.index, 0, movedUser);

    setHierarchy(newHierarchy);
    setReordering(true);

    try {
      // Salvar a nova ordem (opcional - você pode usar uma função backend)
      if (onReorder) {
        await onReorder(newHierarchy);
      }
      toast.success('Ordem atualizada!');
    } catch (error) {
      console.error('Erro ao reordenar:', error);
      toast.error('Erro ao salvar nova ordem');
      // Reverter ao estado anterior
      setHierarchy(users);
    } finally {
      setReordering(false);
    }
  };

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

  const UserCard = ({ user, index, isDragging }) => {
    const levels = Array.isArray(user.career_levels) ? user.career_levels : [];
    const isDirectorPlus = levels.some(l => directorPlusRoles.includes(l));
    const primaryLevel = user.primary_career_level || user.career_levels?.[0] || 'usuario';

    return (
      <div
        className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
          isDragging
            ? 'bg-blue-500/20 border-blue-500/50 shadow-lg scale-105 opacity-70'
            : isDirectorPlus
            ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-500/30 hover:border-red-500/60'
            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
        }`}
      >
        <GripVertical className={`w-5 h-5 flex-shrink-0 ${isDragging ? 'text-blue-400' : 'text-gray-400'} cursor-grab active:cursor-grabbing`} />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold truncate">{user.full_name}</h4>
          <p className="text-gray-400 text-sm truncate">{user.email}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge className={isDirectorPlus ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}>
            {careerLevelsMap[primaryLevel] || primaryLevel}
          </Badge>
          {user.valora_pay_balance > 0 && (
            <span className="text-green-400 text-sm font-semibold">
              R$ {user.valora_pay_balance.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span>📊 Sistema de Alavancagem - Hierarquia</span>
          {reordering && <Loader2 className="w-5 h-5 animate-spin text-green-400" />}
        </CardTitle>
        <p className="text-gray-400 text-sm mt-2">Arraste os usuários para reorganizar a ordem</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : hierarchy.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum usuário para reordenar</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="users-list" type="USER">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-gray-700/30 rounded-lg p-2' : ''
                  }`}
                >
                  {hierarchy.map((user, index) => (
                    <Draggable
                      key={user.id}
                      draggableId={user.id}
                      index={index}
                      isDragDisabled={reordering}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <UserCard
                            user={user}
                            index={index}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {hierarchy.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Total: <strong className="text-white">{hierarchy.length} usuários</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}