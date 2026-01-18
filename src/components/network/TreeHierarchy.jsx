import React, { useState } from 'react';
import { ChevronDown, Users, Store, TrendingUp, Crown, Award, Zap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getCareerIcon = (level) => {
  const icons = {
    usuario: <Users className="w-6 h-6" />,
    licenciado_aplicativo: <Zap className="w-6 h-6" />,
    licenciado_catalogo: <Store className="w-6 h-6" />,
    influencer: <Target className="w-6 h-6" />,
    trainee: <Award className="w-6 h-6" />,
    executivo: <Crown className="w-6 h-6" />,
    kit_start: <TrendingUp className="w-6 h-6" />,
    plano_lider: <Crown className="w-6 h-6" />,
    plano_lojista: <Store className="w-6 h-6" />,
    distribuidor: <TrendingUp className="w-6 h-6" />,
    diretor: <Crown className="w-6 h-6" />,
    diretoria: <Crown className="w-6 h-6" />,
  };
  return icons[level] || <Users className="w-6 h-6" />;
};

const getCareerColor = (level) => {
  const colors = {
    usuario: 'from-gray-600 to-gray-700',
    licenciado_aplicativo: 'from-yellow-600 to-yellow-700',
    licenciado_catalogo: 'from-blue-600 to-blue-700',
    influencer: 'from-pink-600 to-pink-700',
    trainee: 'from-purple-600 to-purple-700',
    executivo: 'from-indigo-600 to-indigo-700',
    kit_start: 'from-green-600 to-green-700',
    plano_lider: 'from-red-600 to-red-700',
    plano_lojista: 'from-cyan-600 to-cyan-700',
    distribuidor: 'from-orange-600 to-orange-700',
    diretor: 'from-fuchsia-600 to-fuchsia-700',
    diretoria: 'from-violet-600 to-violet-700',
  };
  return colors[level] || 'from-gray-600 to-gray-700';
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
    const colorGradient = getCareerColor(primaryLevel);
    const icon = getCareerIcon(primaryLevel);

    return (
      <div className="flex flex-col items-center">
        {/* Nó/Bolha */}
        <div className="relative">
          {/* Bolha com gradiente */}
          <button
            onClick={() => hasChildren && toggleNode(node.id)}
            className={`
              w-24 h-24 rounded-full bg-gradient-to-br ${colorGradient}
              flex flex-col items-center justify-center gap-1
              text-white font-semibold text-xs
              hover:scale-110 transition-transform shadow-lg
              cursor-pointer border-4 border-gray-900
              relative group
            `}
          >
            <div className="text-xl">{icon}</div>
            <div className="text-center line-clamp-2 text-[10px]">
              {node.full_name?.split(' ')[0] || 'User'}
            </div>

            {/* Dropdown indicator */}
            {hasChildren && (
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                <div className="bg-gray-900 rounded-full p-1">
                  <ChevronDown className="w-3 h-3 text-green-400" />
                </div>
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 border border-gray-700">
              {node.full_name}
            </div>
          </button>
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