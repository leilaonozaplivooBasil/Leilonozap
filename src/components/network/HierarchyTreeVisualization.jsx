import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Award, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HierarchyTreeVisualization({ users, onEdit, onDelete, onPromote }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Organiza usuários em uma estrutura hierárquica
  const hierarchy = useMemo(() => {
    const usersMap = new Map(users.map(u => [u.id, { ...u, children: [] }]));
    const roots = [];

    for (const user of users) {
      if (!user.referred_by_id) {
        roots.push(usersMap.get(user.id));
      } else {
        const parent = usersMap.get(user.referred_by_id);
        if (parent) {
          parent.children.push(usersMap.get(user.id));
        } else {
          roots.push(usersMap.get(user.id));
        }
      }
    }

    roots.sort((a, b) => b.career_levels?.length - a.career_levels?.length);
    return roots;
  }, [users]);

  const toggleNode = (userId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
  };

  const getCareerColor = (level) => {
    const colors = {
      diretoria: 'bg-purple-900/30 border-purple-500',
      diretor: 'bg-blue-900/30 border-blue-500',
      distribuidor: 'bg-indigo-900/30 border-indigo-500',
      plano_lojista: 'bg-cyan-900/30 border-cyan-500',
      plano_lider: 'bg-teal-900/30 border-teal-500',
      executivo: 'bg-green-900/30 border-green-500',
      licenciado_catalogo: 'bg-emerald-900/30 border-emerald-500',
      influencer: 'bg-pink-900/30 border-pink-500',
      licenciado_aplicativo: 'bg-amber-900/30 border-amber-500',
    };
    return colors[level] || 'bg-gray-900/30 border-gray-500';
  };

  const NodeCard = ({ node, depth = 0 }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const primaryLevel = node.primary_career_level || 'usuario';

    return (
      <div className="relative">
        {/* Linha vertical conectora */}
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 w-8 h-8 border-l-2 border-t-2 border-gray-600"
            style={{
              transform: 'translate(-1.5rem, 0)',
            }}
          />
        )}

        {/* Node Card */}
        <div
          className={`rounded-lg border-2 p-3 mb-4 transition-all ${getCareerColor(primaryLevel)} min-w-[200px]`}
        >
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">
                {node.display_first_name || node.full_name}
              </p>
              <p className="text-xs text-gray-300 truncate">{node.email}</p>
              {node.indicated_clients_count > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  👥 {node.indicated_clients_count} indicados
                </p>
              )}
            </div>

            {/* Expander */}
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Career Levels */}
          {node.career_levels && node.career_levels.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {node.career_levels.slice(0, 3).map((level) => (
                <span
                  key={level}
                  className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-200"
                >
                  {level.replace(/_/g, ' ')}
                </span>
              ))}
              {node.career_levels.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-200">
                  +{node.career_levels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-blue-400 hover:bg-blue-500/20"
              onClick={() => onEdit(node)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-green-400 hover:bg-green-500/20"
              onClick={() => onPromote(node)}
            >
              <Award className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/20"
              onClick={() => onDelete(node)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-8 border-l-2 border-gray-700 pl-4 relative">
            {/* Linha horizontal conectora do topo */}
            <div
              className="absolute left-0 top-0 w-4 h-8 border-l-2 border-b-2 border-gray-600"
              style={{ transform: 'translate(-2.25rem, -1rem)' }}
            />

            {node.children.map((child) => (
              <NodeCard key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}

        {/* Badge de filhos recolhidos */}
        {!isExpanded && hasChildren && (
          <div className="ml-4 text-xs text-gray-400 italic mb-2">
            ▼ {node.children.length} {node.children.length === 1 ? 'indicado' : 'indicados'} recolhidos
          </div>
        )}
      </div>
    );
  };

  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Nenhum usuário para exibir</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-auto pb-4">
      {hierarchy.map((root) => (
        <div key={root.id} className="min-w-max">
          <NodeCard node={root} />
        </div>
      ))}
    </div>
  );
}