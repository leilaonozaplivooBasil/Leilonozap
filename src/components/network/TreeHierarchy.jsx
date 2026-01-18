import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  const nodePositions = useRef({});
  const svgRef = useRef(null);
  const containerRef = useRef(null);

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

  const drawSVGConnections = () => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const containerRect = containerRef.current.getBoundingClientRect();

    Object.keys(nodePositions.current).forEach(nodeId => {
      const user = users.find(u => u.id === nodeId);
      if (!user || !user.children) return;

      user.children.forEach(child => {
        const parentPos = nodePositions.current[user.id];
        const childPos = nodePositions.current[child.id];

        if (parentPos && childPos) {
          const x1 = parentPos.x;
          const y1 = parentPos.y;
          const x2 = childPos.x;
          const y2 = childPos.y;

          const controlX1 = x1;
          const controlY1 = y1 + (y2 - y1) * 0.3;
          const controlX2 = x2;
          const controlY2 = y1 + (y2 - y1) * 0.7;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute(
            'd',
            `M ${x1} ${y1} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x2} ${y2}`
          );
          path.setAttribute('stroke', '#64748b');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');

          svg.appendChild(path);
        }
      });
    });
  };

  useEffect(() => {
    const timer = setTimeout(drawSVGConnections, 50);
    return () => clearTimeout(timer);
  }, [expandedNodes, users]);

  const TreeNode = ({ node, depth = 0, isRoot = false }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const primaryLevel = node.primary_career_level || 'usuario';
    const bgColor = getCareerColor(primaryLevel);
    const initials = getInitials(node.full_name);
    const nodeRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const container = containerRef.current?.getBoundingClientRect();
        if (container) {
          nodePositions.current[node.id] = {
            x: rect.left - container.left + rect.width / 2,
            y: rect.top - container.top + rect.height / 2
          };
        }
      }
    }, [node.id, isExpanded]);

    return (
      <div className={`flex flex-col items-center gap-8 ${isRoot ? 'w-full' : ''}`} ref={nodeRef}>
        {/* Nó/Bolha */}
        <div className="relative group">
          {/* Bolha melhorada */}
          <button
            onClick={() => hasChildren && toggleNode(node.id)}
            className={`
              w-16 h-16 rounded-full ${bgColor}
              flex items-center justify-center
              text-white font-bold text-sm
              hover:shadow-2xl transition-all duration-300
              cursor-pointer shadow-lg
              relative group/btn
              hover:scale-110
              border-2 border-white/20
              overflow-hidden
            `}
          >
            {node.avatar_url ? (
              <img src={node.avatar_url} alt={node.full_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}

            {/* Dropdown indicator */}
            {hasChildren && (
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <div className="bg-gray-900 rounded-full p-1 border border-gray-700">
                  <ChevronDown className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </button>

          {/* Tooltip com info e ações */}
          <div className={`absolute ${isRoot ? 'top-full mt-3' : 'left-full ml-3 top-1/2 -translate-y-1/2'} hidden group-hover:block bg-gray-950 text-white text-xs rounded-lg px-3 py-2 z-20 border border-gray-600 shadow-2xl whitespace-nowrap`}>
            <div className="font-bold">{node.full_name}</div>
            <div className="text-gray-400 text-[10px] mt-1">{node.email}</div>

            {/* Botões de ação */}
            <div className="flex gap-1 mt-2 pt-2 border-t border-gray-700">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-xs text-blue-400 hover:bg-blue-500/20"
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
                className="h-6 px-1.5 text-xs text-green-400 hover:bg-green-500/20"
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
                className="h-6 px-1.5 text-xs text-red-400 hover:bg-red-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node);
                }}
              >
                🗑️
              </Button>
            </div>
          </div>
        </div>

        {/* Children - Renderizados em linha horizontal se for raiz, em cascata se for filho */}
        {hasChildren && isExpanded && (
          <div className={isRoot ? "flex flex-row gap-12 justify-center flex-wrap" : "flex flex-col gap-6 ml-12"}>
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} isRoot={false} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const roots = getHierarchy();

  return (
    <div className="w-full p-8 bg-gray-900 rounded-lg relative overflow-auto min-h-screen flex items-center justify-center" ref={containerRef}>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <div className="relative" style={{ zIndex: 2 }}>
        {roots.map((root) => (
          <TreeNode key={root.id} node={root} depth={0} isRoot={true} />
        ))}
      </div>
    </div>
  );
}