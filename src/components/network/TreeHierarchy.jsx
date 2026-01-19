import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
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
  const [currentRootId, setCurrentRootId] = useState(null); // null = raiz principal
  const [navigationHistory, setNavigationHistory] = useState([]);
  const nodePositions = useRef({});
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Monta hierarquia completa
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
    return { roots, usersMap };
  };

  // Encontra o nó atual baseado no currentRootId
  const getCurrentRoot = () => {
    const { roots, usersMap } = getHierarchy();
    if (!currentRootId) {
      return roots[0] || null; // Primeira raiz
    }
    return usersMap.get(currentRootId) || roots[0];
  };

  // Navegar para um filho (ele vira a nova raiz)
  const navigateToChild = (childId) => {
    setNavigationHistory(prev => [...prev, currentRootId]);
    setCurrentRootId(childId);
  };

  // Voltar para o nível anterior
  const navigateBack = () => {
    if (navigationHistory.length > 0) {
      const newHistory = [...navigationHistory];
      const previousId = newHistory.pop();
      setNavigationHistory(newHistory);
      setCurrentRootId(previousId);
    }
  };

  const drawSVGConnections = () => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const containerRect = containerRef.current.getBoundingClientRect();
    svg.setAttribute('width', containerRect.width);
    svg.setAttribute('height', containerRect.height);

    const root = getCurrentRoot();
    if (!root) return;

    const rootPos = nodePositions.current[root.id];
    if (!rootPos) return;

    // Só desenhar linhas da raiz para filhos diretos (SEM netos)
    const children = root.children || [];
    children.forEach(child => {
      const childPos = nodePositions.current[child.id];
      if (!childPos) return;

      // Linha RETA diagonal do centro inferior da raiz até centro superior do filho
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', rootPos.x);
      line.setAttribute('y1', rootPos.y + 32); // base do círculo raiz
      line.setAttribute('x2', childPos.x);
      line.setAttribute('y2', childPos.y - 32); // topo do círculo filho
      line.setAttribute('stroke', '#cbd5e1');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('stroke-dasharray', '8 6');
      svg.appendChild(line);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        drawSVGConnections();
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [expandedNodes, users]);

  useEffect(() => {
    window.addEventListener('resize', drawSVGConnections);
    return () => window.removeEventListener('resize', drawSVGConnections);
  }, []);

  const TreeNode = ({ node, depth = 0, isRoot = false, parentId = null }) => {
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
      <div 
        className={`flex flex-col items-center ${isRoot ? 'w-full' : ''}`} 
        ref={nodeRef}
        style={{ gap: isRoot ? '60px' : '30px' }}
      >
        {/* Nó/Bolha */}
        <div 
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
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
              flex-shrink-0
            `}
          >
            {node.avatar_url ? (
              <img src={node.avatar_url} alt={node.full_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}

            {/* Dropdown indicator removido para visual mais limpo */}
          </button>

          {/* Tooltip com info e ações */}
          <div 
            className={`absolute ${isRoot ? 'top-full mt-2' : 'left-full ml-1 top-1/2 -translate-y-1/2'} ${showTooltip ? 'block' : 'hidden'} bg-gray-950 text-white text-xs rounded-lg px-3 py-2 z-20 border border-gray-600 shadow-2xl whitespace-nowrap`}
          >
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

        {/* Children - Estrutura em cascata */}
        {hasChildren && isExpanded && (
          <div className={isRoot ? "flex flex-row gap-16 justify-center flex-wrap w-full" : "flex flex-col gap-6"}>
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <TreeNode node={child} depth={depth + 1} isRoot={false} parentId={node.id} />
              </div>
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
        style={{ zIndex: 1, top: 0, left: 0 }}
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      />
      <div className="relative" style={{ zIndex: 2 }}>
        {roots.map((root) => (
          <TreeNode key={root.id} node={root} depth={0} isRoot={true} />
        ))}
      </div>
    </div>
  );
}