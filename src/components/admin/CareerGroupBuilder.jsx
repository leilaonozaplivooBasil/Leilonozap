import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function CareerGroupBuilder({ onClose }) {
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedCareer, setSelectedCareer] = useState('fundador');

  const careerLevels = [
    'fundador', 'conselheiro', 'ceo', 'diretoria', 'diretor', 'distribuidor',
    'plano_lojista', 'plano_lider', 'kit_start', 'executivo', 'trainee', 'licenciado_catalogo'
  ];

  useEffect(() => {
    loadTemplates();
    loadUsers();
  }, []);

  const loadTemplates = async () => {
    try {
      const temps = await base44.asServiceRole.entities.CareerGroupTemplate.list();
      setTemplates(Array.isArray(temps) ? temps : []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await base44.asServiceRole.entities.AppUser.list();
      setUsers(Array.isArray(allUsers) ? allUsers : []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const createNewTemplate = async () => {
    if (!newTemplateName.trim()) return;

    const newTemplate = {
      name: newTemplateName,
      career_level: selectedCareer,
      structure: {
        groups: [
          {
            id: 'main',
            name: selectedCareer,
            users: [],
            subgroups: []
          }
        ]
      },
      is_active: true
    };

    try {
      await base44.asServiceRole.entities.CareerGroupTemplate.create(newTemplate);
      setNewTemplateName('');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao criar template:', error);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      await base44.asServiceRole.entities.CareerGroupTemplate.update(editingTemplate.id, {
        structure: editingTemplate.structure
      });
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Deletar este template?')) return;

    try {
      await base44.asServiceRole.entities.CareerGroupTemplate.delete(id);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao deletar template:', error);
    }
  };

  const addGroupToTemplate = () => {
    if (!editingTemplate) return;

    const newGroup = {
      id: `group_${Date.now()}`,
      name: `Novo Grupo`,
      users: [],
      subgroups: []
    };

    setEditingTemplate({
      ...editingTemplate,
      structure: {
        ...editingTemplate.structure,
        groups: [...editingTemplate.structure.groups, newGroup]
      }
    });
  };

  const removeGroup = (groupId) => {
    if (!editingTemplate) return;

    setEditingTemplate({
      ...editingTemplate,
      structure: {
        ...editingTemplate.structure,
        groups: editingTemplate.structure.groups.filter(g => g.id !== groupId)
      }
    });
  };

  const getUsersByCareer = (career) => {
    return users.filter(u => {
      const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
      return levels.includes(career);
    });
  };

  if (loading) {
    return <div className="text-white text-center py-8">Carregando...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full max-h-96 overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-white">Criador de Templates de Grupos por Cargo</CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* CRIAR NOVO TEMPLATE */}
          {!editingTemplate && (
            <div className="bg-gray-700 p-4 rounded-lg space-y-3">
              <h3 className="text-white font-semibold">Criar Novo Template</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do template..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="bg-gray-600 border-gray-600 text-white"
                />
                <select
                  value={selectedCareer}
                  onChange={(e) => setSelectedCareer(e.target.value)}
                  className="bg-gray-600 border border-gray-600 text-white rounded px-3"
                >
                  {careerLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <Button onClick={createNewTemplate} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Criar
                </Button>
              </div>
            </div>
          )}

          {/* LISTA DE TEMPLATES */}
          {!editingTemplate && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Templates Existentes</h3>
              {templates.length > 0 ? (
                templates.map(template => (
                  <div key={template.id} className="bg-gray-700 p-3 rounded flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{template.name}</p>
                      <p className="text-gray-300 text-sm">Cargo: {template.career_level}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">Nenhum template criado</p>
              )}
            </div>
          )}

          {/* EDITOR DE TEMPLATE */}
          {editingTemplate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Editando: {editingTemplate.name}</h3>
                <Button size="sm" onClick={() => setEditingTemplate(null)} className="bg-gray-600 hover:bg-gray-700">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 bg-gray-700 p-4 rounded-lg max-h-80 overflow-y-auto">
                {editingTemplate.structure.groups?.map((group) => (
                  <div key={group.id} className="bg-gray-600 p-3 rounded border border-gray-500">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => {
                          const updatedGroups = editingTemplate.structure.groups.map(g =>
                            g.id === group.id ? { ...g, name: e.target.value } : g
                          );
                          setEditingTemplate({
                            ...editingTemplate,
                            structure: { ...editingTemplate.structure, groups: updatedGroups }
                          });
                        }}
                        className="bg-gray-500 border border-gray-400 text-white px-2 py-1 rounded text-sm flex-1"
                        placeholder="Nome do grupo..."
                      />
                      <Button
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                        className="bg-red-600 hover:bg-red-700 ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Usuários do grupo */}
                    <div className="text-gray-300 text-xs">
                      {group.users?.length || 0} usuários
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={addGroupToTemplate} className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Adicionar Grupo
              </Button>

              <div className="flex gap-2">
                <Button onClick={saveTemplate} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4" /> Salvar Template
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}