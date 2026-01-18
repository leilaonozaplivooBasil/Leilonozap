import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const COLOR_MAP = {
  blue: 'bg-blue-500/20 border-blue-500 text-blue-400',
  green: 'bg-green-500/20 border-green-500 text-green-400',
  red: 'bg-red-500/20 border-red-500 text-red-400',
  yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
  purple: 'bg-purple-500/20 border-purple-500 text-purple-400',
  pink: 'bg-pink-500/20 border-pink-500 text-pink-400',
  cyan: 'bg-cyan-500/20 border-cyan-500 text-cyan-400',
  amber: 'bg-amber-500/20 border-amber-500 text-amber-400',
};

export default function GroupHierarchy({ groups, users, groupMembers, onRefresh }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('blue');
  const [parentGroupId, setParentGroupId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Digite o nome do grupo");
      return;
    }

    setIsCreating(true);
    try {
      await base44.entities.Group.create({
        name: newGroupName,
        color: newGroupColor,
        parent_group_id: parentGroupId || null
      });
      toast.success("Grupo criado!");
      setNewGroupName('');
      setNewGroupColor('blue');
      setParentGroupId(null);
      await onRefresh?.();
    } catch (e) {
      toast.error("Erro ao criar grupo: " + e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm("Deletar este grupo e todos os sub-grupos?")) return;

    try {
      await base44.entities.Group.delete(groupId);
      toast.success("Grupo deletado!");
      await onRefresh?.();
    } catch (e) {
      toast.error("Erro ao deletar grupo: " + e.message);
    }
  };

  const getSubGroups = (parentId) => {
    return groups.filter(g => g.parent_group_id === parentId);
  };

  const getGroupMembers = (groupId) => {
    return groupMembers
      .filter(gm => gm.group_id === groupId)
      .map(gm => users.find(u => u.id === gm.user_id))
      .filter(Boolean);
  };

  const renderGroup = (group, level = 0) => {
    const subGroups = getSubGroups(group.id);
    const members = getGroupMembers(group.id);
    const isExpanded = expandedGroups.has(group.id);
    const hasChildren = subGroups.length > 0 || members.length > 0;

    return (
      <div key={group.id} className="mt-2">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${COLOR_MAP[group.color] || COLOR_MAP.blue} hover:bg-gray-700/30 transition-all`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{group.name}</div>
            <div className="text-xs text-gray-400">
              {subGroups.length} sub-grupo(s) • {members.length} membro(s)
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 h-8 px-2"
              onClick={() => deleteGroup(group.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Renderiza sub-grupos */}
            {subGroups.map(subGroup => renderGroup(subGroup, level + 1))}

            {/* Renderiza membros diretos */}
            {members.length > 0 && (
              <div style={{ marginLeft: `${(level + 1) * 24 + 12}px` }} className="mt-2 space-y-1">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded bg-gray-700/30 border border-gray-600 text-sm"
                  >
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white truncate">{member.full_name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const rootGroups = groups.filter(g => !g.parent_group_id);

  return (
    <div className="space-y-4">
      {/* CRIAR NOVO GRUPO */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-green-400 text-sm">Criar Novo Grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do grupo..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white flex-1"
            />
            <select
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
            >
              {Object.keys(COLOR_MAP).map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
            <Button
              onClick={createGroup}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GRUPOS RAIZ */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Hierarquia de Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          {rootGroups.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum grupo criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {rootGroups.map(group => renderGroup(group, 0))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}