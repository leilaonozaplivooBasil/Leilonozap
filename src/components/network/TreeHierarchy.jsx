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

  const nodeRefs = useRef({});

  const TreeNode = ({ node, isRoot = false, parentPos = null }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const primaryLevel = node.primary_career_level || 'usuario';
    const bgColor = getCareerColor(primaryLevel);
    const initials = getInitials(node.full_name);
    const nodeRef = useRef(null);

    useEffect(() => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        nodeRefs.current[node.id] = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    }, [node.id, isExpanded]);

    return (
      <div className="flex flex-col items-center gap-2" ref={nodeRef}>
        {/* Nó/Bolha */}
        <div className="relative group">
          {/* Bolha clean e minimalista */}
          <button
            onClick={() => hasChildren && toggleNode(node.id)}
            className={`
              w-14 h-14 rounded-full ${bgColor}
              flex items-center justify-center
              text-white font-bold text-xs
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
                  <ChevronDown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
            )}
          </button>

          {/* Tooltip com info e ações */}
          <div className="absolute top-full mt-2 hidden group-hover:block bg-gray-950 text-white text-xs rounded-lg px-3 py-2 z-10 border border-gray-700 shadow-lg">
            <div className="font-semibold whitespace-nowrap">{node.full_name}</div>
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

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="flex items-center justify-center gap-6">
            {node.children.map((child, idx) => (
              <TreeNode key={child.id} node={child} parentPos={nodeRefs.current[node.id]} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const roots = getHierarchy();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const drawConnections = () => {
      const svg = svgRef.current;
      svg.innerHTML = '';

      const drawCurve = (fromId, toId) => {
        const from = nodeRefs.current[fromId];
        const to = nodeRefs.current[toId];

        if (!from || !to) return;

        const svg = svgRef.current;
        const container = svg.parentElement;
        const containerRect = container.getBoundingClientRect();

        const x1 = from.x - containerRect.left;
        const y1 = from.y - containerRect.top;
        const x2 = to.x - containerRect.left;
        const y2 = to.y - containerRect.top;

        const controlY = y1 + (y2 - y1) * 0.4;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${controlY}, ${x2} ${controlY}, ${x2} ${y2}`);
        path.setAttribute('stroke', '#64748b');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');

        svg.appendChild(path);
      };

      Object.values(users).forEach(user => {
        if (user.children && user.children.length > 0) {
          user.children.forEach(child => {
            drawCurve(user.id, child.id);
          });
        }
      });
    };

    setTimeout(drawConnections, 100);
  }, [expandedNodes, users]);

  return (
    <div className="w-full p-8 bg-gray-900 rounded-lg relative">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <div className="flex flex-col items-center gap-12 relative" style={{ zIndex: 2 }}>
        {roots.map((root) => (
          <TreeNode key={root.id} node={root} isRoot={true} />
        ))}
      </div>
    </div>
  );
}