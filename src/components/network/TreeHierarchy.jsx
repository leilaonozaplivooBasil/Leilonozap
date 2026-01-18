import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getCareerColor = (level) => {
  const colors = {
    usuario: 'bg-slate-500',
    licenciado_aplicativo: 'bg-amber-500',
    licenciado_catalogo: 'bg-blue-500',
    influencer: 'bg-pink-500',
    trainee: 'bg-purple-500',
    executivo: 'bg-indigo-500',
    kit_start: 'bg-emerald-500',
    plano_lider: 'bg-red-500',
    plano_lojista: 'bg-cyan-500',
    distribuidor: 'bg-orange-500',
    diretor: 'bg-fuchsia-500',
    diretoria: 'bg-violet-500',
  };
  return colors[level] || 'bg-slate-500';
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(p => p);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function TreeHierarchy({ users, onEdit, onDelete, onPromote }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const toggleNode = (userId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
  };

  const getHierarchy = () => {
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

    roots.sort((a, b) => b.children.length - a.children.length);
    return roots;
  };

  const TreeNode = ({ node, isRoot = false }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const primaryLevel = node.primary_career_level || 'usuario';
    const bgColor = getCareerColor(primaryLevel);
    const initials = getInitials(node.full_name);

    return (
      <div className="flex flex-col items-center">
        {/* Nó/Bolha */}
        <div className="relative group">
          {/* Bolha clean e minimalista */}
          <button
            onClick={() => hasChildren && toggleNode(node.id)}
            className={`
              w-20 h-20 rounded-full ${bgColor}
              flex items-center justify-center
              text-white font-bold text-sm
              hover:shadow-xl transition-all duration-200
              cursor-pointer shadow-md
              relative
              ${hasChildren ? 'hover:scale-105' : ''}
            `}
          >
            {initials}

            {/* Dropdown indicator */}
            {hasChildren && (
              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                <div className="bg-gray-900 rounded-full p-0.5">
                  <ChevronDown className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </button>

          {/* Tooltip com info */}
          <div className="absolute top-full mt-2 hidden group-hover:block bg-gray-950 text-white text-xs rounded-lg px-3 py-2 z-10 border border-gray-700 whitespace-nowrap shadow-lg">
            <div className="font-semibold">{node.full_name}</div>
            <div className="text-gray-400 text-[10px] mt-1">{node.email}</div>
          </div>
        </div>

        {/* Linha para baixo */}
        {hasChildren && isExpanded && (
          <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-400"></div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Linha horizontal conectora */}
            <div className="h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mb-6" style={{ width: `${Math.max(120, node.children.length * 120)}px`, marginLeft: `${-Math.max(60, (node.children.length - 1) * 60)}px` }}></div>

            {/* Grid de filhos */}
            <div
              className="flex gap-8 justify-center relative"
              style={{
                marginTop: '-1.5rem',
              }}
            >
              {/* Linhas verticais de conexão */}
              {node.children.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Linha vertical curva */}
                  <svg
                    className="absolute -top-6 w-12 h-12"
                    style={{
                      left: `${idx * 120 + 48}px`,
                    }}
                    viewBox="0 0 48 48"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 24 0 Q 24 24 24 48"
                      stroke="#22c55e"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Nó filho */}
                  <div className="pt-8">
                    <TreeNode node={child} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-blue-400 hover:bg-blue-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
          >
            ✏️
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-green-400 hover:bg-green-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onPromote(node);
            }}
          >
            ⭐
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
          >
            🗑️
          </Button>
        </div>
      </div>
    );
  };

  const roots = getHierarchy();

  return (
    <div className="w-full overflow-x-auto overflow-y-auto p-8 bg-gray-900 rounded-lg">
      <div className="flex flex-col items-center gap-12 min-w-min">
        {roots.map((root) => (
          <div key={root.id} className="group">
            <TreeNode node={root} isRoot={true} />
          </div>
        ))}
      </div>
    </div>
  );
}